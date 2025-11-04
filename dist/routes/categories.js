import express from 'express';
import { body, validationResult } from 'express-validator';
import Category from '../models/Category.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
const router = express.Router();
// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json(categories);
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create category (Admin only)
router.post('/', authenticate, authorize(UserRole.ADMIN), [
    body('name').trim().notEmpty(),
    body('description').optional().trim()
], async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Update category (Admin only)
router.put('/:id', authenticate, authorize(UserRole.ADMIN), [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
], async (req, res) => {
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
                const existingId = existingCategory._id.toString();
                const categoryId = category._id.toString();
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Delete category (Admin only)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        await category.deleteOne();
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=categories.js.map