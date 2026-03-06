"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface UserContextType {
    user: string;
    entityId: number;
    role: string;
    setUser: (u: string) => void;
    setEntityId: (id: number) => void;
    setRole: (r: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState("admin");
    const [entityId, setEntityId] = useState(1);
    const [role, setRole] = useState("ADMIN");

    // Load from localStorage if available
    useEffect(() => {
        const savedUser = localStorage.getItem("atrosha_user");
        const savedEntity = localStorage.getItem("atrosha_entity");
        const savedRole = localStorage.getItem("atrosha_role");

        if (savedUser) setUser(savedUser);
        if (savedEntity) setEntityId(parseInt(savedEntity));
        if (savedRole) setRole(savedRole);
    }, []);

    const updateValue = (key: string, value: string, setter: (v: any) => void) => {
        setter(value);
        localStorage.setItem(key, value.toString());
    };

    return (
        <UserContext.Provider value={{
            user,
            entityId,
            role,
            setUser: (u) => updateValue("atrosha_user", u, setUser),
            setEntityId: (id) => updateValue("atrosha_entity", id.toString(), setEntityId),
            setRole: (r) => updateValue("atrosha_role", r, setRole),
        }}>
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
