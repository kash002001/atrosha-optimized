
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) process.exit(1);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugInsert() {
    let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    let orgId = orgs?.[0]?.id;

    if (!orgId) {
        console.log("No orgs found, creating one...");
        // Assuming org creation works (since it didn't error before)
        const { data: newOrg, error } = await supabase.from('organizations').insert({
            name: 'Debug Corp',
            slug: 'debug-corp-' + Date.now(),
            plan_tier: 'growth',
            subscription_status: 'active'
        }).select().single();
        if (newOrg) orgId = newOrg.id;
        else {
            console.error("Org creation failed:", error);
            return;
        }
    }

    console.log(`Using Org ID: ${orgId}`);

    const attempts = [
        { table: 'agents', col: 'org_id' },
        { table: 'agents', col: 'organization_id' },
        { table: 'policies', col: 'org_id' },
        { table: 'policies', col: 'organization_id' },
    ];

    for (const attempt of attempts) {
        console.log(`\n--- Attempting ${attempt.table} with ${attempt.col} ---`);
        const payload: any = { name: 'Debug Agent' };
        payload[attempt.col] = orgId;

        const { data, error } = await supabase.from(attempt.table).insert(payload).select();

        if (error) {
            console.error(`FAILED: ${error.message} (Code: ${error.code})`);
            // console.error(JSON.stringify(error, null, 2));
        } else {
            console.log(`SUCCESS! Inserted into ${attempt.table}.`);
            console.log(data);
            return; // Found it
        }
    }
}

debugInsert();
