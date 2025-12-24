import express from 'express';
import { body, validationResult } from 'express-validator';
import Menu from '../models/Menu.js';
import UserMenu from '../models/UserMenu.js';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
const router = express.Router();
// Get menus for current user (public or authenticated) - returns hierarchical structure
router.get('/', optionalAuthenticate, async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        // Admin: lấy TẤT CẢ menu (không filter)
        // User khác: chỉ lấy global menus và menu được assign
        let menuQuery = {};
        // Check nếu user là admin
        const isAdmin = userRole === UserRole.ADMIN || userRole === 'admin';
        console.log('=== Menus API Debug ===');
        console.log('req.user:', req.user);
        console.log('userId:', userId);
        console.log('userRole:', userRole);
        console.log('UserRole.ADMIN:', UserRole.ADMIN);
        console.log('isAdmin:', isAdmin);
        if (isAdmin) {
            // Admin: lấy tất cả menu (không filter gì cả - bao gồm cả isGlobal: false và userId set)
            menuQuery = {};
            console.log('Admin detected - fetching ALL menus (no filter)');
        }
        else {
            // User khác: chỉ lấy global menus
            menuQuery = { isGlobal: true };
            console.log('Non-admin - fetching global menus only');
            if (userId) {
                // Also get user-specific menus
                const userMenus = await UserMenu.find({ user: userId }).select('menu');
                const userMenuIds = userMenus.map(um => um.menu);
                if (userMenuIds.length > 0) {
                    menuQuery = {
                        $or: [
                            { isGlobal: true },
                            { _id: { $in: userMenuIds } }
                        ]
                    };
                    console.log('Including user-specific menus:', userMenuIds.length);
                }
            }
        }
        console.log('Final menuQuery:', JSON.stringify(menuQuery));
        // Query tất cả menu (không filter gì cả nếu là admin)
        const menus = await Menu.find(menuQuery).sort({ order: 1, createdAt: 1 });
        console.log('Total menus found (flat from DB):', menus.length);
        console.log('Query result check - isAdmin:', isAdmin, 'menuQuery:', menuQuery);
        // Debug: Kiểm tra xem có menu nào bị thiếu không
        if (isAdmin) {
            const totalMenusInDB = await Menu.countDocuments({});
            console.log('Total menus in database (countDocuments):', totalMenusInDB);
            if (totalMenusInDB !== menus.length) {
                console.warn('⚠️ WARNING: Query result count does not match total count!');
                console.warn('Expected:', totalMenusInDB, 'Got:', menus.length);
            }
        }
        console.log('All menu details:', menus.map(m => ({
            id: m._id,
            name: m.name,
            link: m.link,
            parent: m.parent ? m.parent.toString() : null,
            isGlobal: m.isGlobal,
            userId: m.userId ? m.userId.toString() : null
        })));
        // Build hierarchical structure
        const menuMap = new Map();
        const rootMenus = [];
        // First pass: create map of all menus
        menus.forEach(menu => {
            const menuObj = menu.toObject();
            menuObj.children = [];
            menuMap.set(menu._id.toString(), menuObj);
        });
        // Second pass: build tree structure
        menus.forEach(menu => {
            const menuObj = menuMap.get(menu._id.toString());
            if (menu.parent) {
                const parent = menuMap.get(menu.parent.toString());
                if (parent) {
                    parent.children.push(menuObj);
                }
                else {
                    rootMenus.push(menuObj);
                }
            }
            else {
                rootMenus.push(menuObj);
            }
        });
        // Sort children
        rootMenus.forEach(menu => {
            menu.children.sort((a, b) => a.order - b.order);
        });
        // Count total menus including children (for debugging)
        const countTotalMenus = (menuList) => {
            let count = menuList.length;
            menuList.forEach(menu => {
                if (menu.children && menu.children.length > 0) {
                    count += countTotalMenus(menu.children);
                }
            });
            return count;
        };
        const totalMenusInTree = countTotalMenus(rootMenus);
        console.log('Root menus count:', rootMenus.length);
        console.log('Total menus (flat from DB):', menus.length);
        console.log('Total menus (in tree structure):', totalMenusInTree);
        console.log('Root menu names:', rootMenus.map(m => m.name));
        // Nếu admin và số menu trong tree < số menu trong DB, có vấn đề
        if (isAdmin && totalMenusInTree < menus.length) {
            console.warn('⚠️ WARNING: Some menus are missing from tree structure!');
            console.warn('Missing menus:', menus.length - totalMenusInTree);
        }
        console.log('==================');
        res.json(rootMenus);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get all menus flat (for admin management)
router.get('/all', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req, res) => {
    try {
        const { global } = req.query;
        let query = {};
        if (global === 'true') {
            query.isGlobal = true;
        }
        else if (global === 'false') {
            query.isGlobal = false;
        }
        const menus = await Menu.find(query).sort({ order: 1, createdAt: 1 }).populate('parent', 'name').populate('userId', 'name email');
        res.json(menus);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get single menu
router.get('/:id', async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id).populate('parent', 'name');
        if (!menu) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        res.json(menu);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create menu (Admin/Staff/Manager only)
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), [
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
        const { name, link, parent, order, isGlobal, userId } = req.body;
        // Validate parent if provided
        let parentId = null;
        if (parent && parent !== '' && parent !== null) {
            parentId = parent;
            const parentMenu = await Menu.findById(parentId);
            if (!parentMenu) {
                return res.status(400).json({ message: 'Parent menu not found' });
            }
            // Prevent circular reference
            if (parentMenu.parent) {
                return res.status(400).json({ message: 'Cannot nest more than 2 levels' });
            }
        }
        // Validate userId if provided for user-specific menu
        let userIdObj = null;
        if (userId && userId !== '' && userId !== null) {
            const User = (await import('../models/User.js')).default;
            const user = await User.findById(userId);
            if (!user) {
                return res.status(400).json({ message: 'User not found' });
            }
            userIdObj = userId;
        }
        const menu = new Menu({
            name,
            link,
            parent: parentId,
            order: order || 0,
            isGlobal: isGlobal !== undefined ? isGlobal : true,
            userId: userIdObj
        });
        await menu.save();
        const populatedMenu = await Menu.findById(menu._id).populate('parent', 'name');
        res.status(201).json(populatedMenu);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Update menu (Admin only)
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), [
    body('name').optional().trim().notEmpty(),
    body('link').optional().trim().notEmpty(),
    body('parent').optional().custom((value) => {
        if (value === null || value === '' || value === undefined) {
            return true;
        }
        return /^[0-9a-fA-F]{24}$/.test(value);
    }).withMessage('Invalid parent menu ID'),
    body('order').optional().isInt()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const menu = await Menu.findById(req.params.id);
        if (!menu) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        const { name, link, parent, order } = req.body;
        if (name !== undefined) {
            menu.name = name;
        }
        if (link !== undefined) {
            menu.link = link;
        }
        if (order !== undefined) {
            menu.order = order;
        }
        if (parent !== undefined) {
            if (parent === null || parent === '') {
                menu.parent = undefined;
            }
            else {
                // Validate parent
                const parentMenu = await Menu.findById(parent);
                if (!parentMenu) {
                    return res.status(400).json({ message: 'Parent menu not found' });
                }
                // Prevent self-reference
                if (parent === menu._id.toString()) {
                    return res.status(400).json({ message: 'Cannot set menu as its own parent' });
                }
                // Prevent circular reference
                if (parentMenu.parent) {
                    return res.status(400).json({ message: 'Cannot nest more than 2 levels' });
                }
                menu.parent = parent;
            }
        }
        await menu.save();
        const populatedMenu = await Menu.findById(menu._id).populate('parent', 'name');
        res.json(populatedMenu);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Delete menu (Admin only)
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER), async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);
        if (!menu) {
            return res.status(404).json({ message: 'Menu not found' });
        }
        // Check if menu has children
        const children = await Menu.find({ parent: menu._id });
        if (children.length > 0) {
            return res.status(400).json({ message: 'Cannot delete menu with submenus. Please delete submenus first.' });
        }
        await menu.deleteOne();
        res.json({ message: 'Menu deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=menus.js.map