import dotenv from 'dotenv';
// load backend/.env specifically (script run from repo root)
dotenv.config({ path: './backend/.env' });
import connectDB from '../src/config/db.js';
import Event from '../src/models/Event.js';

const DEFAULT = 'https://wallpapers.com/images/hd/corporate-event-2048-x-1004-wallpaper-s5lftvht2yeiri7u.jpg';

const run = async () => {
  await connectDB();
  const res = await Event.updateMany(
    { $or: [ { image: { $exists: false } }, { image: null }, { image: '' }, { image: /placeholder/ } ] },
    { $set: { image: DEFAULT } }
  );
  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
