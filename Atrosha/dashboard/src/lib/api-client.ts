"use client";

/**
 * Standard client for interacting with the Atrosha Sovereign Agent backend.
 * Automatically injects RBAC and Multi-entity headers from localStorage/Context.
 */

export async function atroshaFetch(endpoint: string, options: RequestInit = {}) {
    const user = typeof window !== "undefined" ? localStorage.getItem("atrosha_user") || "admin" : "admin";
    const entity = typeof window !== "undefined" ? localStorage.getItem("atrosha_entity") || "1" : "1";
    
    // Default to the local dev server if not specified
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

    const headers = {
        ...options.headers,
        "X-Atrosha-User": user,
        "X-Atrosha-Entity": entity,
        "Content-Type": "application/json",
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(error.detail || `Request failed with status ${response.status}`);
    }

    return response.json();
}
