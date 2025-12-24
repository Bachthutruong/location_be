import express, { Response } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Category from '../models/Category.js';
import Location, { LocationStatus } from '../models/Location.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

// Get all categories with location counts (filtered by province/district if provided)
router.get('/', async (req, res) => {
  try {
    const { province, district } = req.query;
    const categories = await Category.find().sort({ createdAt: -1 });
    
    // Build base query for filtering locations
    const locationQuery: any = {
      status: LocationStatus.APPROVED
    };
    
    if (province) {
      locationQuery.province = province;
    }
    if (district) {
      locationQuery.district = district;
    }
    
    // Get location counts for each category (filtered by province/district if provided)
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Location.countDocuments({
          ...locationQuery,
          category: category._id
        });
        return {
          ...category.toObject(),
          locationCount: count
        };
      })
    );
    
    res.json(categoriesWithCounts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create category (Admin/Staff/Manager only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: 'Category already exists' });
      }

      const category = new Category({ name, description });
      await category.save();

      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Update category (Admin/Staff/Manager only)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      const { name, description } = req.body;

      if (name) {
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
          const existingId = (existingCategory._id as mongoose.Types.ObjectId).toString();
          const categoryId = (category._id as mongoose.Types.ObjectId).toString();
          if (existingId !== categoryId) {
            return res.status(400).json({ message: 'Category name already exists' });
          }
        }
        category.name = name;
      }

      if (description !== undefined) {
        category.description = description;
      }

      await category.save();

      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete category (Admin/Staff/Manager only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  async (req: AuthRequest, res) => {
    try {
      const category = await Category.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      await category.deleteOne();

      res.json({ message: 'Category deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

