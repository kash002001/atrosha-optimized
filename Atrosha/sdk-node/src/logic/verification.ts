import axios, { AxiosInstance } from 'axios';

export interface TransactionSchema {
    amount: number;
    currency: string;
    recipient: string;
}

export class DualCheck {
    private client: AxiosInstance;

    constructor(apiKey: string, baseURL: string = 'https://proxy.atrosha.com') {
        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 5000 // 5s timeout for safety check
        });
    }

    /**
     * Pre-validates a transaction schema against live balance.
     * Returns true if safe to proceed, false otherwise.
     */
    public async validateTransaction(schema: TransactionSchema): Promise<boolean> {
        try {
            // 1. Fetch live balance
            const balanceRes = await this.client.get('/balance'); // Assuming /balance endpoint exists on proxy/validator

            // Handle cases where API returns 200 but body implies error or null
            if (!balanceRes.data || typeof balanceRes.data.balance !== 'number') {
                console.error("[DUAL CHECK] Invalid balance response structure", balanceRes.data);
                return false;
            }

            const availableBalance = balanceRes.data.balance;

            // 2. Compare
            if (availableBalance < schema.amount) {
                console.warn(`[DUAL CHECK] Insufficient funds. Available: ${availableBalance}, Required: ${schema.amount}`);
                return false;
            }

            // 3. Optional: Check for "stuck" pending transactions?
            // (Not verifying here to keep it stateless/fast)

            return true;

        } catch (error: any) {
            // Edge case: API is down or 404. 
            // FAIL SAFE: If we can't verify balance, we DO NOT execute.
            console.error(`[DUAL CHECK] Verification failed: ${error.message}`);
            return false;
        }
    }
}
