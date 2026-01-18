import React, { useState } from "react";
import { Product } from "./InventoryTable";
import { Star, Image as ImageIcon, Box, MoreHorizontal, Edit, Copy, Trash } from "lucide-react";
import toast from "react-hot-toast";

export default function InventoryGrid(props: {
    items: Product[];
    onSelect: (p: Product) => void;
    onDelete?: (sku: string) => void;
}) {
    const { items, onSelect, onDelete } = props;
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Close menu when clicking outside
    React.useEffect(() => {
        const fn = () => setOpenMenuId(null);
        window.addEventListener("click", fn);
        return () => window.removeEventListener("click", fn);
    }, []);

    if (items.length === 0) {
        return (
            <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                <Box size={40} style={{ marginBottom: 16, opacity: 0.5 }} />
                <div>No products found.</div>
            </div>
        );
    }

    const handleAction = (e: React.MouseEvent, action: string, p: Product) => {
        e.stopPropagation(); // Stop card click
        setOpenMenuId(null);

        if (action === "edit") {
            onSelect(p); // Open drawer (which has edit)
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
        <div className="grid-cols-2" style={{ gap: 20 }}>
            {items.map((p) => (
                <div
                    key={p.sku}
                    className="card"
                    style={{
                        padding: 0,
                        overflow: "visible", // Allow menu to spill out
                        cursor: "pointer",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        position: "relative",
                        display: "flex"
                    }}
                    onClick={() => onSelect(p)}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
                        e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "none";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = "transparent";
                    }}
                >
                    {/* Action Menu Trigger */}
                    <div
                        style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            zIndex: 10
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === p.sku ? null : p.sku);
                        }}
                    >
                        <div style={{
                            background: "rgba(0,0,0,0.6)",
                            backdropFilter: "blur(4px)",
                            borderRadius: 6,
                            padding: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            border: "1px solid rgba(255,255,255,0.1)"
                        }}>
                            <MoreHorizontal size={16} />
                        </div>

                        {/* Dropdown Menu */}
                        {openMenuId === p.sku && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                right: 0,
                                marginTop: 4,
                                background: "#1e1b18",
                                border: "1px solid var(--border)",
                                borderRadius: 8,
                                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                                width: 140,
                                zIndex: 20,
                                overflow: "hidden"
                            }}>
                                <div
                                    onClick={(e) => handleAction(e, "edit", p)}
                                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <Edit size={14} color="var(--accent)" /> Edit / View
                                </div>
                                <div
                                    onClick={(e) => handleAction(e, "copy", p)}
                                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <Copy size={14} /> Copy SKU
                                </div>
                                <div
                                    onClick={(e) => handleAction(e, "delete", p)}
                                    style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#ef4444" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                >
                                    <Trash size={14} /> Delete
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Image Aspect Square for List-like Grid */}
                    <div style={{ width: 200, height: 200, flexShrink: 0, background: "rgba(255,255,255,0.02)", position: "relative" }}>
                        {p.primary_image ? (
                            <img
                                src={p.primary_image}
                                alt={p.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: var(--text-muted); display: flex; flex-direction: column; gap: 8"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg></div>';
                                }}
                            />
                        ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                                <ImageIcon size={32} opacity={0.5} />
                            </div>
                        )}

                        {/* Status Badge Overlay */}
                        {p.status_zone && (
                            <div style={{ position: "absolute", top: 10, left: 10 }}>
                                <span className={`badge ${p.status_zone.toLowerCase()}`}>{p.status_zone}</span>
                            </div>
                        )}
                    </div>

                    <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{p.name}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>
                                {p.price ? `₹${(p.price / 1000).toFixed(1)}k` : ""}
                            </div>
                        </div>

                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, display: "flex", gap: 12 }}>
                            <span style={{ background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 4 }}>{p.sku}</span>
                            <span>{p.category}</span>
                            {p.subcategory && <span>• {p.subcategory}</span>}
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                            {p.description || "No description available."}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
                                <Star size={14} fill="var(--accent)" color="var(--accent)" />
                                {p.bayesian_rating || "-"}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                                <Box size={14} />
                                Qty: {p.qty}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
