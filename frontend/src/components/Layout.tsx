import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AdminUser, authLogout } from "../auth";

export default function Layout(props: { user: AdminUser; children: React.ReactNode }) {
    const { user, children } = props;
    const location = useLocation();

    async function onLogout() {
        await authLogout();
        window.location.href = "/login";
    }

    const navItems = [
        { path: "/admin", label: "Control Center" },
        { path: "/vault", label: "Vault & Concepts" },
        { path: "/products/add", label: "Add Product" },
        { path: "/batch", label: "Batch Sourcing" },
        { path: "/procurement", label: "Procurement Plan" },
        { path: "/intelligence", label: "Intelligence" },
        { path: "/sales", label: "Sales Archive" },
        { path: "/customers", label: "Customers" },
        { path: "/orders", label: "Orders" },
        { path: "/settings", label: "Settings" },
    ];

    return (
        <div className="layout">
            <Toaster position="top-right" />
            <aside className="sidebar">
                <div className="brand">
                    ROYALIQ <span>v3.0</span>
                </div>

                <nav className="nav-links">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
                        >
                            {/* Icon placeholder */}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="user-profile">
                    <div className="avatar">
                        {user.name ? user.name[0] : user.email[0].toUpperCase()}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user.name || user.email}</div>
                        <div className="user-role">Retail Manager</div>
                    </div>
                    <button onClick={onLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        &#x2715;
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
