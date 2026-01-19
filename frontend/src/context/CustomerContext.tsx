import React, { createContext, useContext, useEffect, useState } from "react";
import { CustomerUser, customerMe, customerLogin, customerSignup, customerLogout } from "../api";
import toast from "react-hot-toast";

interface CustomerContextType {
    customer: CustomerUser | null;
    loading: boolean;
    login: (data: any) => Promise<void>;
    signup: (data: any) => Promise<void>;
    logout: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
    const [customer, setCustomer] = useState<CustomerUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        customerMe()
            .then(res => setCustomer(res.user))
            .catch(() => setCustomer(null))
            .finally(() => setLoading(false));
    }, []);

    const login = async (data: any) => {
        try {
            const res = await customerLogin(data);
            setCustomer(res.user);
            toast.success("Welcome back!");
        } catch (e: any) {
            toast.error(e.message || "Login failed");
            throw e;
        }
    };

    const signup = async (data: any) => {
        try {
            const res = await customerSignup(data);
            setCustomer(res.user);
            toast.success("Account created!");
        } catch (e: any) {
            toast.error(e.message || "Signup failed");
            throw e;
        }
    };

    const logout = async () => {
        try {
            await customerLogout();
            setCustomer(null);
            toast.success("Logged out");
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <CustomerContext.Provider value={{ customer, loading, login, signup, logout }}>
            {children}
        </CustomerContext.Provider>
    );
}

export function useCustomer() {
    const context = useContext(CustomerContext);
    if (!context) throw new Error("useCustomer must be used within CustomerProvider");
    return context;
}
