const SERVICE_REGISTRY = {
  '180': {
    key: '180',
    label: '180.se',
    mode: 'email',
    automationLevel: 'semi_auto',
    requiredFields: ['phone'],
    recipient: 'support@180.se',
    description: '180 brukar vilja ha telefonnummer kopplat till ärendet innan de kan hjälpa vidare.',
    buildMessage: ({ fullName, email, phone }) => ({
      subject: 'Begäran om borttagning av uppgifter från 180.se',
      text: `Hej,

Jag, ${fullName}, önskar hjälp att ta bort eller begränsa mina uppgifter på 180.se.

Berört telefonnummer: ${phone}
Återkoppla gärna till: ${email}

Vänliga hälsningar,
${fullName}`,
      html: `<p>Hej,</p>
<p>Jag, <strong>${fullName}</strong>, önskar hjälp att ta bort eller begränsa mina uppgifter på 180.se.</p>
<p><strong>Berört telefonnummer:</strong> ${phone}</p>
<p>Återkoppla gärna till: <a href="mailto:${email}">${email}</a></p>
<p>Vänliga hälsningar,<br>${fullName}</p>`
    })
  },
  birthday: {
    key: 'birthday',
    label: 'Birthday.se',
    mode: 'self_service',
    automationLevel: 'user_action',
    requiredFields: [],
    externalUrl: 'https://app.minauppgifter.se/birthday/bankidlogin',
    description: 'Birthday har ett eget BankID-flöde för borttagning.'
  },
  eniro: {
    key: 'eniro',
    label: 'Eniro.se',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'dataskydd@eniro.com'
  },
  hitta: {
    key: 'hitta',
    label: 'Hitta.se',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'personuppgifter@hitta.se'
  },
  merinfo: {
    key: 'merinfo',
    label: 'Merinfo.se',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'info@merinfo.se'
  },
  mrkoll: {
    key: 'mrkoll',
    label: 'Mrkoll.se',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'info@mrkoll.se'
  },
  ratsit: {
    key: 'ratsit',
    label: 'Ratsit.se',
    mode: 'self_service',
    automationLevel: 'user_action',
    requiredFields: [],
    externalUrl: 'https://www.ratsit.se/tabort',
    description: 'Ratsit hänvisar normalt till eget borttagningsflöde.'
  },
  upplysning: {
    key: 'upplysning',
    label: 'Upplysning.se',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'support@upplysning.se'
  },
  biluppgifter: {
    key: 'biluppgifter',
    label: 'Biluppgifter.se',
    mode: 'info_only',
    automationLevel: 'limited',
    requiredFields: [],
    description: 'Biluppgifter hänvisar ofta till grundlagsskydd och offentlig källa. Automatiskt GDPR-mail räcker sällan här.'
  },
  carinfo: {
    key: 'carinfo',
    label: 'Car.info',
    mode: 'email',
    automationLevel: 'auto',
    requiredFields: [],
    recipient: 'info@car.info'
  }
};

function getPublicServices() {
  return Object.values(SERVICE_REGISTRY).map((service) => ({
    key: service.key,
    label: service.label,
    mode: service.mode,
    automationLevel: service.automationLevel,
    requiredFields: service.requiredFields,
    externalUrl: service.externalUrl || null,
    description: service.description || null
  }));
}

function getServiceByKey(key) {
  return SERVICE_REGISTRY[key];
}

module.exports = {
  SERVICE_REGISTRY,
  getPublicServices,
  getServiceByKey
};
