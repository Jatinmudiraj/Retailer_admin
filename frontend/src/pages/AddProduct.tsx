import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Package, Plus, Image as ImageIcon, CreditCard, PenTool, Layers } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function AddProduct() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        name: "",
        description: "",
        category: "",
        subcategory: "",
        weight_g: "",
        price: "",
        manual_rating: "",
        qty: "1",
        stock_type: "physical",
        terms: "",
    });

    // Options State (Dynamic Key-Value pairs)
    const [options, setOptions] = useState<{ key: string, value: string }[]>([{ key: "", value: "" }]);

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCompressing(true);

            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
            };

            try {
                const compressedFile = await imageCompression(file, options);
                setImageFile(compressedFile);
                setImagePreview(URL.createObjectURL(compressedFile));

                // Optional: Notify user of compression (can remove if too noisy)
                // const saved = ((file.size - compressedFile.size) / 1024).toFixed(0);
                // if (file.size > compressedFile.size) toast.success(`Image compressed (saved ${saved}KB)`);

            } catch (error) {
                console.error("Compression failed:", error);
                setImageFile(file); // Fallback
                setImagePreview(URL.createObjectURL(file));
            } finally {
                setCompressing(false);
            }
        }
    };

    const handleOptionChange = (index: number, field: "key" | "value", val: string) => {
        const newOptions = [...options];
        newOptions[index][field] = val;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { key: "", value: "" }]);
    };

    const removeOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Construct options object
            const optionsDict: Record<string, string> = {};
            options.forEach(opt => {
                if (opt.key.trim()) optionsDict[opt.key.trim()] = opt.value;
            });

            // Convert image to Base64 if exists
            let base64Image = null;
            if (imageFile) {
                base64Image = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
            }

            const payload = {
                ...form,
                weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
                price: form.price ? parseFloat(form.price) : null,
                manual_rating: form.manual_rating ? parseFloat(form.manual_rating) : null,
                qty: parseInt(form.qty),
                options: optionsDict,
                image_base64: base64Image
            };

            const res = await fetch("/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to create product");
            }

            // Navigate to Vault on success
            toast.success("Product created successfully!");
            navigate("/vault");
        } catch (err: any) {
            console.error(err);
            toast.error(`Error creating product: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title-icon">
                    <Package size={28} />
                    Add New Product
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid-cols-2">
                {/* Left Column: Main Info */}
                <div className="card">
                    <div className="section-title">
                        <PenTool size={18} />
                        Basic Details
                    </div>

                    <div className="form-group">
                        <label className="form-label">Product Title</label>
                        <input
                            className="form-input"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Royal Gold Necklace"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Detailed product description..."
                        />
                    </div>

                    <div className="grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input
                                className="form-input"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                placeholder="e.g. Necklace"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subcategory</label>
                            <input
                                className="form-input"
                                value={form.subcategory}
                                onChange={e => setForm({ ...form, subcategory: e.target.value })}
                                placeholder="e.g. Gold"
                            />
                        </div>
                    </div>

                    <div className="grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Price (INR)</label>
                            <div style={{ position: 'relative' }}>
                                <CreditCard size={14} style={{ position: 'absolute', top: 14, left: 12, color: 'var(--text-muted)' }} />
                                <input
                                    type="number"
                                    className="form-input"
                                    style={{ paddingLeft: 36 }}
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Weight (g)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={form.weight_g}
                                onChange={e => setForm({ ...form, weight_g: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Media */}
                <div className="card">
                    <div className="section-title">
                        <ImageIcon size={18} />
                        Media & Inventory
                    </div>

                    <div className="form-group">
                        <label className="form-label">Product Image</label>
                        <div className="image-upload" onClick={() => !compressing && document.getElementById('file-input')?.click()}>
                            {imagePreview ? (
                                <div style={{ position: "relative" }}>
                                    <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', opacity: compressing ? 0.5 : 1 }} />
                                    {compressing && (
                                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.7)", padding: "8px 16px", borderRadius: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                            <div className="spinner"></div> Compressing...
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>
                                    {compressing ? (
                                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                            <div className="spinner"></div>
                                            <div>Compressing Image...</div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ marginBottom: 12 }}><ImageIcon size={32} /></div>
                                            <div>Click to upload image</div>
                                        </>
                                    )}
                                </div>
                            )}
                            <input
                                id="file-input"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                                disabled={compressing}
                            />
                        </div>
                    </div>

                    <div className="grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Stock Qty</label>
                            <input
                                type="number"
                                className="form-input"
                                value={form.qty}
                                onChange={e => setForm({ ...form, qty: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Initial Rating (0-5)</label>
                            <input
                                type="number"
                                step="0.1"
                                max="5"
                                className="form-input"
                                value={form.manual_rating}
                                onChange={e => setForm({ ...form, manual_rating: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Terms & Conditions</label>
                        <textarea
                            className="form-textarea"
                            style={{ minHeight: '80px' }}
                            value={form.terms}
                            onChange={e => setForm({ ...form, terms: e.target.value })}
                            placeholder="Special terms for this product..."
                        />
                    </div>

                    <div className="form-group">
                        <div className="section-title" style={{ fontSize: 14, marginBottom: 12 }}>
                            <Layers size={16} />
                            Additional Attributes
                            <button type="button" onClick={addOption} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                                + ADD OPTION
                            </button>
                        </div>
                        {options.map((opt, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    className="form-input"
                                    placeholder="Name (e.g. Size)"
                                    value={opt.key}
                                    onChange={e => handleOptionChange(idx, 'key', e.target.value)}
                                />
                                <input
                                    className="form-input"
                                    placeholder="Value (e.g. 10)"
                                    value={opt.value}
                                    onChange={e => handleOptionChange(idx, 'value', e.target.value)}
                                />
                                <button type="button" onClick={() => removeOption(idx)} style={{ background: 'rgba(255,60,60,0.1)', color: '#ff3c3c', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}>
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '32px' }}>
                        <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
                            {loading ? "Creating..." : "Create Product"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
