import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/gsaya/OneDrive/Desktop/Content/frontend/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVIVE_ROLE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('edit_queue')
    .select('*')
    .eq('edit_id', '90321198-179a-4158-91d1-b6c4d609ae50');

  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

test();
