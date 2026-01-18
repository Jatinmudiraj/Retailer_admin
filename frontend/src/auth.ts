import { apiGet, apiPost } from "./api";

export type AdminUser = {
    email: string;
    name?: string | null;
    picture?: string | null;
};

export async function authGoogle(credential: string) {
    return apiPost<{ ok: boolean; user: AdminUser }>("/auth/google", { credential });
}

export async function authMe() {
    return apiGet<{ ok: boolean; user: AdminUser }>("/auth/me");
}

export async function authLogout() {
    return apiPost<{ ok: boolean }>("/auth/logout", {});
}
