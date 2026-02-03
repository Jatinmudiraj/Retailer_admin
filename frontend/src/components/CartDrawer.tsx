import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { ShoppingBag, X, Trash2, ArrowRight } from "lucide-react";
import { publicCreateOrder } from "../api";
import toast from "react-hot-toast";

export default function CartDrawer() {
    const { items, isOpen, setIsOpen, removeFromCart, cartTotal, clearCart } = useCart();
    const [step, setStep] = useState<"cart" | "checkout">("cart");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    async function handleCheckout(e: React.FormEvent) {
        e.preventDefault();
        if (!name || !phone) return;
        setLoading(true);
        try {
            await publicCreateOrder({
                customer_name: name,
                customer_phone: phone,
                items: items.map(i => ({ sku: i.product.sku, qty: i.qty, price: i.product.price || 0 }))
            });
            toast.success("Order placed successfully!");
            clearCart();
            setStep("cart");
            setIsOpen(false);
        } catch (error: any) {
            toast.error("Failed to place order");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            {/* Backdrop */}
            <div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 999, backdropFilter: "blur(4px)" }}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "100%",
                    background: "#fff", borderLeft: "1px solid rgba(0,0,0,0.05)", zIndex: 1000,
                    display: "flex", flexDirection: "column", boxShadow: "-20px 0 50px rgba(0,0,0,0.05)",
                    fontFamily: "'Outfit', sans-serif"
                }}
            >
                <div style={{ padding: 24, borderBottom: "1px solid rgba(0,0,0,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, color: "#1a1a1a" }}>
                        <ShoppingBag size={22} color="#D4AF37" />
                        {step === "cart" ? "Your Bag" : "Checkout"}
                    </h2>
                    <button onClick={() => setIsOpen(false)} style={{ background: "#f5f5f5", border: "none", color: "#666", cursor: "pointer", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#999", marginTop: 60 }}>
                            <ShoppingBag size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
                            <div style={{ fontSize: 16, fontWeight: 500 }}>Your bag is empty.</div>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ marginTop: 20, background: "none", border: "1px solid #e0e0e0", padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 14 }}
                            >
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        step === "cart" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {items.map(item => (
                                    <div key={item.product.sku} style={{ display: "flex", gap: 16, background: "#fdfbf7", padding: 12, borderRadius: 16, border: "1px solid rgba(0,0,0,0.03)" }}>
                                        <div style={{ width: 80, height: 80, background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(0,0,0,0.05)" }}>
                                            <img src={item.product.images[0]?.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>{item.product.name}</div>
                                            <div style={{ fontSize: 13, color: "#666", marginTop: 4, fontWeight: 500 }}>
                                                {item.qty} x ₹{item.product.price?.toLocaleString() || "On Request"}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product.sku)}
                                            style={{ background: "#fdeaea", border: "none", color: "#e74c3c", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <form id="checkout-form" onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Full Name</label>
                                    <input
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        style={{ width: "100%", background: "#f9f9f9", border: "1px solid #eee", color: "#1a1a1a", padding: "12px 16px", borderRadius: 12, outline: "none", fontSize: 14 }}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 12, color: "#888", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone Number</label>
                                    <input
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        style={{ width: "100%", background: "#f9f9f9", border: "1px solid #eee", color: "#1a1a1a", padding: "12px 16px", borderRadius: 12, outline: "none", fontSize: 14 }}
                                        placeholder="+91 9876543210"
                                    />
                                    <div style={{ fontSize: 12, color: "#888", marginTop: 8, lineHeight: 1.4 }}>We will contact you on this number to confirm the order details.</div>
                                </div>
                            </form>
                        )
                    )}
                </div>

                {items.length > 0 && (
                    <div style={{ padding: 24, borderTop: "1px solid rgba(0,0,0,0.05)", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>
                            <span>Total</span>
                            <span>{cartTotal > 0 ? `₹${cartTotal.toLocaleString()}` : "On Request"}</span>
                        </div>
                        {step === "cart" ? (
                            <button
                                onClick={() => setStep("checkout")}
                                style={{
                                    width: "100%", background: "#D4AF37", color: "#000", border: "none",
                                    padding: "16px", borderRadius: 50, fontWeight: 800, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    fontSize: 16, transition: "transform 0.2s"
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                            >
                                Proceed to Checkout <ArrowRight size={18} />
                            </button>
                        ) : (
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => setStep("cart")}
                                    style={{
                                        flex: 1, background: "#f5f5f5", color: "#1a1a1a", border: "none",
                                        padding: "16px", borderRadius: 50, fontWeight: 700, cursor: "pointer", fontSize: 15
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    form="checkout-form"
                                    disabled={loading}
                                    style={{
                                        flex: 2, background: "#D4AF37", color: "#000", border: "none",
                                        padding: "16px", borderRadius: 50, fontWeight: 800, cursor: "pointer", opacity: loading ? 0.7 : 1,
                                        fontSize: 16, transition: "transform 0.2s"
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                                    onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                                >
                                    {loading ? "Placing Order..." : "Confirm & Place Order"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
