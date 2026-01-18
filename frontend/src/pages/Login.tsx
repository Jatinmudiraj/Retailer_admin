import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { authGoogle } from "../auth";
import { ShieldCheck, Lock } from "lucide-react";

export default function Login() {
    const [err, setErr] = useState<string>("");

    return (
        <div style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
            color: "#fff"
        }}>
            {/* Background Accents */}
            <div style={{ position: "absolute", top: "20%", left: "20%", width: 300, height: 300, background: "var(--accent)", filter: "blur(120px)", opacity: 0.1, borderRadius: "50%" }}></div>
            <div style={{ position: "absolute", bottom: "20%", right: "20%", width: 250, height: 250, background: "#fff", filter: "blur(100px)", opacity: 0.05, borderRadius: "50%" }}></div>

            <div className="card" style={{
                width: 400,
                padding: 40,
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}>
                <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: "linear-gradient(135deg, var(--accent) 0%, #a07a1a 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 24, boxShadow: "0 10px 20px rgba(212, 175, 55, 0.3)"
                }}>
                    <ShieldCheck size={32} color="#fff" />
                </div>

                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>RoyalIQ Admin</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 32, textAlign: "center", lineHeight: 1.5 }}>
                    Secure access for authorized retailers only.<br />
                    Please sign in to manage your vault.
                </div>

                {err && (
                    <div style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 24,
                        display: "flex", alignItems: "center", gap: 8, width: "100%"
                    }}>
                        <Lock size={14} /> {err}
                    </div>
                )}

                <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
                    <GoogleLogin
                        onSuccess={async (cred) => {
                            try {
                                setErr("");
                                const token = cred.credential;
                                if (!token) {
                                    setErr("No credential returned by Google");
                                    return;
                                }
                                await authGoogle(token);
                                window.location.href = "/";
                            } catch (e: any) {
                                console.error(e);
                                setErr(e?.message || "Login failed. Check server logs.");
                            }
                        }}
                        onError={() => setErr("Google login failed")}
                        theme="filled_black"
                        shape="pill"
                        width="320"
                    />
                </div>

                <div style={{ marginTop: 32, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                    &copy; 2024 RoyalIQ Retailer Systems
                </div>
            </div>
        </div>
    );
}
