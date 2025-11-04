import express, { Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import Location, { LocationStatus } from '../models/Location.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

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
    const { category, province, district, search } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    const query: any = { status: LocationStatus.APPROVED };

    if (category) {
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

// Get all locations (Admin/Staff only - includes pending, deleted)
router.get('/all', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query as any;
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

// Get deleted locations (Admin only)
router.get('/deleted', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
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

// Get any single location for Admin/Staff (view even if not approved)
router.get('/admin/:id', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF), async (req: AuthRequest, res: Response) => {
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
  upload.array('images', 10),
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
  upload.array('images', 10),
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

