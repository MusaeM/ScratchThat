const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const { getPublicServices, getServiceByKey } = require('./services');
const {
  buildWorkflowPlan,
  buildEmailPayload,
  buildConfirmationMessage,
  getFullName
} = require('./automation');
const {
  saveWorkflow,
  updateWorkflow,
  getWorkflow,
  listWorkflowsByEmail,
  listDueFollowUps
} = require('./storage');
const { classifyResponse } = require('./responseParser');

const app = express();
app.use(cors());
app.use(express.json());

function createTransporter({ userEnvKey, passEnvKey }) {
  const user = process.env[userEnvKey];
  const pass = process.env[passEnvKey];

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: {
      user,
      pass
    }
  });
}

function resolveRecipient(service) {
  return process.env.TARGET_OVERRIDE_EMAIL || service.recipient;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeProfile(body = {}) {
  return {
    fname: String(body.fname || '').trim(),
    sname: String(body.sname || '').trim(),
    pnr: String(body.pnr || '').trim(),
    email: String(body.email || '').trim(),
    phone: String(body.phone || '').trim(),
    plan: String(body.plan || 'bas').trim().toLowerCase()
  };
}

function validateProfile(profile) {
  const issues = [];
  const nameRegex = /^[\p{L}-]+$/u;
  const pnrRegex = /^(\d{6}|\d{8})[-]?\d{4}$/;
  const emailRegex = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/;

  if (!nameRegex.test(profile.fname)) {
    issues.push('fname');
  }
  if (!nameRegex.test(profile.sname)) {
    issues.push('sname');
  }
  if (!pnrRegex.test(profile.pnr)) {
    issues.push('pnr');
  }
  if (!emailRegex.test(profile.email)) {
    issues.push('email');
  }

  return issues;
}

function buildFollowUps({ workflowId, profile, plan }) {
  const planName = profile.plan;
  const scheduleDays = planName === 'premium' ? [7, 14, 30] : planName === 'bas' ? [30] : [];

  return scheduleDays.map((days) => ({
    id: createId('followup'),
    workflowId,
    dueAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    daysAfterStart: days,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    type: 'email_reminder'
  }));
}

function buildWorkflowRecord({ profile, companies, workflowPlan, result }) {
  const workflowId = createId('workflow');
  const now = new Date().toISOString();
  const statuses = workflowPlan.services.map((item) => ({
    key: item.key,
    label: item.label,
    mode: item.mode,
    status: item.status === 'automatable'
      ? 'sent'
      : item.status === 'needs_input'
        ? 'needs_input'
        : item.status === 'user_action'
          ? 'user_action'
          : 'limited',
    lastUpdatedAt: now,
    missingFields: item.missingFields || [],
    externalUrl: item.externalUrl || null,
    description: item.description || null,
    history: [
      {
        at: now,
        status: item.status,
        note: `Workflow skapad med status ${item.status}`
      }
    ]
  }));

  const workflow = {
    id: workflowId,
    createdAt: now,
    updatedAt: now,
    profile,
    companies,
    plan: profile.plan,
    summary: workflowPlan.summary,
    services: statuses,
    incomingResponses: [],
    followUps: buildFollowUps({
      workflowId,
      profile,
      plan: workflowPlan
    }),
    lastExecution: result
  };

  return workflow;
}

function serializeWorkflow(workflow) {
  return {
    id: workflow.id,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    plan: workflow.plan,
    summary: workflow.summary,
    services: workflow.services,
    followUps: workflow.followUps
  };
}

async function sendReminderEmail({ workflow, followUp, transporter }) {
  if (!transporter) {
    return false;
  }

  const actionableServices = workflow.services.filter((service) =>
    ['user_action', 'needs_input', 'sent', 'in_progress'].includes(service.status)
  );

  const text = `Hej ${getFullName(workflow.profile)},

Det här är en automatisk uppföljning från Scratch That för ditt ${workflow.plan}-ärende.

Aktuella tjänster:
${actionableServices.map((service) => `- ${service.label}: ${service.status}`).join('\n')}

Om någon tjänst fortfarande kräver ett steg från dig kan du gå tillbaka till tjänsten och fortsätta där du slutade.
`;

  await transporter.sendMail({
    from: process.env.SMTP2_USER,
    to: workflow.profile.email,
    subject: `Automatisk uppföljning från Scratch That (${followUp.daysAfterStart} dagar)`,
    text,
    html: `<p>Hej <strong>${getFullName(workflow.profile)}</strong>,</p>
<p>Det här är en automatisk uppföljning från Scratch That för ditt ${workflow.plan}-ärende.</p>
<ul>${actionableServices.map((service) => `<li>${service.label}: ${service.status}</li>`).join('')}</ul>
<p>Om någon tjänst fortfarande kräver ett steg från dig kan du gå tillbaka till tjänsten och fortsätta där du slutade.</p>`
  });

  return true;
}

app.get('/', (req, res) => {
  res.send('ScratchThat Backend running');
});

app.get('/services', (req, res) => {
  res.json({ services: getPublicServices() });
});

app.get('/workflows', (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ message: 'Email query parameter is required' });
  }

  const workflows = listWorkflowsByEmail(email).map(serializeWorkflow);
  res.json({ workflows });
});

app.get('/workflows/:workflowId', (req, res) => {
  const workflow = getWorkflow(req.params.workflowId);
  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' });
  }

  res.json({ workflow: serializeWorkflow(workflow) });
});

