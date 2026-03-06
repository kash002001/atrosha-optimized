'use client';

import React, { useState, useEffect } from 'react';
import { atroshaFetch } from '@/lib/api-client';

export default function AuthSettingsClient() {
    const [settings, setSettings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [providerType, setProviderType] = useState('SAML');
    const [metadataUrl, setMetadataUrl] = useState('');
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');

    const fetchSettings = async () => {
        try {
            const data = await atroshaFetch('/auth/settings');
            setSettings(data);
        } catch (error) {
            console.error('Failed to fetch auth settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await atroshaFetch('/auth/settings', {
                method: 'POST',
                body: JSON.stringify({
                    provider_type: providerType,
                    metadata_url: metadataUrl,
                    client_id: clientId,
                    client_secret: clientSecret
                }),
            });
            fetchSettings();
            setMetadataUrl('');
            setClientId('');
            setClientSecret('');
        } catch (error) {
            alert('Failed to add auth settings');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await atroshaFetch(`/auth/settings/${id}`, { method: 'DELETE' });
            fetchSettings();
        } catch (error) {
            alert('Failed to delete settings');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Enterprise Auth (SSO)
                </h1>
                <p className="text-gray-400 mt-2">Configure SAML 2.0 or OIDC identity providers for your organization.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <form onSubmit={handleAdd} className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4">
                    <h2 className="text-xl font-semibold mb-4">Add Provider</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Provider Type</label>
                        <select 
                            value={providerType}
                            onChange={(e) => setProviderType(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="SAML">SAML 2.0</option>
                            <option value="OIDC">OpenID Connect (OIDC)</option>
                        </select>
                    </div>

                    {providerType === 'SAML' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Metadata URL</label>
                            <input 
                                type="url" 
                                value={metadataUrl}
                                onChange={(e) => setMetadataUrl(e.target.value)}
                                placeholder="https://idp.example.com/metadata"
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Client ID</label>
                                <input 
                                    type="text" 
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Client Secret</label>
                                <input 
                                    type="password" 
                                    value={clientSecret}
                                    onChange={(e) => setClientSecret(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </>
                    )}

                    <button 
                        type="submit"
                        className="w-full bg-white text-black font-bold p-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Save Configuration
                    </button>
                </form>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold px-2">Active Providers</h2>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading configurations...</div>
                    ) : settings.length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-gray-500">
                            No SSO providers configured yet.
                        </div>
                    ) : (
                        settings.map((s) => (
                            <div key={s.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between group">
                                <div>
                                    <div className="font-medium text-white flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        {s.provider_type}
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                                        {s.metadata_url || s.client_id}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(s.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
