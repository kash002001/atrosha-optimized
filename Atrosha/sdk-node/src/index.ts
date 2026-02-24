import axios, { AxiosInstance } from 'axios';
import { Transactions } from './resources/transactions';
import { Agents } from './resources/agents';

export * from './resources/transactions';
export * from './resources/agents';
export * from './logic/circuit-breaker';
export * from './logic/verification';

export class Atrosha {
    private client: AxiosInstance;
    public transactions: Transactions;
    public agents: Agents;

    constructor(apiKey: string, options?: { baseURL?: string }) {
        const baseURL = options?.baseURL || 'https://proxy.atrosha.com';

        this.client = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Add interceptor to throw meaningful errors for Semantic Engine blocks
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                const header = error.response?.headers?.['x-atrosha-semantic-verdict'];
                if (header) {
                    error.message = `Atrosha Blocked by Semantic Firewall: ${header}`;
                    error.isSemanticDenial = true;
                    error.semanticVerdict = header;
                }
                return Promise.reject(error);
            }
        );

        this.transactions = new Transactions(this.client);
        this.agents = new Agents(this.client);
    }
}
