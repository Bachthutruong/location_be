import express, { Response } from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import NewsCategory from '../models/NewsCategory.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

// Get all news categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await NewsCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single news category (public)
router.get('/:id', async (req, res) => {
  try {
    const category = await NewsCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'News category not found' });
    }
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create news category (Admin/Staff/Manager only)
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

      const existingCategory = await NewsCategory.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({ message: 'News category already exists' });
      }

      const category = new NewsCategory({ name, description });
      await category.save();

      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Update news category (Admin/Staff/Manager only)
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

      const category = await NewsCategory.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'News category not found' });
      }

      const { name, description } = req.body;

      if (name) {
        const existingCategory = await NewsCategory.findOne({ name });
        if (existingCategory) {
          const existingId = (existingCategory._id as mongoose.Types.ObjectId).toString();
          const categoryId = (category._id as mongoose.Types.ObjectId).toString();
          if (existingId !== categoryId) {
            return res.status(400).json({ message: 'News category name already exists' });
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

// Delete news category (Admin/Staff/Manager only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  async (req: AuthRequest, res) => {
    try {
      const category = await NewsCategory.findById(req.params.id);
      if (!category) {
        return res.status(404).json({ message: 'News category not found' });
      }

      await category.deleteOne();

      res.json({ message: 'News category deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

