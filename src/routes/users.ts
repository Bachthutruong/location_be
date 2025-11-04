import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import User, { UserRole } from '../models/User.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const { role } = req.query;
    const query: any = {};

    if (role) {
      query.role = role;
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Get single user (Admin only)
router.get('/:id', authenticate, authorize(UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').isIn(Object.values(UserRole))
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email,
        password: hashedPassword,
        name,
        role
      });

      await user.save();

      res.status(201).json({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Update user (Admin only)
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().notEmpty(),
    body('role').optional().isIn(Object.values(UserRole))
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { email, name, role } = req.body;

      if (email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && (existingUser as any)._id.toString() !== req.params.id) {
          return res.status(400).json({ message: 'Email already exists' });
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (role) user.role = role;

      await user.save();

      res.json({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Reset password for manager (Staff or Admin)
router.patch(
  '/:id/reset-password',
  authenticate,
  authorize(UserRole.STAFF, UserRole.ADMIN),
  [
    body('newPassword').isLength({ min: 6 })
  ],
  async (req: any, res: any) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.role !== UserRole.MANAGER) {
        return res.status(400).json({ message: 'Can only reset password for managers' });
      }

      const { newPassword } = req.body;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      await user.save();

      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await user.deleteOne();

      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;



