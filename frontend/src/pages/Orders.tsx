import React, { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "../api";
import { ShoppingBag, Plus, Search, User, CheckCircle, Clock, XCircle } from "lucide-react";
import toast from "react-hot-toast";

type Order = {
    id: string;
    customer_id: string;
    total_amount: number;
    status: string;
    created_at: string;
    customer?: { name: string; phone: string };
    items: { sku: string; qty: number; price: number }[];
};

type Customer = { id: string; name: string; phone: string };
type Product = { sku: string; name: string; price: number; qty: number };

export default function Orders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [showNew, setShowNew] = useState(false);

    // New Order State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCust, setSelectedCust] = useState<string>("");

    const [searchProd, setSearchProd] = useState("");
    const [foundProducts, setFoundProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<{ sku: string; name: string; price: number; qty: number }[]>([]);

    useEffect(() => {
        loadOrders();
        loadCustomers();
    }, []);

    async function loadOrders() {
        const res = await apiGet<Order[]>("/orders");
        setOrders(res);
    }

    async function loadCustomers() {
        const res = await apiGet<Customer[]>("/customers");
        setCustomers(res);
    }

    async function searchProducts(q: string) {
        if (!q) { setFoundProducts([]); return; }
        const res = await apiGet<Product[]>(`/products?q=${q}&limit=5`);
        setFoundProducts(res);
    }

    function addToCart(p: Product) {
        const existing = cart.find(x => x.sku === p.sku);
        if (existing) {
            setCart(cart.map(x => x.sku === p.sku ? { ...x, qty: x.qty + 1 } : x));
        } else {
            setCart([...cart, { sku: p.sku, name: p.name, price: p.price || 0, qty: 1 }]);
        }
    }

    async function createOrder() {
        if (!selectedCust) return toast.error("Select a customer");
        if (cart.length === 0) return toast.error("Cart is empty");

        try {
            await apiPost("/orders", {
                customer_id: selectedCust,
                items: cart.map(x => ({ sku: x.sku, qty: x.qty, price: x.price }))
            });
            toast.success("Order created!");
            setShowNew(false);
            setCart([]);
            setSelectedCust("");
            loadOrders();
        } catch (e: any) {
            toast.error(e.message || "Failed to create order");
        }
    }

    async function updateStatus(id: string, status: string) {
        if (!window.confirm(`Mark order as ${status}?`)) return;
        try {
            await apiPut(`/orders/${id}/status?status=${status}`, {});
            loadOrders();
            toast.success("Status updated");
        } catch (e) { console.error(e); }
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <ShoppingBag size={28} />
                    Orders
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                    Sales & Fulfilment
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <button className="btn-primary" onClick={() => setShowNew(true)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Plus size={18} /> New Order
                    </div>
                </button>
            </div>

            {showNew && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: 800 }}>
                        <h2>Create New Order</h2>

                        <div className="grid-cols-2" style={{ gap: 24, margin: "20px 0" }}>
                            {/* Left: Customer & Products */}
                            <div>
                                <label className="form-label">Customer</label>
                                <select className="form-input" value={selectedCust} onChange={e => setSelectedCust(e.target.value)}>
                                    <option value="">-- Select Customer --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                                </select>

                                <label className="form-label" style={{ marginTop: 16 }}>Add Product</label>
                                <div style={{ position: "relative" }}>
                                    <input
                                        className="form-input"
                                        placeholder="Search SKU..."
                                        value={searchProd}
                                        onChange={e => { setSearchProd(e.target.value); searchProducts(e.target.value); }}
                                    />
                                    {foundProducts.length > 0 && (
                                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1e1b18", border: "1px solid var(--border)", zIndex: 10 }}>
                                            {foundProducts.map(p => (
                                                <div
                                                    key={p.sku}
                                                    style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                                                    onClick={() => { addToCart(p); setSearchProd(""); setFoundProducts([]); }}
                                                >
                                                    <div style={{ fontWeight: 600 }}>{p.sku}</div>
                                                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.name} - ₹{p.price}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Cart */}
                            <div style={{ background: "rgba(255,255,255,0.05)", padding: 16, borderRadius: 8 }}>
                                <h4>Cart ({cart.length})</h4>
                                {cart.map(item => (
                                    <div key={item.sku} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                                        <div>
                                            <div>{item.name}</div>
                                            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.sku} x {item.qty}</div>
                                        </div>
                                        <div style={{ fontWeight: 600 }}>₹{item.qty * item.price}</div>
                                    </div>
                                ))}
                                <div style={{ marginTop: 20, borderTop: "1px dashed var(--border)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                                    <span>Total</span>
                                    <span>₹{cart.reduce((a, b) => a + (b.qty * b.price), 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                            <button className="btn2" onClick={() => setShowNew(false)}>Cancel</button>
                            <button className="btn-primary" onClick={createOrder}>Confirm Order</button>
                        </div>
                    </div>
                    <style>{`
                        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justifyContent: center; z-index: 1000; }
                        .modal-content { background: #12100e; padding: 24px; border-radius: 12px; border: 1px solid var(--border); max-height: 90vh; overflow-y: auto; }
                    `}</style>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((o) => (
                                <tr key={o.id}>
                                    <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-muted)" }}>{o.id.substring(0, 8)}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{o.customer?.name}</div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.customer?.phone}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{o.items.length} items</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.items.map(i => i.sku).join(", ")}</div>
                                    </td>
                                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>₹{o.total_amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${o.status === 'COMPLETED' ? 'fresh' : 'watch'}`}>{o.status}</span>
                                    </td>
                                    <td>
                                        {o.status === 'PENDING' && (
                                            <div style={{ display: "flex", gap: 8 }}>
                                                <button className="btn2" onClick={() => updateStatus(o.id, 'COMPLETED')} title="Mark Complete">
                                                    <CheckCircle size={14} color="#22c55e" />
                                                </button>
                                                <button className="btn2" onClick={() => updateStatus(o.id, 'CANCELLED')} title="Cancel Order">
                                                    <XCircle size={14} color="#ef4444" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
