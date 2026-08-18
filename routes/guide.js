import express from 'express';
import Guide from '../models/Guide.js';

const router = express.Router();

// Public: list active guides (ordered)
router.get('/', async (req, res) => {
  try {
    const list = await Guide.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .select('slug title content order updatedAt')
      .lean();
    res.json(list);
  } catch (e) {
    console.error('Guide list error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public: single by slug
router.get('/:slug', async (req, res) => {
  try {
    const g = await Guide.findOne({ slug: req.params.slug, active: true }).lean();
    if (!g) return res.status(404).json({ error: 'Not found' });
    res.json(g);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
