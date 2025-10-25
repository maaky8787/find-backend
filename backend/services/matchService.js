import { supabase } from '../config/supabase.js';
import { sendMatchNotificationToLostUser, sendMatchNotificationToFoundUser } from './emailService.js';

export async function findMatches(type, data) {
  try {
    const table = type === 'lost' ? 'founds' : 'losts';
    const { data: matches, error } = await supabase
      .from(table)
      .select('*')
      .or(
        `plate_number.eq."${data.plate_number}",chassis_number.eq."${data.chassis_number}"`
      );

    if (error) {
      console.error(`خطأ في البحث عن تطابقات:`, error);
      return { matches: [], error };
    }

    return { matches, error: null };
  } catch (error) {
    console.error(`خطأ غير متوقع في البحث عن تطابقات:`, error);
    return { matches: [], error };
  }
}

export async function addMatch(lost_id, found_id, match_type) {
  try {
    // 1. جلب بيانات الطرفين
    const { data: lostData } = await supabase
      .from('losts')
      .select('*')
      .eq('id', lost_id)
      .single();

    const { data: foundData } = await supabase
      .from('founds')
      .select('*')
      .eq('id', found_id)
      .single();

    if (!lostData || !foundData) {
      throw new Error('لم يتم العثور على أحد الطرفين');
    }

    // 2. إضافة التطابق إلى الجداول
    const matchData = {
      lost_id,
      found_id,
      match_type,
      created_at: new Date().toISOString()
    };

    const { data: match, error } = await supabase
      .from('matches')
      .insert([matchData])
      .select();

    if (error) throw error;

    // 3. إضافة إلى سجل التطابقات
    const archiveData = {
      match_id: match[0].id,
      lost_car_name: lostData.car_name,
      lost_plate_number: lostData.plate_number,
      lost_chassis_number: lostData.chassis_number,
      found_car_name: foundData.car_name,
      found_plate_number: foundData.plate_number,
      found_chassis_number: foundData.chassis_number,
      match_type,
      created_at: new Date().toISOString()
    };

    await supabase.from('matches_history').insert([archiveData]);

    // 4. إرسال إشعارات البريد
    await Promise.all([
      sendMatchNotificationToLostUser(lostData, foundData),
      sendMatchNotificationToFoundUser(foundData, lostData)
    ]);

    // 5. حذف الصور والسجلات
    await deleteImagesAndRecords(lost_id, found_id, match[0].id);

    return { success: true, match_id: match[0].id };
  } catch (error) {
    console.error('خطأ في إضافة التطابق:', error);
    return { success: false, error };
  }
}

async function deleteImagesAndRecords(lost_id, found_id, match_id) {
  try {
    // حذف الصور
    const { data: lostData } = await supabase
      .from('losts')
      .select('img_url')
      .eq('id', lost_id)
      .single();

    const { data: foundData } = await supabase
      .from('founds')
      .select('img_url')
      .eq('id', found_id)
      .single();

    const imagesToDelete = [lostData?.img_url, foundData?.img_url]
      .filter(url => url && url.trim() !== '')
      .map(url => url.split('/').pop());

    if (imagesToDelete.length > 0) {
      await supabase.storage.from('car-images').remove(imagesToDelete);
    }

    // حذف السجلات
    await Promise.all([
      supabase.from('matches').delete().eq('id', match_id),
      supabase.from('losts').delete().eq('id', lost_id),
      supabase.from('founds').delete().eq('id', found_id)
    ]);

    return true;
  } catch (error) {
    console.error('خطأ في حذف الصور والسجلات:', error);
    return false;
  }
}