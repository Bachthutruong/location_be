import express from 'express';
import { body, validationResult } from 'express-validator';
import Review from '../models/Review.js';
import { authenticate } from '../middleware/auth.js';
const router = express.Router();
// Get reviews for a location
router.get('/location/:locationId', async (req, res) => {
    try {
        const reviews = await Review.find({ location: req.params.locationId })
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(reviews);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Get single review
router.get('/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .populate('user', 'name email')
            .populate('location', 'name');
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        res.json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Create or update review (Authenticated users)
router.post('/', authenticate, [
    body('location').isMongoId(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { location, rating, comment } = req.body;
        // Check if review already exists
        let review = await Review.findOne({
            location,
            user: req.user.id
        });
        if (review) {
            // Update existing review
            review.rating = rating;
            review.comment = comment;
            await review.save();
        }
        else {
            // Create new review
            review = new Review({
                location,
                user: req.user.id,
                rating,
                comment
            });
            await review.save();
        }
        await review.populate('user', 'name email');
        await review.populate('location', 'name');
        res.status(201).json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Update review (Owner only)
router.put('/:id', authenticate, [
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own reviews' });
        }
        const { rating, comment } = req.body;
        if (rating)
            review.rating = rating;
        if (comment)
            review.comment = comment;
        await review.save();
        await review.populate('user', 'name email');
        await review.populate('location', 'name');
        res.json(review);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// Delete review (Owner only)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (review.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only delete your own reviews' });
        }
        await review.deleteOne();
        res.json({ message: 'Review deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
export default router;
//# sourceMappingURL=reviews.js.map