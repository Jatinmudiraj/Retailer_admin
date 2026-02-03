import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MetricCards, { Metrics } from "../components/MetricCards";
import { apiGet, apiPut } from "../api";
import {
    TrendingUp,
    Plus,
    Archive,
    Database,
    MessageSquare,
    User,
    Download
} from "lucide-react";

import Loader from "../components/Loader";

export default function Dashboard() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [gold, setGold] = useState<number>(0);
    const [goldInput, setGoldInput] = useState<string>("");
    const [feedback, setFeedback] = useState<any[]>([]);

    async function load() {
        const m = await apiGet<Metrics>("/dashboard/metrics");
        const g = await apiGet<{ gold_rate_per_gram: number }>("/settings/gold_rate");
        const f = await apiGet<{ ok: boolean; items: any[] }>("/dashboard/recent_feedback?limit=5");
        setMetrics(m);
        setGold(g.gold_rate_per_gram);
        setGoldInput(String(g.gold_rate_per_gram));
        setFeedback(f.items);
    }

    useEffect(() => {
        load().catch(() => { });
    }, []);

    async function saveGold() {
        const v = Number(goldInput);
        if (!isFinite(v) || v <= 0) return;
        const out = await apiPut<{ gold_rate_per_gram: number }>("/settings/gold_rate", { gold_rate_per_gram: v });
        setGold(out.gold_rate_per_gram);
    }

    if (!metrics) {
        return (
            <div className="card" style={{ minHeight: 400 }}>
                <Loader text="Loading Control Center..." />
            </div>
        );
    }

    return (
        <div>
            {/* Header / Ticker */}
            <div className="header">
                <div>
                    <h1 className="page-title">Control Center</h1>
                    <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>

                <div className="ticker-card">
                    <div className="ticker-icon">
                        <TrendingUp size={18} />
                    </div>
                    <div style={{ marginRight: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Gold Rate</div>
                        <div className="ticker-value">₹{gold.toLocaleString()}/g</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 12 }}>
                        <input
                            className="form-input"
                            value={goldInput}
                            onChange={(e) => setGoldInput(e.target.value)}
                            style={{ width: 80, padding: "4px 8px", fontSize: 13, height: 32 }}
                        />
                        <button className="btn-primary" style={{ padding: "4px 12px", fontSize: 12 }} onClick={saveGold}>
                            Set
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <MetricCards m={metrics} />

            <div style={{ height: 32 }} />

            {/* Quick Actions */}
            <div className="section-title">
                <Database size={20} />
                Quick Actions
            </div>

            <div className="quick-actions">
                <Link to="/products/add" className="action-btn">
                    <div className="stat-icon" style={{ background: "rgba(212, 175, 55, 0.1)", color: "var(--accent)" }}>
                        <Plus size={24} />
                    </div>
                    <span>Add Product</span>
                </Link>
                <Link to="/vault" className="action-btn">
                    <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6" }}>
                        <Database size={24} />
                    </div>
                    <span>Vault</span>
                </Link>
                <Link to="/batch" className="action-btn">
                    <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.1)", color: "#a855f7" }}>
                        <Archive size={24} />
                    </div>
                    <span>Batch Sourcing</span>
                </Link>
                <a href="/customers/ratings.csv" className="action-btn" target="_blank" rel="noreferrer">
                    <div className="stat-icon" style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e" }}>
                        <Download size={24} />
                    </div>
                    <span>Download CSV</span>
                </a>
            </div>

            {/* Feedback & Activity */}
            <div className="grid-cols-2">
                <div>
                    <div className="section-title">
                        <MessageSquare size={20} />
                        Recent Feedback
                    </div>
                    <div className="feedback-list">
                        {feedback.length === 0 ? (
                            <div className="card" style={{ color: "var(--text-muted)", textAlign: "center" }}>
                                No recent feedback
                            </div>
                        ) : (
                            feedback.map((x) => (
                                <div key={x.id} className="feedback-item">
                                    <div className="feedback-avatar">
                                        <User size={20} />
                                    </div>
                                    <div className="feedback-content">
                                        <div className="feedback-meta">
                                            <span>User Feedback</span>
                                            <span>{x.created_at}</span>
                                        </div>
                                        <div style={{ lineHeight: 1.5 }}>{x.text}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Placeholder for future widget (e.g., Sales Chart) */}
                <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, flexDirection: "column", gap: 16 }}>
                    <TrendingUp size={48} color="var(--text-muted)" style={{ opacity: 0.2 }} />
                    <div style={{ color: "var(--text-muted)" }}>Sales Analytics (Coming Soon)</div>
                </div>
            </div>
        </div>
    );
}
