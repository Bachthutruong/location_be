import express from 'express';
import { body, validationResult } from 'express-validator';
import Report, { ReportStatus } from '../models/Report.js';
import ReportCategory from '../models/ReportCategory.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
const router = express.Router();
// Get all reports (Admin only)
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};
        if (status) {
            query.status = status;
        }
        const reports = await Report.find(query)
            .populate('location', 'name address')
            .populate('category', 'name')
            .populate('reportedBy', 'name email')
            .populate('resolvedBy', 'name email')
            .sort({ createdAt: -1 });
        res.json(reports);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get report categories (Admin only for create, public for read)
router.get('/categories', async (req, res) => {
    try {
        const categories = await ReportCategory.find().sort({ createdAt: -1 });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create report category (Admin only)
router.post('/categories', authenticate, authorize(UserRole.ADMIN), [
    body('name').trim().notEmpty(),
    body('description').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, description } = req.body;
        const existingCategory = await ReportCategory.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ message: 'Report category already exists' });
        }
        const category = new ReportCategory({ name, description });
        await category.save();
        res.status(201).json(category);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Update report category (Admin only)
router.put('/categories/:id', authenticate, authorize(UserRole.ADMIN), [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const category = await ReportCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Report category not found' });
        }
        const { name, description } = req.body;
        if (name) {
            const existingCategory = await ReportCategory.findOne({ name });
            if (existingCategory && existingCategory._id.toString() !== req.params.id) {
                return res.status(400).json({ message: 'Report category name already exists' });
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
// Delete report category (Admin only)
router.delete('/categories/:id', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const category = await ReportCategory.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: 'Report category not found' });
        }
        await category.deleteOne();
        res.json({ message: 'Report category deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create report (Authenticated users)
router.post('/', authenticate, [
    body('location').isMongoId(),
    body('category').isMongoId(),
    body('description').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { location, category, description } = req.body;
        const report = new Report({
            location,
            category,
            description,
            reportedBy: req.user.id
        });
        await report.save();
        await report.populate('location', 'name address');
        await report.populate('category', 'name');
        res.status(201).json(report);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Resolve report (Admin only)
router.patch('/:id/resolve', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        report.status = ReportStatus.RESOLVED;
        report.resolvedBy = req.user.id;
        report.resolvedAt = new Date();
        await report.save();
        await report.populate('location', 'name address');
        await report.populate('category', 'name');
        await report.populate('resolvedBy', 'name email');
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Reject report (Admin only)
router.patch('/:id/reject', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const report = await Report.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        report.status = ReportStatus.REJECTED;
        report.resolvedBy = req.user.id;
        report.resolvedAt = new Date();
        await report.save();
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=reports.js.map