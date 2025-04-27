const form = document.getElementById('gdprForm');
const loading = document.getElementById('loading');
const thankYou = document.getElementById('thankYou');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.style.display = 'none';
    loading.style.display = 'block';

    const name = document.getElementById('name').value;
    const pnr = document.getElementById('pnr').value;
    const email = document.getElementById('email').value;
    const companies = Array.from(document.querySelectorAll('input[name="companies"]:checked')).map(el => el.value);

    const data = { name, pnr, email, companies };

    try {
        const response = await fetch('https://scratch-that-5rj639992-musaems-projects.vercel.app/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        loading.style.display = 'none';
        thankYou.style.display = 'block';
        form.reset();
    } catch (error) {
        console.error('Error:', error);
        loading.innerText = 'Något gick fel, försök igen. ❌';
    }
});

