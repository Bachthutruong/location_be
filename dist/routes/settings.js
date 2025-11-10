import express from 'express';
import Settings from '../models/Settings.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';
const router = express.Router();
// Get settings (public)
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.getOrCreate();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Update settings (Admin only)
router.patch('/', authenticate, authorize(UserRole.ADMIN), async (req, res) => {
    try {
        const { defaultProvince } = req.body;
        let settings = await Settings.findOne();
        if (!settings) {
            settings = new Settings({ defaultProvince });
        }
        else {
            if (defaultProvince !== undefined) {
                settings.defaultProvince = defaultProvince || undefined;
            }
        }
        await settings.save();
        res.json(settings);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=settings.js.map