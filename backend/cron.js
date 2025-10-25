import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { supabase } from './supabase.js';
import nodemailer from 'nodemailer';

export function startCronJobs() {
  // مهمة مراجعة التطابقات كل نصف ساعة
  cron.schedule('*/30 * * * *', async () => {
    // جلب كل البلاغات
    const { data: losts } = await supabase.from('losts').select('*');
    // جلب كل الإعلانات
    const { data: founds } = await supabase.from('founds').select('*');
    if (!losts || !founds) return;
    for (const lost of losts) {
      for (const found of founds) {
        // تطابق رقم اللوحة أو الشاسيه
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
            // نفذ نفس منطق التطابق (أضف إلى matches ثم matches_history ثم حذف وأرسل بريد)
            await fetch('http://localhost:4000/add-match', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lost_id: lost.id,
                found_id: found.id,
                match_type: lost.plate_number === found.plate_number ? 'plate' : 'chassis'
              })
            });
          }
        }
      }
    }
  });

  // مهمة أسبوعية/شهرية للبلاغات والإعلانات
  cron.schedule('* * * * *', async () => {
    console.log('⏰ [CRON]:', new Date().toLocaleString());
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // إنشاء transporter داخل المهمة
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 1. بلاغات مضى عليها أسبوع ولم يتم إرسال إشعار الأسبوع
    const { data: lostsWeek } = await supabase
      .from('losts')
      .select('id, email, week_notified, created_at')
      .lt('created_at', weekAgo.toISOString())
      .eq('week_notified', false);
    for (const lost of lostsWeek) {
      if (lost.email) {
        try {
          await transporter.sendMail({
            from: `"FindMyCar" <${process.env.EMAIL_USER}>`,
            to: lost.email,
            subject: 'مضى أسبوع على بلاغك',
            html: '<p>مضى أسبوع على البلاغ، هل وجدت سيارتك؟</p>'
          });
        } catch (err) {
          console.error('خطأ في إرسال البريد الأسبوعي:', err);
        }
      }
      await supabase.from('losts').update({ week_notified: true }).eq('id', lost.id);
    }

    // 2. بلاغات مضى عليها شهر ولم يتم حذفها
    const { data: lostsMonth } = await supabase
      .from('losts')
      .select('id, email, month_notified, created_at')
      .lt('created_at', monthAgo.toISOString())
      .eq('month_notified', false);
    for (const lost of lostsMonth) {
      // حذف صورة البلاغ من التخزين
      const { data: lostImg } = await supabase.from('losts').select('img_url').eq('id', lost.id).single();
      if (lostImg && lostImg.img_url) {
        const filePath = lostImg.img_url.split('/car-images/')[1];
        if (filePath) {
          await supabase.storage.from('car-images').remove([filePath]);
        }
      }
      if (lost.email) {
        await transporter.sendMail({
          from: `"FindMyCar" <${process.env.EMAIL_USER}>`,
          to: lost.email,
          subject: 'تم حذف البلاغ',
          html: '<p>تم حذف البلاغ. الرجاء إعادة النشر لمساعدتنا في إيجاد سيارتك.</p>'
        });
      }
      await supabase.from('losts').delete().eq('id', lost.id);
      await supabase.from('losts').update({ month_notified: true }).eq('id', lost.id);
    }

    // 3. إعلانات الموجودات (founds) نفس المنطق
    const { data: foundsWeek } = await supabase
      .from('founds')
      .select('id, email, week_notified, created_at')
      .lt('created_at', weekAgo.toISOString())
      .eq('week_notified', false);
    for (const found of foundsWeek) {
      if (found.email) {
        await transporter.sendMail({
          from: '"FindMyCar" <findmycar10@gmail.com>',
          to: found.email,
          subject: 'مضى أسبوع على إعلانك',
          html: '<p>مضى أسبوع على الإعلان، هل وجدت صاحب السيارة؟</p>'
        });
      }
      await supabase.from('founds').update({ week_notified: true }).eq('id', found.id);
    }

    const { data: foundsMonth } = await supabase
      .from('founds')
      .select('id, email, month_notified, created_at')
      .lt('created_at', monthAgo.toISOString())
      .eq('month_notified', false);
    for (const found of foundsMonth) {
      // حذف صورة الإعلان من التخزين
      const { data: foundImg } = await supabase.from('founds').select('img_url').eq('id', found.id).single();
      if (foundImg && foundImg.img_url) {
        const filePath = foundImg.img_url.split('/car-images/')[1];
        if (filePath) {
          await supabase.storage.from('car-images').remove([filePath]);
        }
      }
      if (found.email) {
        await transporter.sendMail({
          from: `"FindMyCar" <${process.env.EMAIL_USER}>`,
          to: found.email,
          subject: 'تم حذف الإعلان',
          html: '<p>تم حذف الإعلان. الرجاء إعادة النشر لمساعدتنا في إيجاد صاحب السيارة.</p>'
        });
      }
      await supabase.from('founds').delete().eq('id', found.id);
      await supabase.from('founds').update({ month_notified: true }).eq('id', found.id);
    }

    // 4. التطابقات (matches) التي مضى عليها ساعة ولم تُحذف بعد
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // قبل ساعة
    const { data: matches } = await supabase
      .from('matches')
      .select('id, lost_id, found_id, created_at')
      .lt('created_at', cutoff.toISOString())
      .not('lost_id', 'is', null)
      .not('found_id', 'is', null);
    for (const match of matches) {
      // جلب بيانات البلاغ والإعلان
      const { data: lostData } = await supabase.from('losts').select('car_name, plate_number, chassis_number').eq('id', match.lost_id).single();
      const { data: foundData } = await supabase.from('founds').select('car_name, plate_number, chassis_number').eq('id', match.found_id).single();
      // حفظ في جدول الأرشيف
      await supabase.from('matches_history').insert([{
        match_id: match.id,
        lost_car_name: lostData?.car_name || null,
        lost_plate_number: lostData?.plate_number || null,
        lost_chassis_number: lostData?.chassis_number || null,
        found_car_name: foundData?.car_name || null,
        found_plate_number: foundData?.plate_number || null,
        found_chassis_number: foundData?.chassis_number || null,
        match_type: match.match_type,
        created_at: match.created_at
      }]);
      // احذف التطابق أولاً
      const { error: matchDelErr } = await supabase.from('matches').delete().eq('id', match.id);
      if (matchDelErr) console.log('خطأ في حذف التطابق:', matchDelErr);
      else console.log('تم حذف تطابق قديم وحذف السجل:', match.id);
      // حذف صورة البلاغ من التخزين
      const { data: lostImg } = await supabase.from('losts').select('img_url').eq('id', match.lost_id).single();
      if (lostImg && lostImg.img_url) {
        const filePath = lostImg.img_url.split('/car-images/')[1];
        if (filePath) {
          await supabase.storage.from('car-images').remove([filePath]);
        }
      }
      // حذف البلاغ
      const { error: lostDelErr } = await supabase.from('losts').delete().eq('id', match.lost_id);
      if (lostDelErr) console.log('خطأ في حذف البلاغ:', lostDelErr);
      else console.log('تم حذف البلاغ:', match.lost_id);
      // حذف صورة الإعلان من التخزين
      const { data: foundImg } = await supabase.from('founds').select('img_url').eq('id', match.found_id).single();
      if (foundImg && foundImg.img_url) {
        const filePath = foundImg.img_url.split('/car-images/')[1];
        if (filePath) {
          await supabase.storage.from('car-images').remove([filePath]);
        }
      }
      // حذف الإعلان
      const { error: foundDelErr } = await supabase.from('founds').delete().eq('id', match.found_id);
      if (foundDelErr) console.log('خطأ في حذف الإعلان:', foundDelErr);
      else console.log('تم حذف الإعلان:', match.found_id);
    }
  });
} 