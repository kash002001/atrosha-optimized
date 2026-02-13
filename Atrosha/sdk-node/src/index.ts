import axios, { AxiosInstance } from 'axios';
import { Transactions } from './resources/transactions';
import { Agents } from './resources/agents';

export * from './resources/transactions';
export * from './resources/agents';

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

        this.transactions = new Transactions(this.client);
        this.agents = new Agents(this.client);
    }
}
