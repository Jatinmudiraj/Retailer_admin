import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api";
import { Users, Plus, Phone, Mail, Search, User } from "lucide-react";
import toast from "react-hot-toast";

type Customer = {
    id: string;
    name: string;
    phone: string;
    email?: string;
    notes?: string;
    created_at: string;
};

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);

    // Form
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [newEmail, setNewEmail] = useState("");

    useEffect(() => {
        load();
    }, [search]); // Reload on search debounce could be better, but simple is fine

    async function load() {
        try {
            const url = search ? `/customers?q=${encodeURIComponent(search)}` : "/customers";
            const res = await apiGet<Customer[]>(url);
            setCustomers(res);
        } catch (e) {
            console.error(e);
        }
    }

    async function handleAdd() {
        if (!newName.trim() || !newPhone.trim()) {
            toast.error("Name and Phone are required");
            return;
        }
        try {
            await apiPost("/customers", {
                name: newName,
                phone: newPhone,
                email: newEmail || null,
            });
            toast.success("Customer created!");
            setShowAdd(false);
            setNewName("");
            setNewPhone("");
            setNewEmail("");
            load();
        } catch (e: any) {
            toast.error(e.message || "Failed to create customer");
        }
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <Users size={28} />
                    Customers
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                    Relationship Management
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
                <div style={{
                    position: "relative",
                    width: 400
                }}>
                    <Search
                        size={20}
                        color="var(--text-muted)"
                        style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}
                    />
                    <input
                        style={{
                            width: "100%",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            padding: "14px 16px 14px 50px",
                            fontSize: 15,
                            color: "var(--text)",
                            backdropFilter: "blur(10px)",
                            transition: "all 0.2s"
                        }}
                        placeholder="Search customers by name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={(e) => e.target.style.borderColor = "var(--accent)"}
                        onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                    />
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowAdd(true)}
                    style={{ padding: "12px 24px", borderRadius: 12, fontSize: 15 }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Plus size={20} /> New Customer
                    </div>
                </button>
            </div>

            {showAdd && (
                <div className="card" style={{ marginBottom: 24, border: "1px solid var(--accent)", background: "rgba(224, 168, 46, 0.05)" }}>
                    <h3 style={{ marginBottom: 16 }}>Add New Customer</h3>
                    <div className="grid-cols-3" style={{ gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone *</label>
                            <input className="form-input" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                        <button className="btn2" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleAdd}>Save Customer</button>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="table-container">
                    <table className="table">
                        <thead style={{ background: "rgba(0,0,0,0.2)" }}>
                            <tr>
                                <th style={{ padding: 20 }}>NAME</th>
                                <th style={{ padding: 20 }}>CONTACT</th>
                                <th style={{ padding: 20 }}>HISTORY</th>
                                <th style={{ padding: 20 }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                            <div style={{
                                                width: 42, height: 42,
                                                borderRadius: 12,
                                                background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                border: "1px solid rgba(255,255,255,0.05)"
                                            }}>
                                                <User size={20} color="var(--accent)" />
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 20 }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <Phone size={14} color="var(--text-muted)" /> {c.phone}
                                            </div>
                                            {c.email && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)" }}>
                                                    <Mail size={14} /> {c.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: 20 }}>
                                        <span className="badge" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                                            No active orders
                                        </span>
                                    </td>
                                    <td style={{ padding: 20 }}>
                                        <button className="btn2" style={{ padding: "8px 16px", fontSize: 13, borderRadius: 8 }}>
                                            View Profile
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {customers.length === 0 && (
                    <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={30} opacity={0.3} />
                        </div>
                        <div>No customers found. Add your first client above.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
