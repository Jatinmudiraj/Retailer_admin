import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ShopLayout from "../layouts/ShopLayout";
import { PublicProduct, publicGetProduct, publicListProducts } from "../api";
import {
    ShoppingBag, ArrowRight, Sparkles, Shield, Gem, Truck, Clock,
    CheckCircle2, MessageCircle, ChevronDown, ChevronUp, Award,
    Zap, Eye, HelpCircle, Star, Info
} from "lucide-react";
import { useCart } from "../context/CartContext";
import Loader from "../components/Loader";
import toast from "react-hot-toast";

export default function ShopProduct() {
    const { sku } = useParams<{ sku: string }>();
    const [product, setProduct] = useState<PublicProduct | null>(null);
    const [related, setRelated] = useState<PublicProduct[]>([]);
    const [recommended, setRecommended] = useState<PublicProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState<string>("");
    const [openSection, setOpenSection] = useState<string | null>("craftsmanship");

    const { addToCart } = useCart();

    useEffect(() => {
        if (!sku) return;
        setLoading(true);
        setRelated([]);

        // Fetch current product and related products
        publicGetProduct(sku)
            .then(async p => {
                setProduct(p);
                if (p.images && p.images.length > 0) {
                    const primary = p.images.find(i => i.is_primary);
                    setActiveImage(primary ? primary.url : p.images[0].url);
                }

                // Fetch related products (Complete the look)
                if (p.related_products && p.related_products.length > 0) {
                    const promises = p.related_products.map(rSku => publicGetProduct(rSku).catch(() => null));
                    const results = await Promise.all(promises);
                    setRelated(results.filter(x => x !== null) as PublicProduct[]);
                }

                // Fetch general recommendations (Curated for you)
                const all = await publicListProducts();
                // Filter out current product and already related products
                const others = all.filter(x => x.sku !== sku && !p.related_products?.includes(x.sku));
                // Get 4 random or top recommendations
                setRecommended(others.slice(0, 4));
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [sku]);

    function handleAddToCart() {
        if (!product) return;
        addToCart(product);
        toast.custom((t) => (
            <div style={{
                background: "#1a1a1a",
                color: "#fff",
                padding: "16px 28px",
                borderRadius: "100px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
                animation: t.visible ? "premium-slide-in 0.5s ease" : "premium-slide-out 0.5s ease"
            }}>
                <ShoppingBag size={20} color="#D4AF37" />
                <div style={{ fontWeight: 800, fontSize: 14 }}>Added to Bag</div>
            </div>
        ), { duration: 3000 });
    }

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    if (loading) return (
        <ShopLayout>
            <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader text="Curating Your Private Viewing..." />
            </div>
        </ShopLayout>
    );

    if (!product) return (
        <ShopLayout>
            <div style={{ textAlign: "center", padding: "100px 20px" }}>
                <div style={{ fontSize: 64, marginBottom: 24 }}>💎</div>
                <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Product Entry Restricted</h2>
                <Link to="/" style={{ color: "#1a1a1a", fontWeight: 800 }}>Browse Collection</Link>
            </div>
        </ShopLayout>
    );

    return (
        <ShopLayout>
            <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40 }}>
                {/* Compact Product Frame */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "380px 1fr",
                    gap: 60,
                    alignItems: "start",
                    marginBottom: 60
                }}>

                    {/* Visual Section (Left) */}
                    <div style={{ position: "sticky", top: 20 }}>
                        <div style={{
                            position: "relative",
                            width: 380,
                            height: 380,
                            background: "#fdfbf7",
                            borderRadius: 24,
                            overflow: "hidden",
                            boxShadow: "0 20px 60px rgba(0,0,0,0.05)",
                            border: "1px solid rgba(0,0,0,0.01)"
                        }}>
                            <img
                                src={activeImage}
                                alt={product.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />

                            {/* Badges */}
                            <div style={{ position: "absolute", top: 16, left: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <div style={{ background: "#1a1a1a", color: "#fff", padding: "6px 12px", borderRadius: 100, fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>
                                    LIMITED
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.9)", color: "#1a1a1a", padding: "6px 12px", borderRadius: 100, fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>
                                    AI TRY-ON
                                </div>
                            </div>
                        </div>

                        {/* Miniature Thumbnails */}
                        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
                            {product.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img.url)}
                                    style={{
                                        width: 50, height: 50, borderRadius: 8, overflow: "hidden",
                                        cursor: "pointer", border: activeImage === img.url ? "1px solid #D4AF37" : "1px solid #eee",
                                        background: "none", padding: 0
                                    }}
                                >
                                    <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content Section (Right) */}
                    <div style={{ width: "100%" }}>
                        {/* Header Area */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#D4AF37", letterSpacing: 3, marginBottom: 8, textTransform: "uppercase" }}>
                                    {product.category || "Maître Joaillier"}
                                </div>
                                <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.1, margin: 0, color: "#1a1a1a", letterSpacing: -2 }}>
                                    {product.name}
                                </h1>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a1a" }}>
                                    {product.price ? `₹${product.price.toLocaleString()}` : "Upon Request"}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#999", display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: 4 }}>
                                    <Star size={14} fill="#D4AF37" color="#D4AF37" /> 4.9 (24 Reviews)
                                </div>
                            </div>
                        </div>

                        {/* Wide Description & Specs Row */}
                        <div style={{ display: "flex", gap: 40, marginBottom: 32 }}>
                            <div style={{ flex: 1.5 }}>
                                <p style={{ fontSize: 15, lineHeight: 1.6, color: "#555", margin: 0, borderLeft: "2px solid #D4AF37", paddingLeft: 20 }}>
                                    {product.description || "A masterwork designed for the virtuoso of elegance. This piece captures the essence of heritage craftsmanship while embracing the modern silhouette."}
                                </p>
                            </div>
                            <div style={{ flex: 1, background: "#fdfbf7", padding: 20, borderRadius: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: "#999", letterSpacing: 1, marginBottom: 2 }}>IDENTIFICATION</div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>SKU: {product.sku}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 9, fontWeight: 800, color: "#999", letterSpacing: 1, marginBottom: 2 }}>WEIGHT</div>
                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{product.weight_g || "24.5"} g</div>
                                </div>
                                <div style={{ gridColumn: "1/-1", display: "flex", gap: 8, alignItems: "center", fontSize: 11, fontWeight: 700, color: "#D4AF37" }}>
                                    <CheckCircle2 size={12} /> Certified Authenticity Included
                                </div>
                            </div>
                        </div>

                        {/* Pillars Row */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
                            {[
                                { icon: <Shield size={18} />, title: "Secure Vault", desc: "Conflict-free alloys" },
                                { icon: <Truck size={18} />, title: "Estate Shipping", desc: "Insured delivery" },
                                { icon: <Gem size={18} />, title: "Master Craft", desc: "Artisan-finished" },
                            ].map((p, idx) => (
                                <div key={idx} style={{ padding: 16, borderRadius: 16, border: "1px solid #f0f0f0", display: "flex", gap: 12, alignItems: "center" }}>
                                    <div style={{ color: "#D4AF37" }}>{p.icon}</div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 800 }}>{p.title}</div>
                                        <div style={{ fontSize: 11, color: "#888" }}>{p.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Streamlined Accordions & CTA Row */}
                        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                                {[
                                    { id: "craftsmanship", title: "CRAFTSMANSHIP", content: "120 hours of hand-finishing by Senior Artisans." },
                                ].map((sec) => (
                                    <div key={sec.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                                        <button onClick={() => toggleSection(sec.id)} style={{ width: "100%", padding: "12px 0", border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                                            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2 }}>{sec.title}</span>
                                            {openSection === sec.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {openSection === sec.id && <div style={{ fontSize: 13, color: "#666", paddingBottom: 12 }}>{sec.content}</div>}
                                    </div>
                                ))}
                            </div>

                            <div style={{ flex: 1.5, display: "flex", gap: 8, background: "#fff", border: "1px solid #1a1a1a", borderRadius: 100, padding: 6 }}>
                                <button onClick={handleAddToCart} style={{ flex: 1, background: "#1a1a1a", color: "#fff", padding: "16px 24px", borderRadius: 100, fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                    <ShoppingBag size={18} /> ACQUIRE NOW
                                </button>
                                <a href={`https://wa.me/?text=Consultation for ${product.name}`} target="_blank" rel="noreferrer" style={{ background: "#fdfbf7", color: "#1a1a1a", width: 50, borderRadius: 100, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(0,0,0,0.05)" }}>
                                    <MessageCircle size={20} />
                                </a>
                            </div>
                        </div>

                        <div style={{ marginTop: 20, textAlign: "center", color: "#999", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <HelpCircle size={14} /> Virtual Concierge Available • <span style={{ color: "#D4AF37" }}>Enquire for Bespoke Options</span>
                        </div>
                    </div>
                </div>

                {/* Section 1: Complete The Look (Related Products) */}
                {related.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 60, marginBottom: 80 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                            <div>
                                <div style={{ color: "#D4AF37", fontWeight: 800, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>THE ART OF PAIRING</div>
                                <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -1 }}>Complete Your Collection</h2>
                            </div>
                            <Link to="/" style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 800, textDecoration: "none" }}>Explore All &rarr;</Link>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
                            {related.map((p) => (
                                <Link to={`/product/${p.sku}`} key={p.sku} style={{ textDecoration: "none" }}>
                                    <div style={{ aspectRatio: "1/1", background: "#fdfbf7", borderRadius: 24, overflow: "hidden", marginBottom: 16, border: "1px solid #f0f0f0" }}>
                                        <img src={p.images?.[0]?.url || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{p.name}</h3>
                                        <div style={{ fontSize: 14, fontWeight: 900, color: "#D4AF37" }}>₹{p.price?.toLocaleString()}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section 2: Recommended For You (General Curated Recommendation) */}
                {recommended.length > 0 && (
                    <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 60 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
                            <div>
                                <div style={{ color: "#D4AF37", fontWeight: 800, fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>CURATED FOR YOU</div>
                                <h2 style={{ fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: -1 }}>Recommended For You</h2>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 32 }}>
                            {recommended.map((p) => (
                                <Link to={`/product/${p.sku}`} key={p.sku} style={{ textDecoration: "none" }}>
                                    <div style={{ aspectRatio: "1/1", background: "#fdfbf7", borderRadius: 24, overflow: "hidden", marginBottom: 16, border: "1px solid #f0f0f0" }}>
                                        <img src={p.images?.[0]?.url || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ textAlign: "center" }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", marginBottom: 4 }}>{p.name}</h3>
                                        <div style={{ fontSize: 14, fontWeight: 900, color: "#D4AF37" }}>₹{p.price?.toLocaleString()}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </ShopLayout>
    );
}
