import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import Housing from '../src/models/Housing.js';
import Job from '../src/models/Job.js';
import Application from '../src/models/Application.js';

const run = async () => {
  await connectDB();
  const users = await User.find({}).lean();
  console.log(`Total users: ${users.length}`);
  for (const u of users) {
    const [eCount, hCount, jCount, aCount] = await Promise.all([
      Event.countDocuments({ createdBy: u._id }),
      Housing.countDocuments({ postedBy: u._id }),
      Job.countDocuments({ postedBy: u._id }),
      Application.countDocuments({ applicant: u._id }),
    ]);
    console.log(`${u.email} (${u._id}): events=${eCount}, housing=${hCount}, jobs=${jCount}, applications=${aCount}`);
  }
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });
