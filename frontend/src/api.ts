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

// -----------------------
// Public Shop API
// -----------------------
export type PublicProduct = {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    weight_g?: number;
    price?: number;
    images: { url: string; is_primary: boolean }[];
    related_products?: string[];
};

export async function publicListProducts(q?: string, category?: string) {
    const params = new URLSearchParams();
    if (q) params.append("q", q);
    if (category) params.append("category", category);
    params.append("limit", "1000");
    return apiGet<PublicProduct[]>(`/public/products?${params.toString()}`);
}

export async function publicGetProduct(sku: string) {
    return apiGet<PublicProduct>(`/public/products/${sku}`);
}

export async function publicCreateOrder(data: {
    customer_name: string;
    customer_phone: string;
    items: { sku: string; qty: number; price: number }[];
}) {
    return apiPost("/public/orders", data);
}

// -----------------------
// Customer Auth
// -----------------------
export type CustomerUser = {
    id: string;
    name: string;
    phone: string;
    role: "customer";
};

export async function customerSignup(data: { phone: string; password: string; name: string; email?: string }) {
    return apiPost<{ ok: boolean; user: CustomerUser }>("/auth/customer/signup", data);
}

export async function customerLogin(data: { phone: string; password: string }) {
    return apiPost<{ ok: boolean; user: CustomerUser }>("/auth/customer/login", data);
}

export async function customerLogout() {
    return apiPost("/auth/customer/logout", {});
}

export async function customerMe() {
    return apiGet<{ ok: boolean; user: CustomerUser }>("/auth/customer/me");
}

export type CustomerGoogleAuthResult = {
    ok: boolean;
    status: "success" | "need_phone";
    user?: CustomerUser;
    google_profile?: { email: string; name: string; picture?: string };
};

export async function customerGoogleAuth(credential: string) {
    return apiPost<CustomerGoogleAuthResult>("/auth/customer/google", { credential });
}

export async function createPaymentOrder(amount: number) {
    return apiPost<{ ok: boolean; order_id: string; amount: number; currency: string; key_id: string }>("/payment/create_order", { amount });
}

export async function verifyPayment(data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; total_amount: number }) {
    return apiPost<{ ok: boolean; order_id: string; status: string }>("/payment/verify", data);
}
