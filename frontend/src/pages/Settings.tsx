import React, { useEffect, useState } from "react";
import { apiGet, apiPut } from "../api";
import { Settings as SettingsIcon, Save, TrendingUp, AlertCircle, Building, Database, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function Settings() {
    const [goldRate, setGoldRate] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("pricing");

    // Placeholder settings for Store Profile
    const [storeName, setStoreName] = useState("RoyalIQ Jewellers");
    const [storeAddress, setStoreAddress] = useState("Mumbai, India");
    const [taxRate, setTaxRate] = useState("3");

    useEffect(() => {
        loadRate();
    }, []);

    async function loadRate() {
        try {
            const res = await apiGet<{ gold_rate_per_gram: number }>("/settings/gold_rate");
            setGoldRate(res.gold_rate_per_gram);
        } catch (e) {
            console.error(e);
        }
    }

    async function saveRate() {
        if (goldRate <= 0) {
            toast.error("Gold rate must be greater than 0");
            return;
        }
        setLoading(true);
        try {
            await apiPut("/settings/gold_rate", { gold_rate_per_gram: goldRate });
            toast.success("Gold Rate updated successfully.");
        } catch (e: any) {
            toast.error(e.message || "Failed to update rate");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <SettingsIcon size={28} />
                    Settings
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                    System Configuration
                </div>
            </div>

            <div style={{ display: "flex", gap: 32 }}>
                {/* Sidebar Navigation */}
                <div style={{ width: 240, flexShrink: 0 }}>
                    <div className="card" style={{ padding: 12 }}>
                        {[
                            { id: "pricing", label: "Gold Rate & Pricing", icon: TrendingUp },
                            { id: "general", label: "Store Profile", icon: Building },
                            { id: "system", label: "System & Data", icon: Database },
                        ].map((tab) => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: "12px 16px",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    background: activeTab === tab.id ? "rgba(224, 168, 46, 0.1)" : "transparent",
                                    color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
                                    marginBottom: 4,
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    transition: "all 0.2s"
                                }}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, maxWidth: 600 }}>

                    {activeTab === "pricing" && (
                        <div className="card" style={{ animation: "fadeIn 0.3s ease-out" }}>
                            <div className="section-title">
                                <TrendingUp size={20} />
                                Daily Gold Rate
                            </div>

                            <div style={{ marginBottom: 24, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
                                Set the daily gold rate per gram. This value is used to calculate the real-time <b>Retail Valuation</b> of all physical inventory items.
                            </div>

                            <div className="form-group">
                                <label className="form-label">Rate per Gram (INR)</label>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <div style={{ position: "relative", flex: 1 }}>
                                        <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 600 }}>₹</span>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={goldRate}
                                            onChange={(e) => setGoldRate(parseFloat(e.target.value) || 0)}
                                            style={{ fontSize: 18, fontWeight: 700, paddingLeft: 32 }}
                                        />
                                    </div>
                                    <button className="btn-primary" onClick={saveRate} disabled={loading}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Save size={18} /> Update Rate
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: 16, background: "rgba(234, 179, 8, 0.1)", borderRadius: 8, display: "flex", gap: 12, alignItems: "start", border: "1px solid rgba(234, 179, 8, 0.2)" }}>
                                <AlertCircle size={20} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div style={{ fontSize: 13, color: "#eab308", lineHeight: 1.5 }}>
                                    <b>Important:</b> Updating this rate does not change the price of items already sold. It only affects the valuation of current stock and future sales calculations.
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "general" && (
                        <div className="card" style={{ animation: "fadeIn 0.3s ease-out" }}>
                            <div className="section-title">
                                <Building size={20} />
                                Store Profile
                            </div>
                            <div style={{ marginBottom: 24, fontSize: 14, color: "var(--text-muted)" }}>
                                These details will appear on printed invoices and labels.
                            </div>

                            <div className="form-group">
                                <label className="form-label">Store Name</label>
                                <input className="form-input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Address / Location</label>
                                <textarea className="form-input" rows={3} value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Default Tax Rate (GST %)</label>
                                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                    <input className="form-input" style={{ width: 100 }} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                                    <span style={{ color: "var(--text-muted)" }}>%</span>
                                </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                                <button className="btn-primary" onClick={() => toast.success("Store Profile Saved")}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "system" && (
                        <div className="card" style={{ animation: "fadeIn 0.3s ease-out" }}>
                            <div className="section-title">
                                <Database size={20} />
                                System & Data
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Export Inventory</div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Download all product data as CSV</div>
                                    </div>
                                    <button className="btn2" onClick={() => window.open("/customers/ratings.csv", "_blank")}>
                                        <FileText size={16} style={{ marginRight: 8 }} /> Export CSV
                                    </button>
                                </div>

                                <div style={{ padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>Clear Local Cache</div>
                                        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Fix display issues by resetting browser cache</div>
                                    </div>
                                    <button className="btn2" onClick={() => { window.localStorage.clear(); window.location.reload(); }}>
                                        Clear Cache
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
