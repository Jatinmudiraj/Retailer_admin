import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../layouts/ShopLayout";
import { PublicProduct, publicListProducts } from "../api";

export default function ShopHome() {
    const [products, setProducts] = useState<PublicProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("");
    const [q, setQ] = useState("");

    async function load() {
        setLoading(true);
        try {
            const data = await publicListProducts(q, category);
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    // Debounced search effect could go here, but keeping it simple for now

    return (
        <ShopLayout>
            {/* Hero Section */}
            <div style={{ textAlign: "center", marginBottom: 60, marginTop: 20 }}>
                <h1 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16 }}>
                    Exquisite <span style={{ color: "#D4AF37" }}>Jewellery</span> Collection
                </h1>
                <p style={{ color: "#888", fontSize: 18, maxWidth: 600, margin: "0 auto" }}>
                    Explore our curated selection of fine gold, diamond, and platinum jewellery.
                </p>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 40, flexWrap: "wrap" }}>
                <input
                    placeholder="Search products..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && load()}
                    style={{
                        background: "#1a1a1a", border: "1px solid #333", color: "#fff",
                        padding: "10px 16px", borderRadius: 8, width: 300, outline: "none"
                    }}
                />
                <button
                    onClick={load}
                    style={{
                        background: "#D4AF37", border: "none", color: "#000",
                        padding: "10px 20px", borderRadius: 8, fontWeight: 600, cursor: "pointer"
                    }}
                >
                    Search
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ textAlign: "center", padding: 40, color: "#666" }}>Loading collection...</div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 30
                }}>
                    {products.map((p) => (
                        <Link to={`/product/${p.sku}`} key={p.sku} style={{ textDecoration: "none", color: "inherit" }}>
                            <div style={{
                                background: "#151515",
                                borderRadius: 12,
                                overflow: "hidden",
                                border: "1px solid #222",
                                transition: "transform 0.2s",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column"
                            }}
                                onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                                onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                            >
                                <div style={{ aspectRatio: "1/1", background: "#222", position: "relative" }}>
                                    {p.images && p.images.length > 0 ? (
                                        <img
                                            src={p.images.find(i => i.is_primary)?.url || p.images[0].url}
                                            alt={p.name}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        />
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#444" }}>
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 13, color: "#D4AF37", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                                        {p.category || "Jewellery"}
                                    </div>
                                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px 0", lineHeight: 1.4 }}>{p.name}</h3>
                                    {p.weight_g && (
                                        <div style={{ fontSize: 14, color: "#888", marginBottom: 12 }}>{p.weight_g}g</div>
                                    )}
                                    <div style={{ marginTop: "auto", fontSize: 16, fontWeight: 700 }}>
                                        {p.price ? `₹${p.price.toLocaleString()}` : "Enquire for Price"}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {products.length === 0 && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 60, color: "#666" }}>
                            No products found using your search criteria.
                        </div>
                    )}
                </div>
            )}
        </ShopLayout>
    );
}
