import app from './config/app.js';
import { checkSupabaseConnection } from './config/supabase.js';
import { checkEmailConfig } from './config/email.js';
import { startCronJobs } from './cron.js';

// استيراد النقاط النهائية
import matchesRoutes from './routes/matches.js';
import lostRoutes from './routes/lost.js';
import foundRoutes from './routes/found.js';


// التحقق من الاتصالات
await checkSupabaseConnection();
await checkEmailConfig();

// تسجيل النقاط النهائية
app.use('/matches', matchesRoutes);
app.use('/add-lost', lostRoutes);
app.use('/add-existing', foundRoutes);



// endpoint لجلب التطابقات من matches_history
app.get('/get-matches', async (req, res) => {
  try {
    console.log('جاري جلب التطابقات من matches_history...');

    const { data, error } = await supabase
      .from('matches_history')
      .select(`id, match_id, match_type, created_at,
        lost_car_name, lost_plate_number, lost_chassis_number,
        found_car_name, found_plate_number, found_chassis_number
      `)
      .order('id', { ascending: false });

    if (error) {
      console.error('خطأ في جلب التطابقات:', error);
      return res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
    }

    console.log('تم جلب', data?.length || 0, 'تطابق بنجاح');
    res.json({ matches: data || [] });

  } catch (err) {
    console.error('خطأ في endpoint جلب التطابقات:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});


// endpoint لإضافة التطابق إلى الأرشيف فقط
app.post('/add-match', async (req, res) => {
  const { lost_id, found_id, match_type } = req.body;

  // جلب بيانات البلاغ (lost)
  const { data: lostData } = await supabase.from('losts').select('email, car_name, plate_number, phone_main, phone_secondary, show_phone_public, chassis_number, img_url, location').eq('id', lost_id).single();
  // جلب بيانات الإعلان (found)
  const { data: foundData } = await supabase.from('founds').select('email, car_name, plate_number, phone_main, chassis_number, img_url, location').eq('id', found_id).single();

  // 1. إضافة التطابق إلى جدول matches
  const matchData = {
    lost_id,
    found_id,
    match_type,
    created_at: new Date().toISOString()
  };
  const { data: matchInsert, error: matchInsertErr } = await supabase.from('matches').insert([matchData]).select();
  if (matchInsertErr) {
    console.log('خطأ في إضافة التطابق إلى matches:', matchInsertErr);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
  const match_id = matchInsert[0]?.id;

  // 2. إضافة نسخة إلى matches_history
  const archiveData = {
    match_id,
    lost_car_name: lostData?.car_name || null,
    lost_plate_number: lostData?.plate_number || null,
    lost_chassis_number: lostData?.chassis_number || null,
    found_car_name: foundData?.car_name || null,
    found_plate_number: foundData?.plate_number || null,
    found_chassis_number: foundData?.chassis_number || null,
    match_type,
    created_at: new Date().toISOString()
  };
  const { data: archiveResult, error: copyErr } = await supabase.from('matches_history').insert([archiveData]).select();
  if (copyErr) {
    console.log('خطأ في إضافة التطابق إلى الأرشيف:', copyErr);
    return res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }

  // 3. إرسال إشعار بالبريد للطرفين
  if (lostData && lostData.email) {
    const subject = 'تم العثور على سيارتك - تطابق جديد في FindMyCar!';

    const html = `
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
    
        <h2 style="color: #27ae60; text-align: center; font-size: 28px; margin-bottom: 25px;">
          🎉 مبروك! تم العثور على تطابق
        </h2>
    
        <p style="font-size: 18px; color: #333; margin-bottom: 25px;">
          تم العثور على <strong>إعلان</strong> يطابق <strong>بلاغك</strong> المُسجل على <span style="color: #007bff;">FindMyCar</span>. نأمل أن يكون هذا الإعلان متعلق بسيارتك فعلاً، ونشجعك على التواصل مع المعلن بعد اتخاذ الحذر اللازم.
        </p>
    
        <div style="font-size: 17px; color: #444; margin-bottom: 25px; background-color: #f9f9f9; padding: 20px; border-radius: 8px; line-height: 1.8;">
          <p><strong>🚗 اسم السيارة:</strong> ${foundData.car_name}</p>
          <p><strong>🔢 رقم اللوحة:</strong> ${foundData.plate_number}</p>
          <p><strong>🔧 رقم الشاسيه:</strong> ${foundData.chassis_number}</p>
          <p><strong>📞 رقم هاتف صاحب الإعلان:</strong> ${foundData.phone_main}</p>
          ${
            foundData.phone_secondary && foundData.phone_secondary !== '0'
              ? `<p><strong>📱 رقم إضافي:</strong> ${foundData.phone_secondary}</p>`
              : ''
          }
          <p><strong>📍 الموقع الذي حدده المعلن:</strong> ${foundData.location}</p>
        </div>
    
        <div style="font-size: 16px; color: #a04000; background-color: #fff6e5; padding: 20px; border: 1px solid #f5cba7; border-radius: 10px; margin-bottom: 30px;">
          ⚠️ <strong>تنبيه مهم:</strong><br>
          يرجى توخي الحذر قبل التواصل أو الالتقاء بالمعلن. لا تقم بدفع أي مبالغ مالية أو تسليم مستندات إلا بعد التأكد التام من صحة الإعلان وهوية الشخص.
          <br>ننصحك باللقاء في أماكن عامة وآمنة، واصطحاب شخص معك إن أمكن.
        </div>
    
        <p style="font-size: 17px; color: #555; margin-bottom: 30px;">
          تم حفظ هذا التطابق في <strong>أرشيف التطابقات</strong> الخاص بك، ويمكنك الرجوع إليه في أي وقت من خلال لوحة التحكم في حسابك.
        </p>
    
        <p style="font-size: 18px; color: #333; font-weight: bold; text-align: center;">
          نتمنى أن تكون هذه الخطوة بداية لاستعادة سيارتك 💙<br>
          <span style="color: #007bff;">فريق FindMyCar</span>
        </p>
      </div>
    `;
    
    await transporter.sendMail({
      from: 'FindMyCar <findmycar10@gmail.com>',
      to: lostData.email,
      subject,
      html
    });
  }
  if (foundData && foundData.email) {
    const subject = 'تم العثور على تطابق لإعلانك في FindMyCar!';

    const html = `
      <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
        <h2 style="color: #27ae60; text-align: center; font-size: 26px; margin-bottom: 25px;">
          🎉 مبروك! تم العثور على تطابق
        </h2>
    
        <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
          تم إيجاد بلاغ لفقدان سيارة يطابق إعلانك المُسجل على <strong style="color: #007bff;">FindMyCar</strong>. نأمل أن تكون هذه بداية للوصول إلى صاحب السيارة.
        </p>
    
        <div style="font-size: 17px; color: #444; margin-bottom: 20px; line-height: 1.8;">
          <p><strong>🚗 اسم السيارة:</strong> ${lostData.car_name}</p>
          <p><strong>🔢 رقم اللوحة:</strong> ${lostData.plate_number}</p>
          <p><strong>🔧 رقم الشاسيه:</strong> ${lostData.chassis_number}</p>
          <p><strong>📞 رقم هاتف الفاقد:</strong> ${lostData.phone_main}</p>
          ${lostData.phone_secondary && lostData.phone_secondary !== '0'
        ? `<p><strong>📱 رقم إضافي:</strong> ${lostData.phone_secondary}</p>`
        : ''
      }
        </div>
    
        <p style="font-size: 17px; color: #555; margin-bottom: 25px;">
          تم حفظ هذا التطابق في أرشيف التطابقات الخاصة بك، ويمكنك التواصل مباشرة مع صاحب البلاغ لاتخاذ الخطوات اللازمة.
        </p>
    
        <p style="font-size: 18px; color: #444; font-weight: bold; text-align: center;">
          شكرًا لمساهمتك في إعادة السيارات لأصحابها 💙<br>
          فريق <span style="color: #007bff;">FindMyCar</span>
        </p>
      </div>
    `;


    await transporter.sendMail({
      from: 'FindMyCar <findmycar10@gmail.com>',
      to: foundData.email,
      subject,
      html
    });
  }

  // 4. حذف صورة البلاغ
  const { data: lostDataFromDB } = await supabase.from('losts').select('img_url').eq('id', lost_id).single();
  let lostImgUrl = lostDataFromDB?.img_url;
  if (lostImgUrl && lostImgUrl.trim() !== '') {
    const filePath = lostImgUrl.split('/').pop();
    if (filePath && filePath.trim() !== '') {
      await supabase.storage.from('car-images').remove([filePath]);
    }
  }
  // 5. حذف صورة الإعلان
  const { data: foundDataFromDB } = await supabase.from('founds').select('img_url').eq('id', found_id).single();
  let foundImgUrl = foundDataFromDB?.img_url;
  if (foundImgUrl && foundImgUrl.trim() !== '') {
    const filePath = foundImgUrl.split('/').pop();
    if (filePath && filePath.trim() !== '') {
      await supabase.storage.from('car-images').remove([filePath]);
    }
  }

  // 6. حذف السجلات من قاعدة البيانات
  await supabase.from('matches').delete().eq('id', match_id);
  await supabase.from('losts').delete().eq('id', lost_id);
  await supabase.from('founds').delete().eq('id', found_id);

  res.json({ ok: true });
});

app.post('/add-lost', async (req, res) => {
  console.log('=== بداية معالجة طلب إضافة بلاغ ===');
  console.log('البيانات الواردة:', req.body);
  
  const dataToSend = req.body;
  if (!dataToSend.car_name || !dataToSend.plate_number || !dataToSend.phone_main || !dataToSend.color || !dataToSend.model || !dataToSend.location || !dataToSend.email) {
    console.log('خطأ: بيانات غير مكتملة', { dataToSend });
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح' });
  }
  try {
    console.log('جاري إدخال البيانات في Supabase...');
    // استبعاد الحقول غير الموجودة في الجدول
    const { details, ...cleanData } = dataToSend;
    const dataToInsert = {
      car_name: cleanData.car_name,
      plate_number: cleanData.plate_number,
      chassis_number: cleanData.chassis_number,
      phone_main: cleanData.phone_main,
      phone_secondary: cleanData.phone_secondary,
      color: cleanData.color,
      model: cleanData.model,
      location: cleanData.location,
      email: cleanData.email,
      show_phone_public: cleanData.show_phone_public,
      img_url: cleanData.img_url
    };
    console.log('البيانات التي سيتم إدخالها:', dataToInsert);
    const { data: insertData, error: insertError } = await supabase.from('losts').insert([dataToInsert]).select();
    if (insertError) {
      console.error('خطأ في إدخال البيانات في Supabase:', insertError);
      return res.status(500).json({ error: 'حدث خطأ في حفظ البيانات: ' + insertError.message });
    }
    console.log('تم إدخال البيانات بنجاح:', insertData);
    // إرسال البريد بعد نجاح الإدراج
    try {
      const subject = 'تم استلام بلاغك في FindMyCar';
      const html = `
        <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
          <h2 style="color: #2c3e50; text-align: center; font-size: 26px; margin-bottom: 30px;">
             تم استلام بلاغك بنجاح
          </h2>
          <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
            شكرًا لاستخدامك <strong style="color: #007bff;">FindMyCar</strong>، لقد استلمنا تفاصيل البلاغ الخاصة بك وبدأنا بمطابقتها مع قاعدة البيانات لدينا.
          </p>
          <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
            🚗 <strong>اسم السيارة:</strong> <span style="color: #000;">${dataToInsert.car_name}</span><br>
            📞 <strong>رقم التواصل:</strong> <span style="color: #000;">${dataToInsert.phone_main}</span>
          </p>
          <p style="font-size: 17px; color: #555; line-height: 1.8; margin-bottom: 25px;">
            سنتواصل معك فور وجود أي تطابق مع بلاغات السيارات الموجودة، أو في حال تواصل معنا أحد المبلّغين بسيارة تحمل نفس المواصفات.<br><br>
            فضلاً، صنّف هذه الرسالة كمهمة ⭐ في بريدك لتضمن استلام أي تحديثات قادمة.
          </p>
          <p style="font-size: 18px; color: #444; font-weight: bold; text-align: center;">
            مع أطيب التمنيات باستعادة سيارتك قريبًا 💙<br>
            فريق <span style="color: #007bff;">FindMyCar</span>
          </p>
        </div>
      `;
      await transporter.sendMail({
        from: 'FindMyCar <findmycar10@gmail.com>',
        to: dataToInsert.email,
        subject,
        html
      });
    } catch (err) {
      console.log('خطأ في إرسال البريد بعد إضافة بلاغ:', err);
    }
    // ابحث عن إعلان موجود يطابق رقم اللوحة أو الشاسيه
    console.log('البحث عن تطابقات للبلاغ الجديد...');
    const { data: foundMatch, error: matchError } = await supabase
      .from('founds')
      .select('*')
      .or(
        `plate_number.eq."${dataToInsert.plate_number}",chassis_number.eq."${dataToInsert.chassis_number}"`
      );

    if (matchError) {
      console.error('خطأ في البحث عن تطابقات:', matchError);
    }

    let hasMatch = false;
    if (foundMatch && foundMatch.length > 0) {
      console.log(`تم العثور على ${foundMatch.length} تطابق محتمل`);
      hasMatch = true;
      for (const found of foundMatch) {
        try {
          await fetch('http://localhost:4000/add-match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lost_id: insertData[0].id,
              found_id: found.id,
              match_type: found.plate_number === dataToInsert.plate_number ? 'plate' : 'chassis'
            })
          });
        } catch (fetchError) {
          console.error('خطأ في إضافة التطابق:', fetchError);
        }
      }
    }
    res.json({ ok: true, data: insertData[0], hasMatch });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

// endpoint لإضافة إعلان موجود (founds) مع منطق التطابقات
app.post('/add-existing', async (req, res) => {
  const dataToSend = req.body;
  if (!dataToSend.car_name || !dataToSend.plate_number || !dataToSend.phone_main || !dataToSend.color || !dataToSend.model || !dataToSend.location || !dataToSend.email) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح' });
  }
  try {
    console.log('جاري إضافة إعلان جديد...');
    // استبعاد الحقول غير الموجودة في الجدول
    const { details, ...cleanData } = dataToSend;
    const dataToInsert = {
      car_name: cleanData.car_name,
      plate_number: cleanData.plate_number,
      chassis_number: cleanData.chassis_number,
      phone_main: cleanData.phone_main,
      phone_secondary: cleanData.phone_secondary,
      color: cleanData.color,
      model: cleanData.model,
      location: cleanData.location,
      email: cleanData.email,
      img_url: cleanData.img_url
    };
    const { data: insertData, error } = await supabase.from('founds').insert([dataToInsert]).select();
    if (error) {
      return res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
    }
    // إرسال البريد بعد نجاح الإدراج
    try {
      const subject = 'تم نشر إعلانك بنجاح على FindMyCar';
      const html = `
        <div style="max-width: 600px; margin: 30px auto; background-color: #ffffff; padding: 30px; font-family: Tahoma, Arial, sans-serif; border: 1px solid #e0e0e0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); direction: rtl; text-align: right;">
          <h2 style="color: #2c3e50; text-align: center; font-size: 26px; margin-bottom: 30px;">
             تم نشر إعلانك بنجاح!
          </h2>
          <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
            شكرًا لاستخدامك <strong style="color: #007bff;">FindMyCar</strong>، لقد تم نشر إعلانك بنجاح وهو الآن متاح على منصتنا ليشاهده الآخرون.
          </p>
          <p style="font-size: 18px; color: #333; margin-bottom: 15px;">
            🚗 <strong>اسم السيارة:</strong> <span style="color: #000;">${dataToInsert.car_name}</span><br>
            📞 <strong>رقم التواصل:</strong> <span style="color: #000;">${dataToInsert.phone_main}</span>
          </p>
          <p style="font-size: 17px; color: #555; line-height: 1.8; margin-bottom: 25px;">
            نقوم تلقائيًا بمقارنة إعلانك مع البلاغات المسجلة لدينا، وسنقوم بإعلامك فور وجود أي تطابق.<br><br>
            يُرجى تصنيف هذه الرسالة كمهمة ⭐ لضمان استلام أي إشعارات لاحقة بشأن إعلانك.
          </p>
          <p style="font-size: 18px; color: #444; font-weight: bold; text-align: center;">
            نتمنى أن يكون إعلانك سببًا في إعادة السيارة إلى صاحبها 💙<br>
            فريق <span style="color: #007bff;">FindMyCar</span>
          </p>
        </div>
      `;
      await transporter.sendMail({
        from: 'FindMyCar <findmycar10@gmail.com>',
        to: dataToInsert.email,
        subject,
        html
      });
    } catch (err) {
      console.log('خطأ في إرسال البريد بعد إضافة إعلان:', err);
    }
    // ابحث عن بلاغ مفقود يطابق رقم اللوحة أو الشاسيه
    const { data: lostMatch } = await supabase
      .from('losts')
      .select('*')
      .or(`plate_number.eq.${dataToInsert.plate_number},chassis_number.eq.${dataToInsert.chassis_number}`);
    let hasMatch = false;
    if (lostMatch && lostMatch.length > 0) {
      hasMatch = true;
      for (const lost of lostMatch) {
        await fetch('http://localhost:4000/add-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lost_id: lost.id,
            found_id: insertData[0].id,
            match_type: lost.plate_number === dataToInsert.plate_number ? 'plate' : 'chassis'
          })
        });
      }
    }
    res.json({ ok: true, data: insertData[0], hasMatch });
  } catch (error) {
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

// endpoint لمراجعة التطابقات يدوياً
app.post('/review-matches', async (req, res) => {
  try {
    console.log('تشغيل مراجعة التطابقات يدوياً من لوحة الإدارة...');
    // جلب كل البلاغات
    const { data: losts } = await supabase.from('losts').select('*');
    // جلب كل الإعلانات
    const { data: founds } = await supabase.from('founds').select('*');
    if (!losts || !founds) return res.json({ ok: true, message: 'لا توجد بيانات للمراجعة.' });
    let count = 0;
    for (const lost of losts) {
      for (const found of founds) {
        if ((lost.plate_number && found.plate_number && lost.plate_number === found.plate_number) ||
          (lost.chassis_number && found.chassis_number && lost.chassis_number === found.chassis_number)) {
          // تحقق أنه لم يتم أرشفة هذا التطابق مسبقاً
          const { data: alreadyArchived } = await supabase
            .from('matches_history')
            .select('id')
            .eq('lost_car_name', lost.car_name)
            .eq('found_car_name', found.car_name)
            .eq('lost_plate_number', lost.plate_number)
            .eq('found_plate_number', found.plate_number)
            .limit(1);
          if (!alreadyArchived || alreadyArchived.length === 0) {
            await fetch('http://localhost:4000/add-match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lost_id: lost.id,
                found_id: found.id,
                match_type: lost.plate_number === found.plate_number ? 'plate' : 'chassis'
              })
            });
            count++;
          }
        }
      }
    }
    res.json({ ok: true, message: `تمت مراجعة التطابقات (${count} تطابق جديد).` });
  } catch (err) {
    console.error('خطأ في مراجعة التطابقات:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

startCronJobs();