app.post('/workflow-plan', (req, res) => {
  const profile = normalizeProfile(req.body);
  const companies = Array.isArray(req.body.companies) ? req.body.companies : [];
  const validationIssues = validateProfile({
    ...profile,
    fname: profile.fname || 'Placeholder',
    sname: profile.sname || 'Placeholder',
    pnr: profile.pnr || '19000101-0000',
    email: profile.email || 'placeholder@example.com'
  }).filter((field) => {
    if (field === 'fname') {
      return profile.fname !== '';
    }
    if (field === 'sname') {
      return profile.sname !== '';
    }
    if (field === 'pnr') {
      return profile.pnr !== '';
    }
    if (field === 'email') {
      return profile.email !== '';
    }
    return false;
  });

  const plan = buildWorkflowPlan({ profile, companies });

  res.json({
    ...plan,
    validationIssues
  });
});

app.post(['/execute-workflow', '/send-email'], async (req, res) => {
  try {
    const profile = normalizeProfile(req.body);
    const companies = Array.isArray(req.body.companies) ? req.body.companies : [];
    const validationIssues = validateProfile(profile);

    if (validationIssues.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        validationIssues
      });
    }

    if (companies.length === 0) {
      return res.status(400).json({
        message: 'At least one service must be selected'
      });
    }

    const workflowPlan = buildWorkflowPlan({ profile, companies });
    const automatableItems = workflowPlan.services.filter((item) => item.status === 'automatable');
    const result = {
      plan: profile.plan,
      fullName: getFullName(profile),
      automated: [],
      userAction: workflowPlan.services.filter((item) => item.status === 'user_action'),
      needsInput: workflowPlan.services.filter((item) => item.status === 'needs_input'),
      limited: workflowPlan.services.filter((item) => item.status === 'limited'),
      confirmationSent: false,
      previewText: null
    };

    const companyTransporter = createTransporter({
      userEnvKey: 'SMTP_USER',
      passEnvKey: 'SMTP_PASS'
    });

    if (automatableItems.length > 0 && !companyTransporter) {
      return res.status(500).json({
        message: 'SMTP credentials are missing for automated email flows'
      });
    }

    for (const item of automatableItems) {
      const service = getServiceByKey(item.key);
      const payload = buildEmailPayload(service, profile);
      const recipient = resolveRecipient(service);

      await companyTransporter.sendMail({
        from: process.env.SMTP_USER,
        to: recipient,
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      });

      result.automated.push({
        key: item.key,
        label: item.label,
        recipient: recipient
      });

      if (!result.previewText) {
        result.previewText = payload.text;
      }
    }

    const confirmationTransporter = createTransporter({
      userEnvKey: 'SMTP2_USER',
      passEnvKey: 'SMTP2_PASS'
    });

    if (confirmationTransporter) {
      const confirmation = buildConfirmationMessage({ profile, result });
      await confirmationTransporter.sendMail({
        from: process.env.SMTP2_USER,
        to: profile.email,
        subject: confirmation.subject,
        text: confirmation.text,
        html: confirmation.html
      });
      result.confirmationSent = true;
    }

    const workflowRecord = buildWorkflowRecord({
      profile,
      companies,
      workflowPlan,
      result
    });
    saveWorkflow(workflowRecord);

    res.status(200).json({
      message: 'Workflow executed successfully',
      workflow: {
        ...result,
        workflowId: workflowRecord.id,
        followUps: workflowRecord.followUps
      }
    });
  } catch (error) {
    console.error('ERROR:', error.response || error.message || error);
    res.status(500).json({
      message: 'Something went wrong',
      error: error.message
    });
  }
});

app.post('/parse-response', (req, res) => {
  const { workflowId, serviceKey, subject = '', text = '', from = '' } = req.body || {};
  const workflow = getWorkflow(workflowId);

  if (!workflow) {
    return res.status(404).json({ message: 'Workflow not found' });
  }

  const service = workflow.services.find((item) => item.key === serviceKey);
  if (!service) {
    return res.status(404).json({ message: 'Service not found in workflow' });
  }

  const parsed = classifyResponse({ serviceKey, subject, text });
  const now = new Date().toISOString();

  const updated = updateWorkflow(workflowId, (current) => ({
    ...current,
    updatedAt: now,
    incomingResponses: current.incomingResponses.concat({
      id: createId('response'),
      serviceKey,
      subject,
      text,
      from,
      receivedAt: now,
      classification: parsed
    }),
    services: current.services.map((item) => {
      if (item.key !== serviceKey) {
        return item;
      }

      return {
        ...item,
        status: parsed.status,
        lastUpdatedAt: now,
        history: item.history.concat({
          at: now,
          status: parsed.status,
          note: parsed.reason
        })
      };
    })
  }));

  res.json({
    message: 'Response parsed',
    classification: parsed,
    workflow: serializeWorkflow(updated)
  });
});

app.post('/process-followups', async (req, res) => {
  const confirmationTransporter = createTransporter({
    userEnvKey: 'SMTP2_USER',
    passEnvKey: 'SMTP2_PASS'
  });

  const dueItems = listDueFollowUps(new Date().toISOString());
  const processed = [];

  for (const due of dueItems) {
    const workflow = getWorkflow(due.workflowId);
    if (!workflow) {
      continue;
    }

    let sent = false;
    try {
      sent = await sendReminderEmail({
        workflow,
        followUp: due.item,
        transporter: confirmationTransporter
      });
    } catch (error) {
      console.error('FOLLOW_UP_ERROR:', error.message);
    }

    const now = new Date().toISOString();
    updateWorkflow(due.workflowId, (current) => ({
      ...current,
      updatedAt: now,
      followUps: current.followUps.map((item) => {
        if (item.id !== due.followUpId) {
          return item;
        }

        return {
          ...item,
          status: sent ? 'sent' : 'failed',
          processedAt: now
        };
      })
    }));

    processed.push({
      workflowId: due.workflowId,
      followUpId: due.followUpId,
      sent
    });
  }

  res.json({
    message: 'Follow-up processing complete',
    processed
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
