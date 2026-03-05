
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function simulateTraffic() {
    console.log('🚀 Simulating traffic...');

    // 1. Get or Create Organization
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    let orgId = orgs?.[0]?.id;

    if (!orgId) {
        console.log('Creating demo organization...');
        const { data: newOrg, error } = await supabase.from('organizations').insert({
            name: 'Demo Corp',
            slug: 'demo-corp-' + Date.now(),
            plan_tier: 'growth',
            subscription_status: 'active'
        }).select().single();
        if (error) {
            console.error('Error creating org:', error);
            return;
        }
        orgId = newOrg.id;
    }

    // 2. Get or Create Agent
    const { data: agents } = await supabase.from('agents').select('id').eq('organization_id', orgId).limit(1);
    let agentId = agents?.[0]?.id;

    if (!agentId) {
        console.log('Creating demo agent via agents...');
        const { data: newAgent, error } = await supabase.from('agents').insert({
            organization_id: orgId,
            name: 'Finance Assistant',
            pubkey: 'dummy-pubkey-' + Date.now(), // Required field
            // type: 'finance_assistant', // Might not exist in policies
            // status: 'active' // might be is_active
        }).select().single();
        if (error) {
            console.error('Error creating agent:', error);
            return;
        }
        agentId = newAgent.id;
    }

    console.log(`Target Org: ${orgId}`);
    console.log(`Target Agent: ${agentId}`);

    // 3. Generate Transactions
    const transactions = [];
    const now = new Date();
    const destinations = ['AWS', 'Stripe', 'Google Cloud', 'Slack', 'Zoom', 'Notion', 'Figma', 'OpenAI', 'Anthropic', 'Vercel'];

    // Spread over last 24 hours
    for (let i = 0; i < 50; i++) {
        // Random time in last 24h
        const timeOffset = Math.random() * 24 * 60 * 60 * 1000;
        const createdAt = new Date(now.getTime() - timeOffset).toISOString();

        const isApproved = Math.random() > 0.15; // 85% approved
        const amount = Math.floor(Math.random() * 12000) + 500; // $5.00 - $120.00
        const dest = destinations[Math.floor(Math.random() * destinations.length)];

        transactions.push({
            id: crypto.randomUUID(),
            organization_id: orgId,
            agent_id: agentId,
            amount: amount,
            currency: 'USD',
            status: isApproved ? 'approved' : 'denied',
            created_at: createdAt,
            destination: dest, // Matches schema
        });
    }

    const { error } = await supabase.from('transactions').insert(transactions);
    if (error) {
        fs.writeFileSync('error.log', JSON.stringify(error, null, 2));
        console.error('Error logged to error.log');
    } else {
        console.log(`✅ Inserted ${transactions.length} transactions.`);
    }
}

simulateTraffic();
