// "Välj alla" funktion
const selectAll = document.getElementById('selectAll');
const checkboxes = document.querySelectorAll('input[name="companies"]');

selectAll.addEventListener('change', function () {
    checkboxes.forEach(checkbox => {
        checkbox.checked = this.checked;
    });
});

// Form och element
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

let isVerified = false;

// Från start - göm submitButton
submitButton.style.display = 'none';

// BankID verifiering
bankidButton.addEventListener('click', () => {
    bankidModal.style.display = 'block';
    modalText.textContent = 'Verifierar BankID...';

    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = '0%';
    progressBar.style.animation = 'loadProgress 4s linear forwards';

    setTimeout(() => {
        isVerified = true;
        modalText.textContent = 'Verifiering lyckades ✅';

        setTimeout(() => {
            bankidModal.style.display = 'none';
            bankidButton.style.display = 'none';
            verifyMessage.style.display = 'block';
            submitButton.style.display = 'inline-block';
            submitButton.disabled = false;
        }, 1500);
    }, 4000);
});

// Formulärsubmit
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isVerified) {
        alert('Du måste verifiera dig med BankID innan du kan skicka.');
        return;
    }

    const fname = document.getElementById('fname');
    const sname = document.getElementById('sname');
    const pnr = document.getElementById('pnr');
    const email = document.getElementById('email');
    const companies = Array.from(document.querySelectorAll('input[name="companies"]:checked')).map(el => el.value);

    let hasError = false;

    // Rensa gamla felmarkeringar
    [fname, sname, pnr, email].forEach(input => {
        input.style.borderColor = '#ccc';
    });

    // ✅ Validering:

    const nameRegex = /^[A-Za-zÅÄÖåäö-]+$/;
    if (!nameRegex.test(fname.value.trim())) {
        fname.style.borderColor = 'red';
        hasError = true;
    }
    if (!nameRegex.test(sname.value.trim())) {
        sname.style.borderColor = 'red';
        hasError = true;
    }

    const pnrRegex = /^(\d{6}|\d{8})[-]?\d{4}$/;
    if (!pnrRegex.test(pnr.value.trim())) {
        pnr.style.borderColor = 'red';
        hasError = true;
    }

    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email.value.trim())) {
        email.style.borderColor = 'red';
        hasError = true;
    }
	
	// Måste välja minst en checkbox
	if (companies.length === 0) {
		alert('Välj minst en sajt.');
		return;
	}

    if (hasError) {
        alert('Vänligen rätta de markerade fälten.');
        return;
    }

    // Om ingen error, fortsätt skicka
    buttonText.textContent = 'Skickar...';
    spinner.style.display = 'inline-block';

    const data = {
        fname: fname.value.trim(),
        sname: sname.value.trim(),
        pnr: pnr.value.trim(),
        email: email.value.trim(),
        companies
    };

    try {
        const response = await fetch('https://scratch-that-theta.vercel.app/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        
const fullName = `${fname.value.trim()} ${sname.value.trim()}`;
const emailText = `Hej,

Jag, ${fullName}, personnummer ${pnr.value.trim()}, begär härmed i enlighet med Artikel 17 i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.

Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt Artikel 12.3 GDPR, inom en månad.

Återkoppla till: ${email.value.trim()}

Vänliga hälsningar,
${fullName}`;

document.getElementById('emailPreview').textContent = emailText;

        spinner.style.display = 'none';
        buttonText.textContent = 'Skicka GDPR Begäran';
        loading.style.display = 'none';
        form.style.display = 'none';
        thankYou.style.display = 'block';
        isVerified = false;
    } catch (error) {
        console.error('Error:', error);
        spinner.style.display = 'none';
        buttonText.textContent = 'Skicka GDPR Begäran';
        loading.innerText = 'Något gick fel, försök igen. ❌';
    }
});

// Intro-popup visas endast en gång per användare
window.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('introPopup');
    const closeBtn = document.getElementById('closePopup');

    if (!localStorage.getItem('introSeen')) {
        popup.style.display = 'flex';
    }

    closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        localStorage.setItem('introSeen', 'true');
    });
});
