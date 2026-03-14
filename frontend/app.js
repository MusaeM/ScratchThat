const API_BASE = 'https://scratch-that-theta.vercel.app';

const selectAll = document.getElementById('selectAll');
const checkboxes = document.querySelectorAll('input[name="companies"]');
const form = document.getElementById('gdprForm');
const bankidButton = document.getElementById('bankidButton');
const submitButton = document.getElementById('submitButton');
const buttonText = document.getElementById('buttonText');
const spinner = document.getElementById('spinner');
const loading = document.getElementById('loading');
const thankYou = document.getElementById('thankYou');
const bankidModal = document.getElementById('bankidModal');
const modalText = document.getElementById('modalText');
const verifyMessage = document.getElementById('verifiedMessage');
const selectedPlanInput = document.getElementById('selectedPlan');
const selectedPlanLabel = document.getElementById('selectedPlanLabel');
const selectedPlanPrice = document.getElementById('selectedPlanPrice');
const planButtons = document.querySelectorAll('.plan-option');
const faqButtons = document.querySelectorAll('.faq-question');
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
const extraFieldsPanel = document.getElementById('extraFieldsPanel');
const extraFields = document.getElementById('extraFields');
const workflowOverview = document.getElementById('workflowOverview');
const workflowSummary = document.getElementById('workflowSummary');
const resultSummary = document.getElementById('resultSummary');
const emailPreview = document.getElementById('emailPreview');

let isVerified = false;
let servicesByKey = {};
let previewTimer = null;

const extraFieldDefinitions = {
    phone: {
        label: 'Telefonnummer',
        placeholder: '070-123 45 67',
        type: 'text'
    }
};

if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
        const isOpen = siteNav.classList.toggle('is-open');
        navToggle.setAttribute('aria-expanded', String(isOpen));
    });
}

if (faqButtons.length > 0) {
    faqButtons.forEach((button) => {
        button.addEventListener('click', () => {
            button.parentElement.classList.toggle('is-open');
        });
    });
}

if (selectAll && checkboxes.length > 0) {
    selectAll.addEventListener('change', function () {
        checkboxes.forEach((checkbox) => {
            checkbox.checked = this.checked;
        });
        scheduleWorkflowPreview();
    });
}

checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', scheduleWorkflowPreview);
});

['fname', 'sname', 'pnr', 'email'].forEach((id) => {
    const field = document.getElementById(id);
    if (field) {
        field.addEventListener('input', scheduleWorkflowPreview);
    }
});

function applyPlanSelection(plan, price) {
    if (!selectedPlanInput || !selectedPlanLabel || !selectedPlanPrice) {
        return;
    }

    selectedPlanInput.value = plan;
    selectedPlanLabel.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    selectedPlanPrice.textContent = String(price).includes('kr') ? price : `${price} kr`;

    planButtons.forEach((button) => {
        button.classList.toggle('is-selected', button.dataset.plan === plan);
    });
}

if (planButtons.length > 0) {
    planButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyPlanSelection(button.dataset.plan, button.dataset.price);
        });
    });

    const params = new URLSearchParams(window.location.search);
    const requestedPlan = params.get('plan');
    const matchedPlan = Array.from(planButtons).find((button) => button.dataset.plan === requestedPlan);

    if (matchedPlan) {
        applyPlanSelection(matchedPlan.dataset.plan, matchedPlan.dataset.price);
    }
}

if (submitButton) {
    submitButton.disabled = true;
}

function getSelectedCompanies() {
    return Array.from(document.querySelectorAll('input[name="companies"]:checked')).map((el) => el.value);
}

function getProfile() {
    const getValue = (id) => {
        const node = document.getElementById(id);
        return node ? node.value.trim() : '';
    };

    const profile = {
        fname: getValue('fname'),
        sname: getValue('sname'),
        pnr: getValue('pnr'),
        email: getValue('email'),
        phone: getValue('phone'),
        plan: selectedPlanInput ? selectedPlanInput.value : 'bas'
    };

    return profile;
}

function renderExtraFields(requiredFields) {
    if (!extraFieldsPanel || !extraFields) {
        return;
    }

    if (!requiredFields || requiredFields.length === 0) {
        extraFieldsPanel.style.display = 'none';
        extraFields.innerHTML = '';
        return;
    }

    const currentProfile = getProfile();
    extraFieldsPanel.style.display = 'block';
    extraFields.innerHTML = requiredFields.map((field) => {
        const definition = extraFieldDefinitions[field] || {
            label: field,
            placeholder: '',
            type: 'text'
        };

        return `
            <label>
                <span>${definition.label}</span>
                <input
                    type="${definition.type}"
                    id="${field}"
                    placeholder="${definition.placeholder}"
                    value="${currentProfile[field] || ''}"
                >
            </label>
        `;
    }).join('');

    requiredFields.forEach((field) => {
        const input = document.getElementById(field);
        if (input) {
            input.addEventListener('input', scheduleWorkflowPreview);
        }
    });
}

