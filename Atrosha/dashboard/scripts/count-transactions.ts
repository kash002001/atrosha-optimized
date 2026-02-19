
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function countTx() {
    const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

    if (error) console.error(error);
    else console.log('Transaction Count:', count);
}

countTx();
