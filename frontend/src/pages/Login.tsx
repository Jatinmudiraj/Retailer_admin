import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { authGoogle, authEmailLogin, authEmailSignup } from "../auth";
import { ShieldCheck, Lock, Mail, Key, User, ArrowRight } from "lucide-react";

export default function Login() {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr("");
        setLoading(true);

        try {
            if (isSignup) {
                await authEmailSignup({ email, password, name });
            } else {
                await authEmailLogin({ email, password });
            }
            window.location.href = "/admin";
        } catch (e: any) {
            console.error(e);
            setErr(e?.message || "Authentication failed. Check credentials or server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)",
            color: "#fff",
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background Accents */}
            <div style={{ position: "absolute", top: "20%", left: "20%", width: 300, height: 300, background: "var(--accent)", filter: "blur(120px)", opacity: 0.1, borderRadius: "50%" }}></div>
            <div style={{ position: "absolute", bottom: "20%", right: "20%", width: 250, height: 250, background: "#fff", filter: "blur(100px)", opacity: 0.05, borderRadius: "50%" }}></div>

            <div className="card" style={{
                width: 440,
                padding: "40px 48px",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 24,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: "linear-gradient(135deg, var(--accent) 0%, #a07a1a 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 20, boxShadow: "0 10px 20px rgba(212, 175, 55, 0.3)"
                    }}>
                        <ShieldCheck size={28} color="#fff" />
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>RoyalIQ Admin</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
                        {isSignup ? "Create your administrator account." : "Please sign in to manage your vault."}
                    </div>
                </div>

                {err && (
                    <div style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        padding: "12px 16px",
                        borderRadius: 12,
                        fontSize: 13,
                        marginBottom: 24,
                        display: "flex", alignItems: "center", gap: 10
                    }}>
                        <Lock size={14} /> {err}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {isSignup && (
                        <div style={{ position: "relative" }}>
                            <User size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: "100%",
                                    padding: "14px 16px 14px 44px",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: 12,
                                    color: "#fff",
                                    fontSize: 14,
                                    outline: "none"
                                }}
                            />
                        </div>
                    )}
                    <div style={{ position: "relative" }}>
                        <Mail size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "14px 16px 14px 44px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 12,
                                color: "#fff",
                                fontSize: 14,
                                outline: "none"
                            }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <Key size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%",
                                padding: "14px 16px 14px 44px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 12,
                                color: "#fff",
                                fontSize: 14,
                                outline: "none"
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "14px",
                            background: "var(--accent)",
                            border: "none",
                            borderRadius: 12,
                            color: "#000",
                            fontWeight: 600,
                            fontSize: 14,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            marginTop: 8,
                            transition: "all 0.2s"
                        }}
                    >
                        {loading ? "Processing..." : (isSignup ? "Create Account" : "Sign In")}
                        {!loading && <ArrowRight size={16} />}
                    </button>
                </form>

                <div style={{ margin: "24px 0", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1 }}>OR</div>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                </div>

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
                                window.location.href = "/admin";
                            } catch (e: any) {
                                console.error(e);
                                setErr(e?.message || "Login failed. Check server logs.");
                            }
                        }}
                        onError={() => setErr("Google login failed")}
                        theme="filled_black"
                        shape="pill"
                        text="continue_with"
                        width="344"
                    />
                </div>

                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent)",
                            fontSize: 13,
                            cursor: "pointer",
                            fontWeight: 500
                        }}
                    >
                        {isSignup ? "Already have an account? Sign In" : "Don't have an account? Create one"}
                    </button>
                </div>

                <div style={{ marginTop: 40, fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
                    &copy; 2024 RoyalIQ Retailer Systems
                </div>
            </div>
        </div>
    );
}
