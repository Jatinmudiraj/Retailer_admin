import React from "react";
import { Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import CartDrawer from "../components/CartDrawer";

function HeaderCart() {
    const { setIsOpen, items } = useCart();
    const count = items.reduce((a, b) => a + b.qty, 0);

    return (
        <button
            onClick={() => setIsOpen(true)}
            style={{
                background: "none", border: "none", color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, padding: 8, position: "relative"
            }}
        >
            <ShoppingBag size={24} />
            {count > 0 && (
                <span style={{
                    position: "absolute", top: 0, right: 0,
                    background: "#D4AF37", color: "#000",
                    fontSize: 10, fontWeight: 700,
                    width: 18, height: 18, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    {count}
                </span>
            )}
        </button>
    );
}

function CustomerHeaderAuth() {
    const { customer, logout } = useCustomer();

    if (customer) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 13, color: "#D4AF37" }}>Hi, {customer.name}</div>
                <button
                    onClick={logout}
                    style={{
                        background: "none", border: "1px solid #333", color: "#888",
                        padding: "4px 8px", borderRadius: 4, cursor: "pointer", fontSize: 11
                    }}
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <Link
            to="/customer/login"
            style={{
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600,
                padding: "8px 16px",
                background: "#D4AF37",
                color: "#000",
                borderRadius: 6,
            }}
        >
            Sign In
        </Link>
    );
}

export default function ShopLayout(props: { children: React.ReactNode }) {
    return (
        <>
            <CartDrawer />
            <div className="shop-layout" style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
                <Toaster position="top-right" />

                {/* Header */}
                <header style={{
                    height: 70,
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 40px",
                    position: "sticky",
                    top: 0,
                    background: "rgba(10,10,10,0.8)",
                    backdropFilter: "blur(10px)",
                    zIndex: 100
                }}>
                    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                        <Link to="/" style={{ textDecoration: 'none', color: '#fff' }}>
                            ROYAL<span style={{ color: "#D4AF37" }}>IQ</span>
                        </Link>
                    </div>
                    <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <a
                            href="https://wa.me/"
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#fff", textDecoration: "none", display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}
                        >
                            <MessageCircle size={16} /> WhatsApp
                        </a>
                        <HeaderCart />
                        <Link
                            to="/admin"
                            style={{
                                textDecoration: 'none',
                                color: 'var(--text-muted, #888)',
                                fontSize: 14,
                                fontWeight: 500,
                                padding: "8px 16px",
                                borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.1)",
                                transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = "#D4AF37"}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
                        >
                            Admin Login
                        </Link>
                        <CustomerHeaderAuth />
                    </nav>
                </header>

                {/* Main Content */}
                <main style={{ padding: 40, maxWidth: 1400, margin: "0 auto" }}>
                    {props.children}
                </main>

                {/* Footer */}
                <footer style={{
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    padding: "40px",
                    textAlign: "center",
                    color: "#666",
                    fontSize: 14,
                    marginTop: 60
                }}>
                    <p>&copy; {new Date().getFullYear()} RoyalIQ Retailer. All rights reserved.</p>
                </footer>
            </div>
        </>
    );
}
