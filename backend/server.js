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
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const targets = {
      mrkoll: 'ceweriyezdan@gmail.com',
      birthday: 'ceweriyezdan@gmail.com',
      // Lägg till fler sajter här
    };

    for (const company of companies) {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: targets[company],
        subject: 'Begäran om radering av personuppgifter enligt GDPR',
        text: `Hej,

Jag, ${name}, personnummer ${pnr}, begär härmed att mina personuppgifter raderas från er tjänst enligt min rätt enligt GDPR (artikel 17).

Kontakt: ${email}

Tack på förhand,
${name}`
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ message: 'Mails sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
