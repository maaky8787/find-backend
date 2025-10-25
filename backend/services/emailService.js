import { transporter } from '../config/email.js';

export async function sendMatchNotificationToLostUser(lostData, foundData) {
  if (!lostData?.email) return;

  const subject = 'تم العثور على سيارتك - تطابق جديد في FindMyCar!';
  const html = `
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
      <h2 style="color: #27ae60; text-align: center; font-size: 28px; margin-bottom: 25px;">
        🎉 مبروك! تم العثور على تطابق
      </h2>
      <p style="font-size: 18px; color: #333; margin-bottom: 25px;">
        تم العثور على <strong>إعلان</strong> يطابق <strong>بلاغك</strong> المُسجل على <span style="color: #007bff;">FindMyCar</span>.
      </p>
      <div style="font-size: 17px; color: #444; margin-bottom: 25px; background-color: #f9f9f9; padding: 20px; border-radius: 8px; line-height: 1.8;">
        <p><strong>🚗 اسم السيارة:</strong> ${foundData.car_name}</p>
        <p><strong>🔢 رقم اللوحة:</strong> ${foundData.plate_number}</p>
        <p><strong>🔧 رقم الشاسيه:</strong> ${foundData.chassis_number}</p>
        <p><strong>📞 رقم هاتف صاحب الإعلان:</strong> ${foundData.phone_main}</p>
        ${foundData.phone_secondary && foundData.phone_secondary !== '0'
          ? `<p><strong>📱 رقم إضافي:</strong> ${foundData.phone_secondary}</p>`
          : ''}
        <p><strong>📍 الموقع:</strong> ${foundData.location}</p>
      </div>
      <div style="font-size: 16px; color: #a04000; background-color: #fff6e5; padding: 20px; border: 1px solid #f5cba7; border-radius: 10px; margin-bottom: 30px;">
        ⚠️ <strong>تنبيه مهم:</strong><br>
        يرجى توخي الحذر عند التواصل. لا تقم بدفع أي مبالغ مالية أو تسليم مستندات إلا بعد التأكد.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: 'FindMyCar <findmycar10@gmail.com>',
    to: lostData.email,
    subject,
    html
  });
}

export async function sendMatchNotificationToFoundUser(foundData, lostData) {
  if (!foundData?.email) return;

  const subject = 'تم العثور على تطابق لإعلانك في FindMyCar!';
  const html = `
    <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
      <h2 style="color: #27ae60; text-align: center; font-size: 26px; margin-bottom: 25px;">
        🎉 تم العثور على تطابق!
      </h2>
      <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
        تم إيجاد بلاغ يطابق إعلانك على <strong style="color: #007bff;">FindMyCar</strong>.
      </p>
      <div style="font-size: 17px; color: #444; margin-bottom: 20px; line-height: 1.8;">
        <p><strong>🚗 اسم السيارة:</strong> ${lostData.car_name}</p>
        <p><strong>🔢 رقم اللوحة:</strong> ${lostData.plate_number}</p>
        <p><strong>🔧 رقم الشاسيه:</strong> ${lostData.chassis_number}</p>
        <p><strong>📞 رقم هاتف المبلغ:</strong> ${lostData.phone_main}</p>
        ${lostData.phone_secondary && lostData.phone_secondary !== '0'
          ? `<p><strong>📱 رقم إضافي:</strong> ${lostData.phone_secondary}</p>`
          : ''}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: 'FindMyCar <findmycar10@gmail.com>',
    to: foundData.email,
    subject,
    html
  });
}

export async function sendConfirmationEmail(type, data) {
  const subject = type === 'lost' 
    ? 'تم استلام بلاغك في FindMyCar'
    : 'تم نشر إعلانك بنجاح على FindMyCar';

  const html = `
    <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
      <h2 style="color: #2c3e50; text-align: center; font-size: 26px; margin-bottom: 30px;">
        ${type === 'lost' ? 'تم استلام بلاغك بنجاح' : 'تم نشر إعلانك بنجاح!'}
      </h2>
      <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
        شكرًا لاستخدامك <strong style="color: #007bff;">FindMyCar</strong>
      </p>
      <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
        🚗 <strong>اسم السيارة:</strong> <span style="color: #000;">${data.car_name}</span><br>
        📞 <strong>رقم التواصل:</strong> <span style="color: #000;">${data.phone_main}</span>
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: 'FindMyCar <findmycar10@gmail.com>',
    to: data.email,
    subject,
    html
  });
}