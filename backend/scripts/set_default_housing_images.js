import dotenv from 'dotenv';
// load backend/.env specifically
dotenv.config({ path: './backend/.env' });
import connectDB from '../src/config/db.js';
import Housing from '../src/models/Housing.js';

const DEFAULT = 'https://tse2.mm.bing.net/th/id/OIP.HyPO0GQqnsGoMcauAHz_MQHaE7?rs=1&pid=ImgDetMain&o=7&rm=3';

const run = async () => {
  await connectDB();
  const res = await Housing.updateMany(
    { $or: [ { image: { $exists: false } }, { image: null }, { image: '' }, { image: /placeholder/ } ] },
    { $set: { image: DEFAULT } }
  );
  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
