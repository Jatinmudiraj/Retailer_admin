let API_BASE = import.meta.env.VITE_API_BASE_URL || "";
if (API_BASE && !API_BASE.startsWith("http")) {
    API_BASE = `https://${API_BASE}`;
}

// Ensure no trailing slash on base
if (API_BASE.endsWith("/")) {
    API_BASE = API_BASE.slice(0, -1);
}

// FIX: If the Env Var is just the internal service name (Render default "host"),
// the browser cannot resolve it. We must force the public .onrender.com URL.
if (API_BASE === "https://royaliq-backend" || API_BASE === "http://royaliq-backend") {
    console.warn("Detected internal Render hostname. Switching to public URL.");
    API_BASE = "https://royaliq-backend.onrender.com";
}

if (!API_BASE) {
    console.error("WARNING: VITE_API_BASE_URL is not set! API calls will likely fail.");
    // Fallback for safety
    if (import.meta.env.MODE === "production") {
        API_BASE = "https://royaliq-backend.onrender.com";
    }
}

console.log("RoyalIQ Configuration:");
console.log(" - API BASE URL:", API_BASE);

export type AdminUser = {
    email: string;
    name?: string | null;
    picture?: string | null;
};

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
    if (!res.ok) {
        throw new Error(`GET ${path} failed: ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
    }
    return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`PUT ${path} failed: ${res.status} ${txt}`);
    }
    return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`DELETE ${path} failed: ${res.status} ${txt}`);
    }
    return res.json() as Promise<T>;
}

export async function authLogin(data: any) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/login", data);
}

export async function authSignup(data: any) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/signup", data);
}
