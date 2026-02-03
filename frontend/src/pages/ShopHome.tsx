import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShopLayout from "../layouts/ShopLayout";
import { PublicProduct, publicListProducts } from "../api";
import Loader from "../components/Loader";
import { Heart, Star, Sparkles, Search, X, ArrowRight } from "lucide-react";

export default function ShopHome() {
    const [products, setProducts] = useState<PublicProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    async function fetchProducts(query: string, category: string) {
        setLoading(true);
        try {
            const data = await publicListProducts(query, category === "All" ? "" : category);
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProducts(q, selectedCategory);
        }, 500);
        return () => clearTimeout(timeout);
    }, [q, selectedCategory]);

    const recommended = products.slice(0, 4);
    const categories = ["All", "Necklace", "Rings", "Earrings", "Bracelets", "Bangles"];

    return (
        <ShopLayout>
            {/* Hero Section */}
            {!q && selectedCategory === "All" && (
                <div style={{
                    position: "relative",
                    height: 520,
                    borderRadius: 48,
                    overflow: "hidden",
                    marginBottom: 80,
                    background: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    textAlign: "center",
                    padding: 60,
                    boxShadow: "0 30px 100px rgba(0,0,0,0.15)"
                }}>
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(225deg, rgba(212, 175, 55, 0.3) 0%, rgba(0,0,0,0) 60%, rgba(212, 175, 55, 0.2) 100%)",
                        zIndex: 1
                    }}></div>

                    <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
                        <div style={{
                            fontSize: 14, fontWeight: 700, letterSpacing: 6,
                            textTransform: "uppercase", color: "#D4AF37",
                            marginBottom: 28, opacity: 0.9
                        }}>
                            Since 1988 • Royal Craftsmanship
                        </div>
                        <h1 style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.05, margin: "0 0 24px 0", letterSpacing: -3 }}>
                            The Heirloom <br /> Collection
                        </h1>
                        <p style={{ fontSize: 20, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 48, maxWidth: 650, margin: "0 auto 48px" }}>
                            Discover timeless elegance and unparalleled craftsmanship in every piece of our latest masterwork collection.
                        </p>
                        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                            <button style={{
                                background: "#D4AF37", color: "#000", border: "none",
                                padding: "18px 42px", borderRadius: 100, fontWeight: 800,
                                fontSize: 16, cursor: "pointer", boxShadow: "0 12px 30px rgba(212, 175, 55, 0.35)",
                                transition: "all 0.3s"
                            }}
                                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(212, 175, 55, 0.4)"; }}
                                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(212, 175, 55, 0.35)"; }}
                            >
                                Shop Experience
                            </button>
                            <button style={{
                                background: "rgba(255,255,255,0.06)", color: "#fff",
                                border: "1px solid rgba(255,255,255,0.2)", padding: "18px 42px",
                                borderRadius: 100, fontWeight: 800, fontSize: 16,
                                cursor: "pointer", backdropFilter: "blur(20px)",
                                transition: "all 0.3s"
                            }}
                                onMouseOver={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
                                onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
                            >
                                Virtual Try-On
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recommended Section - Premium Highlight */}
            {!loading && recommended.length > 0 && !q && selectedCategory === "All" && (
                <div style={{ marginBottom: 100 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 44, height: 44, background: "#fdfbf7", border: "1px solid #D4AF37", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <Sparkles size={20} color="#D4AF37" />
                            </div>
                            <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 }}>Curated For You</h2>
                        </div>
                    </div>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                        gap: 32,
                    }}>
                        {recommended.map((p) => (
                            <Link to={`/product/${p.sku}`} key={p.sku} style={{ textDecoration: "none" }}>
                                <div
                                    style={{
                                        background: "#fff",
                                        borderRadius: 32,
                                        position: "relative",
                                        boxShadow: "0 15px 45px rgba(0,0,0,0.03)",
                                        border: "1px solid rgba(0,0,0,0.04)",
                                        transition: "all 0.5s cubic-bezier(0.19, 1, 0.22, 1)",
                                        cursor: "pointer",
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        overflow: "hidden"
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.transform = "translateY(-12px)";
                                        e.currentTarget.style.boxShadow = "0 30px 60px rgba(0,0,0,0.07)";
                                        e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.3)";
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.transform = "translateY(0)";
                                        e.currentTarget.style.boxShadow = "0 15px 45px rgba(0,0,0,0.03)";
                                        e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)";
                                    }}
                                >
                                    <div style={{ position: "relative", height: 280, background: "#fdfbf7", overflow: "hidden" }}>
                                        <img
                                            src={p.images?.[0]?.url || ""}
                                            style={{
                                                width: "100%", height: "100%", objectFit: "cover",
                                                transition: "transform 1s cubic-bezier(0.19, 1, 0.22, 1)"
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
                                            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                                        />
                                        <div style={{
                                            position: "absolute", top: 20, right: 20,
                                            background: "rgba(255,255,255,0.95)", backdropFilter: "blur(10px)",
                                            padding: "8px 16px", borderRadius: 100, fontSize: 10, fontWeight: 800,
                                            color: "#D4AF37", border: "1px solid rgba(212,175,55,0.1)",
                                            letterSpacing: 1.5
                                        }}>
                                            EXCLUSIVE PIECE
                                        </div>
                                    </div>

                                    <div style={{ padding: 32, flex: 1, display: "flex", flexDirection: "column" }}>
                                        <div style={{ fontSize: 11, color: "#999", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                                            {p.category || "FINE JEWELLERY"}
                                        </div>
                                        <h3 style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 20, lineHeight: 1.3, margin: "0 0 12px 0" }}>
                                            {p.name}
                                        </h3>
                                        <div style={{ marginTop: "auto", paddingTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a" }}>
                                                    {p.price ? `₹${p.price.toLocaleString()}` : "Price On Request"}
                                                </div>
                                            </div>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: "50%",
                                                background: "#1a1a1a", display: "flex",
                                                alignItems: "center", justifyContent: "center",
                                                boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
                                            }}>
                                                <ArrowRight size={18} color="#fff" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Catalog Section */}
            <div style={{ marginBottom: 48 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 32 }}>
                    <div>
                        <h2 style={{ fontSize: 40, fontWeight: 800, color: "#1a1a1a", margin: "0 0 12px 0", letterSpacing: -2 }}>The Collection</h2>
                        <div style={{ color: "#666", fontSize: 18, fontWeight: 500 }}>Browse our full range of masterfully crafted pieces.</div>
                    </div>

                    <div style={{ position: "relative", width: 400 }}>
                        <Search size={20} style={{ position: "absolute", top: 16, left: 24, color: "#999" }} />
                        <input
                            placeholder="Search our vault..."
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            style={{
                                background: "#fff",
                                border: "1px solid #e5e5e5",
                                color: "#1a1a1a",
                                padding: "18px 24px 18px 60px",
                                borderRadius: 100,
                                width: "100%",
                                outline: "none",
                                fontSize: 16,
                                fontWeight: 500,
                                transition: "all 0.3s"
                            }}
                            onFocus={(e) => { e.target.style.borderColor = "#D4AF37"; e.target.style.boxShadow = "0 8px 24px rgba(212, 175, 55, 0.08)"; }}
                            onBlur={(e) => { e.target.style.borderColor = "#e5e5e5"; e.target.style.boxShadow = "none"; }}
                        />
                        {q && (
                            <button
                                onClick={() => setQ("")}
                                style={{
                                    position: "absolute", top: 14, right: 20,
                                    background: "#f5f5f5", border: "none",
                                    width: 32, height: 32, borderRadius: "50%",
                                    cursor: "pointer", color: "#666",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category Filter */}
                <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: "12px 32px",
                                borderRadius: 100,
                                border: selectedCategory === cat ? "1px solid #D4AF37" : "1px solid rgba(0,0,0,0.06)",
                                background: selectedCategory === cat ? "#fdfbf7" : "#fff",
                                color: selectedCategory === cat ? "#D4AF37" : "#666",
                                fontSize: 15,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.3s",
                                whiteSpace: "nowrap"
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid Display */}
            {loading ? (
                <div style={{ height: "40vh" }}>
                    <Loader text="Curating Your Collection..." />
                </div>
            ) : (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 32
                }}>
                    {products.map((p) => (
                        <div key={p.sku} style={{
                            background: "#fff",
                            borderRadius: 24,
                            overflow: "hidden",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.02)",
                            border: "1px solid rgba(0,0,0,0.04)",
                            transition: "all 0.4s cubic-bezier(0.19, 1, 0.22, 1)",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column"
                        }}
                            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-8px)"; e.currentTarget.style.boxShadow = "0 30px 60px rgba(0,0,0,0.06)"; }}
                            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.02)"; }}
                        >
                            <Link to={`/product/${p.sku}`} style={{ textDecoration: "none", color: "inherit", flex: 1, display: "flex", flexDirection: "column" }}>
                                <div style={{ aspectRatio: "1/1", position: "relative", background: "#fdfbf7", overflow: "hidden" }}>
                                    {p.images && p.images.length > 0 ? (
                                        <img
                                            src={p.images.find(i => i.is_primary)?.url || p.images[0].url}
                                            alt={p.name}
                                            style={{
                                                width: "100%", height: "100%", objectFit: "cover",
                                                transition: "transform 0.6s ease"
                                            }}
                                            onMouseOver={e => e.currentTarget.style.transform = "scale(1.1)"}
                                            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
                                        />
                                    ) : (
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ccc", fontSize: 12 }}>
                                            No Image
                                        </div>
                                    )}

                                    <div style={{
                                        position: "absolute", bottom: 16, left: 16,
                                        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)",
                                        padding: "8px 14px", borderRadius: 100, fontSize: 10, fontWeight: 800,
                                        display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
                                    }}>
                                        <Sparkles size={12} color="#D4AF37" /> AI TRY-ON
                                    </div>
                                </div>
                                <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 10, color: "#D4AF37", fontWeight: 800, textTransform: "uppercase", marginBottom: 10, letterSpacing: 1.5 }}>
                                        {p.category || "JEWELLERY"}
                                    </div>
                                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 12px 0", color: "#1a1a1a", lineHeight: 1.4 }}>{p.name}</h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>
                                            {p.price ? `₹${p.price.toLocaleString()}` : "Price On Request"}
                                        </div>
                                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <ArrowRight size={14} color="#666" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                    {products.length === 0 && (
                        <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 100, color: "#999", background: "#fdfbf7", borderRadius: 32 }}>
                            <div style={{ fontSize: 48, marginBottom: 16 }}>💎</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>No match found in our vault.</div>
                            <p>Try adjusting your search criteria.</p>
                        </div>
                    )}
                </div>
            )}
        </ShopLayout>
    );
}
