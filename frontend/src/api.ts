let API_BASE = import.meta.env.VITE_API_BASE_URL || "";
if (API_BASE && !API_BASE.startsWith("http")) {
    API_BASE = `https://${API_BASE}`;
}
console.log("RoyalIQ Configuration:");
console.log(" - API BASE URL:", API_BASE);
console.log(" - Mode:", import.meta.env.MODE);

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
