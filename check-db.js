import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVIVE_ROLE_API_KEY; // Using service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking public.users...");
    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) console.error("Users Error:", usersError);
    else console.log("Users:", users);

    console.log("\nChecking public.avatar_details...");
    const { data: avatars, error: avatarsError } = await supabase.from('avatar_details').select('*');
    if (avatarsError) console.error("Avatars Error:", avatarsError);
    else console.log("Avatars:", avatars);
}

checkData();
