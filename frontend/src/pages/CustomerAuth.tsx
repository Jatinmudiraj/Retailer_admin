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
                fontFamily: "'Outfit', sans-serif"
            }}>
                {/* Background ambient light */}
                <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, background: "#D4AF37", filter: "blur(250px)", opacity: 0.05, zIndex: 0 }}></div>

                <div style={{
                    width: 440,
                    padding: "48px 40px",
                    background: "#fff",
                    borderRadius: 32,
                    border: "1px solid rgba(0,0,0,0.04)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.05)",
                    zIndex: 1,
                    position: "relative"
                }}>
                    <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{
                            width: 64, height: 64, margin: "0 auto 24px",
                            background: "linear-gradient(135deg, #fdfbf7 0%, #f5f5f5 100%)",
                            borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
                            border: "1px solid rgba(0,0,0,0.05)"
                        }}>
                            <User size={28} color="#D4AF37" />
                        </div>
                        <h2 style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px 0", color: "#1a1a1a", letterSpacing: -0.5 }}>
                            {googleProfile ? "Complete Profile" : (isSignup ? "Create Account" : "Welcome Back")}
                        </h2>
                        <p style={{ color: "#666", fontSize: 15, fontWeight: 500 }}>
                            {googleProfile ? "One last step to secure your account." : (isSignup ? "Join our exclusive club." : "Sign in to access your vault.")}
                        </p>
                    </div>

                    {!googleProfile && (
                        <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
                            <div style={{ width: "100%", overflow: "hidden" }}>
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => toast.error("Google Login Failed")}
                                    theme="outline"
                                    shape="pill"
                                    width="100%"
                                    text="continue_with"
                                />
                            </div>
                        </div>
                    )}

                    {!googleProfile && (
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                            <div style={{ flex: 1, height: 1, background: "#eee" }}></div>
                            <div style={{ fontSize: 11, color: "#999", textTransform: "uppercase", fontWeight: 700, letterSpacing: 1 }}>Or</div>
                            <div style={{ flex: 1, height: 1, background: "#eee" }}></div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {(isSignup || googleProfile) && (
                            <div style={{ position: "relative" }}>
                                <User size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                                <input
                                    placeholder="Full Name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    disabled={!!googleProfile}
                                    style={{
                                        width: "100%", padding: "14px 16px 14px 48px",
                                        background: "#f9f9f9",
                                        border: "1px solid #eee",
                                        color: "#1a1a1a", borderRadius: 16, outline: "none", fontSize: 14,
                                        opacity: googleProfile ? 0.6 : 1, transition: "border-color 0.2s"
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#D4AF37"}
                                    onBlur={e => e.target.style.borderColor = "#eee"}
                                />
                            </div>
                        )}

                        <div style={{ position: "relative" }}>
                            <Phone size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                            <input
                                placeholder="Phone Number"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                required
                                style={{
                                    width: "100%", padding: "14px 16px 14px 48px",
                                    background: "#f9f9f9",
                                    border: "1px solid #eee",
                                    color: "#1a1a1a", borderRadius: 16, outline: "none", fontSize: 14,
                                    transition: "border-color 0.2s"
                                }}
                                onFocus={e => e.target.style.borderColor = "#D4AF37"}
                                onBlur={e => e.target.style.borderColor = "#eee"}
                            />
                        </div>

                        {(isSignup && !googleProfile) && (
                            <div style={{ position: "relative" }}>
                                <div style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "#999", fontSize: 16 }}>@</div>
                                <input
                                    placeholder="Email Address"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    style={{
                                        width: "100%", padding: "14px 16px 14px 48px",
                                        background: "#f9f9f9",
                                        border: "1px solid #eee",
                                        color: "#1a1a1a", borderRadius: 16, outline: "none", fontSize: 14,
                                        transition: "border-color 0.2s"
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#D4AF37"}
                                    onBlur={e => e.target.style.borderColor = "#eee"}
                                />
                            </div>
                        )}

                        {!googleProfile && (
                            <div style={{ position: "relative" }}>
                                <Lock size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "#999" }} />
                                <input
                                    placeholder="Password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{
                                        width: "100%", padding: "14px 16px 14px 48px",
                                        background: "#f9f9f9",
                                        border: "1px solid #eee",
                                        color: "#1a1a1a", borderRadius: 16, outline: "none", fontSize: 14,
                                        transition: "border-color 0.2s"
                                    }}
                                    onFocus={e => e.target.style.borderColor = "#D4AF37"}
                                    onBlur={e => e.target.style.borderColor = "#eee"}
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                background: "#D4AF37", color: "#000",
                                padding: "16px", border: "none", borderRadius: 50,
                                fontWeight: 800, fontSize: 16, cursor: "pointer",
                                marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 10,
                                transition: "all 0.2s"
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                        >
                            {loading ? "Processing..." : (googleProfile ? "Complete Registration" : (isSignup ? "Create Account" : "Sign In"))}
                            {!loading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    {!googleProfile && (
                        <div style={{ marginTop: 32, textAlign: "center" }}>
                            <button
                                onClick={() => setIsSignup(!isSignup)}
                                style={{
                                    background: "none", border: "none", color: "#D4AF37",
                                    cursor: "pointer", fontSize: 14, fontWeight: 700
                                }}
                            >
                                {isSignup ? "Already have an account? Sign In" : "New customer? Create account"}
                            </button>
                        </div>
                    )}

                    {/* Admin Login Link */}
                    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
                        <Link to="/login" style={{ fontSize: 13, color: "#999", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                            <ShieldCheck size={14} /> Administrator Access
                        </Link>
                    </div>
                </div>
            </div>
        </ShopLayout>
    );
}
