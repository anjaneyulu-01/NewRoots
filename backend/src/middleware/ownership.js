import Event from '../models/Event.js';

export const requireEventOwner = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: not event owner' });
    }
    req.event = event;
    next();
  } catch (e) {
    return res.status(400).json({ error: 'Invalid event id' });
  }
};
