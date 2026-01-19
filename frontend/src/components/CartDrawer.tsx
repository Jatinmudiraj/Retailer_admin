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
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 999 }}
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div
                style={{
                    position: "fixed", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100%",
                    background: "#111", borderLeft: "1px solid #333", zIndex: 1000,
                    display: "flex", flexDirection: "column", boxShadow: "-10px 0 30px rgba(0,0,0,0.5)"
                }}
            >
                <div style={{ padding: 20, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                        <ShoppingBag size={20} color="#D4AF37" />
                        {step === "cart" ? "Your Bag" : "Checkout"}
                    </h2>
                    <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer" }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                    {items.length === 0 ? (
                        <div style={{ textAlign: "center", color: "#666", marginTop: 40 }}>
                            Your bag is empty.
                        </div>
                    ) : (
                        step === "cart" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                {items.map(item => (
                                    <div key={item.product.sku} style={{ display: "flex", gap: 12 }}>
                                        <div style={{ width: 70, height: 70, background: "#222", borderRadius: 8, overflow: "hidden" }}>
                                            <img src={item.product.images[0]?.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{item.product.name}</div>
                                            <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                                                {item.qty} x ₹{item.product.price || "On Request"}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product.sku)}
                                            style={{ background: "none", border: "none", color: "#444", cursor: "pointer", height: "fit-content" }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <form id="checkout-form" onSubmit={handleCheckout} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6 }}>Full Name</label>
                                    <input
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="form-input"
                                        style={{ width: "100%", background: "#222", border: "1px solid #333", color: "#fff", padding: 10, borderRadius: 6 }}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", fontSize: 13, color: "#888", marginBottom: 6 }}>Phone Number</label>
                                    <input
                                        required
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="form-input"
                                        style={{ width: "100%", background: "#222", border: "1px solid #333", color: "#fff", padding: 10, borderRadius: 6 }}
                                        placeholder="+91 9876543210"
                                    />
                                    <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>We will contact you on this number to confirm the order.</div>
                                </div>
                            </form>
                        )
                    )}
                </div>

                {items.length > 0 && (
                    <div style={{ padding: 20, borderTop: "1px solid #222", background: "#0f0f0f" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
                            <span>Total</span>
                            <span>{cartTotal > 0 ? `₹${cartTotal.toLocaleString()}` : "On Request"}</span>
                        </div>
                        {step === "cart" ? (
                            <button
                                onClick={() => setStep("checkout")}
                                style={{
                                    width: "100%", background: "#D4AF37", color: "#000", border: "none",
                                    padding: 14, borderRadius: 8, fontWeight: 700, cursor: "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                                }}
                            >
                                Proceed to Checkout <ArrowRight size={16} />
                            </button>
                        ) : (
                            <div style={{ display: "flex", gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setStep("cart")}
                                    style={{
                                        flex: 1, background: "#222", color: "#fff", border: "none",
                                        padding: 14, borderRadius: 8, fontWeight: 600, cursor: "pointer"
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
                                        padding: 14, borderRadius: 8, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1
                                    }}
                                >
                                    {loading ? "Placing Order..." : "Confirm Item"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
