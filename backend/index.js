// 🧩 استيراد الإعدادات
import app from './config/app.js';
import { supabase, checkSupabaseConnection } from './config/supabase.js';
import { transporter, checkEmailConfig } from './config/email.js';
import { startCronJobs } from './cron.js';

// 🛣️ استيراد النقاط النهائية الفرعية
import matchesRoutes from './routes/matches.js';
import lostRoutes from './routes/lost.js';
import foundRoutes from './routes/found.js';

// 🌍 متغير البيئة للرابط الأساسي (Railway أو Local)
const BASE_URL = process.env.VITE_API_URL || 'http://localhost:4000';

// ✅ التحقق من الاتصالات قبل التشغيل
await checkSupabaseConnection();
await checkEmailConfig();

// 🔗 تسجيل المسارات
app.use('/matches', matchesRoutes);
app.use('/add-lost', lostRoutes);
app.use('/add-existing', foundRoutes);

// ========================================
// 🔹 جلب التطابقات من matches_history
// ========================================
app.get('/get-matches', async (req, res) => {
  try {
    console.log('جاري جلب التطابقات من matches_history...');

    const { data, error } = await supabase
      .from('matches_history')
      .select(`id, match_id, match_type, created_at,
        lost_car_name, lost_plate_number, lost_chassis_number,
        found_car_name, found_plate_number, found_chassis_number`)
      .order('id', { ascending: false });

    if (error) {
      console.error('خطأ في جلب التطابقات:', error);
      return res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
    }

    console.log(`تم جلب ${data?.length || 0} تطابق بنجاح`);
    res.json({ matches: data || [] });
  } catch (err) {
    console.error('خطأ في endpoint جلب التطابقات:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

// ========================================
// 🔹 إضافة تطابق جديد إلى الأرشيف
// ========================================
app.post('/add-match', async (req, res) => {
  const { lost_id, found_id, match_type } = req.body;

  try {
    // جلب بيانات البلاغ والإعلان
    const { data: lostData } = await supabase
      .from('losts')
      .select('email, car_name, plate_number, phone_main, phone_secondary, show_phone_public, chassis_number, img_url, location')
      .eq('id', lost_id)
      .single();

    const { data: foundData } = await supabase
      .from('founds')
      .select('email, car_name, plate_number, phone_main, chassis_number, img_url, location')
      .eq('id', found_id)
      .single();

    // إدخال في matches
    const matchData = {
      lost_id,
      found_id,
      match_type,
      created_at: new Date().toISOString()
    };
    const { data: matchInsert, error: matchInsertErr } = await supabase.from('matches').insert([matchData]).select();
    if (matchInsertErr) {
      console.log('خطأ في إضافة التطابق إلى matches:', matchInsertErr);
      return res.status(500).json({ error: 'حدث خطأ أثناء إضافة التطابق.' });
    }
    const match_id = matchInsert[0]?.id;

    // إدخال في matches_history
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
    const { error: copyErr } = await supabase.from('matches_history').insert([archiveData]);
    if (copyErr) {
      console.log('خطأ في إضافة التطابق إلى الأرشيف:', copyErr);
      return res.status(500).json({ error: 'فشل حفظ الأرشيف.' });
    }

    // إرسال بريد للطرفين
    if (lostData?.email) {
      await transporter.sendMail({
        from: 'FindMyCar <findmycar10@gmail.com>',
        to: lostData.email,
        subject: 'تم العثور على سيارتك - تطابق جديد في FindMyCar!',
        html: `<p>تم العثور على إعلان يطابق بلاغك 🚗</p>`
      });
    }
    if (foundData?.email) {
      await transporter.sendMail({
        from: 'FindMyCar <findmycar10@gmail.com>',
        to: foundData.email,
        subject: 'تم العثور على تطابق لإعلانك في FindMyCar!',
        html: `<p>تم العثور على بلاغ يطابق إعلانك 🎉</p>`
      });
    }

    // حذف الصور والسجلات الأصلية
    await supabase.from('matches').delete().eq('id', match_id);
    await supabase.from('losts').delete().eq('id', lost_id);
    await supabase.from('founds').delete().eq('id', found_id);

    res.json({ ok: true });
  } catch (err) {
    console.error('خطأ في /add-match:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

// ========================================
// 🔹 إضافة بلاغ مفقود (lost)
// ========================================
app.post('/add-lost', async (req, res) => {
  console.log('=== إضافة بلاغ جديد ===');
  const data = req.body;

  if (!data.car_name || !data.plate_number || !data.phone_main || !data.color || !data.model || !data.location || !data.email) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة.' });
  }

  try {
    const { details, ...clean } = data;
    const dataToInsert = {
      ...clean,
      created_at: new Date().toISOString()
    };

    const { data: insertData, error } = await supabase.from('losts').insert([dataToInsert]).select();
    if (error) throw error;

    // البحث عن تطابق
    const { data: foundMatch, error: matchError } = await supabase
      .from('founds')
      .select('*')
      .or(`plate_number.eq.${JSON.stringify(dataToInsert.plate_number)},chassis_number.eq.${JSON.stringify(dataToInsert.chassis_number)}`);

    if (matchError) throw matchError;

    let hasMatch = false;
    if (foundMatch?.length > 0) {
      hasMatch = true;
      for (const found of foundMatch) {
        try {
          await fetch(`${BASE_URL}/add-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lost_id: insertData[0].id,
              found_id: found.id,
              match_type: found.plate_number === dataToInsert.plate_number ? 'plate' : 'chassis'
            })
          });
        } catch (err) {
          console.error('خطأ في إرسال التطابق:', err);
        }
      }
    }

    res.json({ ok: true, data: insertData[0], hasMatch: !!hasMatch });
  } catch (err) {
    console.error('خطأ في /add-lost:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء الإضافة.' });
  }
});

// ========================================
// 🔹 إضافة إعلان موجود (found)
// ========================================
app.post('/add-existing', async (req, res) => {
  const data = req.body;

  if (!data.car_name || !data.plate_number || !data.phone_main || !data.color || !data.model || !data.location || !data.email) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة.' });
  }

  try {
    const { details, ...clean } = data;
    const dataToInsert = { ...clean, created_at: new Date().toISOString() };

    const { data: insertData, error } = await supabase.from('founds').insert([dataToInsert]).select();
    if (error) throw error;

    // البحث عن بلاغ مطابق
    const { data: lostMatch } = await supabase
      .from('losts')
      .select('*')
      .or(`plate_number.eq.${JSON.stringify(dataToInsert.plate_number)},chassis_number.eq.${JSON.stringify(dataToInsert.chassis_number)}`);

    let hasMatch = false;
    if (lostMatch?.length > 0) {
      hasMatch = true;
      for (const lost of lostMatch) {
        await fetch(`${BASE_URL}/add-match`, {
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

    res.json({ ok: true, data: insertData[0], hasMatch: !!hasMatch });
  } catch (err) {
    console.error('خطأ في /add-existing:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء الإضافة.' });
  }
});

// ========================================
// 🔹 مراجعة التطابقات يدويًا
// ========================================
app.post('/review-matches', async (req, res) => {
  try {
    console.log('تشغيل مراجعة التطابقات...');
    const { data: losts } = await supabase.from('losts').select('*');
    const { data: founds } = await supabase.from('founds').select('*');
    if (!losts?.length || !founds?.length) return res.json({ ok: true, message: 'لا توجد بيانات للمراجعة.' });

    let count = 0;
    for (const lost of losts) {
      for (const found of founds) {
        if (
          (lost.plate_number && found.plate_number && lost.plate_number === found.plate_number) ||
          (lost.chassis_number && found.chassis_number && lost.chassis_number === found.chassis_number)
        ) {
          await fetch(`${BASE_URL}/add-match`, {
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
    res.json({ ok: true, message: `تمت مراجعة ${count} تطابق جديد.` });
  } catch (err) {
    console.error('خطأ في /review-matches:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء المراجعة.' });
  }
});

// ========================================
// 🚀 بدء التشغيل
// ========================================
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});

startCronJobs();
