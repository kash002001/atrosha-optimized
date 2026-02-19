
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAgent() {
    const { data, error } = await supabase.from('policies').select('*').limit(1);

    if (error) console.error('Error fetching policies:', JSON.stringify(error, null, 2));
    else console.log('Policies Data:', JSON.stringify(data, null, 2));
}

fetchAgent();
