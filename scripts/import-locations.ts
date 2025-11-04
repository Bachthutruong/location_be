import dotenv from 'dotenv';
import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import Location, { LocationStatus } from '../src/models/Location.js';
import Category from '../src/models/Category.js';
import User, { UserRole } from '../src/models/User.js';

dotenv.config();

async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/location-management';
  await mongoose.connect(uri);
}

function readRowsFromExcel(filePath: string): string[][] {
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel 無內容');
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown as string[][];
  return rows;
}

async function getManagerUser(): Promise<mongoose.Types.ObjectId> {
  const admin = await User.findOne({ role: UserRole.ADMIN });
  if (admin) return admin._id as any;
  const anyUser = await User.findOne();
  if (anyUser) return anyUser._id as any;
  // create a minimal admin user if none exists
  const created = await User.create({ name: 'Import Admin', email: `import-admin-${Date.now()}@example.com`, password: 'ChangeMe123!', role: UserRole.ADMIN });
  return created._id as any;
}

async function ensureCategoryByName(name: string) {
  const trimmed = name.trim();
  let cat = await Category.findOne({ name: trimmed });
  if (!cat) {
    cat = await Category.create({ name: trimmed });
  }
  return cat;
}

async function main() {
  const excelPath = process.argv[2];
  if (!excelPath) {
    console.error('Usage: tsx scripts/import-locations.ts <path-to-excel.xlsx>');
    process.exit(1);
  }

  await connectMongo();
  const managerId = await getManagerUser();

  const rows = readRowsFromExcel(excelPath);
  if (!rows || rows.length === 0) throw new Error('Excel 無內容');
  const header = rows[0].map(h => String(h || '').trim());
  const idx = (name: string) => header.indexOf(name);

  const required = ['name','categoryName','province','district','street','address','googleMapsLink','description'];
  for (const h of required) {
    if (!header.includes(h)) throw new Error(`缺少欄位: ${h}`);
  }

  const dataRows = rows.slice(1);
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r] || [];
    const get = (name: string) => (idx(name) >= 0 ? String(row[idx(name)] || '').trim() : '');

    const name = get('name');
    const categoryName = get('categoryName');
    const province = get('province');
    const district = get('district');
    const street = get('street');
    const address = get('address');
    const phone = get('phone');
    const googleMapsLink = get('googleMapsLink');
    const description = get('description');
    const imageUrlsRaw = get('imageUrls');
    const latitudeRaw = get('latitude');
    const longitudeRaw = get('longitude');

    if (!name || !categoryName || !province || !district || !street || !address || !googleMapsLink || !description) {
      errors.push({ row: r + 2, message: '缺少必要欄位' });
      continue;
    }
    try { new URL(googleMapsLink); } catch { errors.push({ row: r + 2, message: 'Google 地圖連結無效' }); continue; }

    try {
      const category = await ensureCategoryByName(categoryName);
      const images = imageUrlsRaw ? imageUrlsRaw.split(';').map(s => s.trim()).filter(Boolean) : [];
      const latitude = latitudeRaw ? parseFloat(latitudeRaw) : undefined;
      const longitude = longitudeRaw ? parseFloat(longitudeRaw) : undefined;

      await Location.create({
        name,
        category: category._id,
        province,
        district,
        street,
        address,
        phone: phone || undefined,
        googleMapsLink,
        description,
        images, // optional
        manager: managerId,
        status: LocationStatus.APPROVED,
        approvedBy: managerId as any,
        approvedAt: new Date(),
        latitude,
        longitude
      });
      imported++;
    } catch (e: any) {
      errors.push({ row: r + 2, message: e.message || '匯入失敗' });
    }
  }

  console.log(JSON.stringify({ imported, failed: errors.length, errors }, null, 2));
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (e) => {
    console.error(e);
    await mongoose.disconnect();
    process.exit(1);
  });


