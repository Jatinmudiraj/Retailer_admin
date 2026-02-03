import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiGet } from "../api";
import { Package, Image as ImageIcon, CreditCard, PenTool, Layers, CheckCircle2, Tag as TagIcon, Plus } from "lucide-react";
import imageCompression from "browser-image-compression";
import Loader from "../components/Loader";

export default function EditProduct() {
    const { sku } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Form State
    const [form, setForm] = useState({
        sku: "",
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

    useEffect(() => {
        if (!sku) return;
        setLoading(true);
        apiGet<any>(`/products/${sku}`)
            .then(data => {
                setForm({
                    sku: data.sku,
                    name: data.name,
                    description: data.description || "",
                    category: data.category || "",
                    subcategory: data.subcategory || "",
                    weight_g: data.weight_g?.toString() || "",
                    price: data.price ? data.price?.toString() : "",
                    manual_rating: data.manual_rating?.toString() || "",
                    qty: data.qty.toString(),
                    stock_type: data.stock_type,
                    terms: data.terms || "",
                });

                if (data.options) {
                    const opts = Object.entries(data.options).map(([k, v]) => ({ key: k, value: String(v) }));
                    setOptions(opts.length > 0 ? opts : [{ key: "", value: "" }]);
                }

                if (data.tags) {
                    setTags(data.tags);
                }

                if (data.primary_image) {
                    setImagePreview(data.primary_image);
                }

                if (data.images && Array.isArray(data.images)) {
                    // Filter out primary image from additional images list if needed, 
                    // or just use non-primary ones.
                    const extras = data.images.filter((img: any) => !img.is_primary).map((img: any) => img.url);
                    setAdditionalPreviews(extras);
                }
            })
            .catch(err => {
                console.error(err);
                toast.error("Failed to load product details");
            })
            .finally(() => setLoading(false));
    }, [sku]);

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
            } catch (error) {
                console.error("Compression failed:", error);
                setImageFile(file); // Fallback
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
        // Note: This only removes locally added images or hides existing ones from view. 
        // For deleting existing server images, we might need a separate API call or logic.
        // For now, let's assume we are just managing the list to be sent (which only ADDs new ones).
        // If the user wants to delete specific existing images, that requires a delete endpoint.

        // However, to keep UI consistent, let's support removing newly added ones easily.
        // Removing pre-existing ones from the preview list won't delete them from server unless we track deletions.
        // For this version, let's just handle local array.

        // Helper: if index < number of initial server images, it's a server image (mock logic for now).
        // Actually best way: separate server images vs new images? 
        // The prompt asked for "upload multiple images", implying addition. 
        // Let's implement full list management for new files.
        // Existing images deletion is a separate requirement usually, but let's allow removing new ones.

        // Real robust way: 
        // We have `additionalFiles` (new) and `additionalPreviews` (mixed).
        // We need to know which are new.

        // Simplified: `additionalPreviews` holds ALL. 
        // `additionalFiles` holds NEW.
        // If we remove an image, we need to know if it was a file or a URL.

        // Let's rely on standard logic: 
        // We can't easily "delete" a server image via "PUT" payload usually unless API supports "replace all".
        // Our backend supports "ADDITIONAL_IMAGES" (append).
        // To DELETE, we usually need a delete endpoint.
        // Let's support removing NEWly added images.

        // Filter logic:
        // We need to find the corresponding file in `additionalFiles`.
        // This is tricky if we mix them in one preview array.

        // Let's keep it simple: 
        // Only allow removing NEWly added images for now to ensure safety.
        // OR, just update `additionalPreviews` and `additionalFiles`.

        // If we remove index `i` from `additionalPreviews`:
        // We need to find if it corresponds to a file in `additionalFiles`.
        // Since we APPEND new files, the last `N` previews are the new files.
        const numServerImages = additionalPreviews.length - additionalFiles.length;

        if (index < numServerImages) {
            toast.error("Deleting existing images is not supported in this view yet.");
            return;
        }

        const fileIndex = index - numServerImages;
        const newFiles = additionalFiles.filter((_, i) => i !== fileIndex);
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
            // 1. Prepare Base64 Image if selected
            let imageBase64 = null;
            if (imageFile) {
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(imageFile);
                });
            }

            // 2. Prepare Additional Images Base64
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

            // 2. Construct options
            const optionsDict: Record<string, string> = {};
            options.forEach(opt => {
                if (opt.key.trim()) optionsDict[opt.key.trim()] = opt.value;
            });

            const payload = {
                ...form,
                weight_g: form.weight_g ? parseFloat(form.weight_g) : null,
                price: form.price ? parseFloat(form.price) : null,
                manual_rating: form.manual_rating ? parseFloat(form.manual_rating) : null,
                qty: parseInt(form.qty),
                options: optionsDict,

                tags: tags,
                image_base64: imageBase64,
                additional_images: additionalBase64,
            };

            const res = await fetch(`/products/${sku}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.detail || "Failed to update product");
            }

            toast.success("Product updated successfully!");
            navigate("/vault");
        } catch (err: any) {
            console.error(err);
            toast.error(`Error updating product: ${err.message || err}`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !form.name) return <Loader fullscreen text="Loading Product..." />;

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="page-title-icon">
                    <Package size={28} />
                    Edit Product <span style={{ color: 'var(--accent)', fontSize: '0.6em', marginLeft: 10 }}>#{sku}</span>
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
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-textarea"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="grid-cols-2">
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input
                                className="form-input"
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Subcategory</label>
                            <input
                                className="form-input"
                                value={form.subcategory}
                                onChange={e => setForm({ ...form, subcategory: e.target.value })}
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
                                    {compressing ? (
                                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "rgba(0,0,0,0.7)", padding: "8px 16px", borderRadius: 20, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                            <div className="spinner"></div> Compressing...
                                        </div>
                                    ) : (
                                        <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.7)", padding: "4px 8px", borderRadius: 4, fontSize: 12 }}>Click to Change</div>
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
                                            <div>Click to update image</div>
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

                    {/* Additional Images */}
                    <div style={{ marginTop: 12 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Additional Images (New)</label>
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
                            <label className="form-label">Rating (0-5)</label>
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
                                    placeholder="Key"
                                    value={opt.key}
                                    onChange={e => handleOptionChange(idx, 'key', e.target.value)}
                                />
                                <input
                                    className="form-input"
                                    placeholder="Value"
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
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <CheckCircle2 size={18} />
                                {loading ? "Updating..." : "Update Product"}
                            </div>
                        </button>
                    </div>
                </div>
            </form >
        </div >
    );
}
