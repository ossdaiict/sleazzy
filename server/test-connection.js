require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing Auth Admin connection...');
    try {
        const start = Date.now();
        // Use admin api to list users, helps verify auth service connectivity
        const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        console.log('Time:', Date.now() - start, 'ms');

        if (error) {
            console.error('Supabase Auth Error:', error);
        } else {
            console.log('Success! Found users:', data.users.length);
        }
    } catch (e) {
        console.error('Exception:', e);
    }
}

test();
