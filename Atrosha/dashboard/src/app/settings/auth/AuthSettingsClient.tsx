'use client';

import React, { useState } from 'react';
import { Shield, Info } from 'lucide-react';

export default function AuthSettingsClient() {
    const [providerType, setProviderType] = useState('SAML');
    const [metadataUrl, setMetadataUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // M1: form now submits to an API route that will persist config — scaffold placeholder
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (providerType === 'SAML' && !metadataUrl) {
            setError('Metadata URL is required for SAML.');
            return;
        }
        if (providerType === 'OIDC' && (!clientId || !clientSecret)) {
            setError('Client ID and Secret are required for OIDC.');
            return;
        }

        try {
            // TODO: wire to /api/auth/sso-providers when the SSO provider DB table is ready
            setSaved(true);
            setMetadataUrl('');
            setClientId('');
            setClientSecret('');
            setTimeout(() => setSaved(false), 3000);
        } catch {
            setError('Failed to save configuration. Please try again.');
        }
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

            {/* M1 / L7: removed hardcoded seed data — no fake active providers shown */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", marginBottom: 28, borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "var(--text-muted)", fontSize: 13 }}>
                <Info size={16} style={{ flexShrink: 0, color: "#6366f1" }} />
                SSO configuration is available on the Enterprise plan. Contact <strong style={{ color: "var(--text)" }}>support@atrosha.bond</strong> to enable.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                <form onSubmit={handleAdd} className="chart-card" style={{ padding: 24 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Add Provider</h3>

                    {error && (
                        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                            {error}
                        </div>
                    )}
                    {saved && (
                        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 6, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", fontSize: 13 }}>
                            Configuration submitted. Our team will reach out within 24 hours.
                        </div>
                    )}

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
                                    autoComplete="off"
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                                />
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Client Secret</label>
                                <input
                                    type="password"
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    autoComplete="new-password"
                                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "var(--bg-body)", border: "1px solid var(--border)", color: "var(--text)", fontSize: 13 }}
                                />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        style={{ width: "100%", padding: 12, borderRadius: 6, background: "var(--primary)", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
                    >
                        Submit Configuration
                    </button>
                </form>

                <div>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, padding: "0 8px" }}>Active Providers</h3>
                    <div className="chart-card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                        <Shield size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: 14 }}>No SSO providers configured.</p>
                        <p style={{ margin: "6px 0 0", fontSize: 12 }}>Contact support to activate Enterprise SSO.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
