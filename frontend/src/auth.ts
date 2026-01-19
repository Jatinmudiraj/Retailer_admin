import { apiGet, apiPost, AdminUser } from "./api";
export type { AdminUser };

export async function authGoogle(credential: string) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/google", { credential });
}

export async function authMe() {
    return apiGet<{ ok: boolean; user: AdminUser }>("/auth/me");
}

export async function authLogout() {
    return apiPost<{ ok: boolean }>("/auth/logout", {});
}

export async function authEmailLogin(data: any) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/login", data);
}

export async function authEmailSignup(data: any) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/signup", data);
}
