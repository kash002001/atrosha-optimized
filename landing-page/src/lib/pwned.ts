// k-anonymity: only the first 5 hex chars of the SHA-1 go to the API.
// The full hash never leaves the browser. See: https://haveibeenpwned.com/API/v3#PwnedPasswords
async function sha1Hex(str: string): Promise<string> {
    const buf = await crypto.subtle.digest(
        "SHA-1",
        new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

export async function isPwned(password: string): Promise<boolean> {
    try {
        const hash = await sha1Hex(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: { "Add-Padding": "true" }, // prevents traffic-analysis side-channel
        });

        if (!res.ok) return false; // fail open — don't block signup on API failure

        const text = await res.text();
        return text
            .split("\r\n")
            .some(line => line.split(":")[0] === suffix);
    } catch {
        return false; // network error = fail open
    }
}
