import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Package, Plus, Image as ImageIcon, CreditCard, PenTool, Layers, Tag as TagIcon } from "lucide-react";
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

    // Tags State
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");

    // Image State
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
    const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);

    const [compressing, setCompressing] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCompressing(true);
            try {
                const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                setImageFile(compressedFile);
                setImagePreview(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error(error);
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
            } finally {
                setCompressing(false);
            }
        }
    };

    const handleAdditionalImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setCompressing(true);
            const files = Array.from(e.target.files);
            const newFiles: File[] = [];
            const newPreviews: string[] = [];

            for (const file of files) {
                try {
                    const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
                    newFiles.push(compressed);
                    newPreviews.push(URL.createObjectURL(compressed));
                } catch (e) {
                    newFiles.push(file);
                    newPreviews.push(URL.createObjectURL(file));
                }
            }

            setAdditionalFiles([...additionalFiles, ...newFiles]);
            setAdditionalPreviews([...additionalPreviews, ...newPreviews]);
            setCompressing(false);
        }
    };

    const removeAdditionalImage = (index: number) => {
        const newFiles = additionalFiles.filter((_, i) => i !== index);
        const newPreviews = additionalPreviews.filter((_, i) => i !== index);
        setAdditionalFiles(newFiles);
        setAdditionalPreviews(newPreviews);
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

    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentTag.trim()) {
            e.preventDefault();
            if (!tags.includes(currentTag.trim())) {
                setTags([...tags, currentTag.trim()]);
            }
            setCurrentTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
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

            // Convert additional images
            const additionalBase64: string[] = [];
            for (const file of additionalFiles) {
                const b64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                additionalBase64.push(b64);
            }

            const payload = {
                ...form,
                weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
                price: form.price ? parseFloat(form.price) : null,
                manual_rating: form.manual_rating ? parseFloat(form.manual_rating) : null,
                qty: parseInt(form.qty),
                options: optionsDict,
                tags: tags,
                image_base64: base64Image,
                additional_images: additionalBase64
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


                    <div className="form-group">
                        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TagIcon size={14} /> Product Tags
                        </label>
                        <input
                            className="form-input"
                            value={currentTag}
                            onChange={e => setCurrentTag(e.target.value)}
                            onKeyDown={handleAddTag}
                            placeholder="Type a tag and press Enter..."
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                            {tags.map((tag, idx) => (
                                <span key={idx} style={{
                                    background: 'var(--accent-glow)',
                                    color: 'var(--accent)',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    #{tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                                    >
                                        &times;
                                    </button>
                                </span>
                            ))}
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

                    {/* Additional Images UI */}
                    <div style={{ marginTop: 12, marginBottom: 20 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Additional Images</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {additionalPreviews.map((src, idx) => (
                                <div key={idx} style={{ position: 'relative', width: 60, height: 60 }}>
                                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                                    <button type="button" onClick={() => removeAdditionalImage(idx)} style={{ position: 'absolute', top: -4, right: -4, background: 'red', color: 'white', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: 'none', cursor: 'pointer' }}>&times;</button>
                                </div>
                            ))}
                            <div className="image-upload" style={{ width: 60, height: 60, minHeight: 60, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => document.getElementById('add-files')?.click()}>
                                <Plus size={20} />
                            </div>
                        </div>
                        <input id="add-files" type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleAdditionalImagesChange} />
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
            </form >
        </div >
    );
}
