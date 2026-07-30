/**
 * Shared vendor-pack conversion (CLI + Nest API).
 * GROUP NAME → imsId/name/sku; drop rows without images; single image → SKU.jpg
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const AdmZip = require('adm-zip');

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const UPLOAD_HEADERS = [
  'imsId',
  'name',
  'sku',
  'brand',
  'description',
  'bookName',
  'pageNumber',
  'application',
  'materialType',
  'finishType',
  'colorName',
  'colorHex',
  'thickness',
  'dimensions',
  'performanceRating',
  'durabilityRating',
  'priceCategory',
  'maintenanceRating',
  'bestUsedFor',
  'pros',
  'cons',
  'status',
  'categoryIds',
];

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\//g, ' ')
    .replace(/\+/g, '+')
    .replace(/[^A-Z0-9+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSku(value) {
  const sku = String(value || '')
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');

  if (!sku) {
    throw new Error(`GROUP NAME "${value}" produces an empty SKU`);
  }
  return sku;
}

function cellString(row, ...keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function formatThickness(value) {
  if (value == null || String(value).trim() === '') return '';
  const raw = String(value).trim();
  if (/mm/i.test(raw)) return raw.toUpperCase();
  if (/^\d+(\.\d+)?$/.test(raw)) return `${raw} MM`;
  return raw;
}

function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function collectImagesFromDir(dirPath) {
  const files = [];
  const stack = [dirPath];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      files.push({
        sourcePath: full,
        originalName: entry.name,
        baseName: path.parse(entry.name).name,
        ext,
        buffer: null,
      });
    }
  }
  return files;
}

function collectImagesFromZipBuffer(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const files = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const originalName = entry.entryName.split('/').pop()?.trim() || '';
    if (!originalName) continue;
    const ext = path.extname(originalName).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;
    files.push({
      sourcePath: null,
      originalName,
      baseName: path.parse(originalName).name,
      ext,
      buffer: entry.getData(),
    });
  }
  return files;
}

function collectImagesFromZipPath(zipPath) {
  return collectImagesFromZipBuffer(fs.readFileSync(zipPath));
}

function buildImageIndex(images) {
  const byKey = new Map();
  for (const img of images) {
    const key = normalizeKey(img.baseName);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(img);
  }
  return byKey;
}

function readVendorRowsFromBuffer(xlsxBuffer) {
  const wb = XLSX.read(xlsxBuffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
  return { sheetName, rows };
}

function buildUploadXlsxBuffer(uploadRows) {
  const aoa = [
    UPLOAD_HEADERS,
    ...uploadRows.map((row) => UPLOAD_HEADERS.map((h) => row[h] ?? '')),
  ];
  const outWb = XLSX.utils.book_new();
  const outWs = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(outWb, outWs, 'Products');
  return XLSX.write(outWb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * @param {{
 *   xlsxBuffer: Buffer,
 *   images: Array<{sourcePath:string|null, originalName:string, baseName:string, ext:string, buffer:Buffer|null}>,
 *   options: {
 *     categoryId: string,
 *     finishType?: string,
 *     status?: string,
 *     materialType?: string,
 *     description?: string,
 *     bookName?: string,
 *     brand?: string,
 *     dimensions?: string,
 *     packName?: string,
 *   }
 * }} input
 */