function buildSummaryCards(items, type) {
    if (!items || items.length === 0) {
        return '';
    }

    return items.map((item) => {
        const extra = item.externalUrl
            ? `<a href="${item.externalUrl}" class="text-link" target="_blank" rel="noreferrer">Öppna flöde</a>`
            : '';
        const missing = item.missingFields && item.missingFields.length > 0
            ? `<p>Saknar: ${item.missingFields.join(', ')}</p>`
            : '';
        const description = item.description ? `<p>${item.description}</p>` : '';

        return `
            <article class="summary-item summary-item-${type}">
                <h4>${item.label}</h4>
                ${missing}
                ${description}
                ${extra}
            </article>
        `;
    }).join('');
}

function renderWorkflowPreview(plan) {
    if (!workflowOverview || !workflowSummary) {
        return;
    }

    const selectedCompanies = getSelectedCompanies();
    if (selectedCompanies.length === 0) {
        workflowOverview.style.display = 'none';
        workflowSummary.innerHTML = '';
        renderExtraFields([]);
        return;
    }

    renderExtraFields(plan.requiredFields || []);
    workflowOverview.style.display = 'block';

    const automatable = plan.services.filter((item) => item.status === 'automatable');
    const needsInput = plan.services.filter((item) => item.status === 'needs_input');
    const userAction = plan.services.filter((item) => item.status === 'user_action');
    const limited = plan.services.filter((item) => item.status === 'limited');

    workflowSummary.innerHTML = `
        <div class="summary-block">
            <p class="eyebrow">Automatiseras direkt</p>
            ${automatable.length > 0 ? buildSummaryCards(automatable, 'auto') : '<p class="muted-copy">Inga av de valda tjänsterna kan köras helautomatiskt ännu.</p>'}
        </div>
        <div class="summary-block">
            <p class="eyebrow">Behöver mer från användaren</p>
            ${needsInput.length > 0 ? buildSummaryCards(needsInput, 'input') : '<p class="muted-copy">Inga extra uppgifter behövs för de val du gjort just nu.</p>'}
        </div>
        <div class="summary-block">
            <p class="eyebrow">Egen självservice</p>
            ${userAction.length > 0 ? buildSummaryCards(userAction, 'action') : '<p class="muted-copy">Inga självserviceflöden bland de valda sajterna.</p>'}
        </div>
        <div class="summary-block">
            <p class="eyebrow">Begränsad automation</p>
            ${limited.length > 0 ? buildSummaryCards(limited, 'limited') : '<p class="muted-copy">Ingen av de valda sajterna ligger i den här kategorin just nu.</p>'}
        </div>
    `;
}

