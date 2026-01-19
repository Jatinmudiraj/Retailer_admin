import React, { useState } from "react";
import ShopLayout from "../layouts/ShopLayout";
import { useCustomer } from "../context/CustomerContext";
import { Link, useNavigate } from "react-router-dom";
import { Lock, User, Phone, ArrowRight, ShieldCheck } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { customerGoogleAuth } from "../api";
import toast from "react-hot-toast";

export default function CustomerAuth() {
    const { login, signup, customer } = useCustomer();
    const navigate = useNavigate();
    const [isSignup, setIsSignup] = useState(false);
    const [loading, setLoading] = useState(false);

    // "need_phone" flow state
    const [googleProfile, setGoogleProfile] = useState<{ email: string; name: string } | null>(null);

    // Form state
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    if (customer) {
        navigate("/");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (googleProfile) {
                // Google Flow Completion
                await signup({
                    phone,
                    password: "google_linked_" + Math.random().toString(36), // Dummy password or we could make it optional in backend
                    name: googleProfile.name,
                    email: googleProfile.email
                });
            } else if (isSignup) {
                await signup({ phone, password, name, email });
            } else {
                await login({ phone, password });
            }
            navigate("/");
        } catch (e: any) {
            // Toast handled in context
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (cred: any) => {
        try {
            const res = await customerGoogleAuth(cred.credential);
            if (res.status === "success") {
                // Determine how to set user in context. 
                // Since our context relies on `customerMe` or manual set, we might need a refresh.
                // Re-load window or we can assume the cookie is set and context will pick it up on refresh.
                // Better: expose a `refresh` method in context or just hard navigation.
                window.location.href = "/";
            } else if (res.status === "need_phone" && res.google_profile) {
                setGoogleProfile(res.google_profile);
                setName(res.google_profile.name);
                setEmail(res.google_profile.email);
                setIsSignup(true); // Force into signup mode
                toast("Please provide your phone number to complete registration.", { icon: "📱" });
            }
        } catch (e) {
            console.error(e);
            toast.error("Google Login failed");
        }
    };

    return (
        <ShopLayout>
            <div style={{
                minHeight: "80vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Inter', sans-serif"
            }}>
                {/* Background ambient light */}
                <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 500, height: 500, background: "#D4AF37", filter: "blur(200px)", opacity: 0.1, zIndex: 0 }}></div>

                <div className="card" style={{
                    width: 420,
                    padding: 40,
                    background: "rgba(20, 20, 20, 0.8)",
                    backdropFilter: "blur(20px)",
                    borderRadius: 24,
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                    zIndex: 1,
                    position: "relative"
                }}>
                    <div style={{ textAlign: "center", marginBottom: 30 }}>
                        <div style={{
                            width: 60, height: 60, margin: "0 auto 20px",
                            background: "linear-gradient(135deg, #D4AF37 0%, #aa8b2c 100%)",
                            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            boxShadow: "0 10px 20px rgba(212, 175, 55, 0.2)"
                        }}>
                            <User size={28} color="#000" />
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px 0" }}>
                            {googleProfile ? "Complete Profile" : (isSignup ? "Create Account" : "Welcome Back")}
                        </h2>
                        <p style={{ color: "#888", fontSize: 14 }}>
                            {googleProfile ? "One last step to secure your account." : (isSignup ? "Join our exclusive club." : "Sign in to access your vault.")}
                        </p>
                    </div>

                    {!googleProfile && (
                        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error("Google Login Failed")}
                                theme="filled_black"
                                shape="pill"
                                width="340"
                                text="continue_with"
                            />
                        </div>
                    )}

                    {!googleProfile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                            <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>Or continue with phone</div>
                            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }}></div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {(isSignup || googleProfile) && (
                            <div style={{ position: "relative" }}>
                                <User size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                                <input
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    disabled={!!googleProfile}
                                    style={{
                                        width: "100%", padding: "12px 16px 12px 42px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff", borderRadius: 12, outline: "none", fontSize: 14,
                                        opacity: googleProfile ? 0.6 : 1
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ position: "relative" }}>
                            <Phone size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                            <input
                                placeholder="Phone Number"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                required
                                style={{
                                    width: "100%", padding: "12px 16px 12px 42px",
                                    background: "rgba(255,255,255,0.05)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    color: "#fff", borderRadius: 12, outline: "none", fontSize: 14
                                }}
                            />
                        </div>

                        {(isSignup && !googleProfile) && (
                            <div style={{ position: "relative" }}>
                                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#666", fontSize: 14 }}>@</div>
                                <input
                                    placeholder="Email (Optional)"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={{
                                        width: "100%", padding: "12px 16px 12px 42px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff", borderRadius: 12, outline: "none", fontSize: 14
                                    }}
                                />
                            </div>
                        )}

                        {!googleProfile && (
                            <div style={{ position: "relative" }}>
                                <Lock size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#666" }} />
                                <input
                                    placeholder="Password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%", padding: "12px 16px 12px 42px",
                                        background: "rgba(255,255,255,0.05)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        color: "#fff", borderRadius: 12, outline: "none", fontSize: 14
                                    }}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: "#D4AF37", color: "#000",
                                padding: "14px", border: "none", borderRadius: 12,
                                fontWeight: 700, fontSize: 14, cursor: "pointer",
                                marginTop: 10, display: "flex", justifyContent: "center", alignItems: "center", gap: 8,
                                transition: "all 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
                            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                            {loading ? "Processing..." : (googleProfile ? "Complete Registration" : (isSignup ? "Sign Up" : "Sign In"))}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </form>

                    {!googleProfile && (
                        <div style={{ marginTop: 24, textAlign: "center" }}>
                            <button
                                onClick={() => setIsSignup(!isSignup)}
                                style={{
                                    background: "none", border: "none", color: "#D4AF37",
                                    cursor: "pointer", fontSize: 13, fontWeight: 500
                                }}
                            >
                                {isSignup ? "Already have an account? Sign In" : "New customer? Create account"}
                            </button>
                        </div>
                    )}

                    {/* Admin Login Link */}
                    <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
                        <Link to="/login" style={{ fontSize: 12, color: "#666", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <ShieldCheck size={12} /> Are you an administrator? Login here
                        </Link>
                    </div>
                </div>
            </div>
        </ShopLayout>
    );
}
