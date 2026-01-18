#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Base, Product, ProductImage
from app.db import engine

settings = get_settings()
Base.metadata.create_all(bind=engine)


def norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s


def build_meta_index(meta_dir: Path) -> Dict[str, Dict[str, Any]]:
    idx: Dict[str, Dict[str, Any]] = {}
    if not meta_dir.exists():
        return idx
    for p in sorted(meta_dir.glob("*.csv")):
        try:
            df = pd.read_csv(p, low_memory=False)
        except Exception:
            continue
        for r in df.to_dict(orient="records"):
            # index by image-ish cols
            for c in ["image", "image_name", "filename", "file_name", "path", "image_path"]:
                v = r.get(c)
                if v is None:
                    continue
                name = Path(str(v).replace("\\", "/")).name
                stem = Path(name).stem
                for k in [norm(name), norm(stem)]:
                    if k and k not in idx:
                        idx[k] = r
    return idx


def pick(row: Dict[str, Any], cols: List[str]) -> Optional[str]:
    for c in cols:
        v = row.get(c)
        if v is None:
            continue
        s = str(v).strip()
        if s and s.lower() != "nan":
            return s
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--image_index", required=True, type=str)
    ap.add_argument("--images_dir", required=True, type=str)
    ap.add_argument("--meta_dir", required=True, type=str)
    ap.add_argument("--default_stock_type", default="physical")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    image_index = Path(args.image_index)
    images_dir = Path(args.images_dir)
    meta_dir = Path(args.meta_dir)

    meta_idx = build_meta_index(meta_dir)

    with SessionLocal() as db:
        # find path column
        with image_index.open("r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            path_col = None
            for cand in ["rel_path", "relative_path", "image_rel", "path", "image_path", "filepath", "file_path"]:
                if cand in headers:
                    path_col = cand
                    break
            if path_col is None:
                path_col = headers[0] if headers else None

            created = 0
            for r in reader:
                if args.limit and created >= args.limit:
                    break
                raw = (r.get(path_col) or "").strip() if path_col else ""
                if not raw:
                    continue
                raw_norm = raw.replace("\\", "/")
                prefix = images_dir.as_posix().rstrip("/") + "/"
                rel = raw_norm[len(prefix):] if raw_norm.startswith(prefix) else raw_norm.lstrip("/")
                name = Path(rel).name
                stem = Path(rel).stem
                m = meta_idx.get(norm(name)) or meta_idx.get(norm(stem)) or {}

                # build sku
                sku = rel.replace("/", "__")
                sku = re.sub(r"\.[a-zA-Z0-9]{2,5}$", "", sku)
                sku = re.sub(r"[^a-zA-Z0-9_\-]+", "_", sku)
                sku = sku.strip("_")
                if not sku:
                    continue

                if db.query(Product).filter(Product.sku == sku).first():
                    continue

                title = pick(m, ["name", "title", "product_name"]) or stem.replace("_", " ").title()
                category = pick(m, ["category", "Category", "product_category"]) or (Path(rel).parts[0] if len(Path(rel).parts) else "Unknown")
                desc = pick(m, ["description", "desc", "details"]) or None

                weight_g = None
                try:
                    w = m.get("weight_g")
                    if w is not None and str(w).strip() != "":
                        weight_g = float(w)
                except Exception:
                    weight_g = None

                p = Product(
                    sku=sku,
                    name=str(title),
                    description=desc,
                    category=str(category),
                    subcategory=pick(m, ["subcategory", "sub_category"]),
                    weight_g=weight_g,
                    stock_type=args.default_stock_type,
                    qty=1,
                    purchase_date=None,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                    is_archived=False,
                )
                db.add(p)
                # image record (points to customer images path if you later mirror it)
                # For admin UI we serve /media, but here we store relative under "imported/"
                img = ProductImage(sku=sku, path=f"imported/{rel}", is_primary=True)
                db.add(img)

                created += 1

            db.commit()
            print(f"Seeded products: {created}")


if __name__ == "__main__":
    main()
