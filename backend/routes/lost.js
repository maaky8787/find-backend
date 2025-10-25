import express from 'express';
import { supabase } from '../config/supabase.js';
import { findMatches } from '../services/matchService.js';
import { sendConfirmationEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('=== بداية معالجة طلب إضافة بلاغ ===');
  
  const dataToSend = req.body;
  if (!dataToSend.car_name || !dataToSend.plate_number || !dataToSend.phone_main || 
      !dataToSend.color || !dataToSend.model || !dataToSend.location || !dataToSend.email) {
    console.log('خطأ: بيانات غير مكتملة', { dataToSend });
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح' });
  }

  try {
    // استبعاد الحقول غير المطلوبة
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

    // إدخال البلاغ
    const { data: insertData, error: insertError } = await supabase
      .from('losts')
      .insert([dataToInsert])
      .select();

    if (insertError) {
      console.error('خطأ في إدخال البيانات:', insertError);
      return res.status(500).json({ error: 'حدث خطأ في حفظ البيانات: ' + insertError.message });
    }

    // إرسال بريد التأكيد
    try {
      await sendConfirmationEmail('lost', dataToInsert);
    } catch (emailError) {
      console.log('خطأ في إرسال البريد:', emailError);
    }

    // البحث عن تطابقات
    const { matches, error: matchError } = await findMatches('lost', dataToInsert);
    
    if (matchError) {
      console.error('خطأ في البحث عن تطابقات:', matchError);
    }

    let hasMatch = matches.length > 0;

    res.json({ 
      ok: true, 
      data: insertData[0], 
      hasMatch,
      matchesCount: matches.length 
    });

  } catch (error) {
    console.error('خطأ غير متوقع:', error);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

export default router;