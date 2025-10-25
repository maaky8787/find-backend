import { transporter } from './config/email.js';

async function testEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // إرسال إلى نفس البريد للاختبار
      subject: "اختبار الإيميل",
      text: "هذا اختبار للتأكد من عمل خدمة البريد",
      html: "<p>هذا اختبار للتأكد من عمل خدمة البريد</p>"
    });

    console.log("تم إرسال البريد بنجاح:", info.messageId);
  } catch (error) {
    console.error("خطأ في إرسال البريد:", error);
  }
}

testEmail();