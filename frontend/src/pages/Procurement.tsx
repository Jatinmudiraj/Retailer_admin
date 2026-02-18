import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import Loader from "../components/Loader";
import {
    AlertTriangle, CheckCircle, TrendingDown, ShoppingBag,
    XCircle, RefreshCw, Archive, DollarSign, Activity, Search, Filter,
    Download, Calendar, BarChart2, Star, X
} from "lucide-react";
import { Link } from "react-router-dom";

type ProcurementRecommendation = {
    sku: string;
    name: string;
    category: string;
    current_stock: number;
    forecasted_demand: number;
    recommendation: string;
    recommendation_color: string;
    reason: string;
    days_in_stock: number;
    sales_velocity_30d: number;
    image_url?: string;
    procurement_score: number;
    retail_value: number;
    avg_rating: number;
    rating_count: number;
};

export default function Procurement() {
    const [data, setData] = useState<ProcurementRecommendation[]>([]);
    const [filteredData, setFilteredData] = useState<ProcurementRecommendation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filters & Enhancements
    const [tab, setTab] = useState("All");
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [seasonality, setSeasonality] = useState(1.0);
    const [selectedItem, setSelectedItem] = useState<ProcurementRecommendation | null>(null);

    async function load() {
        setLoading(true);
        setError("");
        try {
            const res = await apiGet<ProcurementRecommendation[]>("/procurement/recommendations");
            setData(res);
            setFilteredData(res);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleExport() {
        try {
            // Using window.open for simplicity with streaming response
            const token = localStorage.getItem("token"); // Assuming simple token auth query param or cookie
            // Better: fetch blob
            const response = await fetch(import.meta.env.VITE_API_BASE_URL + "/procurement/export", {
                headers: { "Authorization": `Bearer ${token}` } // Or however auth is handled
            });
            if (!response.ok) throw new Error("Export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `procurement_plan_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e: any) {
            alert("Failed to export data: " + e.message);
        }
    }

    useEffect(() => {
        load();
    }, []);

    // Extract categories
    const categories = ["All", ...Array.from(new Set(data.map(i => i.category || "Uncategorized")))];

    useEffect(() => {
        let res = data;

        // 1. Tab Filter
        if (tab === "Buy") {
            res = res.filter(x => x.recommendation.includes("Buy") || x.recommendation.includes("Restock"));
        } else if (tab === "Sell") {
            res = res.filter(x => x.recommendation.includes("Discount") || x.recommendation.includes("Dead") || x.recommendation.includes("Overstock"));
        } else if (tab === "Urgent") {
            res = res.filter(x => x.procurement_score >= 80);
        }

        // 2. Category Filter
        if (categoryFilter !== "All") {
            res = res.filter(x => (x.category || "Uncategorized") === categoryFilter);
        }

        // 3. Search
        if (search) {
            const q = search.toLowerCase();
            res = res.filter(x =>
                x.name.toLowerCase().includes(q) ||
                x.sku.toLowerCase().includes(q) ||
                x.reason.toLowerCase().includes(q)
            );
        }

        setFilteredData(res);
    }, [tab, categoryFilter, search, data, seasonality]); // Added seasonality to dependencies

    if (loading && data.length === 0) return <Loader text="Analyzing Retail Intelligence..." />;

    if (error) {
        return (
            <div className="card">
                <div style={{ color: "var(--danger)", textAlign: "center", padding: 50 }}>
                    <AlertTriangle size={64} style={{ marginBottom: 24, opacity: 0.8 }} />
                    <h2 style={{ marginBottom: 12 }}>Analysis Unavailable</h2>
                    <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>{error}</p>
                    <button className="btn-primary" onClick={load}>Retry Analysis</button>
                </div>
            </div>
        );
    }

    // Calculations for Summary
    const totalCapitalHere = data.reduce((acc, item) => acc + item.retail_value, 0);
    const urgentCount = data.filter(x => x.procurement_score >= 80).length;
    const deadStockCount = data.filter(x => x.recommendation.includes("Dead")).length;

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Header */}
            <div className="header" style={{ marginBottom: 32 }}>
                <div>
                    <h1 className="page-title">Procurement Intelligence</h1>
                    <div className="subtitle">AI-driven inventory optimization and forecasting</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-secondary" onClick={handleExport}>
                        <Download size={16} style={{ marginRight: 8 }} />
                        Export CSV
                    </button>
                    <button className="btn-primary" onClick={load}>
                        <RefreshCw size={16} style={{ marginRight: 8 }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Controls Bar (With Seasonality) */}
            <div className="controls-bar" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, background: "var(--card-bg)", padding: 16, borderRadius: 12, border: "1px solid var(--border-color)" }}>
                {/* Seasonality */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 16, borderRight: "1px solid var(--border-color)" }}>
                    <Calendar size={18} color="var(--accent)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Seasonality:</span>
                    <select
                        style={{ background: "var(--bg-secondary)", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", cursor: "pointer" }}
                        value={seasonality}
                        onChange={e => setSeasonality(parseFloat(e.target.value))}
                    >
                        <option value={1.0}>Standard (1.0x)</option>
                        <option value={1.2}>Wedding Season (1.2x)</option>
                        <option value={1.5}>Diwali / Festival (1.5x)</option>
                        <option value={0.8}>Off-Season (0.8x)</option>
                    </select>
                </div>

                {/* Filters */}
                <div className="search-box">
                    <Search size={16} color="var(--text-muted)" />
                    <input
                        placeholder="Search products..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="select-box">
                    <Filter size={14} color="var(--text-muted)" style={{ marginRight: 8 }} />
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div style={{ flex: 1 }}></div>

                {/* Tabs */}
                <div className="tabs">
                    {["All", "Buy", "Sell", "Urgent"].map(f => (
                        <button
                            key={f}
                            className={`tab-btn ${tab === f ? "active" : ""}`}
                            onClick={() => setTab(f)}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid-cols-3" style={{ marginBottom: 32 }}>
                <MetricCard
                    icon={<Activity size={24} />}
                    color="#ef4444"
                    label="Urgent Actions"
                    value={`${urgentCount} Items`}
                    sub="Requires immediate attention"
                />
                <MetricCard
                    icon={<DollarSign size={24} />}
                    color="#3b82f6"
                    label="Inventory Value"
                    value={`₹${(totalCapitalHere / 100000).toFixed(2)} L`}
                    sub="Total tracked assets"
                />
                <MetricCard
                    icon={<Archive size={24} />}
                    color="var(--text-secondary)"
                    label="Dead Stock"
                    value={`${deadStockCount} Items`}
                    sub="No sales in 90+ days"
                />
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <table className="table">
                    <thead style={{ background: "var(--bg-secondary)", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        <tr>
                            <th style={{ width: 60, paddingLeft: 24 }}></th>
                            <th>Product</th>
                            <th style={{ textAlign: "center" }}>Stock</th>
                            <th style={{ textAlign: "center" }}>Forecast</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Insight</th>
                            <th style={{ textAlign: "right", paddingRight: 24 }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map((item) => {
                            // Apply Seasonality to Display
                            const adjustedForecast = Math.round(item.forecasted_demand * seasonality);

                            return (
                                <tr
                                    key={item.sku}
                                    style={{ borderBottom: "1px solid var(--border-color)", transition: "background 0.2s", cursor: "pointer" }}
                                    className="hover-row"
                                    onClick={() => setSelectedItem(item)}
                                >
                                    <td style={{ padding: "16px 0 16px 24px" }}>
                                        <div className="product-thumb">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" />
                                            ) : (
                                                <div className="thumb-placeholder">{item.name[0]}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 15 }}>{item.name}</div>
                                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", gap: 8, alignItems: "center" }}>
                                            <span className="sku-tag">{item.sku}</span>
                                            <span>•</span>
                                            <span>{item.category}</span>
                                            {item.rating_count > 0 && (
                                                <span style={{ display: "flex", alignItems: "center", color: "#eab308", fontWeight: 600 }}>
                                                    ★ {item.avg_rating} <span style={{ color: "var(--text-muted)", marginLeft: 4, fontWeight: 400 }}>({item.rating_count})</span>
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{item.current_stock}</div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Units</div>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <div style={{ fontWeight: 600, fontSize: 15, color: seasonality !== 1.0 ? "var(--accent)" : "var(--text-secondary)" }}>
                                            {adjustedForecast}
                                            {seasonality !== 1.0 && <span style={{ fontSize: 10, verticalAlign: "top" }}>*</span>}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Est. 30d</div>
                                    </td>
                                    <td style={{ width: 140 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div className="score-bar-bg">
                                                <div
                                                    className="score-bar-fill"
                                                    style={{
                                                        width: `${item.procurement_score}%`,
                                                        background: getScoreColor(item.procurement_score)
                                                    }}
                                                />
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: getScoreColor(item.procurement_score) }}>{item.procurement_score}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Badge type={item.recommendation} color={item.recommendation_color} />
                                    </td>
                                    <td style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.4 }}>
                                        {item.reason}
                                    </td>
                                    <td style={{ textAlign: "right", paddingRight: 24 }}>
                                        {getAction(item)}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {filteredData.length === 0 && (
                    <div style={{ padding: 80, textAlign: "center", color: "var(--text-muted)" }}>
                        <div style={{ marginBottom: 16, opacity: 0.3 }}>
                            <ShoppingBag size={64} />
                        </div>
                        <h3>No items match this filter</h3>
                        <p>Try adjusting your search or category filters.</p>
                        <button className="btn-secondary" style={{ marginTop: 16 }} onClick={() => { setTab("All"); setCategoryFilter("All"); setSearch("") }}>
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Product Detail Modal */}
            {selectedItem && (
                <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Product Intelligence</h2>
                            <button className="close-btn" onClick={() => setSelectedItem(null)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
                                <div className="product-thumb-l">
                                    {selectedItem.image_url ? <img src={selectedItem.image_url} alt="" /> : <div className="thumb-placeholder">{selectedItem.name[0]}</div>}
                                </div>
                                <div>
                                    <h3>{selectedItem.name}</h3>
                                    <div className="sku-tag" style={{ display: "inline-block", marginTop: 8 }}>{selectedItem.sku}</div>
                                    <p style={{ color: "var(--text-muted)", marginTop: 8 }}>{selectedItem.category}</p>
                                </div>
                            </div>

                            <div className="grid-cols-2" style={{ gap: 16 }}>
                                <div className="stat-box">
                                    <label>Forecast Logic</label>
                                    <div className="val">{selectedItem.forecasted_demand} units</div>
                                    <div className="sub">Base 30d Projection</div>
                                </div>
                                <div className="stat-box">
                                    <label>Customer Sentiment</label>
                                    <div className="val" style={{ color: "#eab308" }}>
                                        ★ {selectedItem.avg_rating} <span style={{ fontSize: 14, color: "var(--text-muted)" }}>({selectedItem.rating_count} reviews)</span>
                                    </div>
                                    <div className="sub">Crowdsourced quality score</div>
                                </div>
                                <div className="stat-box">
                                    <label>Sales Velocity</label>
                                    <div className="val">{selectedItem.sales_velocity_30d} / mo</div>
                                    <div className="sub">Moving average</div>
                                </div>
                                <div className="stat-box">
                                    <label>Inventory Age</label>
                                    <div className="val">{selectedItem.days_in_stock} days</div>
                                    <div className="sub">Since last purchase</div>
                                </div>
                            </div>

                            <div style={{ marginTop: 24, padding: 16, background: "var(--bg-secondary)", borderRadius: 8 }}>
                                <h4 style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><BarChart2 size={16} /> Recommendation Engine</h4>
                                <p style={{ lineHeight: 1.5, color: "var(--text-secondary)" }}>
                                    Thinking: <strong>{selectedItem.reason}</strong>
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
                            {getAction(selectedItem)}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 1000;
                }
                .modal-content {
                    background: var(--card-bg); width: 600px; max-width: 90vw;
                    border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header {
                    padding: 20px 24px; border-bottom: 1px solid var(--border-color);
                    display: flex; justify-content: space-between; align-items: center;
                }
                .modal-body { padding: 24px; }
                .modal-footer {
                    padding: 16px 24px; border-top: 1px solid var(--border-color);
                    display: flex; justify-content: flex-end; gap: 12px; background: var(--bg-secondary);
                    border-radius: 0 0 16px 16px;
                }
                .product-thumb-l {
                    width: 80px; height: 80px; border-radius: 12px;
                    background: var(--bg-secondary); overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                .product-thumb-l img { width: 100%; height: 100%; object-fit: cover; }

                .stat-box {
                    background: var(--bg-body); padding: 16px; border-radius: 12px;
                    border: 1px solid var(--border-color);
                }
                .stat-box label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 4px; }
                .stat-box .val { font-size: 20px; font-weight: 700; color: var(--text-primary); }
                .stat-box .sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Previous Styles */
                .controls-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    background: var(--card-bg);
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                }

                .filters {
                    display: flex;
                    gap: 12px;
                }

                .search-box {
                    display: flex;
                    align-items: center;
                    background: var(--bg-body);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0 12px;
                    height: 40px;
                    width: 240px;
                    transition: border-color 0.2s;
                }
                .search-box:focus-within {
                    border-color: var(--accent);
                }
                .search-box input {
                    border: none;
                    background: transparent;
                    outline: none;
                    margin-left: 8px;
                    font-size: 14px;
                    color: var(--text-primary);
                    width: 100%;
                }

                .select-box {
                    display: flex;
                    align-items: center;
                    background: var(--bg-body);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 0 12px;
                    height: 40px;
                }
                .select-box select {
                    border: none;
                    background: transparent;
                    outline: none;
                    font-size: 14px;
                    color: var(--text-primary);
                    cursor: pointer;
                }

                .hover-row:hover {
                    background: rgba(0,0,0,0.02);
                }

                .sku-tag {
                    font-family: monospace;
                    background: var(--bg-secondary);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 11px;
                    color: var(--text-primary);
                }

                .card-metrics {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.03);
                    transition: transform 0.2s;
                }
                .card-metrics:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.06);
                }
                .metrics-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .metrics-label {
                    font-size: 13px;
                    color: var(--text-muted);
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }
                .metrics-value {
                    font-size: 28px;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .metrics-sub {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-top: 2px;
                }

                .product-thumb {
                    width: 56px;
                    height: 56px;
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-color);
                    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                }
                .product-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .thumb-placeholder {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-muted);
                }

                .score-bar-bg {
                    flex: 1;
                    height: 8px;
                    background: var(--bg-secondary);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .score-bar-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.5s ease-out;
                }

                .tabs {
                    display: flex;
                    gap: 4px;
                    background: var(--bg-secondary);
                    padding: 4px;
                    border-radius: 10px;
                }
                .tab-btn {
                    padding: 8px 16px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: var(--text-muted);
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .tab-btn:hover {
                    color: var(--text-primary);
                    background: rgba(255,255,255,0.05);
                }
                .tab-btn.active {
                    color: var(--text-primary);
                    background: var(--card-bg);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}

function MetricCard({ icon, color, label, value, sub }: any) {
    return (
        <div className="card-metrics">
            <div className="metrics-icon" style={{ background: color + "20", color: color }}>
                {icon}
            </div>
            <div>
                <div className="metrics-label">{label}</div>
                <div className="metrics-value">{value}</div>
                <div className="metrics-sub">{sub}</div>
            </div>
        </div>
    );
}

function getScoreColor(score: number) {
    if (score >= 80) return "#ef4444"; // Red for Urgent
    if (score >= 60) return "#f97316";
    if (score >= 40) return "#eab308";
    return "#22c55e"; // Green for Safe/Normal
}

function Badge({ type, color }: { type: string; color: string }) {
    let bg = "rgba(0,0,0,0.1)";
    let fg = "var(--text-primary)";

    if (color === "green") {
        bg = "rgba(34, 197, 94, 0.1)";
        fg = "#22c55e";
    } else if (color === "red") {
        bg = "rgba(239, 68, 68, 0.1)";
        fg = "#ef4444";
    } else if (color === "orange") {
        bg = "rgba(249, 115, 22, 0.1)";
        fg = "#f97316";
    } else if (color === "yellow") {
        bg = "rgba(234, 179, 8, 0.1)";
        fg = "#eab308";
    } else if (color === "black") {
        bg = "rgba(0, 0, 0, 0.1)";
        fg = "var(--text-muted)";
    } else if (color === "blue") {
        bg = "rgba(59, 130, 246, 0.1)";
        fg = "#3b82f6";
    }

    return (
        <span style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            background: bg,
            color: fg,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            border: `1px solid ${color === "black" ? "rgba(0,0,0,0.1)" : bg}`
        }}>
            {getIcon(type)}
            {type}
        </span>
    );
}

function getIcon(type: string) {
    const style = { marginRight: 6, width: 14, height: 14 };
    if (type.includes("Buy") || type.includes("Restock")) return <ShoppingBag style={style} />;
    if (type.includes("Overstock")) return <Archive style={style} />;
    if (type.includes("Discount")) return <TrendingDown style={style} />;
    if (type.includes("Dead")) return <XCircle style={style} />;
    if (type.includes("Promote")) return <Star style={style} />;
    return <CheckCircle style={style} />;
}

function getAction(item: ProcurementRecommendation) {
    if (item.recommendation.includes("Buy") || item.recommendation.includes("Restock")) {
        return (
            <Link to="/batch" className="btn-primary" style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
                Order
            </Link>
        );
    }
    if (item.recommendation.includes("Discount") || item.recommendation.includes("Dead") || item.recommendation.includes("Promote")) {
        return (
            <Link to={`/products/${item.sku}/edit`} className="btn-secondary" style={{ fontSize: 13, padding: "8px 16px", textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                Manage
            </Link>
        );
    }
    return <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 500 }}>No Action</span>;
}
