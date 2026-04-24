"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

interface UserContextType {
    user: string;
    entityId: number;
    role: string;
    orgId: string | null;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState("");
    const [entityId, setEntityId] = useState(0);
    const [role, setRole] = useState("");
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // C1: derive role/entityId from the server-verified JWT, never from localStorage
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setUser(user.email || "");
                setOrgId(user.user_metadata?.org_id || null);
                // role comes from DB metadata, not localStorage — can't be spoofed client-side
                const serverRole = (user.user_metadata?.role as string) || "VIEWER";
                setRole(serverRole);
                // entity_id is the org's numeric entity identifier stored in metadata
                setEntityId(Number(user.user_metadata?.entity_id) || 1);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user.email || "");
                setOrgId(session.user.user_metadata?.org_id || null);
                setRole((session.user.user_metadata?.role as string) || "VIEWER");
                setEntityId(Number(session.user.user_metadata?.entity_id) || 1);
            } else {
                setUser("");
                setOrgId(null);
                setRole("");
                setEntityId(0);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <UserContext.Provider value={{ user, entityId, role, orgId, loading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
}
