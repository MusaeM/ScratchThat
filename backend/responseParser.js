function classifyResponse({ serviceKey, subject = '', text = '' }) {
  const haystack = `${subject}\n${text}`.toLowerCase();

  if (/vilket tlf|vilket telefon|telefonnummer|vilket nr|which phone/.test(haystack)) {
    return {
      status: 'needs_input',
      reason: 'Svarstexten efterfrågar kompletterande uppgifter, troligen telefonnummer eller liknande.'
    };
  }

  if (/bankidlogin|minauppgifter|tabort|ta bort dina uppgifter|egen länk|själv.*logga in/.test(haystack)) {
    return {
      status: 'user_action',
      reason: 'Svarstexten hänvisar till ett eget självserviceflöde.'
    };
  }

  if (/utgivningsbevis|yttrandefrihetsgrundlagen|ygl|tryckfrihetsförordningen|tf|grundlagsskydd|inte skyldiga att radera|gdpr inte är tillämplig/.test(haystack)) {
    return {
      status: 'limited',
      reason: 'Svarstexten hänvisar till utgivningsbevis eller grundlagsskydd.'
    };
  }

  if (/har skickats|kommer att tas bort|borttagen|raderad|vi ska hjälpa dig|detta ska vi hjälpa dig med/.test(haystack)) {
    return {
      status: 'in_progress',
      reason: 'Svarstexten antyder positiv hantering eller att ärendet bearbetas.'
    };
  }

  if (/avslås|kan inte hjälpa|kan inte radera|inte möjligt|ingen möjlighet/.test(haystack)) {
    return {
      status: 'denied',
      reason: 'Svarstexten är ett direkt avslag.'
    };
  }

  return {
    status: 'unknown',
    reason: `Kunde inte klassificera svaret automatiskt för ${serviceKey}.`
  };
}

module.exports = {
  classifyResponse
};
