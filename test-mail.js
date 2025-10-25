import dotenv from 'dotenv';
dotenv.config();

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '****' : 'NOT SET');

import nodemailer from 'nodemailer';
// إذا كنت تريد استخدام إعدادات البريد من backend/mailer.js:
// import transporter from './backend/mailer.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: 'mohamedmaaax01@gmail.com', // ضع هنا بريدك الحقيقي
  subject: 'Test Email',
  text: 'This is a test'
}, (err, info) => {
  if (err) {
    console.log('Error:', err);
  } else {
    console.log('Email sent:', info.response);
  }
}); 