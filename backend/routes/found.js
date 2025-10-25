import express from 'express';
import { supabase } from '../config/supabase.js';
import { findMatches } from '../services/matchService.js';
import { sendConfirmationEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const dataToSend = req.body;
  if (!dataToSend.car_name || !dataToSend.plate_number || !dataToSend.phone_main || 
      !dataToSend.color || !dataToSend.model || !dataToSend.location || !dataToSend.email) {
    return res.status(400).json({ error: 'يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح' });
  }

  try {
    console.log('جاري إضافة إعلان جديد...');
    
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
      img_url: cleanData.img_url
    };

    // إدخال الإعلان
    const { data: insertData, error } = await supabase
      .from('founds')
      .insert([dataToInsert])
      .select();

    if (error) {
      console.error('خطأ في إدخال الإعلان:', error);
      return res.status(500).json({ error: 'حدث خطأ في حفظ البيانات: ' + error.message });
    }

    // إرسال بريد التأكيد
    try {
      await sendConfirmationEmail('found', dataToInsert);
    } catch (emailError) {
      console.log('خطأ في إرسال البريد:', emailError);
    }

    // البحث عن تطابقات
    const { matches, error: matchError } = await findMatches('found', dataToInsert);
    
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