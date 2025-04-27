const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('ScratchThat Backend running  🚀');
});

app.post('/send-email', async (req, res) => {
  try {
    const { name, pnr, email, companies } = req.body;

	let transporter = nodemailer.createTransport({
  host: 'smtp.zoho.eu',
  port: 465, // Använd 465 för SSL eller 587 för TLS
  secure: true, // true för port 465, annars false
  auth: {
    user: process.env.SMTP_USER, // ex. no-reply@scratchthat.se
    pass: process.env.SMTP_PASS, // ditt lösenord
  },
});

    const targets = {
	/*180: 'support@180.se',
  	birthday: 'info@birthday.se',
	eniro: 'dataskydd@eniro.com',
  	hitta: 'personuppgifter@hitta.se',
  	merinfo: 'info@merinfo.se',
  	mrkoll: 'info@mrkoll.se',
	ratsit: 'kundservice@ratsit.se',
	upplysning: 'support@upplysning.se'*/
mrkoll: 'ceweriyezdan@gmail.com',
birthday: 'ceweriyezdan@gmail.com'
      // Lägg till fler sajter här
    };

for (const company of companies) {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: targets[company],
    subject: 'Begäran om radering av personuppgifter enligt GDPR (Artikel 17)',
    text: `Hej,

Jag, ${name}, personnummer ${pnr}, begär härmed i enlighet med Artikel 17 i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.

Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt Artikel 12.3 GDPR, inom en månad.

Återkoppla till: ${email}

Vänliga hälsningar,
${name}`,
    html: `
    <p>Hej,</p>
    <p>Jag, <strong>${name}</strong>, personnummer <strong>${pnr}</strong>, begär härmed i enlighet med <strong>Artikel 17</strong> i Dataskyddsförordningen (GDPR) att alla personuppgifter som rör mig raderas från era system, register och eventuella samarbetspartners.</p>
    <p>Jag önskar få bekräftelse på radering samt information om behandlade uppgifter, enligt <strong>Artikel 12.3 GDPR</strong>, inom en månad.</p>
    <p>För eventuell återkoppling kan ni nå mig på: <a href="mailto:${email}">${email}</a></p>
    <p>Vänliga hälsningar,<br>${name}</p>
    `
  };

  await transporter.sendMail(mailOptions);
}



    res.status(200).json({ message: 'Mails sent successfully' });
  } catch (error) {
    console.error('ERROR:', error.response || error.message || error);
    res.status(500).json({ message: 'Something went wrong', error: error.message });
}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
