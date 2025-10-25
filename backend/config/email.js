import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    accessToken: process.env.GMAIL_ACCESS_TOKEN
  },
  pool: true, // استخدام connection pool
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000, // وقت الانتظار بين الرسائل
  rateLimit: 5 // عدد الرسائل في الثانية
});

// التحقق من تكوين البريد
export async function checkEmailConfig() {
  // التحقق من وجود المتغيرات المطلوبة
  const requiredVars = [
    'EMAIL_USER',
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ متغيرات البيئة المفقودة:', missingVars.join(', '));
    return false;
  }

  try {
    // محاولة إرسال رسالة اختبار
    await transporter.verify();
    console.log('✅ تم تكوين خدمة البريد بنجاح');
    
    // محاولة إرسال بريد اختباري
    const testResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'اختبار الاتصال',
      text: 'هذا اختبار للتحقق من عمل خدمة البريد'
    });
    
    console.log('✅ تم إرسال بريد الاختبار بنجاح:', testResult.messageId);
    return true;
  } catch (error) {
    console.error('❌ خطأ في تكوين خدمة البريد:', {
      code: error.code,
      command: error.command,
      info: error.response,
      message: error.message
    });
    return false;
  }
}