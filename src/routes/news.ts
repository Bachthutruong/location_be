import express, { Response, RequestHandler } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import News from '../models/News.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 10MB per file
  }
});

// Get all published news (public)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    const query: any = { published: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const baseCursor = News.find(query)
      .populate('category', 'name')
      .populate('author', 'name email')
      .sort({ publishedAt: -1, createdAt: -1 });

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        baseCursor.skip(offset).limit(limit),
        News.countDocuments(query)
      ]);
      return res.json({ items, total, offset, limit });
    } else {
      const news = await baseCursor;
      return res.json(news);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get all news (Admin/Staff/Manager only - includes unpublished)
router.get('/all', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, published } = req.query as any;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
    
    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (typeof published !== 'undefined') {
      query.published = ['true', '1', 'yes'].includes(String(published).toLowerCase());
    }

    const baseCursor = News.find(query)
      .populate('category', 'name')
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    if (limit !== undefined) {
      const [items, total] = await Promise.all([
        baseCursor.skip(offset).limit(limit),
        News.countDocuments(query)
      ]);
      return res.json({ items, total, offset, limit });
    } else {
      const news = await baseCursor;
      return res.json(news);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single news (public - only published)
router.get('/:id', async (req, res) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('category', 'name description')
      .populate('author', 'name email');

    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }

    // Only show published news to public users
    if (!news.published) {
      return res.status(404).json({ message: 'News not found' });
    }

    res.json(news);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single news for admin/staff/manager (can view unpublished)
router.get('/admin/:id', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req: AuthRequest, res: Response) => {
  try {
    const news = await News.findById(req.params.id)
      .populate('category', 'name description')
      .populate('author', 'name email');
    
    if (!news) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    return res.json(news);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
});

// Create news (Admin/Staff/Manager)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  (upload.array('images', 20) as unknown as RequestHandler),
  async (req: AuthRequest, res: Response) => {
    try {
      // Manual validation for multipart/form-data
      const { title, content, category, published } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ message: '標題為必填' });
      }
      if (!content || !content.trim()) {
        return res.status(400).json({ message: '內容為必填' });
      }
      if (!category || !mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: '分類無效' });
      }

      const files = req.files as Express.Multer.File[];
      let imageUrls: string[] = [];

      // Upload images to Cloudinary if provided
      if (files && files.length > 0) {
        try {
          imageUrls = await Promise.all(
            files.map(file => uploadToCloudinary(file, 'location-management/news'))
          );
        } catch (uploadError: any) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          return res.status(500).json({ message: '上傳圖片時發生錯誤: ' + (uploadError.message || 'Unknown error') });
        }
      }

      const isPublished = published === 'true' || published === true;

      const news = new News({
        title: title.trim(),
        content: content.trim(),
        category,
        images: imageUrls,
        author: req.user!.id,
        published: isPublished,
        publishedAt: isPublished ? new Date() : undefined
      });

      await news.save();
      await news.populate('category', 'name');
      await news.populate('author', 'name email');

      res.status(201).json(news);
    } catch (error: any) {
      console.error('Error creating news:', error);
      res.status(500).json({ message: error.message || '建立新聞時發生錯誤' });
    }
  }
);

// Update news (Admin/Staff/Manager)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  (upload.array('images', 20) as unknown as RequestHandler),
  async (req: AuthRequest, res: Response) => {
    try {
      const news = await News.findById(req.params.id);
      if (!news) {
        return res.status(404).json({ message: 'News not found' });
      }

      const { title, content, category, published } = req.body;

      if (title) news.title = title.trim();
      if (content) news.content = content.trim();
      if (category) news.category = category;

      // Handle published status
      if (typeof published !== 'undefined') {
        const isPublished = published === 'true' || published === true;
        news.published = isPublished;
        if (isPublished && !news.publishedAt) {
          news.publishedAt = new Date();
        }
      }

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
        const currentSet = new Set(news.images);
        const keepSet = new Set(keepImages);
        const toDelete = [...currentSet].filter(url => !keepSet.has(url));
        if (toDelete.length > 0) {
          await Promise.all(toDelete.map(url => deleteFromCloudinary(url)));
        }
        news.images = [...keepSet];
      }
      if (files && files.length > 0) {
        try {
          const newUrls = await Promise.all(files.map(file => uploadToCloudinary(file, 'location-management/news')));
          news.images = [...(news.images || []), ...newUrls];
        } catch (uploadError: any) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          return res.status(500).json({ message: '上傳圖片時發生錯誤: ' + (uploadError.message || 'Unknown error') });
        }
      }

      await news.save();
      await news.populate('category', 'name');
      await news.populate('author', 'name email');

      res.json(news);
    } catch (error: any) {
      console.error('Error updating news:', error);
      res.status(500).json({ message: error.message || '更新新聞時發生錯誤' });
    }
  }
);

// Delete news (Admin/Staff/Manager)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  async (req: AuthRequest, res: Response) => {
    try {
      const news = await News.findById(req.params.id);
      if (!news) {
        return res.status(404).json({ message: 'News not found' });
      }

      // Delete images from Cloudinary
      if (news.images && news.images.length > 0) {
        await Promise.all(news.images.map(url => deleteFromCloudinary(url)));
      }

      await news.deleteOne();

      res.json({ message: 'News deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

