import express from 'express';
import { supabase } from '../config/supabase.js';
import { findMatches, addMatch } from '../services/matchService.js';

const router = express.Router();

// جلب سجل التطابقات
router.get('/', async (req, res) => {
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

// إضافة تطابق جديد
router.post('/add', async (req, res) => {
  const { lost_id, found_id, match_type } = req.body;

  if (!lost_id || !found_id || !match_type) {
    return res.status(400).json({ error: 'البيانات المطلوبة غير مكتملة' });
  }

  const result = await addMatch(lost_id, found_id, match_type);
  
  if (result.success) {
    res.json({ ok: true, match_id: result.match_id });
  } else {
    res.status(500).json({ error: 'حدث خطأ في إضافة التطابق' });
  }
});

// مراجعة التطابقات يدوياً
router.post('/review', async (req, res) => {
  try {
    console.log('تشغيل مراجعة التطابقات يدوياً...');
    const { data: losts } = await supabase.from('losts').select('*');
    const { data: founds } = await supabase.from('founds').select('*');
    
    if (!losts || !founds) {
      return res.json({ ok: true, message: 'لا توجد بيانات للمراجعة.' });
    }

    let count = 0;
    for (const lost of losts) {
      const { matches } = await findMatches('lost', lost);
      if (matches.length > 0) {
        for (const found of matches) {
          const result = await addMatch(lost.id, found.id, 
            lost.plate_number === found.plate_number ? 'plate' : 'chassis'
          );
          if (result.success) count++;
        }
      }
    }

    res.json({ ok: true, message: `تمت مراجعة التطابقات (${count} تطابق جديد).` });
  } catch (err) {
    console.error('خطأ في مراجعة التطابقات:', err);
    res.status(500).json({ error: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.' });
  }
});

export default router;