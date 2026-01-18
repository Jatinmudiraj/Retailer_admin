import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, Layers, Archive, Calendar, CheckCircle2 } from "lucide-react";

export default function BatchSourcing() {
    const [images, setImages] = useState<FileList | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [globalDate, setGlobalDate] = useState(new Date().toISOString().split('T')[0]);
    const [stockType, setStockType] = useState("physical");
    const [msg, setMsg] = useState("");
    const [loading, setLoading] = useState(false);

    async function uploadImages() {
        if (!images || images.length === 0) return;
        setLoading(true);
        try {
            const fd = new FormData();
            for (let i = 0; i < images.length; i++) fd.append("files", images[i]);
            const res = await fetch("/uploads/buffer_images", {
                method: "POST",
                credentials: "include",
                body: fd
            });
            if (!res.ok) throw new Error("Image upload failed");
            const out = await res.json();
            setMsg(`Success: Buffered ${out.buffer_count} images.`);
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function uploadCsv() {
        if (!csvFile) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("csv_file", csvFile);
            const url = `/uploads/batch_csv?global_date=${encodeURIComponent(globalDate)}&stock_type=${encodeURIComponent(stockType)}`;
            const res = await fetch(url, { method: "POST", credentials: "include", body: fd });
            const out = await res.json();
            if (!res.ok) throw new Error(out?.detail || "CSV import failed");
            setMsg(`Success: Created ${out.created} items. Matched ${out.matched_images} images.`);
        } catch (e: any) {
            setMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-title-icon">
                    <Layers size={28} />
                    Batch Sourcing
                </div>
                <div style={{ color: "var(--text-muted)" }}>
                    Upload & Sync
                </div>
            </div>

            {msg && (
                <div className="card" style={{ marginBottom: 20, background: msg.startsWith("Error") ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: msg.startsWith("Error") ? "1px solid #ef4444" : "1px solid #22c55e", display: "flex", alignItems: "center", gap: 10 }}>
                    {msg.startsWith("Error") ? <Archive size={20} color="#ef4444" /> : <CheckCircle2 size={20} color="#22c55e" />}
                    <span>{msg}</span>
                </div>
            )}

            <div className="grid-cols-2">
                {/* Step 1: Media Buffer */}
                <div className="card">
                    <div className="section-title">
                        <div style={{ background: "var(--accent)", color: "#000", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>1</div>
                        Media Buffer
                    </div>

                    <div style={{ marginBottom: 16, color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>
                        Upload product images first. The filenames will be matched with the <b>image_filename</b> column in your CSV.
                    </div>

                    <div className="image-upload" onClick={() => document.getElementById('img-input')?.click()}>
                        <UploadCloud size={40} color="var(--accent)" style={{ marginBottom: 16 }} />
                        <div>
                            {images && images.length > 0 ? (
                                <span style={{ color: "var(--text)", fontWeight: 600 }}>{images.length} files selected</span>
                            ) : (
                                <span>Click to select images</span>
                            )}
                        </div>
                    </div>
                    <input id="img-input" className="input" type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => setImages(e.target.files)} />

                    <button className="btn-primary" style={{ marginTop: 20, width: "100%" }} onClick={uploadImages} disabled={loading || !images}>
                        {loading ? "Uploading..." : "Upload to Buffer"}
                    </button>
                </div>

                {/* Step 2: CSV Processor */}
                <div className="card">
                    <div className="section-title">
                        <div style={{ background: "var(--accent)", color: "#000", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>2</div>
                        CSV Processor
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Calendar size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Global Entry Date</label>
                        <input className="form-input" type="date" value={globalDate} onChange={(e) => setGlobalDate(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Archive size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} /> Stock Type</label>
                        <select className="form-select" value={stockType} onChange={(e) => setStockType(e.target.value)}>
                            <option value="physical">Physical Inventory</option>
                            <option value="concept">Concept (Digital)</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">CSV File</label>
                        <input className="form-input" type="file" accept=".csv" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
                    </div>

                    <button className="btn-primary" style={{ marginTop: 8, width: "100%" }} onClick={uploadCsv} disabled={loading || !csvFile}>
                        {loading ? "Processing..." : "Process Batch"}
                    </button>
                </div>
            </div>
        </div>
    );
}
