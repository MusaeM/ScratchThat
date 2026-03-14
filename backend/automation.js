const { getServiceByKey } = require('./services');
const crypto = require('crypto');

function getFullName(profile) {
  return `${profile.fname || ''} ${profile.sname || ''}`.trim();
}

function getBaseGdprMessage({ fullName, pnr, email }) {
  return {
    subject: 'Begäran om radering av personuppgifter enligt GDPR (Artikel 17)',
    text: `Hej,

Jag, ${fullName}, personnummer ${pnr}, begär härmed i enlighet med Artikel 17 i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.

Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt Artikel 12.3 GDPR, inom en månad.

Återkoppla till: ${email}

Vänliga hälsningar,
${fullName}`,
    html: `<p>Hej,</p>
<p>Jag, <strong>${fullName}</strong>, personnummer <strong>${pnr}</strong>, begär härmed i enlighet med <strong>Artikel 17</strong> i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.</p>
<p>Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt <strong>Artikel 12.3 GDPR</strong>, inom en månad.</p>
<p>För eventuell återkoppling kan ni nå mig på: <a href="mailto:${email}">${email}</a></p>
<p>Vänliga hälsningar,<br>${fullName}</p>`
  };
}

function validateRequiredFields(profile, requiredFields = []) {
  return requiredFields.filter((field) => {
    const value = profile[field];
    return !value || String(value).trim() === '';
  });
}

function buildPlanItem(service, profile) {
  const missingFields = validateRequiredFields(profile, service.requiredFields);

  if (service.mode === 'email') {
    if (missingFields.length > 0) {
      return {
        key: service.key,
        label: service.label,
        status: 'needs_input',
        mode: service.mode,
        automationLevel: service.automationLevel,
        missingFields,
        description: service.description || null
      };
    }

    return {
      key: service.key,
      label: service.label,
      status: 'automatable',
      mode: service.mode,
      automationLevel: service.automationLevel,
      description: service.description || null
    };
  }

  if (service.mode === 'self_service') {
    return {
      key: service.key,
      label: service.label,
      status: 'user_action',
      mode: service.mode,
      automationLevel: service.automationLevel,
      externalUrl: service.externalUrl,
      description: service.description || null
    };
  }

  return {
    key: service.key,
    label: service.label,
    status: 'limited',
    mode: service.mode,
    automationLevel: service.automationLevel,
    description: service.description || null
  };
}

function buildWorkflowPlan({ profile, companies }) {
  const selected = Array.isArray(companies) ? companies : [];
  const planItems = selected
    .map((key) => getServiceByKey(key))
    .filter(Boolean)
    .map((service) => buildPlanItem(service, profile));

  const requiredFieldSet = new Set();
  for (const item of planItems) {
    if (item.missingFields) {
      item.missingFields.forEach((field) => requiredFieldSet.add(field));
    }
  }

  return {
    services: planItems,
    requiredFields: Array.from(requiredFieldSet),
    summary: {
      automatable: planItems.filter((item) => item.status === 'automatable').length,
      needsInput: planItems.filter((item) => item.status === 'needs_input').length,
      userAction: planItems.filter((item) => item.status === 'user_action').length,
      limited: planItems.filter((item) => item.status === 'limited').length
    }
  };
}

function buildEmailPayload(service, profile) {
  const fullName = getFullName(profile);

  if (typeof service.buildMessage === 'function') {
    return service.buildMessage({
      ...profile,
      fullName
    });
  }

  return getBaseGdprMessage({
    fullName,
    pnr: profile.pnr,
    email: profile.email
  });
}

function buildConfirmationMessage({ profile, result }) {
  const fullName = getFullName(profile);
  const lines = [];

  if (result.automated.length > 0) {
    lines.push('Automatiskt skickade ärenden:');
    result.automated.forEach((item) => lines.push(`- ${item.label}`));
    lines.push('');
  }

  if (result.userAction.length > 0) {
    lines.push('Sajter där du behöver göra ett steg själv:');
    result.userAction.forEach((item) => lines.push(`- ${item.label}: ${item.externalUrl}`));
    lines.push('');
  }

  if (result.needsInput.length > 0) {
    lines.push('Sajter som kräver mer uppgifter innan vi kan automatisera dem:');
    result.needsInput.forEach((item) => lines.push(`- ${item.label}: saknar ${item.missingFields.join(', ')}`));
    lines.push('');
  }

  if (result.limited.length > 0) {
    lines.push('Sajter där automatiserad radering inte är realistisk i nuläget:');
    result.limited.forEach((item) => lines.push(`- ${item.label}: ${item.description}`));
    lines.push('');
  }

  const text = `Hej ${fullName},

Här är en sammanfattning av ditt ärende hos Scratch That:

${lines.join('\n')}
Du kan följa nästa steg i tjänsten och återkomma senare för fler automatiserade flöden.

Tack för att du använder Scratch That!`;

  const htmlSections = [];

  const sectionToHtml = (title, items, formatter) => {
    if (items.length === 0) {
      return '';
    }

    return `<p><strong>${title}</strong></p><ul>${items.map(formatter).join('')}</ul>`;
  };

  htmlSections.push(sectionToHtml('Automatiskt skickade ärenden', result.automated, (item) => `<li>${item.label}</li>`));
  htmlSections.push(sectionToHtml('Sajter där du behöver göra ett steg själv', result.userAction, (item) => `<li>${item.label}: <a href="${item.externalUrl}">${item.externalUrl}</a></li>`));
  htmlSections.push(sectionToHtml('Sajter som kräver mer uppgifter', result.needsInput, (item) => `<li>${item.label}: saknar ${item.missingFields.join(', ')}</li>`));
  htmlSections.push(sectionToHtml('Sajter där automatiserad radering inte är realistisk i nuläget', result.limited, (item) => `<li>${item.label}: ${item.description}</li>`));

  return {
    subject: 'Din Scratch That-sammanfattning',
    text,
    html: `<p>Hej <strong>${fullName}</strong>,</p>
<p>Här är en sammanfattning av ditt ärende hos Scratch That:</p>
${htmlSections.join('')}
<p>Du kan följa nästa steg i tjänsten och återkomma senare för fler automatiserade flöden.</p>
<p>Tack för att du använder Scratch That!</p>`
  };
}

module.exports = {
  buildWorkflowPlan,
  buildEmailPayload,
  buildConfirmationMessage,
  getFullName
};
