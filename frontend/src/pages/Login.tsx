import React, { useState } from "react";
import { Link } from "react-router-dom";
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
            background: "#080808",
            color: "#fff",
            fontFamily: "'Outfit', sans-serif"
        }}>
            {/* High-End Background Effects */}
            <div style={{ position: "absolute", top: "20%", left: "15%", width: 600, height: 600, background: "#D4AF37", filter: "blur(250px)", opacity: 0.05, borderRadius: "50%" }}></div>
            <div style={{ position: "absolute", bottom: "10%", right: "10%", width: 400, height: 400, background: "#fff", filter: "blur(200px)", opacity: 0.03, borderRadius: "50%" }}></div>

            <div style={{
                width: 460,
                padding: "56px 48px",
                background: "rgba(20, 20, 20, 0.4)",
                backdropFilter: "blur(40px)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: 40,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
                position: "relative",
                zIndex: 1
            }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 40 }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 24,
                        background: "linear-gradient(135deg, #D4AF37 0%, #aa8b2c 100%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 24, boxShadow: "0 20px 40px rgba(212, 175, 55, 0.15)"
                    }}>
                        <ShieldCheck size={36} color="#000" />
                    </div>
                    <h1 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px 0", letterSpacing: -1 }}>Administrator</h1>
                    <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", textAlign: "center", fontWeight: 500 }}>
                        {isSignup ? "Create your administrative credentials." : "Secure entry to RoyalIQ Retailer Systems."}
                    </p>
                </div>

                {err && (
                    <div style={{
                        background: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        color: "#ef4444",
                        padding: "14px 20px",
                        borderRadius: 16,
                        fontSize: 14,
                        marginBottom: 32,
                        display: "flex", alignItems: "center", gap: 12, fontWeight: 500
                    }}>
                        <Lock size={16} /> {err}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {isSignup && (
                        <div style={{ position: "relative" }}>
                            <User size={18} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
                            <input
                                type="text"
                                placeholder="Universal Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{
                                    width: "100%", padding: "16px 20px 16px 52px",
                                    background: "rgba(255,255,255,0.03)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    borderRadius: 16, color: "#fff", fontSize: 15,
                                    outline: "none", transition: "all 0.3s"
                                }}
                                onFocus={e => { e.target.style.borderColor = "rgba(212, 175, 55, 0.5)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                            />
                        </div>
                    )}
                    <div style={{ position: "relative" }}>
                        <Mail size={18} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: "100%", padding: "16px 20px 16px 52px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 16, color: "#fff", fontSize: 15,
                                outline: "none", transition: "all 0.3s"
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(212, 175, 55, 0.5)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                        />
                    </div>
                    <div style={{ position: "relative" }}>
                        <Key size={18} style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }} />
                        <input
                            type="password"
                            placeholder="Access Token"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{
                                width: "100%", padding: "16px 20px 16px 52px",
                                background: "rgba(255,255,255,0.03)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                borderRadius: 16, color: "#fff", fontSize: 15,
                                outline: "none", transition: "all 0.3s"
                            }}
                            onFocus={e => { e.target.style.borderColor = "rgba(212, 175, 55, 0.5)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                            onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%", padding: "18px",
                            background: "#D4AF37", border: "none",
                            borderRadius: 100, color: "#000",
                            fontWeight: 800, fontSize: 16,
                            cursor: loading ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            gap: 12, marginTop: 12, transition: "all 0.3s"
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                        onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                    >
                        {loading ? "Authorizing..." : (isSignup ? "Generate Access" : "Initiate Login")}
                        {!loading && <ArrowRight size={20} />}
                    </button>
                </form>

                <div style={{ margin: "40px 0", display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }}></div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>Or</div>
                    <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.05)" }}></div>
                </div>

                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: 40 }}>
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
                        theme="outline"
                        shape="pill"
                        text="continue_with"
                        width="364"
                    />
                </div>

                <div style={{ textAlign: "center" }}>
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={{
                            background: "none", border: "none",
                            color: "rgba(255,255,255,0.5)", fontSize: 14,
                            cursor: "pointer", fontWeight: 600, transition: "color 0.2s"
                        }}
                        onMouseOver={e => e.currentTarget.style.color = "#D4AF37"}
                        onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
                    >
                        {isSignup ? "Back to Login Portal" : "Establish New Administrator"}
                    </button>
                </div>

                {/* Back to Shop Link */}
                <div style={{ marginTop: 40, paddingTop: 32, borderTop: "1px solid rgba(255,255,255,0.05)", textAlign: "center" }}>
                    <Link to="/" style={{ textDecoration: "none", color: "#D4AF37", fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                        &larr; Return to Boutique
                    </Link>
                </div>
            </div>
        </div>
    );
}
