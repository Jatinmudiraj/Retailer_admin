import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ShopLayout from "../layouts/ShopLayout";
import { PublicProduct, publicGetProduct } from "../api";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import toast from "react-hot-toast";

export default function ShopProduct() {
    const { sku } = useParams<{ sku: string }>();
    const [product, setProduct] = useState<PublicProduct | null>(null);
    const [related, setRelated] = useState<PublicProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState<string>("");

    // We need to access the cart context, but this component is rendered inside ShopLayout which has the provider.
    // However, useCart() must be used within the provider. 
    // Since ShopLayout wraps the *children* in the provider, we can use useCart here safely.
    const { addToCart } = useCart();

    useEffect(() => {
        if (!sku) return;
        setLoading(true);
        // Reset related
        setRelated([]);

        publicGetProduct(sku)
            .then(async p => {
                setProduct(p);
                if (p.images && p.images.length > 0) {
                    const primary = p.images.find(i => i.is_primary);
                    setActiveImage(primary ? primary.url : p.images[0].url);
                }

                // Fetch related products
                if (p.related_products && p.related_products.length > 0) {
                    const promises = p.related_products.map(rSku => publicGetProduct(rSku).catch(() => null));
                    const results = await Promise.all(promises);
                    setRelated(results.filter(x => x !== null) as PublicProduct[]);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [sku]);

    function handleAddToCart() {
        if (!product) return;
        addToCart(product);
        toast.success("Added to bag");
    }

    if (loading) return (
        <ShopLayout>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#D4AF37", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        </ShopLayout>
    );

    if (!product) return (
        <ShopLayout>
            <div style={{ textAlign: "center", padding: "100px 20px" }}>
                <h2 style={{ fontSize: 32, marginBottom: 16 }}>Product Not Found</h2>
                <p style={{ color: "#888", marginBottom: 32 }}>The product you are looking for might have been removed or is unavailable.</p>
                <Link to="/" style={{
                    display: "inline-block", background: "#D4AF37", color: "#000",
                    padding: "12px 24px", borderRadius: 8, fontWeight: 600, textDecoration: "none"
                }}>
                    Browse Collection
                </Link>
            </div>
        </ShopLayout>
    );

    return (
        <ShopLayout>
            <div style={{ marginBottom: 30 }}>
                <Link to="/" style={{ color: "#888", textDecoration: "none", fontSize: 14 }}>&larr; Back to Collection</Link>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 60, marginBottom: 80 }}>
                {/* Image Gallery */}
                <div style={{ flex: "1 1 500px" }}>
                    <div style={{
                        aspectRatio: "1/1",
                        background: "#151515",
                        borderRadius: 16,
                        border: "1px solid #222",
                        overflow: "hidden",
                        marginBottom: 20
                    }}>
                        {activeImage ? (
                            <img src={activeImage} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>No Image</div>
                        )}
                    </div>
                    {/* Thumbnails */}
                    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10 }}>
                        {product.images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(img.url)}
                                style={{
                                    width: 80, height: 80,
                                    borderRadius: 8,
                                    border: activeImage === img.url ? "2px solid #D4AF37" : "1px solid #333",
                                    padding: 0,
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    background: "#151515"
                                }}
                            >
                                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Details */}
                <div style={{ flex: "1 1 400px", maxWidth: 600 }}>
                    <div style={{ color: "#D4AF37", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>
                        {product.category || "Fine Jewellery"}
                    </div>
                    <h1 style={{ fontSize: 42, fontWeight: 800, margin: "0 0 20px 0", lineHeight: 1.1 }}>{product.name}</h1>

                    <div style={{ margin: "24px 0", fontSize: 24, fontWeight: 600 }}>
                        {product.price ? `₹${product.price.toLocaleString()}` : "Price On Request"}
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.05)", padding: 24, borderRadius: 12, marginBottom: 30 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                                <div style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>SKU</div>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>{product.sku}</div>
                            </div>
                            {product.weight_g && (
                                <div>
                                    <div style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>Gross Weight</div>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{product.weight_g} g</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ fontSize: 16, lineHeight: 1.6, color: "#ccc", marginBottom: 40 }}>
                        {product.description || "No description available."}
                    </div>

                    <div style={{ display: "flex", gap: 16 }}>
                        <button
                            onClick={handleAddToCart}
                            style={{
                                flex: 1,
                                background: "#fff",
                                color: "#000",
                                padding: "16px 32px",
                                borderRadius: 8,
                                fontWeight: 700,
                                fontSize: 16,
                                border: "none",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                            }}
                        >
                            <ShoppingBag size={20} /> Add to Bag
                        </button>
                        <a
                            href={`https://wa.me/?text=I am interested in ${product.name} (SKU: ${product.sku})`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                flex: 1,
                                background: "rgba(255,255,255,0.1)",
                                color: "#fff",
                                padding: "16px 32px",
                                borderRadius: 8,
                                fontWeight: 700,
                                textDecoration: "none",
                                fontSize: 16,
                                border: "1px solid rgba(255,255,255,0.2)",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                            }}
                        >
                            Enquire
                        </a>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {related.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 60 }}>
                    <h2 style={{ fontSize: 24, marginBottom: 30 }}>You May Also Like</h2>
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                        gap: 20
                    }}>
                        {related.map((p) => (
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
                                    <div style={{ padding: 16 }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</h3>
                                        <div style={{ fontSize: 14, color: "#888" }}>
                                            {p.price ? `₹${p.price.toLocaleString()}` : "Price On Request"}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </ShopLayout>
    );
}
