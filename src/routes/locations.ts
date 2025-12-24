import express, { Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import Location, { LocationStatus } from '../models/Location.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';
import Category from '../models/Category.js';
// @ts-ignore - types provided at runtime, and declared in src/types
import * as XLSX from 'xlsx';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Get all approved locations (public)
router.get('/', async (req, res) => {
  try {
    const { category, categories, province, district, search, featured } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const query: any = { status: LocationStatus.APPROVED };

    // Support both single category (for backward compatibility) and multiple categories
    if (categories) {
      // Handle comma-separated string or array
      const categoryArray = Array.isArray(categories) 
        ? categories 
        : (categories as string).split(',').map(c => c.trim()).filter(Boolean);
      
      if (categoryArray.length > 0) {
        query.category = { $in: categoryArray };
      }
    } else if (category) {
      // Backward compatibility: single category
      query.category = category;
    }
    
    if (province) {
      query.province = province;
    }
    if (district) {
      query.district = district;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (typeof featured !== 'undefined') {
      query.featured = ['true', '1', 'yes'].includes(String(featured).toLowerCase());
    }

    const baseCursor = Location.find(query)
      .populate('category', 'name')
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        baseCursor.skip(offset).limit(limit),
        Location.countDocuments(query)
      ]);
      return res.json({ items, total, offset, limit });
    } else {
      const locations = await baseCursor;
      return res.json(locations);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all locations (Admin/Staff/Manager - includes pending, deleted)
router.get('/all', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, featured } = req.query as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const query: any = {};

    if (status) {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { province: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } }
      ];
    }
    if (typeof featured !== 'undefined') {
      query.featured = ['true', '1', 'yes'].includes(String(featured).toLowerCase());
    }
    const baseCursor = Location.find(query)
      .populate('category', 'name')
      .populate('manager', 'name email')
      .populate('approvedBy', 'name email')
      .populate('deletedBy', 'name email')
      .sort({ createdAt: -1 });

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        baseCursor.skip(offset).limit(limit),
        Location.countDocuments(query)
      ]);
      return res.json({ items, total, offset, limit });
    } else {
      const locations = await baseCursor;
      return res.json(locations);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Download Excel template for bulk import (Admin/Staff/Manager only)
router.get('/import/template', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (_req: AuthRequest, res: Response) => {
  const rows = [
    ['name','categoryName','province','district','street','address','phone','googleMapsLink','description','imageUrls','latitude','longitude'],
    ['Sample Location','Restaurant','Taipei City','Da’an District','Section 1, Xinyi Rd','No. 1, Section 1, Xinyi Rd, Da’an District, Taipei City','02-12345678','https://maps.google.com/?q=25.033964,121.564468','Great place for local food','https://picsum.photos/seed/1/800/600;https://picsum.photos/seed/2/800/600','25.033964','121.564468']
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="locations_template.xlsx"');
  res.send(Buffer.from(buf));
});

// Bulk import locations via Excel (Admin/Staff/Manager only)
router.post('/import', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), (upload.single('file') as unknown as RequestHandler), async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ message: 'Excel 檔案為必填' });
    }
    // parse workbook
    const wb = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: 'Excel 內容為空' });
    }
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown as string[][];
    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel 內容為空' });
    }
    const header = rows[0].map(h => String(h || '').trim());
    const requiredHeaders = ['name','categoryName','province','district','street','address','googleMapsLink','description'];
    for (const h of requiredHeaders) {
      if (!header.includes(h)) {
        return res.status(400).json({ message: `缺少欄位: ${h}` });
      }
    }

    const colIndex = (name: string) => header.indexOf(name);
    const dataRows = rows.slice(1);

    const errors: { row: number; message: string }[] = [];
    let success = 0;

    for (let r = 0; r < dataRows.length; r++) {
      const row = dataRows[r];
      const get = (name: string) => (colIndex(name) >= 0 && row[colIndex(name)] !== undefined ? row[colIndex(name)].trim() : '');

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

      // basic validation
      if (!name || !categoryName || !province || !district || !street || !address || !googleMapsLink || !description) {
        errors.push({ row: r + 2, message: '缺少必要欄位' });
        continue;
      }
      try { new URL(googleMapsLink); } catch { errors.push({ row: r + 2, message: 'Google 地圖連結無效' }); continue; }

      // find category by name
      let category = await Category.findOne({ name: categoryName.trim() });
      if (!category) {
        category = await Category.create({ name: categoryName.trim() });
      }

      const images = imageUrlsRaw ? imageUrlsRaw.split(';').map(s => s.trim()).filter(Boolean) : [];

      const latitude = latitudeRaw ? parseFloat(latitudeRaw) : undefined;
      const longitude = longitudeRaw ? parseFloat(longitudeRaw) : undefined;

      const location = new Location({
        name,
        category: category._id,
        province,
        district,
        street,
        address,
        phone: phone || undefined,
        googleMapsLink,
        description,
        images,
        manager: req.user!.id,
        status: LocationStatus.APPROVED, // admin import -> approved
        approvedBy: req.user!.id as any,
        approvedAt: new Date(),
        latitude,
        longitude
      });

      try {
        await location.save();
        success++;
      } catch (e: any) {
        errors.push({ row: r + 2, message: e.message || '無法儲存' });
      }
    }

    res.json({ imported: success, failed: errors.length, errors });
  } catch (error: any) {
    res.status(500).json({ message: error.message || '匯入失敗' });
  }
});

