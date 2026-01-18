import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import {
    Lightbulb,
    Target,
    Plus,
    Sparkles,
    AlertCircle,
    CheckCircle2
} from "lucide-react";

type Card = { title: string; color: string; items: string[] };

export default function Intelligence() {
    const [cards, setCards] = useState<Card[]>([]);
    const [wishlistText, setWishlistText] = useState("");
    const [wishlist, setWishlist] = useState<any[]>([]);

    async function load() {
        const out = await apiGet<{ ok: boolean; cards: Card[] }>("/intelligence/prescriptive");
        setCards(out.cards);
        const wl = await apiGet<any[]>("/wishlist?limit=50");
        setWishlist(wl);
    }

    useEffect(() => {
        load().catch(() => { });
    }, []);

    async function addWishlist() {
        if (!wishlistText.trim()) return;
        await apiPost("/wishlist", { request_text: wishlistText.trim() });
        setWishlistText("");
        await load();
    }

    function getColorTheme(color: string) {
        if (color === "green") return { border: "1px solid rgba(34, 197, 94, 0.3)", bg: "linear-gradient(145deg, rgba(34, 197, 94, 0.05) 0%, rgba(30, 27, 24, 0.95) 100%)", icon: "var(--green)" };
        if (color === "yellow") return { border: "1px solid rgba(234, 179, 8, 0.3)", bg: "linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(30, 27, 24, 0.95) 100%)", icon: "var(--yellow)" };
        if (color === "red") return { border: "1px solid rgba(239, 68, 68, 0.3)", bg: "linear-gradient(145deg, rgba(239, 68, 68, 0.05) 0%, rgba(30, 27, 24, 0.95) 100%)", icon: "var(--red)" };
        return { border: "1px solid var(--border)", bg: "var(--panel)" };
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <Sparkles size={28} />
                    Intelligence
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                    Analytics & Strategy
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: 32 }}>
                {cards.map((c) => {
                    const theme = getColorTheme(c.color);
                    return (
                        <div key={c.title} className="card" style={{ background: theme.bg, border: theme.border, transition: 'transform 0.2s' }}>
                            <h3 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
                                <Lightbulb size={18} color={c.color === 'green' ? '#22c55e' : c.color === 'red' ? '#ef4444' : '#eab308'} />
                                {c.title}
                            </h3>
                            {c.items.length === 0 ? (
                                <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>No signals yet</div>
                            ) : (
                                <ul style={{ margin: 0, paddingLeft: 20 }}>
                                    {c.items.map((x) => (
                                        <li key={x} style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.4 }}>{x}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <div className="section-title">
                    <Target size={20} />
                    Demand Fulfillment Ledger
                </div>

                <div className="form-group" style={{ display: "flex", gap: 12 }}>
                    <input
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="Enter client request (e.g., 'Need 50g bangles under ₹3L')"
                        value={wishlistText}
                        onChange={(e) => setWishlistText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addWishlist()}
                    />
                    <button className="btn-primary" onClick={addWishlist}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Plus size={18} /> Add Request
                        </div>
                    </button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Request</th>
                                <th>Category</th>
                                <th>Potential Matches</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wishlist.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                                        No active wishlist requests.
                                    </td>
                                </tr>
                            ) : wishlist.map((w) => (
                                <tr key={w.id}>
                                    <td style={{ fontWeight: 500 }}>{w.request_text}</td>
                                    <td><span className="badge">{w.category || "Pending"}</span></td>
                                    <td>
                                        {w.potential_matches > 0 ? (
                                            <span style={{ color: "#22c55e", display: "flex", alignItems: "center", gap: 6 }}>
                                                <CheckCircle2 size={14} /> {w.potential_matches} Matches
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--text-muted)" }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            {w.status === "FULFILLED" ? <CheckCircle2 size={14} color="#22c55e" /> : <AlertCircle size={14} color="#eab308" />}
                                            <span className={`badge ${w.status === 'FULFILLED' ? 'fresh' : 'watch'}`}>
                                                {w.status}
                                            </span>
                                        </div>
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
