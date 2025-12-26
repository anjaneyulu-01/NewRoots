import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import Application from '../models/Application.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  const apps = await Application.find({ applicant: req.user.id, status: 'approved' }).populate('event', 'title');
  let totalPaid = 0;
  let totalPending = 0;
  const perEvent = {};

  for (const a of apps) {
    const amt = a.amount || 0;
    if (a.paymentStatus === 'paid') totalPaid += amt;
    else totalPending += amt;

    const evId = a.event._id.toString();
    if (!perEvent[evId]) perEvent[evId] = { eventId: evId, title: a.event.title, paid: 0, pending: 0 };
    if (a.paymentStatus === 'paid') perEvent[evId].paid += amt;
    else perEvent[evId].pending += amt;
  }

  res.json({
    totals: { total: totalPaid + totalPending, paid: totalPaid, pending: totalPending },
    perEvent: Object.values(perEvent),
  });
});

export default router;
