
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

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

    const agentNames = ['stripe-agent', 'openai-agent', 'aws-agent', 'paypal-agent', 'wise-agent'];
    const destinations = ['api.stripe.com/v1/charges', 'api.openai.com/v1/chat', 'ec2.amazonaws.com', 'api.paypal.com/v2/payments', 'api.wise.com/v3/transfers', 'api.anthropic.com/v1/messages', 'api.notion.so', 'api.figma.com'];

    const transactions = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
        const timeOffset = Math.random() * 48 * 60 * 60 * 1000; // last 48h
        const createdAt = new Date(now.getTime() - timeOffset).toISOString();

        const isApproved = Math.random() > 0.18;
        const isSemanticDenial = !isApproved && Math.random() > 0.4;

        const amount = Math.floor(Math.random() * 25000) + 100;
        const dest = destinations[Math.floor(Math.random() * destinations.length)];
        const agent = agentNames[Math.floor(Math.random() * agentNames.length)];

        let simScore = parseFloat((0.88 + Math.random() * 0.12).toFixed(4));
        let latencyMs = parseFloat((11 + Math.random() * 6).toFixed(2));

        let status = isApproved ? 'approved' : 'denied';
        let denialReason: string | null = null;

        if (isSemanticDenial) {
            denialReason = 'semantic firewall DENIED request';
            simScore = parseFloat((0.96 + Math.random() * 0.04).toFixed(4));
        } else if (!isApproved) {
            denialReason = 'budget exceeded';
        }

        transactions.push({
            id: `tx-sim-${Date.now()}-${i}`,
            agent_id: agent,
            amount,
            currency: 'USD',
            status,
            destination: dest,
            sim_score: simScore,
            latency_ms: latencyMs,
            denial_reason: denialReason,
            created_at: createdAt
        });
    }

    const { error } = await supabase.from('transactions').insert(transactions);
    if (error) {
        console.error('Insert error:', JSON.stringify(error, null, 2));
    } else {
        console.log(`✅ Inserted ${transactions.length} transactions.`);
    }
}

simulateTraffic();
