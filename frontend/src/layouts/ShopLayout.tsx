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
                background: "none", border: "none", color: "#1a1a1a", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", position: "relative",
                borderRadius: 50, transition: "background 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
            onMouseOut={e => e.currentTarget.style.background = "none"}
        >
            <ShoppingBag size={22} />
            {count > 0 && (
                <span style={{
                    position: "absolute", top: -2, right: -2,
                    background: "#000", color: "#fff",
                    fontSize: 9, fontWeight: 800,
                    width: 18, height: 18, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid #FDFBF7"
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
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, background: "#D4AF37", borderRadius: "50%" }}></div>
                    {customer.name}
                </div>
                <button
                    onClick={logout}
                    style={{
                        background: "none", border: "1px solid #eee", color: "#666",
                        padding: "8px 16px", borderRadius: 50, cursor: "pointer", fontSize: 12, fontWeight: 600,
                        transition: "all 0.2s"
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#999"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#eee"; }}
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
                fontSize: 13,
                fontWeight: 800,
                padding: "10px 24px",
                background: "#000",
                color: "#fff",
                borderRadius: 50,
                transition: "all 0.2s"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
            Login
        </Link>
    );
}

export default function ShopLayout(props: { children: React.ReactNode }) {
    return (
        <>
            <CartDrawer />
            <div className="shop-layout" style={{ minHeight: "100vh", background: "#FDFBF7", color: "#1a1a1a", fontFamily: "'Outfit', sans-serif" }}>
                <Toaster position="top-right" />

                {/* Header */}
                <header style={{
                    height: 90,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 60px",
                    position: "sticky",
                    top: 0,
                    background: "rgba(253, 251, 247, 0.85)",
                    backdropFilter: "blur(20px)",
                    zIndex: 100,
                    borderBottom: "1px solid rgba(0,0,0,0.03)"
                }}>
                    <Link to="/" style={{ textDecoration: 'none', color: '#000', display: "flex", flexDirection: "column" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1 }}>
                            ROYAL<span style={{ color: "#D4AF37" }}>IQ</span>
                        </div>
                        <div style={{ fontSize: 9, color: "#D4AF37", fontWeight: 800, letterSpacing: 2.5, marginTop: 4, textTransform: "uppercase" }}>
                            Haute Joaillerie
                        </div>
                    </Link>

                    <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
                        <div style={{ display: "flex", gap: 32, marginRight: 24, borderRight: "1px solid #eee", paddingRight: 32 }}>
                            {["Collection", "Heritage", "Artisans", "Bespoke"].map(item => (
                                <Link key={item} to="/" style={{ textDecoration: "none", color: "#666", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{item}</Link>
                            ))}
                        </div>
                        <HeaderCart />
                        <CustomerHeaderAuth />
                    </nav>
                </header>

                {/* Main Content */}
                <main style={{ padding: "60px 40px", maxWidth: 1600, margin: "0 auto" }}>
                    {props.children}
                </main>

                {/* Footer */}
                <footer style={{
                    borderTop: "1px solid rgba(0,0,0,0.05)",
                    padding: "100px 60px 60px",
                    background: "#fff",
                    marginTop: 100
                }}>
                    <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 80, marginBottom: 80 }}>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1, marginBottom: 20 }}>
                                ROYAL<span style={{ color: "#D4AF37" }}>IQ</span>
                            </div>
                            <p style={{ color: "#666", lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>
                                Elevating the art of jewellery through exceptional craftsmanship and revolutionary AI experiences. <br /> From our vault to your heritage.
                            </p>
                            <div style={{ display: "flex", gap: 16 }}>
                                {[1, 2, 3, 4].map(i => <div key={i} style={{ width: 40, height: 40, background: "#f5f5f5", borderRadius: "50%" }}></div>)}
                            </div>
                        </div>
                        {["Explore", "Services", "House"].map((group, idx) => (
                            <div key={group}>
                                <h4 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 28 }}>{group}</h4>
                                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                    {[1, 2, 3, 4].map(i => (
                                        <Link key={i} to="/" style={{ textDecoration: "none", color: "#888", fontSize: 14, fontWeight: 500 }}>Link {i}</Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        borderTop: "1px solid #f5f5f5",
                        paddingTop: 40,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#999",
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 1
                    }}>
                        <div>&copy; {new Date().getFullYear()} RoyalIQ Retailer Systems</div>
                        <div style={{ display: "flex", gap: 32 }}>
                            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>Privacy Policy</Link>
                            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>Terms of Service</Link>
                            <Link to="/login" style={{ textDecoration: "none", color: "#D4AF37", fontWeight: 800 }}>Admin Portal</Link>
                        </div>
                    </div>
                </footer>

                {/* Floating Chat Button */}
                <button style={{
                    position: "fixed", bottom: 40, right: 40,
                    width: 64, height: 64, borderRadius: "50%",
                    background: "#000", color: "#fff",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                    zIndex: 1000, transition: "transform 0.3s"
                }}
                    onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
                    onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                >
                    <MessageCircle size={28} />
                </button>
            </div>
        </>
    );
}