async function fetchServices() {
    if (!form) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/services`);
        const payload = await response.json();
        servicesByKey = Object.fromEntries((payload.services || []).map((service) => [service.key, service]));
        scheduleWorkflowPreview();
    } catch (error) {
        console.error('Failed to load services:', error);
    }
}

async function updateWorkflowPreview() {
    if (!form) {
        return;
    }

    const companies = getSelectedCompanies();
    if (companies.length === 0) {
        renderWorkflowPreview({ services: [], requiredFields: [] });
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/workflow-plan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...getProfile(),
                companies
            })
        });

        const plan = await response.json();
        renderWorkflowPreview(plan);
    } catch (error) {
        console.error('Failed to build workflow preview:', error);
    }
}

function scheduleWorkflowPreview() {
    if (previewTimer) {
        window.clearTimeout(previewTimer);
    }
    previewTimer = window.setTimeout(updateWorkflowPreview, 180);
}

if (bankidButton && bankidModal && modalText && verifyMessage && submitButton) {
    bankidButton.addEventListener('click', () => {
        bankidModal.style.display = 'block';
        modalText.textContent = 'Verifierar BankID-placeholder...';

        const progressBar = document.getElementById('progressBar');
        if (progressBar) {
            progressBar.style.width = '0%';
            progressBar.style.animation = 'loadProgress 4s linear forwards';
        }

        window.setTimeout(() => {
            isVerified = true;
            modalText.textContent = 'Verifiering lyckades';

            window.setTimeout(() => {
                bankidModal.style.display = 'none';
                bankidButton.style.display = 'none';
                verifyMessage.style.display = 'block';
                submitButton.disabled = false;
            }, 1200);
        }, 4000);
    });
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isVerified) {
            window.alert('Du måste verifiera dig med BankID-placeholder innan du kan skicka.');
            return;
        }

        const profile = getProfile();
        const companies = getSelectedCompanies();
        const fname = document.getElementById('fname');
        const sname = document.getElementById('sname');
        const pnr = document.getElementById('pnr');
        const email = document.getElementById('email');

        let hasError = false;

        [fname, sname, pnr, email].forEach((input) => {
            input.style.borderColor = 'rgba(59, 43, 21, 0.12)';
        });

        if (profile.phone) {
            const phoneInput = document.getElementById('phone');
            if (phoneInput) {
                phoneInput.style.borderColor = 'rgba(59, 43, 21, 0.12)';
            }
        }

        const nameRegex = /^[\p{L}-]+$/u;
        const pnrRegex = /^(\d{6}|\d{8})[-]?\d{4}$/;
        const emailRegex = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/;

        if (!nameRegex.test(profile.fname)) {
            fname.style.borderColor = '#c23f1f';
            hasError = true;
        }
        if (!nameRegex.test(profile.sname)) {
            sname.style.borderColor = '#c23f1f';
            hasError = true;
        }
        if (!pnrRegex.test(profile.pnr)) {
            pnr.style.borderColor = '#c23f1f';
            hasError = true;
        }
        if (!emailRegex.test(profile.email)) {
            email.style.borderColor = '#c23f1f';
            hasError = true;
        }

        if (companies.length === 0) {
            window.alert('Välj minst en sajt.');
            return;
        }

        if (hasError) {
            window.alert('Rätta de markerade fälten.');
            return;
        }

        if (buttonText) {
            buttonText.textContent = 'Bearbetar...';
        }
        if (spinner) {
            spinner.style.display = 'inline-block';
        }
        if (loading) {
            loading.style.display = 'block';
            loading.textContent = 'Bygger din automationsplan...';
        }

        try {
            const response = await fetch(`${API_BASE}/execute-workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...profile,
                    companies
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Workflow execution failed');
            }

            const workflow = result.workflow;

            if (resultSummary) {
                resultSummary.innerHTML = `
                    <div class="summary-block">
                        <p class="eyebrow">Automatiserat nu</p>
                        ${workflow.automated.length > 0 ? buildSummaryCards(workflow.automated, 'auto') : '<p class="muted-copy">Inga sajter kunde skickas helautomatiskt i den här rundan.</p>'}
                    </div>
                    <div class="summary-block">
                        <p class="eyebrow">Du behöver göra själv</p>
                        ${workflow.userAction.length > 0 ? buildSummaryCards(workflow.userAction, 'action') : '<p class="muted-copy">Inga självserviceflöden återstår i den här rundan.</p>'}
                    </div>
                    <div class="summary-block">
                        <p class="eyebrow">Behöver mer data</p>
                        ${workflow.needsInput.length > 0 ? buildSummaryCards(workflow.needsInput, 'input') : '<p class="muted-copy">Inga fler kompletteringar krävs just nu.</p>'}
                    </div>
                    <div class="summary-block">
                        <p class="eyebrow">Begränsad automation</p>
                        ${workflow.limited.length > 0 ? buildSummaryCards(workflow.limited, 'limited') : '<p class="muted-copy">Ingen vald tjänst föll i den här kategorin.</p>'}
                    </div>
                `;
            }

            if (emailPreview) {
                if (workflow.previewText) {
                    emailPreview.textContent = workflow.previewText;
                    emailPreview.style.display = 'block';
                } else {
                    emailPreview.style.display = 'none';
                }
            }

            if (spinner) {
                spinner.style.display = 'none';
            }
            if (buttonText) {
                buttonText.textContent = 'Skicka GDPR-begäran';
            }
            if (loading) {
                loading.style.display = 'none';
            }

            form.style.display = 'none';
            if (thankYou) {
                thankYou.style.display = 'block';
            }
            isVerified = false;
        } catch (error) {
            console.error('Error:', error);
            if (spinner) {
                spinner.style.display = 'none';
            }
            if (buttonText) {
                buttonText.textContent = 'Skicka GDPR-begäran';
            }
            if (loading) {
                loading.textContent = 'Något gick fel, försök igen.';
                loading.style.display = 'block';
            }
        }
    });
}

fetchServices();
