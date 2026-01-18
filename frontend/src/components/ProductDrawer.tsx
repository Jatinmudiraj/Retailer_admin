import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "./InventoryTable";
import { apiPost, apiDelete } from "../api";
import {
    X,
    Edit,
    Trash2,
    Calendar,
    User,
    Phone,
    Tag,
    Award,
    Layers,
    DollarSign,
    CheckCircle2,
    Scale,
    AlertTriangle,
    Clock
} from "lucide-react";
import toast from "react-hot-toast";

export default function ProductDrawer(props: {
    product: Product;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const { product, onClose, onRefresh } = props;
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [imgError, setImgError] = useState(false);

    async function reserve() {
        if (!name || !phone) {
            toast.error("Name and Phone are required to reserve.");
            return;
        }
        setLoading(true);
        try {
            await apiPost(`/products/${encodeURIComponent(product.sku)}/reserve`, { name, phone });
            toast.success("Product reserved successfully.");
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || "Reservation failed");
        } finally {
            setLoading(false);
        }
    }

    async function release() {
        setLoading(true);
        try {
            await apiPost(`/products/${encodeURIComponent(product.sku)}/release`, {});
            toast.success("Reservation released.");
            onRefresh();
        } catch (e: any) {
            toast.error(e.message || "Release failed");
        } finally {
            setLoading(false);
        }
    }

    async function markSold() {
        if (!window.confirm("Mark this item as SOLD? This will move it to Sales Archive.")) return;
        setLoading(true);
        try {
            await apiPost(`/products/${encodeURIComponent(product.sku)}/mark_sold`, { recovery_price_inr: null });
            toast.success("Item marked as SOLD and archived.");
            onRefresh();
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Action failed");
        } finally {
            setLoading(false);
        }
    }

    async function deleteProduct() {
        const confirm1 = window.confirm("Are you sure you want to DELETE this product?");
        if (!confirm1) return;
        const confirm2 = window.confirm("This action is permanent and cannot be undone. Delete forever?");
        if (!confirm2) return;

        setLoading(true);
        try {
            await apiDelete(`/products/${encodeURIComponent(product.sku)}`);
            toast.success("Product deleted permanently.");
            onRefresh();
            onClose();
        } catch (e: any) {
            toast.error(e.message || "Delete failed");
        } finally {
            setLoading(false);
        }
    }

    // Helper to format date
    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString() : "-";

    return (
        <div className="drawer" style={{
            position: "fixed", top: 0, right: 0,
            width: "520px", maxWidth: "100%", height: "100vh",
            background: "var(--panel)", borderLeft: "1px solid var(--border)",
            boxShadow: "-10px 0 40px rgba(0,0,0,0.5)", zIndex: 100,
            overflowY: "auto", display: "flex", flexDirection: "column"
        }}>
            {/* Header Image Area */}
            <div style={{ position: "relative", width: "100%", height: "300px", background: "#000", flexShrink: 0 }}>
                {product.primary_image && !imgError ? (
                    <img
                        src={product.primary_image}
                        alt={product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }}
                        onError={() => setImgError(true)}
                    />
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", flexDirection: "column", gap: 10, background: "linear-gradient(45deg, #1a1a1a, #2a2a2a)" }}>
                        <Layers size={48} opacity={0.3} />
                        <div>{imgError ? "Image Failed to Load" : "No Image Available"}</div>
                    </div>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: 16, right: 16,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        border: "none", borderRadius: "50%", width: 36, height: 36,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        backdropFilter: "blur(4px)"
                    }}
                >
                    <X size={20} />
                </button>

                {/* SKU Badge */}
                <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(0,0,0,0.8)", padding: "6px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#fff", backdropFilter: "blur(4px)", display: "flex", gap: 8, alignItems: "center" }}>
                    <Tag size={14} color="var(--accent)" />
                    {product.sku}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: 24, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 20 }}>
                    <div>
                        <h2 style={{ margin: "0 0 8px 0", fontSize: 24, lineHeight: 1.2 }}>{product.name}</h2>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span className="badge">{product.category || "Uncategorized"}</span>
                            {product.subcategory && <span className="badge">{product.subcategory}</span>}
                            <span className="badge" style={{ textTransform: "uppercase" }}>{product.stock_type}</span>
                            <span className={`badge ${product.status_zone?.toLowerCase()}`}>Zone: {product.status_zone}</span>
                        </div>
                    </div>
                </div>

                {/* Edit Button */}
                <button
                    className="btn"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 24 }}
                    onClick={() => navigate(`/products/${encodeURIComponent(product.sku)}/edit`)}
                >
                    <Edit size={16} /> Edit Product / Update Image
                </button>

                {/* Description */}
                {product.description && (
                    <div style={{ marginBottom: 24, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8 }}>
                        {product.description}
                    </div>
                )}

                {/* Detailed Stats Grid */}
                <div className="grid-cols-2" style={{ marginBottom: 24, gap: 12 }}>
                    <div className="card" style={{ padding: 12, marginBottom: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><DollarSign size={12} /> PRICE (INR)</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{product.price ? `₹${product.price.toLocaleString()}` : "-"}</div>
                    </div>
                    <div className="card" style={{ padding: 12, marginBottom: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Scale size={12} /> WEIGHT</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{product.weight_g ? `${product.weight_g} g` : "-"}</div>
                    </div>
                    <div className="card" style={{ padding: 12, marginBottom: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Award size={12} /> RATING</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{product.manual_rating || product.bayesian_rating || "-"} <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>/ 5</span></div>
                    </div>
                    <div className="card" style={{ padding: 12, marginBottom: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}><Layers size={12} /> QUANTITY</div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{product.qty}</div>
                    </div>
                </div>

                {/* Options / Attributes */}
                {product.options && Object.keys(product.options).length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--text-muted)", textTransform: "uppercase" }}>Technical Specifications</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {Object.entries(product.options).map(([k, v]) => (
                                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                                    <span style={{ color: "var(--text-muted)" }}>{k}</span>
                                    <span style={{ fontWeight: 600 }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24, display: "flex", gap: 16 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> Created: {formatDate(product.created_at)}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> Updated: {formatDate(product.updated_at)}</span>
                </div>

                {/* Print Label Action */}
                <div style={{ marginBottom: 24 }}>
                    <button
                        className="btn2"
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                        onClick={() => {
                            const win = window.open("", "Print Label", "width=300,height=300");
                            if (win) {
                                win.document.write(`
                                    <html>
                                    <body style="font-family: sans-serif; text-align: center; padding: 10px;">
                                        <div style="border: 2px solid #000; padding: 10px; border-radius: 4px;">
                                            <div style="font-weight: bold; font-size: 16px;">ROYALIQ</div>
                                            <div style="margin: 10px 0; background: #eee; padding: 20px;">[ QR CODE PLACEHOLDER ]</div>
                                            <div style="font-size: 14px; font-weight: bold;">${product.sku}</div>
                                            <div style="font-size: 12px;">${product.weight_g || 0}g</div>
                                        </div>
                                        <br/>
                                        <button onclick="window.print()">PRINT</button>
                                    </body>
                                    </html>
                                `);
                            }
                        }}
                    >
                        <Tag size={16} /> Print Label / Tag
                    </button>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid var(--border)", marginBottom: 24 }} />

                {/* Actions Section */}
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

                    {/* Reservation */}
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <Calendar size={16} /> Reservation Status
                        </div>

                        {product.reserved_name ? (
                            <div style={{ background: "rgba(212, 175, 55, 0.1)", border: "1px solid rgba(212, 175, 55, 0.3)", borderRadius: 8, padding: 16 }}>
                                <div style={{ marginBottom: 12 }}>
                                    Reserved for <b style={{ color: "var(--accent)" }}>{product.reserved_name}</b>
                                    {product.reserved_phone && <span style={{ opacity: 0.7 }}> ({product.reserved_phone})</span>}
                                </div>
                                <button className="btn2" onClick={release} disabled={loading} style={{ width: "100%" }}>
                                    Release Reservation
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                                <div className="grid-cols-2" style={{ marginBottom: 0 }}>
                                    <div className="form-group" style={{ marginBottom: 8 }}>
                                        <div style={{ position: "relative" }}>
                                            <User size={14} style={{ position: "absolute", top: 12, left: 12, opacity: 0.5 }} />
                                            <input
                                                className="form-input"
                                                style={{ paddingLeft: 34 }}
                                                placeholder="Client Name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 8 }}>
                                        <div style={{ position: "relative" }}>
                                            <Phone size={14} style={{ position: "absolute", top: 12, left: 12, opacity: 0.5 }} />
                                            <input
                                                className="form-input"
                                                style={{ paddingLeft: 34 }}
                                                placeholder="Phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <button className="btn" onClick={reserve} disabled={loading || !name}>
                                    Reserve Item
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sales Action */}
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <CheckCircle2 size={16} /> Sales Execution
                        </div>
                        <button
                            className="btn"
                            style={{ width: "100%", background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)" }}
                            onClick={markSold}
                            disabled={loading}
                        >
                            Mark as Sold (Archive)
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div style={{ padding: 16, borderRadius: 8, border: "1px dashed #ef4444", background: "rgba(239, 68, 68, 0.05)" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
                            <AlertTriangle size={16} /> Danger Zone
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                            Deleting a product is permanent and cannot be undone. All data including history and images will be removed.
                        </div>
                        <button
                            className="btn"
                            style={{ width: "100%", background: "#ef4444", color: "#fff", border: "none" }}
                            onClick={deleteProduct}
                            disabled={loading}
                        >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                <Trash2 size={16} /> DELETE PERMANENTLY
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
