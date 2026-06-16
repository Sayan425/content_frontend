import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
const supabaseKey = process.env.SUPABASE_SERVIVE_ROLE_API_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetPassword() {
    console.log("Updating password for user Sayan Ghosh...");
    const { data, error } = await supabase.auth.admin.updateUserById(
        '9a5e4d87-724a-4123-8583-6d2f8449b3f1',
        { password: 'password123' }
    );

    if (error) {
        console.error("Error updating password:", error);
    } else {
        console.log("Password updated successfully!", data);
    }
}

resetPassword();
