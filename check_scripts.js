import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVIVE_ROLE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkScripts() {
  const { data, error } = await supabase.from('scripts_final').select('*').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Scripts Data:", data);
  }
}

checkScripts();
