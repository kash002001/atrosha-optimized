'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Plus } from 'lucide-react';

interface AuthSetting {
    id: number;
    provider_type: string;
    metadata_url?: string;
    client_id?: string;
    created_at: string;
}

const seedSettings: AuthSetting[] = [
    { id: 1, provider_type: "SAML", metadata_url: "https://login.microsoftonline.com/tenant/FederationMetadata/2007-06/FederationMetadata.xml", created_at: "2026-02-10T09:00:00Z" },
    { id: 2, provider_type: "OIDC", client_id: "atrosha-prod-0x8f2a...4b1c", created_at: "2026-03-01T14:30:00Z" },
];

let nid = 10;

export default function AuthSettingsClient() {
    const [settings, setSettings] = useState<AuthSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [providerType, setProviderType] = useState('SAML');
    const [metadataUrl, setMetadataUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    useEffect(() => {
        const t = setTimeout(() => { setSettings(seedSettings); setLoading(false); }, 300);
        return () => clearTimeout(t);
    }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const entry: AuthSetting = {
            id: nid++,
            provider_type: providerType,
            metadata_url: providerType === 'SAML' ? metadataUrl : undefined,
            client_id: providerType === 'OIDC' ? clientId : undefined,
            created_at: new Date().toISOString(),
        };
        setSettings(prev => [...prev, entry]);
        setMetadataUrl('');
        setClientId('');
        setClientSecret('');
    };

    const handleDelete = (id: number) => {
        if (!confirm('Remove this provider?')) return;
        setSettings(prev => prev.filter(s => s.id !== id));
    };

    return (
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
                <div style={{ padding: 10, background: "var(--bg-secondary)", borderRadius: 8, border: "1px solid var(--border)" }}>
                    <Shield size={24} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Enterprise Auth (SSO)</h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--text-muted)" }}>Configure SAML 2.0 or OIDC identity providers for your organization.</p>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <form onSubmit={handleAdd} className="chart-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Add Provider</h3>

                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Provider Type</label>
                        <select
                            value={providerType}
                            onChange={(e) => setProviderType(e.target.value)}
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                        >
                            <option value="SAML">SAML 2.0</option>
                            <option value="OIDC">OpenID Connect (OIDC)</option>
                        </select>
                    </div>

                    {providerType === 'SAML' ? (
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Metadata URL</label>
                            <input
                                type="url"
                                value={metadataUrl}
                                onChange={(e) => setMetadataUrl(e.target.value)}
                                placeholder="https://idp.example.com/metadata"
                                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                            />
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Client ID</label>
                                <input
                                    type="text"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Client Secret</label>
                                <input
                                    type="password"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        style={{ width: "100%", padding: 12, borderRadius: 6, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                    >
                        <Plus size={16} /> Save Configuration
                    </button>
                </form>

                <div>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, padding: "0 8px" }}>Active Providers</h3>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading configurations...</div>
                    ) : settings.length === 0 ? (
                        <div className="chart-card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                            No SSO providers configured yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {settings.map((s) => (
                                <div key={s.id} className="chart-card" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                                            {s.provider_type}
                                        </div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {s.metadata_url || s.client_id}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(s.id)}
                                        style={{ padding: "6px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", cursor: "pointer", fontSize: 12 }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
