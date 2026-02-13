import { AxiosInstance } from 'axios';

export interface GuardParams {
    agentId: string;
    amount: number; // in cents
    currency?: string;
    metadata?: Record<string, any>;
    destination?: string;
}

export interface GuardResponse {
    allowed: boolean;
    decision: 'approved' | 'denied' | 'shadow_denied';
    reason?: string;
    new_balance?: number;
}

export class Transactions {
    private client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async guard(params: GuardParams): Promise<GuardResponse> {
        const { agentId, amount, currency = 'usd', metadata, destination } = params;

        // We hit the proxy to validate the transaction
        const response = await this.client.post('/proxy/v1/guard', { // Hypothetical endpoint for cleaner SDK usage
            agent_id: agentId,
            amount,
            currency,
            metadata,
            destination
        });

        return response.data;
    }
}
