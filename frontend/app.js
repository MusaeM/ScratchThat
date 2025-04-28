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

    buttonText.textContent = 'Skickar...';
    spinner.style.display = 'inline-block';

    const fname = document.getElementById('fname').value;
    const sname = document.getElementById('sname').value;
    const pnr = document.getElementById('pnr').value;
    const email = document.getElementById('email').value;
    const companies = Array.from(document.querySelectorAll('input[name="companies"]:checked')).map(el => el.value);

    const data = { fname, sname, pnr, email, companies };

    try {
        const response = await fetch('https://scratch-that-f9adnh625-musaems-projects.vercel.app/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

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
