import React from "react";
import { Star, Image as ImageIcon, Trash, Edit, Copy } from "lucide-react";
import toast from "react-hot-toast";

export type Product = {
    sku: string;
    name: string;
    category?: string | null;
    stock_type: string;
    qty: number;
    weight_g?: number | null;
    status_zone?: string | null;
    primary_image?: string | null;
    retail_valuation_inr?: number | null;
    bayesian_rating?: number | null;
    rating_count: number;
    reserved_name?: string | null;
    reserved_phone?: string | null;
    description?: string | null;
    price?: number | null;
    manual_rating?: number | null;
    options?: Record<string, any> | null;
    created_at?: string;
    updated_at?: string;
    subcategory?: string | null;
    reservations?: { id: string, name: string, qty: number, created_at: string }[] | null;
};

function zoneClass(z?: string | null) {
    const v = (z || "").toLowerCase();
    if (v === "fresh") return "badge fresh";
    if (v === "watch") return "badge watch";
    if (v === "dead") return "badge dead";
    if (v === "reserved") return "badge reserved";
    if (v === "sold") return "badge sold";
    return "badge";
}

export default function InventoryTable(props: {
    items: Product[];
    onSelect: (p: Product) => void;
    onDelete?: (sku: string) => void;
}) {
    const { items, onSelect, onDelete } = props;

    const handleAction = (e: React.MouseEvent, action: string, p: Product) => {
        e.stopPropagation();
        if (action === "edit") {
            onSelect(p);
        } else if (action === "copy") {
            navigator.clipboard.writeText(p.sku);
            toast.success("SKU Copied");
        } else if (action === "delete") {
            if (onDelete && window.confirm(`Permanently delete ${p.sku}?`)) {
                onDelete(p.sku);
            }
        }
    };

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}>Image</th>
                            <th>Product Details</th>
                            <th>Category</th>
                            <th>Stock</th>
                            <th>Zone</th>
                            <th>Rating</th>
                            <th>Valuation</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                    No products found. Adjust filters or search terms.
                                </td>
                            </tr>
                        ) : (
                            items.map((p) => (
                                <tr key={p.sku} onClick={() => onSelect(p)} style={{ cursor: "pointer" }}>
                                    <td>
                                        {p.primary_image ? (
                                            <div style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                                                <img
                                                    src={p.primary_image}
                                                    alt={p.name}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.parentElement!.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: var(--text-muted);"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></div>';
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div style={{ width: 48, height: 48, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{p.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.sku}</div>
                                    </td>
                                    <td>{p.category || "-"}</td>
                                    <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                            <span style={{ fontSize: 12, fontWeight: 500 }}>{p.stock_type}</span>
                                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Qty: {p.qty}</span>
                                        </div>
                                    </td>
                                    <td><span className={zoneClass(p.status_zone)}>{p.status_zone || "UNKNOWN"}</span></td>
                                    <td>
                                        {p.bayesian_rating ? (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                <Star size={14} fill="var(--accent)" color="var(--accent)" />
                                                <span style={{ fontWeight: 600 }}>{p.bayesian_rating}</span>
                                                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>({p.rating_count})</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>-</span>
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {p.retail_valuation_inr ? `₹${Math.round(p.retail_valuation_inr).toLocaleString()}` : "-"}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn2" onClick={(e) => handleAction(e, "edit", p)} title="Edit">
                                                <Edit size={14} />
                                            </button>
                                            <button className="btn2" onClick={(e) => handleAction(e, "copy", p)} title="Copy SKU">
                                                <Copy size={14} />
                                            </button>
                                            <button className="btn2" onClick={(e) => handleAction(e, "delete", p)} title="Delete" style={{ color: "#ef4444" }}>
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
