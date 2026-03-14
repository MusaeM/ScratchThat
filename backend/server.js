const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const { getPublicServices, getServiceByKey } = require('./services');
const {
  buildWorkflowPlan,
  buildEmailPayload,
  buildConfirmationMessage,
  getFullName
} = require('./automation');

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

app.get('/', (req, res) => {
  res.send('ScratchThat Backend running');
});

app.get('/services', (req, res) => {
  res.json({ services: getPublicServices() });
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

    res.status(200).json({
      message: 'Workflow executed successfully',
      workflow: result
    });
  } catch (error) {
    console.error('ERROR:', error.response || error.message || error);
    res.status(500).json({
      message: 'Something went wrong',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
