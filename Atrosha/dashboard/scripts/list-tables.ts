
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listTables() {
    const { data, error } = await supabase
        .from('information_schema.columns')
        .select('table_name, column_name, data_type')
        .eq('table_schema', 'public')
        .order('table_name');

    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

listTables();