// Get deleted locations (Admin/Staff/Manager only)
router.get('/deleted', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const locations = await Location.find({ status: LocationStatus.DELETED })
      .populate('category', 'name')
      .populate('manager', 'name email')
      .populate('deletedBy', 'name email')
      .sort({ deletedAt: -1 });

    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Intentionally moved to end to avoid shadowing specific routes (no handler here)

// Get manager's locations
router.get('/manager/my', authenticate, authorize(UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const query: any = { manager: req.user!.id };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { province: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } }
      ];
    }

    const baseCursor = Location.find(query)
      .populate('category', 'name')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        baseCursor.skip(offset).limit(limit),
        Location.countDocuments(query)
      ]);
      return res.json({ items, total, offset, limit });
    } else {
      const locations = await baseCursor;
      return res.json(locations);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get manager's single location by id (can view even if not approved)
router.get('/manager/:id', authenticate, authorize(UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('category', 'name description')
      .populate('manager', 'name email')
      .populate('approvedBy', 'name email');

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const managerId = (location.manager as any)?._id
      ? String((location.manager as any)._id)
      : String(location.manager);
    if (managerId !== req.user!.id) {
      return res.status(403).json({ message: 'You can only view your own locations' });
    }

    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get any single location for Admin/Staff/Manager (view even if not approved)
router.get('/admin/:id', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('category', 'name description')
      .populate('manager', 'name email')
      .populate('approvedBy', 'name email');
    if (!location) return res.status(404).json({ message: 'Location not found' });
    return res.json(location);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Create location (Manager and Admin)
router.post(
  '/',
  authenticate,
  authorize(UserRole.MANAGER, UserRole.ADMIN),
  (upload.array('images', 10) as unknown as RequestHandler),
  async (req: AuthRequest, res: Response) => {
    try {
      // Manual validation for multipart/form-data
      const { name, category, province, district, street, address, phone, googleMapsLink, description, latitude, longitude } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: '地點名稱為必填' });
      }
      if (!category || !mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: '分類無效' });
      }
      if (!province || !province.trim()) {
        return res.status(400).json({ message: '縣市為必填' });
      }
      if (!district || !district.trim()) {
        return res.status(400).json({ message: '區為必填' });
      }
      if (!street || !street.trim()) {
        return res.status(400).json({ message: '街道為必填' });
      }
      if (!address || !address.trim()) {
        return res.status(400).json({ message: '地址為必填' });
      }
      if (!googleMapsLink || !googleMapsLink.trim()) {
        return res.status(400).json({ message: 'Google 地圖連結為必填' });
      }
      try {
        new URL(googleMapsLink);
      } catch {
        return res.status(400).json({ message: 'Google 地圖連結無效' });
      }
      if (!description || !description.trim()) {
        return res.status(400).json({ message: '描述為必填' });
      }
      if (!phone || !phone.trim()) {
        return res.status(400).json({ message: '電話為必填' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: '請上傳至少一張圖片' });
      }

      // Upload images to Cloudinary
      const imageUrls = await Promise.all(
        files.map(file => uploadToCloudinary(file))
      );

      // Auto-approve if created by admin
      const isAdmin = req.user!.role === UserRole.ADMIN;
      const status = isAdmin ? LocationStatus.APPROVED : LocationStatus.PENDING;

      const location = new Location({
        name: name.trim(),
        category,
        province: province.trim(),
        district: district.trim(),
        street: street.trim(),
        address: address.trim(),
        phone: phone.trim(),
        googleMapsLink: googleMapsLink.trim(),
        description: description.trim(),
        images: imageUrls,
        manager: req.user!.id,
        status,
        latitude: latitude ? parseFloat(latitude as string) : undefined,
        longitude: longitude ? parseFloat(longitude as string) : undefined
      });

      // If admin creates, auto-approve
      if (isAdmin) {
        location.approvedBy = req.user!.id as any;
        location.approvedAt = new Date();
      }

      await location.save();
      await location.populate('category', 'name');
      if (isAdmin) {
        await location.populate('approvedBy', 'name email');
      }

      res.status(201).json(location);
    } catch (error: any) {
      console.error('Error creating location:', error);
      res.status(500).json({ message: error.message || '建立地點時發生錯誤' });
    }
  }
);

