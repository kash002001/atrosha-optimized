"use client";

import { useState } from "react";
import { Copy, RefreshCw, Terminal, Eye, EyeOff } from "lucide-react";

export default function DevelopersPage() {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const regenerateKey = async () => {
        if (!confirm("Are you sure? This will INVALIDATE your old key immediately.")) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/regenerate-key", { method: "POST" });
            const data = await res.json();
            if (data.api_key) {
                setApiKey(data.api_key);
                setShowKey(true);
            } else {
                alert("Failed to generate key: " + data.error);
            }
        } catch (e) {
            alert("Error generating key");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copied!");
    };

    return (
        <div className="p-8 max-w-4xl animate-fade-in">
            <header className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Developer Console</h1>
                <p className="text-gray-400">Manage your API keys and integrate Atrosha into your agents.</p>
            </header>

            {/* API Key Section */}
            <section className="bg-card-bg border border-white/10 rounded-xl p-6 mb-8 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-purple-400" />
                        API Credentials
                    </h2>
                    <button
                        onClick={regenerateKey}
                        disabled={loading}
                        className="flex items-center gap-2 text-sm bg-red-500/10 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        {loading ? "Generating..." : "Regenerate Key"}
                    </button>
                </div>

                <div className="bg-black/30 p-4 rounded-lg flex items-center justify-between border border-white/5">
                    <div className="font-mono text-gray-300 overflow-hidden text-ellipsis mr-4">
                        {apiKey ? (
                            showKey ? apiKey : "•".repeat(40)
                        ) : (
                            <span className="text-gray-500 italic">Hidden (Click regenerate to view new key)</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {apiKey && (
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400"
                                title={showKey ? "Hide" : "Show"}
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        )}
                        {apiKey && (
                            <button
                                onClick={() => copyToClipboard(apiKey)}
                                className="p-2 hover:bg-white/10 rounded transition-colors text-gray-400"
                                title="Copy"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-3 text-xs text-yellow-500/80">
                    ⚠️ Your API Key provides full spending access. Keep it secure. We only show it once upon generation.
                </p>
            </section>

            {/* Code Snippets */}
            <section className="space-y-6">
                <h2 className="text-xl font-semibold">Quick Start</h2>

                <div className="bg-card-bg border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium mb-3 text-blue-400">1. Authenticate Request</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        All requests to the Proxy must include your Organization ID and the specific Agent ID you are acting as.
                    </p>
                    <pre className="bg-black/50 p-4 rounded text-sm overflow-x-auto text-green-400/90 font-mono">
                        {`curl -X POST https://proxy.atrosha.com/proxy/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_LLM_KEY" \\
  -H "X-Atrosha-Org-ID: <your_org_id>" \\
  -H "X-Atrosha-Agent-ID: <agent_id>" \\
  -d '{ "model": "gpt-4", "messages": [...] }'`}
                    </pre>
                </div>

                <div className="bg-card-bg border border-white/10 rounded-xl p-6">
                    <h3 className="font-medium mb-3 text-purple-400">2. Rotate Key</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Automated key rotation for security compliance.
                    </p>
                    <pre className="bg-black/50 p-4 rounded text-sm overflow-x-auto text-green-400/90 font-mono">
                        {`curl -X POST https://proxy.atrosha.com/rotate-key \\
  -H "X-Atrosha-Agent-ID: <agent_id>" \\
  -d '{ "new_pub_hex": "..." }'`}
                    </pre>
                </div>
            </section>
        </div>
    );
}
