export interface ClassifyRequest {
    /** URL or service the agent is calling (e.g. "api.stripe.com/v1/charges") */
    target_url: string;
    /** Arbitrary JSON payload — the full intent/request body */
    payload: Record<string, unknown>;
}

export interface ClassifyResponse {
    /** ALLOW or DENY */
    verdict: "ALLOW" | "DENY";
    /** Model confidence 0.0–1.0 */
    confidence: number;
    /** Round-trip latency in milliseconds */
    latency_ms: number;
    /** heuristic | semantic_v3 */
    source: string;
    /** Human-readable reason for the verdict */
    reason: string;
}

export interface HealthResponse {
    status: string;
    model_loaded: boolean;
    audit_sink: boolean;
}

export interface AtroshClientOptions {
    /** Atrosha API key  */
    apiKey: string;
    /** Base URL of the Semantic Engine — defaults to production */
    baseUrl?: string;
    /** Max retry attempts on transient errors. Default: 3 */
    maxRetries?: number;
    /** Request timeout in milliseconds. Default: 10000 */
    timeoutMs?: number;
}
