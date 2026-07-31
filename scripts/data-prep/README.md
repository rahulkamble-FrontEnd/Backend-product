# Data Prep (Phase 1 + Phase 2)

Convert vendor Excel + images → bulk-upload ready pack.

## Locked rules

- `GROUP NAME` → `imsId`, `name`, and `sku` (bulk API requires all three)
- Rows **without** a matching image are **removed** from the upload Excel
- Brand is **not** a dropdown (optional `--brand` / form field only)
- Single image naming: `SKU.jpg` (no `-1` suffix)
- `/` and other unsafe chars in SKU are sanitized for ZIP filenames

## Phase 1 — Local CLI

List categories:

```bash
npm run data-prep -- --list-categories
```

Convert example:

```bash
npm run data-prep -- ^
  --xlsx "C:\Users\rahul.kamble\Downloads\Aroma - Matte .xlsx" ^
  --images "C:\Users\rahul.kamble\Downloads\AROMA DURAIN" ^
  --category laminates ^
  --finishType MATTE ^
  --materialType LAMINATE ^
  --status ACTIVE ^
  --out scripts/data-prep/output/aroma-matte
```

Outputs: `*-upload.xlsx`, `*-images.zip`, `*-report.csv`, `*-pack.zip`

Shared engine: `scripts/data-prep/convert-core.js`

## Phase 2 — Admin Data Prep Tool (UI)

- Navbar: **PRODUCTS → Data Prep Tool** (admin only)
- Page: `/data-prep`
- API: `POST /products/data-prep` (admin only)
  - multipart: `file` (xlsx), `imagesZip` (zip), plus form fields `categoryId`, `finishType`, `status`, …
  - response: downloadable pack ZIP + summary headers

Flow: DPT convert → download pack → unzip → existing **Bulk Upload**.
