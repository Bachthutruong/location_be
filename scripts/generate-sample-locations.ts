import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Location, { LocationStatus } from '../src/models/Location.js';
import Category from '../src/models/Category.js';
import User, { UserRole } from '../src/models/User.js';

dotenv.config();

async function connectMongo() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/location-management';
  await mongoose.connect(uri);
}

async function getManagerUser(): Promise<mongoose.Types.ObjectId> {
  const admin = await User.findOne({ role: UserRole.ADMIN });
  if (admin) return admin._id as any;
  const anyUser = await User.findOne();
  if (anyUser) return anyUser._id as any;
  const created = await User.create({ name: 'Import Admin', email: `import-admin-${Date.now()}@example.com`, password: 'ChangeMe123!', role: UserRole.ADMIN });
  return created._id as any;
}

async function main() {
  const rows = [
    ['name','categoryName','province','district','street','address','phone','googleMapsLink','description','imageUrls','latitude','longitude'],
    ['Din Tai Fung (Taipei 101)','Restaurant','Taipei City','Xinyi District','Section 5, Xinyi Rd','No. 45, Shifu Rd, Xinyi District, Taipei City','02-8101-7799','https://maps.google.com/?q=25.034184,121.564517','World-famous xiaolongbao, must-visit in Taipei 101','','25.034184','121.564517'],
    ['Yongkang Beef Noodle','Restaurant','Taipei City','Da’an District','Sec. 2, Jinshan S Rd','No. 17, Sec. 2, Jinshan S Rd, Da’an District, Taipei City','02-2351-1051','https://maps.google.com/?q=25.032729,121.528986','Iconic Taiwanese beef noodle soup spot','','25.032729','121.528986'],
    ['Chun Shui Tang (Taichung Siwei)','Tea Shop','Taichung City','West District','Siwei St','No. 30, Siwei St, West District, Taichung City','04-2327-6608','https://maps.google.com/?q=24.143229,120.661936','Birthplace of bubble milk tea','','24.143229','120.661936'],
    ['Fika Fika Cafe','Cafe','Taipei City','Zhongshan District','Yitong St','No. 33, Yitong St, Zhongshan District, Taipei City','02-2711-9260','https://maps.google.com/?q=25.057248,121.533627','Award-winning specialty coffee','','25.057248','121.533627'],
    ['Tiger Sugar (Ximending)','Tea Shop','Taipei City','Wanhua District','Hanzhong St','No. 52, Hanzhong St, Wanhua District, Taipei City','02-2388-0110','https://maps.google.com/?q=25.042233,121.507942','Brown sugar boba milk specialty','','25.042233','121.507942']
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Locations');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outDir = path.resolve(__dirname, '../sample');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sample-locations.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(outPath);

  // Seed into DB as well
  await connectMongo();
  const header = rows[0];
  const idx = (name: string) => header.indexOf(name);
  const managerId = await getManagerUser();
  let created = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (name: string) => String(row[idx(name)] || '').trim();
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

    let category = await Category.findOne({ name: categoryName });
    if (!category) category = await Category.create({ name: categoryName });

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
      images: imageUrlsRaw ? imageUrlsRaw.split(';').map(s => s.trim()).filter(Boolean) : [],
      manager: managerId,
      status: LocationStatus.APPROVED,
      approvedBy: managerId as any,
      approvedAt: new Date(),
      latitude: latitudeRaw ? parseFloat(latitudeRaw) : undefined,
      longitude: longitudeRaw ? parseFloat(longitudeRaw) : undefined
    });
    created++;
  }
  console.log(JSON.stringify({ created }, null, 2));
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });


