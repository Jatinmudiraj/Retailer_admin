import React, { useEffect, useState } from "react";
import { apiGet } from "../api";
import { Archive, TrendingUp } from "lucide-react";

export default function SalesArchive() {
    const [items, setItems] = useState<any[]>([]);

    async function load() {
        const out = await apiGet<{ ok: boolean; items: any[] }>("/sales/archive?limit=200");
        setItems(out.items);
    }

    useEffect(() => {
        load().catch(() => { });
    }, []);

    function printInvoice(item: any) {
        const h = 500;
        const w = 400;
        const left = (window.screen.width / 2) - (w / 2);
        const top = (window.screen.height / 2) - (h / 2);

        const win = window.open("", "Invoice", `width=${w},height=${h},top=${top},left=${left}`);
        if (!win) {
            alert("Please allow popups to print invoices");
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice #${item.sku}</title>
                <style>
                    body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; }
                    .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                    .total { border-top: 1px dashed #000; margin-top: 10px; padding-top: 10px; font-weight: bold; font-size: 16px; }
                    .footer { margin-top: 30px; text-align: center; font-size: 12px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>ROYALIQ INVOICE</h2>
                    <div>Date: ${new Date(item.sold_at).toLocaleDateString()}</div>
                    <div>ref: ${item.id.substring(0, 8)}</div>
                </div>
                
                <div class="row">
                    <span>Item</span>
                    <span>${item.sku}</span>
                </div>
                
                <div class="row">
                    <span>Days to Sell</span>
                    <span>${item.days_to_sell || "-"}</span>
                </div>

                <div class="row total">
                    <span>TOTAL</span>
                    <span>₹${(item.recovery_price_inr || 0).toLocaleString()}</span>
                </div>

                <div class="footer">
                    Thank you for your business.
                </div>
                
                <div style="text-align:center; margin-top:20px" class="no-print">
                    <button onclick="window.print()">PRINT NOW</button>
                    <button onclick="window.close()">CLOSE</button>
                </div>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <Archive size={28} />
                    Sales Archive
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Last 200 Items
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Sold At</th>
                                <th>Days to Sell</th>
                                <th>Recovery Price</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((x) => (
                                <tr key={x.id}>
                                    <td style={{ fontWeight: 600 }}>{x.sku}</td>
                                    <td style={{ color: "var(--text-muted)" }}>{new Date(x.sold_at).toLocaleDateString()}</td>
                                    <td>
                                        <span className="badge" style={{ background: "rgba(255,255,255,0.05)" }}>
                                            {x.days_to_sell ?? "-"} days
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>
                                        {x.recovery_price_inr ? `₹${Math.round(x.recovery_price_inr).toLocaleString()}` : "-"}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <TrendingUp size={14} color="#22c55e" />
                                            <span style={{ color: "#22c55e", fontWeight: 500 }}>SOLD</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn2"
                                            style={{ padding: "4px 8px", fontSize: 12 }}
                                            onClick={() => printInvoice(x)}
                                        >
                                            INVOICE
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {items.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                        No sales records found.
                    </div>
                )}
            </div>
        </div>
    );
}
