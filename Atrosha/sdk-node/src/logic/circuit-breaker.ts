export class CircuitBreaker {
    private failures: number[] = [];
    private readonly windowMs = 60000; // 60 seconds
    private readonly threshold = 3;

    public recordFailure(): void {
        const now = Date.now();
        this.failures.push(now);
        this.cleanup(now);

        if (this.failures.length >= this.threshold) {
            console.error(`[CIRCUIT BREAKER] CRITICAL: ${this.failures.length} failures in ${this.windowMs / 1000}s. Terminating process.`);
            // In a real agent, we might want to emit an event or call a webhook before dying.
            // For now, fail hard to prevent loss.
            process.exit(1);
        }
    }

    public recordSuccess(): void {
        // Optional: clear failures on success? 
        // Strict mode: No, failures still count towards the window density.
        // Relaxed mode: this.failures = [];
        // We'll keep strict mode for safety.
    }

    private cleanup(now: number): void {
        this.failures = this.failures.filter(ts => now - ts < this.windowMs);
    }
}
