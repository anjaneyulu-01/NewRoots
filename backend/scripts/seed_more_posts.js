import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import Housing from '../src/models/Housing.js';
import Job from '../src/models/Job.js';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const run = async () => {
  await connectDB();
  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users; creating posts...`);

  for (const u of users) {
    const toCreateEvents = Math.max(0, 2 - await Event.countDocuments({ createdBy: u._id }));
    const toCreateHousing = Math.max(0, 2 - await Housing.countDocuments({ postedBy: u._id }));
    const toCreateJobs = Math.max(0, 2 - await Job.countDocuments({ postedBy: u._id }));

    for (let i = 0; i < toCreateEvents; i++) {
      const ev = await Event.create({
        title: `${u.name || u.email} Event ${i+1}`,
        description: `Auto-generated event ${i+1} by ${u.email}`,
        date: new Date(Date.now() + rand(2,30) * 86400000),
        location: { address: `${rand(1,999)} Auto St`, lat: 40.71 + Math.random()*0.02, lng: -74.0 + Math.random()*0.02 },
        createdBy: u._id,
      });
      console.log(`Created event ${ev.title} for ${u.email}`);
    }

    for (let i = 0; i < toCreateHousing; i++) {
      const h = await Housing.create({
        title: `${u.name || u.email} Housing ${i+1}`,
        description: `Auto-generated housing ${i+1} by ${u.email}`,
        address: `${rand(10,999)} Auto Ave`,
        lat: 40.71 + Math.random()*0.02,
        lng: -74.0 + Math.random()*0.02,
        rent: rand(500,1500),
        contact: u.email,
        postedBy: u._id,
      });
      console.log(`Created housing ${h.title} for ${u.email}`);
    }

    for (let i = 0; i < toCreateJobs; i++) {
      const j = await Job.create({
        title: `${u.name || u.email} Job ${i+1}`,
        description: `Auto-generated job ${i+1} by ${u.email}`,
        company: `${u.name || 'Org'} Co`,
        address: `${rand(1,999)} Business Rd`,
        lat: 40.71 + Math.random()*0.02,
        lng: -74.0 + Math.random()*0.02,
        pay: rand(0,25),
        contact: u.email,
        postedBy: u._id,
      });
      console.log(`Created job ${j.title} for ${u.email}`);
    }
  }

  console.log('Done creating posts.');
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });
