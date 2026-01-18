import React, { useEffect, useState } from "react";
import InventoryTable, { Product } from "../components/InventoryTable";
import InventoryGrid from "../components/InventoryGrid";
import ProductDrawer from "../components/ProductDrawer";
import { apiGet, apiDelete } from "../api";
import { Database, Search, Filter, RefreshCw, LayoutGrid, List } from "lucide-react";
import toast from "react-hot-toast";

export default function Vault() {
    const [items, setItems] = useState<Product[]>([]);
    const [q, setQ] = useState("");
    const [category, setCategory] = useState("");
    const [stockType, setStockType] = useState("");
    const [selected, setSelected] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

    async function load() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            if (category.trim()) params.set("category", category.trim());
            if (stockType.trim()) params.set("stock_type", stockType.trim());
            const out = await apiGet<Product[]>(`/products?${params.toString()}`);
            setItems(out);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(sku: string) {
        try {
            setLoading(true);
            await apiDelete(`/products/${encodeURIComponent(sku)}`);
            toast.success("Product deleted");
            await load();
        } catch (e: any) {
            toast.error(e.message || "Failed to delete");
            setLoading(false);
        }
    }

    useEffect(() => {
        load().catch(() => { });
    }, []);

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <Database size={28} />
                    Vault & Concepts
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 4, display: "flex", gap: 4 }}>
                        <button
                            onClick={() => setViewMode("list")}
                            style={{
                                background: viewMode === "list" ? "rgba(255,255,255,0.1)" : "transparent",
                                border: "none", color: viewMode === "list" ? "#fff" : "var(--text-muted)",
                                padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600
                            }}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setViewMode("grid")}
                            style={{
                                background: viewMode === "grid" ? "rgba(255,255,255,0.1)" : "transparent",
                                border: "none", color: viewMode === "grid" ? "#fff" : "var(--text-muted)",
                                padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600
                            }}
                        >
                            Grid
                        </button>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                        <Search size={16} style={{ position: "absolute", top: 12, left: 12, color: "var(--text-muted)" }} />
                        <input
                            className="form-input"
                            style={{ paddingLeft: 38 }}
                            placeholder="Search by SKU, Name, or Description..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && load()}
                        />
                    </div>

                    <div style={{ position: "relative", width: 200 }}>
                        <Filter size={16} style={{ position: "absolute", top: 12, left: 12, color: "var(--text-muted)" }} />
                        <input
                            className="form-input"
                            style={{ paddingLeft: 38 }}
                            placeholder="Category (e.g. Ring)"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && load()}
                        />
                    </div>

                    <select
                        className="form-select"
                        style={{ width: 160 }}
                        value={stockType}
                        onChange={(e) => setStockType(e.target.value)}
                    >
                        <option value="">All Stock</option>
                        <option value="physical">Physical</option>
                        <option value="concept">Concept</option>
                    </select>

                    <button className="btn-primary" onClick={load} disabled={loading}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {loading ? "..." : <RefreshCw size={18} />}
                        </div>
                    </button>
                </div>
            </div>

            {viewMode === "list" ? (
                <InventoryTable
                    items={items}
                    onSelect={(p) => setSelected(p)}
                    onDelete={handleDelete}
                />
            ) : (
                <InventoryGrid
                    items={items}
                    onSelect={(p) => setSelected(p)}
                    onDelete={handleDelete}
                />
            )}

            {selected ? (
                <ProductDrawer
                    product={selected}
                    onClose={() => setSelected(null)}
                    onRefresh={async () => {
                        await load();
                        if (selected) {
                            const sku = selected.sku;
                            const refreshed = await apiGet<Product>(`/products/${encodeURIComponent(sku)}`);
                            setSelected(refreshed);
                        }
                    }}
                />
            ) : null}
        </div>
    );
}
