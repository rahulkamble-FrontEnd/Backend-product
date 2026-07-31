/**
 * CLI wrapper around convert-core.js
 *
 * Usage:
 *   node scripts/data-prep/convert-vendor-pack.js ^
 *     --xlsx "C:/path/Aroma - Matte .xlsx" ^
 *     --images "C:/path/AROMA DURAIN" ^
 *     --category laminates ^
 *     --finishType MATTE ^
 *     --status ACTIVE ^
 *     --out scripts/data-prep/output/aroma-matte
 */

const fs = require('fs');
const path = require('path');
const {
  collectImagesFromDir,
  collectImagesFromZipPath,
  convertVendorPack,
} = require('./convert-core');

const SCRIPT_DIR = __dirname;
const CATEGORIES_PATH = path.join(SCRIPT_DIR, 'categories.json');

function printHelp() {
  console.log(`
Data Prep — convert vendor Excel + images → bulk-upload pack

Required:
  --xlsx <path>              Vendor .xlsx (first sheet)
  --images <path>            Images folder OR .zip
  --category <slug|uuid|name>
                             Sub-category from categories.json
                             e.g. laminates | LAMINATES | 953d4497-...

Optional:
  --out <dirOrPrefix>        Output prefix (default: scripts/data-prep/output/pack)
  --finishType <text>        e.g. MATTE / GLOSSY
  --status <text>            default ACTIVE
  --materialType <text>      e.g. LAMINATE
  --description <text>
  --bookName <text>
  --brand <text>             optional (no dropdown)
  --dimensions <text>        e.g. "2440 x 1220 MM"
  --list-categories          Print categories and exit
  --help
`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--list-categories') {
      args.listCategories = true;
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = value;
    i++;
  }
  return args;
}

function loadCategories() {
  return JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));
}

function resolveCategory(categories, input) {
  const needle = String(input || '').trim();
  if (!needle) throw new Error('--category is required');

  const byId = categories.find((c) => c.id === needle);
  if (byId) return byId;

  const lower = needle.toLowerCase();
  const bySlug = categories.find((c) => c.slug.toLowerCase() === lower);
  if (bySlug) return bySlug;

  const byName = categories.filter((c) => c.name.toLowerCase() === lower);
  if (byName.length === 1) return byName[0];
  if (byName.length > 1) {
    throw new Error(
      `Ambiguous category name "${needle}". Use slug or id.\n` +
        byName
          .map((c) => `  ${c.parent} / ${c.name} → ${c.slug} (${c.id})`)
          .join('\n'),
    );
  }

  throw new Error(
    `Unknown category "${needle}". Run with --list-categories to see options.`,
  );
}

function loadImages(imagesPath) {
  const stat = fs.statSync(imagesPath);
  if (stat.isDirectory()) return collectImagesFromDir(imagesPath);
  if (/\.zip$/i.test(imagesPath)) return collectImagesFromZipPath(imagesPath);
  throw new Error(`--images must be a folder or .zip: ${imagesPath}`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const categories = loadCategories();
  if (args.listCategories) {
    for (const c of categories) {
      console.log(`${c.parent} | ${c.name} | ${c.slug} | ${c.id}`);
    }
    console.log(`\nTotal: ${categories.length}`);
    return;
  }

  if (!args.xlsx) throw new Error('--xlsx is required');
  if (!args.images) throw new Error('--images is required');

  const category = resolveCategory(categories, args.category);
  const outPrefix = path.resolve(
    args.out || path.join(SCRIPT_DIR, 'output', 'pack'),
  );
  fs.mkdirSync(path.dirname(outPrefix), { recursive: true });

  const packName = path.basename(outPrefix);
  const result = convertVendorPack({
    xlsxBuffer: fs.readFileSync(path.resolve(args.xlsx)),
    images: loadImages(path.resolve(args.images)),
    options: {
      categoryId: category.id,
      finishType: args.finishType || '',
      status: args.status || 'ACTIVE',
      materialType: args.materialType || '',
      description: args.description || '',
      bookName: args.bookName || '',
      brand: args.brand || '',
      dimensions: args.dimensions || '',
      packName,
    },
  });

  const uploadPath = `${outPrefix}-upload.xlsx`;
  const zipPath = `${outPrefix}-images.zip`;
  const reportPath = `${outPrefix}-report.csv`;
  const packPath = `${outPrefix}-pack.zip`;

  fs.writeFileSync(uploadPath, result.uploadXlsxBuffer);
  fs.writeFileSync(zipPath, result.imagesZipBuffer);
  fs.writeFileSync(reportPath, result.reportCsv, 'utf8');
  fs.writeFileSync(packPath, result.packZipBuffer);

  console.log('Data Prep complete');
  console.log(`  Vendor sheet : ${result.sheetName}`);
  console.log(`  Vendor rows  : ${result.vendorRows}`);
  console.log(`  Images found : ${result.imagesFound}`);
  console.log(`  Matched      : ${result.matched}`);
  console.log(`  Skipped (no image): ${result.skippedNoImage}`);
  console.log(`  Orphan images: ${result.orphanImages}`);
  console.log(
    `  Category     : ${category.parent} / ${category.name} (${category.id})`,
  );
  console.log(`  Upload XLSX : ${uploadPath}`);
  console.log(`  Images ZIP   : ${zipPath}`);
  console.log(`  Report CSV   : ${reportPath}`);
  console.log(`  Pack ZIP     : ${packPath}`);
}

try {
  main();
} catch (err) {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
}
