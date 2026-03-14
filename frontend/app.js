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

let isVerified = false;

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
    });
}

function applyPlanSelection(plan, price) {
    if (!selectedPlanInput || !selectedPlanLabel || !selectedPlanPrice) {
        return;
    }

    selectedPlanInput.value = plan;
    selectedPlanLabel.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    selectedPlanPrice.textContent = `${price} kr`;

    planButtons.forEach((button) => {
        const isSelected = button.dataset.plan === plan;
        button.classList.toggle('is-selected', isSelected);
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

        const fname = document.getElementById('fname');
        const sname = document.getElementById('sname');
        const pnr = document.getElementById('pnr');
        const email = document.getElementById('email');
        const companies = Array.from(document.querySelectorAll('input[name="companies"]:checked')).map((el) => el.value);

        let hasError = false;

        [fname, sname, pnr, email].forEach((input) => {
            input.style.borderColor = 'rgba(59, 43, 21, 0.12)';
        });

        const nameRegex = /^[\p{L}-]+$/u;
        if (!nameRegex.test(fname.value.trim())) {
            fname.style.borderColor = '#c23f1f';
            hasError = true;
        }
        if (!nameRegex.test(sname.value.trim())) {
            sname.style.borderColor = '#c23f1f';
            hasError = true;
        }

        const pnrRegex = /^(\d{6}|\d{8})[-]?\d{4}$/;
        if (!pnrRegex.test(pnr.value.trim())) {
            pnr.style.borderColor = '#c23f1f';
            hasError = true;
        }

        const emailRegex = /^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/;
        if (!emailRegex.test(email.value.trim())) {
            email.style.borderColor = '#c23f1f';
            hasError = true;
        }

        if (companies.length === 0) {
            window.alert('Välj minst en sajt.');
            return;
        }

        if (hasError) {
            window.alert('Ratta de markerade falten.');
            return;
        }

        if (buttonText) {
            buttonText.textContent = 'Skickar...';
        }
        if (spinner) {
            spinner.style.display = 'inline-block';
        }
        if (loading) {
            loading.style.display = 'block';
        }

        const data = {
            fname: fname.value.trim(),
            sname: sname.value.trim(),
            pnr: pnr.value.trim(),
            email: email.value.trim(),
            companies,
            plan: selectedPlanInput ? selectedPlanInput.value : 'bas'
        };

        try {
            const response = await fetch('https://scratch-that-theta.vercel.app/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            await response.json();

            const fullName = `${fname.value.trim()} ${sname.value.trim()}`;
            const emailText = `Hej,

Jag, ${fullName}, personnummer ${pnr.value.trim()}, begär härmed i enlighet med Artikel 17 i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.

Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt Artikel 12.3 GDPR, inom en månad.

Ärendet skickades via Scratch That-planen: ${selectedPlanInput ? selectedPlanInput.value : 'bas'}
Återkoppla till: ${email.value.trim()}

Vänliga hälsningar,
${fullName}`;

            const emailPreview = document.getElementById('emailPreview');
            if (emailPreview) {
                emailPreview.textContent = emailText;
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
