import express from 'express';
import { body, validationResult } from 'express-validator';
import Menu from '../models/Menu.js';
import UserMenu from '../models/UserMenu.js';
import User from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
const router = express.Router();
// Get all users (for menu assignment)
router.get('/users', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req, res) => {
    try {
        const users = await User.find().select('name email role').sort({ name: 1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Assign global menus to all users
router.post('/assign-global', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), [
    body('menuIds').isArray().withMessage('Menu IDs must be an array'),
    body('menuIds.*').isMongoId().withMessage('Invalid menu ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { menuIds } = req.body;
        // Verify all menus exist and are global
        const menus = await Menu.find({ _id: { $in: menuIds }, isGlobal: true });
        if (menus.length !== menuIds.length) {
            return res.status(400).json({ message: 'Some menus not found or not global' });
        }
        // Get all users
        const users = await User.find().select('_id');
        const userIds = users.map(u => u._id);
        // Remove existing assignments for these menus from all users
        await UserMenu.deleteMany({
            menu: { $in: menuIds },
            user: { $in: userIds }
        });
        // Create assignments for all users
        const assignments = [];
        userIds.forEach(userId => {
            menuIds.forEach((menuId) => {
                assignments.push({
                    user: userId,
                    menu: menuId
                });
            });
        });
        if (assignments.length > 0) {
            await UserMenu.insertMany(assignments);
        }
        res.json({ message: `Menus assigned to ${userIds.length} users successfully` });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get menus assigned to a specific user
router.get('/user/:userId', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req, res) => {
    try {
        const { userId } = req.params;
        const userMenus = await UserMenu.find({ user: userId }).populate('menu');
        const menuIds = userMenus.map(um => um.menu);
        // Get all global menus and user-specific menus
        const menus = await Menu.find({
            $or: [
                { isGlobal: true },
                { _id: { $in: menuIds } }
            ]
        }).sort({ order: 1, createdAt: 1 }).populate('parent', 'name');
        res.json({
            assignedMenuIds: menuIds.map((m) => m._id || m),
            allMenus: menus
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Assign menus to a user
router.post('/user/:userId', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), [
    body('menuIds').isArray().withMessage('Menu IDs must be an array'),
    body('menuIds.*').isMongoId().withMessage('Invalid menu ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const { menuIds } = req.body;
        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Verify all menus exist
        const menus = await Menu.find({ _id: { $in: menuIds } });
        if (menus.length !== menuIds.length) {
            return res.status(400).json({ message: 'Some menus not found' });
        }
        // Remove existing assignments
        await UserMenu.deleteMany({ user: userId });
        // Create new assignments
        const assignments = menuIds.map((menuId) => ({
            user: userId,
            menu: menuId
        }));
        await UserMenu.insertMany(assignments);
        res.json({ message: 'Menus assigned successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create menu for a specific user
router.post('/user/:userId/menu', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), [
    body('name').trim().notEmpty().withMessage('Menu name is required'),
    body('link').trim().notEmpty().withMessage('Menu link is required'),
    body('parent').optional().custom((value) => {
        if (value === null || value === '' || value === undefined) {
            return true;
        }
        return /^[0-9a-fA-F]{24}$/.test(value);
    }).withMessage('Invalid parent menu ID'),
    body('order').optional().isInt().withMessage('Order must be an integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { userId } = req.params;
        const { name, link, parent, order } = req.body;
        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Validate parent if provided
        let parentId = null;
        if (parent && parent !== '' && parent !== null) {
            parentId = parent;
            const parentMenu = await Menu.findById(parentId);
            if (!parentMenu) {
                return res.status(400).json({ message: 'Parent menu not found' });
            }
            if (parentMenu.parent) {
                return res.status(400).json({ message: 'Cannot nest more than 2 levels' });
            }
        }
        // Create user-specific menu
        const menu = new Menu({
            name,
            link,
            parent: parentId,
            order: order || 0,
            isGlobal: false,
            userId: userId
        });
        await menu.save();
        // Assign to user
        const userMenu = new UserMenu({
            user: userId,
            menu: menu._id
        });
        await userMenu.save();
        const populatedMenu = await Menu.findById(menu._id).populate('parent', 'name');
        res.status(201).json(populatedMenu);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=user-menus.js.map