import { AxiosInstance } from 'axios';

export interface Agent {
    id: string;
    name: string;
    daily_limit_cents: number;
    rate_limit_rpm: number;
    is_active: boolean;
}

export class Agents {
    private client: AxiosInstance;

    constructor(client: AxiosInstance) {
        this.client = client;
    }

    async list(): Promise<Agent[]> {
        const response = await this.client.get('/api/agents');
        return response.data;
    }

    async get(agentId: string): Promise<Agent> {
        const response = await this.client.get(`/api/agents/${agentId}`);
        return response.data;
    }
}
