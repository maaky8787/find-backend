import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// التحقق من اتصال Supabase
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('losts').select('id').limit(1);
    if (error) throw error;
    console.log('✅ تم الاتصال بـ Supabase بنجاح');
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ Supabase:', error);
  }
}