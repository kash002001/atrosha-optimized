import type {
    AtroshClientOptions,
    ClassifyRequest,
    ClassifyResponse,
    HealthResponse,
} from "./types";

const DEFAULT_BASE_URL = "https://atrosha-engine.onrender.com";
const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class AtroshClient {
    private readonly apiKey: string;
    private readonly baseUrl: string;
    private readonly maxRetries: number;
    private readonly timeoutMs: number;

    constructor(opts: AtroshClientOptions) {
        this.apiKey = opts.apiKey;
        this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
        this.maxRetries = opts.maxRetries ?? DEFAULT_RETRIES;
        this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
    }

    private async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        let attempt = 0;
        while (true) {
            attempt++;
            try {
                const res = await fetch(`${this.baseUrl}${path}`, {
                    method,
                    signal: controller.signal,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Atrosha-Key": this.apiKey,
                    },
                    ...(body ? { body: JSON.stringify(body) } : {}),
                });

                clearTimeout(timer);

                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Atrosha API ${res.status}: ${text}`);
                }

                return res.json() as Promise<T>;
            } catch (err: any) {
                const isTransient = err?.name === "AbortError" || (err?.message ?? "").includes("fetch");
                if (!isTransient || attempt >= this.maxRetries) {
                    clearTimeout(timer);
                    throw err;
                }
                // exponential backoff: 200, 400, 800ms
                await sleep(200 * 2 ** (attempt - 1));
            }
        }
    }

    /** Classify an agent's outgoing request. Returns ALLOW or DENY verdict. */
    async classify(req: ClassifyRequest): Promise<ClassifyResponse> {
        return this.request<ClassifyResponse>("/classify", "POST", req);
    }

    /** Check engine health — model loaded, audit sink status. */
    async health(): Promise<HealthResponse> {
        return this.request<HealthResponse>("/health");
    }
}
