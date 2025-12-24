import express from 'express';
import Settings from '../models/Settings.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { UserRole } from '../models/User.js';

const router = express.Router();

// Get settings (public)
router.get('/', async (req, res) => {
  try {
    const settings = await (Settings as any).getOrCreate();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Update settings (Admin/Staff/Manager only)
router.patch(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.STAFF, UserRole.MANAGER),
  async (req: AuthRequest, res) => {
    try {
      const { defaultProvince, defaultDistrict } = req.body;
      
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings({ defaultProvince, defaultDistrict });
      } else {
        if (defaultProvince !== undefined) {
          settings.defaultProvince = defaultProvince || undefined;
        }
        if (defaultDistrict !== undefined) {
          settings.defaultDistrict = defaultDistrict || undefined;
        }
      }
      
      await settings.save();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

