import dotenv from 'dotenv';
// load backend/.env specifically (script run from repo root)
dotenv.config({ path: './backend/.env' });
import connectDB from '../src/config/db.js';
import Job from '../src/models/Job.js';

const DEFAULT = 'https://media.istockphoto.com/id/506351726/photo/recruiter-advertising-for-job-vacancies-searching-candidates-to-hire.jpg?s=612x612&w=0&k=20&c=JNtjXENGX7igzXRDCaifzEcRox2FCUPzF0hptTK3dRw=';

const run = async () => {
  await connectDB();
  const res = await Job.updateMany(
    { $or: [ { image: { $exists: false } }, { image: null }, { image: '' }, { image: /placeholder/ } ] },
    { $set: { image: DEFAULT } }
  );
  console.log('Matched:', res.matchedCount, 'Modified:', res.modifiedCount);
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