function convertVendorPack(input) {
  const { xlsxBuffer, images, options } = input;
  const categoryId = String(options.categoryId || '').trim();
  if (!categoryId) {
    throw new Error('categoryId is required');
  }

  const finishType = options.finishType || '';
  const status = (options.status || 'ACTIVE').toUpperCase();
  const materialType = options.materialType || '';
  const description = options.description || '';
  const bookName = options.bookName || '';
  const brand = options.brand || '';
  const dimensions = options.dimensions || '';
  const packName = options.packName || 'pack';

  const { sheetName, rows: vendorRows } = readVendorRowsFromBuffer(xlsxBuffer);
  const imageIndex = buildImageIndex(images);

  const uploadRows = [];
  const reportRows = [];
  const usedImageKeys = new Set();
  const usedSkus = new Set();
  const imagesZip = new AdmZip();

  for (let i = 0; i < vendorRows.length; i++) {
    const vendorRow = vendorRows[i];
    const excelRow = i + 2;
    const groupName = cellString(
      vendorRow,
      'GROUP NAME',
      'Group Name',
      'group name',
    );

    if (!groupName) {
      reportRows.push({
        excelRow,
        groupName: '',
        sku: '',
        status: 'skipped_empty_group',
        imageFile: '',
        notes: 'Missing GROUP NAME',
      });
      continue;
    }

    const sku = sanitizeSku(groupName);
    const key = normalizeKey(groupName);
    const matches = imageIndex.get(key) || [];

    if (!matches.length) {
      reportRows.push({
        excelRow,
        groupName,
        sku,
        status: 'skipped_no_image',
        imageFile: '',
        notes: 'No matching image; removed from upload Excel',
      });
      continue;
    }

    const skuKey = sku.toUpperCase();
    if (usedSkus.has(skuKey)) {
      reportRows.push({
        excelRow,
        groupName,
        sku,
        status: 'skipped_duplicate_sku',
        imageFile: '',
        notes: 'Sanitized SKU duplicates an earlier row',
      });
      continue;
    }
    usedSkus.add(skuKey);

    const img =
      matches.find((m) => !usedImageKeys.has(normalizeKey(m.baseName))) ||
      matches[0];
    usedImageKeys.add(normalizeKey(img.baseName));

    const thickness = formatThickness(
      cellString(vendorRow, 'THICKNESS', 'Thickness'),
    );

    const zipEntryName = `${sku}${img.ext.toLowerCase() === '.jpeg' ? '.jpg' : img.ext.toLowerCase()}`;
    const buffer = img.buffer || fs.readFileSync(img.sourcePath);
    imagesZip.addFile(zipEntryName, buffer);

    uploadRows.push({
      imsId: groupName,
      name: groupName,
      sku,
      brand,
      description,
      bookName,
      pageNumber: '',
      application: '',
      materialType,
      finishType,
      colorName: '',
      colorHex: '',
      thickness,
      dimensions,
      performanceRating: '',
      durabilityRating: '',
      priceCategory: '',
      maintenanceRating: '',
      bestUsedFor: '',
      pros: '',
      cons: '',
      status,
      categoryIds: categoryId,
    });

    reportRows.push({
      excelRow,
      groupName,
      sku,
      status: 'matched',
      imageFile: img.originalName,
      notes: `zip:${zipEntryName}`,
    });
  }

  for (const img of images) {
    const key = normalizeKey(img.baseName);
    if (usedImageKeys.has(key)) continue;
    reportRows.push({
      excelRow: '',
      groupName: '',
      sku: '',
      status: 'orphan_image',
      imageFile: img.originalName,
      notes: 'Image not matched to any GROUP NAME',
    });
  }

  const matched = reportRows.filter((r) => r.status === 'matched').length;
  const skippedNoImage = reportRows.filter(
    (r) => r.status === 'skipped_no_image',
  ).length;
  const orphans = reportRows.filter((r) => r.status === 'orphan_image').length;
  const skippedEmpty = reportRows.filter(
    (r) => r.status === 'skipped_empty_group',
  ).length;
  const skippedDup = reportRows.filter(
    (r) => r.status === 'skipped_duplicate_sku',
  ).length;

  const uploadXlsxBuffer = buildUploadXlsxBuffer(uploadRows);
  const imagesZipBuffer = imagesZip.toBuffer();
  const reportCsv = buildCsv(reportRows);

  const packZip = new AdmZip();
  packZip.addFile(`${packName}-upload.xlsx`, uploadXlsxBuffer);
  packZip.addFile(`${packName}-images.zip`, imagesZipBuffer);
  packZip.addFile(`${packName}-report.csv`, Buffer.from(reportCsv, 'utf8'));
  packZip.addFile(
    `${packName}-summary.json`,
    Buffer.from(
      JSON.stringify(
        {
          sheetName,
          vendorRows: vendorRows.length,
          imagesFound: images.length,
          matched,
          skippedNoImage,
          skippedEmptyGroup: skippedEmpty,
          skippedDuplicateSku: skippedDup,
          orphanImages: orphans,
          categoryId,
        },
        null,
        2,
      ),
      'utf8',
    ),
  );

  return {
    sheetName,
    vendorRows: vendorRows.length,
    imagesFound: images.length,
    matched,
    skippedNoImage,
    skippedEmptyGroup: skippedEmpty,
    skippedDuplicateSku: skippedDup,
    orphanImages: orphans,
    categoryId,
    uploadXlsxBuffer,
    imagesZipBuffer,
    reportCsv,
    packZipBuffer: packZip.toBuffer(),
    reportRows,
  };
}

module.exports = {
  UPLOAD_HEADERS,
  normalizeKey,
  sanitizeSku,
  collectImagesFromDir,
  collectImagesFromZipBuffer,
  collectImagesFromZipPath,
  convertVendorPack,
  buildCsv,
};
