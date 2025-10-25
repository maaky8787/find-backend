import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dwlnicvwnnrrxfrodxrb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3bG5pY3Z3bm5ycnhmcm9keHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0NDIzMzgsImV4cCI6MjA2ODAxODMzOH0.lrFsegUPl3FWbY1wzcYrBln7qIa_1eGm74m0Xsix9I8'; // استخدم هنا Anon Key فقط
export const supabase = createClient(supabaseUrl, supabaseKey); 