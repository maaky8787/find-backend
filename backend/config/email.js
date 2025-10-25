import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // ترو فقط لبورت 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // مهم في بعض بيئات الاستضافة
  },
  // إعدادات إضافية لتحسين الاتصال
  connectionTimeout: 10000, // 10 ثواني
  greetingTimeout: 5000,  // 5 ثواني
  socketTimeout: 10000    // 10 ثواني
});

// التحقق من تكوين البريد
export async function checkEmailConfig() {
  try {
    await transporter.verify();
    console.log('✅ تم تكوين خدمة البريد بنجاح');
    return true;
  } catch (error) {
    console.error('❌ خطأ في تكوين خدمة البريد:', error);
    return false;
  }
}

// دالة إرسال البريد
export async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    console.log('✅ تم إرسال البريد بنجاح:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ خطأ في إرسال البريد:', error);
    return false;
  }
}