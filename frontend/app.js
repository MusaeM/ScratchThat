document.getElementById('gdpr-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const pnr = document.getElementById('pnr').value;
  const email = document.getElementById('email').value;

  const companies = Array.from(document.querySelectorAll('input[name="companies"]:checked'))
                          .map(cb => cb.value);

  const response = await fetch('https://din-backend-url.vercel.app/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pnr, email, companies })
  });

  const data = await response.json();
  alert(data.message);
});