// Update location (Manager - own locations, Staff - all)
router.put(
  '/:id',
  authenticate,
  (upload.array('images', 10) as unknown as RequestHandler),
  async (req: AuthRequest, res: Response) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      // Check permissions
      const isManager = req.user!.role === UserRole.MANAGER;
      const isStaff = req.user!.role === UserRole.STAFF;
      const isAdmin = req.user!.role === UserRole.ADMIN;

      if (isManager && location.manager.toString() !== req.user!.id) {
        return res.status(403).json({ message: 'You can only edit your own locations' });
      }

      if (!isManager && !isStaff && !isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const { name, category, province, district, street, address, phone, googleMapsLink, description, latitude, longitude } = req.body;

      if (name) location.name = name.trim();
      if (category) location.category = category;
      if (province) location.province = province.trim();
      if (district) location.district = district.trim();
      if (street) location.street = street.trim();
      if (address) location.address = address.trim();
      if (phone) location.phone = phone.trim();
      if (googleMapsLink) location.googleMapsLink = googleMapsLink.trim();
      if (description) location.description = description.trim();
      if (latitude) location.latitude = parseFloat(latitude as string);
      if (longitude) location.longitude = parseFloat(longitude as string);

      // Handle images with optional keepImages + uploads
      const files = req.files as Express.Multer.File[];
      // Parse keepImages (JSON array or comma-separated)
      let keepImages: string[] | undefined;
      const rawKeep = (req.body as any).keepImages;
      if (rawKeep) {
        try {
          keepImages = Array.isArray(rawKeep) ? rawKeep as string[] : JSON.parse(rawKeep as string);
        } catch {
          keepImages = String(rawKeep).split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      if (keepImages) {
        const currentSet = new Set(location.images);
        const keepSet = new Set(keepImages);
        const toDelete = [...currentSet].filter(url => !keepSet.has(url));
        if (toDelete.length > 0) {
          await Promise.all(toDelete.map(url => deleteFromCloudinary(url)));
        }
        location.images = [...keepSet];
      }
      if (files && files.length > 0) {
        const newUrls = await Promise.all(files.map(file => uploadToCloudinary(file)));
        location.images = [...(location.images || []), ...newUrls];
      }

      await location.save();
      await location.populate('category', 'name');
      await location.populate('manager', 'name email');

      res.json(location);
    } catch (error: any) {
      console.error('Error updating location:', error);
      res.status(500).json({ message: error.message || '更新地點時發生錯誤' });
    }
  }
);

// Approve location (Staff and Admin)
router.patch(
  '/:id/approve',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      location.status = LocationStatus.APPROVED;
      location.approvedBy = req.user!.id as any;
      location.approvedAt = new Date();

      await location.save();
      await location.populate('category', 'name');
      await location.populate('manager', 'name email');
      await location.populate('approvedBy', 'name email');

      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Set featured flag (Admin only)
router.patch(
  '/:id/featured',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  async (req: AuthRequest, res: Response) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }
      const desired = ['true', '1', 'yes'].includes(String((req.body as any)?.featured).toLowerCase());
      (location as any).featured = desired;
      await location.save();
      await location.populate('category', 'name');
      await location.populate('manager', 'name email');
      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message || '更新精選地點失敗' });
    }
  }
);

// Reject location (Staff and Admin)
router.patch(
  '/:id/reject',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  async (req: AuthRequest, res: Response) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      location.status = LocationStatus.REJECTED;

      await location.save();

      res.json(location);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete location (Manager - own, Staff - all)
router.delete(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }

      const isManager = req.user!.role === UserRole.MANAGER;
      const isStaff = req.user!.role === UserRole.STAFF;
      const isAdmin = req.user!.role === UserRole.ADMIN;

      if (isManager && location.manager.toString() !== req.user!.id) {
        return res.status(403).json({ message: 'You can only delete your own locations' });
      }

      if (!isManager && !isStaff && !isAdmin) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Soft delete - mark as deleted
      location.status = LocationStatus.DELETED;
      location.deletedBy = req.user!.id as any;
      location.deletedAt = new Date();

      await location.save();

      res.json({ message: 'Location deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get single location (public approved only) - keep at end
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('category', 'name description')
      .populate('manager', 'name email')
      .populate('approvedBy', 'name email');

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    // Only show approved locations to public users
    if (location.status !== LocationStatus.APPROVED) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

