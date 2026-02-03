import React, { useState } from "react";
import ShopLayout from "../layouts/ShopLayout";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { createPaymentOrder, verifyPayment } from "../api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function Checkout() {
    const { items, clearCart } = useCart();
    const { customer } = useCustomer();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const total = items.reduce((sum, item) => sum + ((item.product.price || 0) * item.qty), 0);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handlePayment = async () => {
        if (!customer) {
            toast.error("Please login to proceed");
            navigate("/customer/login");
            return;
        }

        setLoading(true);
        try {
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                toast.error("Failed to load payment gateway");
                return;
            }

            // 1. Create Order
            const orderData = await createPaymentOrder(total);

            // 2. Open Razorpay
            const options = {
                key: orderData.key_id,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "RoyalIQ Retail",
                description: "Purchase of Jewelry",
                order_id: orderData.order_id,
                handler: async function (response: any) {
                    try {
                        // 3. Verify Payment
                        await verifyPayment({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            total_amount: total
                        });

                        toast.success("Payment Successful!");
                        clearCart();
                        navigate("/orders"); // Or success page
                    } catch (e) {
                        toast.error("Payment verification failed");
                    }
                },
                prefill: {
                    name: customer.name,
                    email: "", // customer.email if available
                    contact: customer.phone
                },
                theme: {
                    color: "#D4AF37"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast.error(response.error.description || "Payment failed");
            });
            rzp.open();

        } catch (e) {
            console.error(e);
            toast.error("Could not initiate payment");
        } finally {
            setLoading(false);
        }
    };

    if (items.length === 0) {
        return (
            <ShopLayout>
                <div style={{ padding: 100, textAlign: "center", color: '#1a1a1a' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Your cart is empty</h2>
                    <p style={{ color: "#666", marginBottom: 32 }}>Add some beautiful jewelry to your bag to proceed.</p>
                    <button
                        onClick={() => navigate("/")}
                        style={{ background: "#D4AF37", color: "#000", border: "none", padding: "12px 32px", borderRadius: 50, fontWeight: 700, cursor: "pointer" }}
                    >
                        Browse Collection
                    </button>
                </div>
            </ShopLayout>
        );
    }

    return (
        <ShopLayout>
            <div style={{ padding: "60px 20px", maxWidth: 1000, margin: "0 auto", color: '#1a1a1a', fontFamily: "'Outfit', sans-serif" }}>
                <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 40, textAlign: "center", letterSpacing: -1 }}>Order Checkout</h1>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 40, alignItems: "start" }}>
                    {/* Summary */}
                    <div style={{ background: "#fff", padding: 32, borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
                        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, borderBottom: "1px solid #f0f0f0", paddingBottom: 16 }}>Review Bag</h3>
                        {items.map(item => (
                            <div key={item.product.sku} style={{ display: "flex", gap: 20, marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f9f9f9' }}>
                                <div style={{ width: 80, height: 80, background: "#f8f8f8", borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
                                    <img src={item.product.images?.[0]?.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 16 }}>{item.product.name}</div>
                                    <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>SKU: {item.product.sku}</div>
                                    <div style={{ fontSize: 14, color: '#444', marginTop: 8, fontWeight: 500 }}>Qty: {item.qty}</div>
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>₹{((item.product.price || 0) * item.qty).toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    {/* Order Total & Pay */}
                    <div style={{ position: "sticky", top: 120 }}>
                        <div style={{ background: "#fff", padding: 32, borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.04)" }}>
                            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Order Total</h3>

                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, color: "#666" }}>
                                <span>Subtotal</span>
                                <span>₹{total.toLocaleString()}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, color: "#666" }}>
                                <span>Shipping</span>
                                <span style={{ color: "#27ae60", fontWeight: 600 }}>FREE</span>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #eee", paddingTop: 24, marginTop: 24, fontSize: 22, fontWeight: 800 }}>
                                <span>Total</span>
                                <span>₹{total.toLocaleString()}</span>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    background: "#D4AF37", color: "#000",
                                    padding: "18px", fontSize: 18, fontWeight: 800,
                                    border: "none", borderRadius: 50, cursor: "pointer",
                                    opacity: loading ? 0.7 : 1,
                                    marginTop: 32,
                                    transition: "all 0.2s"
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                                onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                            >
                                {loading ? "Processing..." : "Secure Payment"}
                            </button>

                            <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#999", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /></svg>
                                SECURE CHECKOUT
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ShopLayout>
    );
}
