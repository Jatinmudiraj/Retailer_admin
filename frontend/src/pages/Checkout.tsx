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
                <div style={{ padding: 40, textAlign: "center", color: '#fff' }}>
                    <h2>Your cart is empty</h2>
                </div>
            </ShopLayout>
        );
    }

    return (
        <ShopLayout>
            <div style={{ padding: "40px 20px", maxWidth: 800, margin: "0 auto", color: '#fff' }}>
                <h1 style={{ fontSize: 24, marginBottom: 20 }}>Checkout</h1>

                <div style={{ background: "#111", padding: 20, borderRadius: 8, marginBottom: 20 }}>
                    {items.map(item => (
                        <div key={item.product.sku} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, borderBottom: '1px solid #333', paddingBottom: 10 }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                                <div style={{ fontSize: 13, color: '#888' }}>Qty: {item.qty}</div>
                            </div>
                            <div>₹{((item.product.price || 0) * item.qty).toLocaleString()}</div>
                        </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 18, fontWeight: 'bold' }}>
                        <span>Total</span>
                        <span>₹{total.toLocaleString()}</span>
                    </div>
                </div>

                <div style={{ textAlign: "right" }}>
                    <button
                        onClick={handlePayment}
                        disabled={loading}
                        style={{
                            background: "#D4AF37", color: "#000",
                            padding: "12px 30px", fontSize: 16, fontWeight: 700,
                            border: "none", borderRadius: 8, cursor: "pointer",
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? "Processing..." : "Pay Now"}
                    </button>
                </div>
            </div>
        </ShopLayout>
    );
}
