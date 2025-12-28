import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import Housing from '../src/models/Housing.js';
import Job from '../src/models/Job.js';

dotenv.config();

const run = async () => {
  await connectDB();

  const email = 'user1@gmail.com';
  const pw = 'password123';
  const hash = await bcrypt.hash(pw, 10);

  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { name: 'User One', email, passwordHash: hash } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Using user:', user.email, user._id.toString());

  // Create some events
  const evA = await Event.create({
    title: 'User1 Community Meetup',
    description: 'Meet and network with local community members.',
    date: new Date(Date.now() + 86400000 * 10),
    location: { address: '100 Main St', lat: 40.71, lng: -74.0 },
    createdBy: user._id,
  });

  const evB = await Event.create({
    title: 'User1 Charity Drive',
    description: 'Bring donations and support local families.',
    date: new Date(Date.now() + 86400000 * 20),
    location: { address: '200 Charity Ave', lat: 40.72, lng: -74.01 },
    createdBy: user._id,
  });

  // Create housings
  const hA = await Housing.create({
    title: 'User1 Cozy Room',
    description: 'Private room in shared apartment.',
    address: '12 Oak St',
    lat: 40.713, lng: -74.02,
    rent: 700,
    contact: 'user1@gmail.com',
    postedBy: user._id,
  });

  const hB = await Housing.create({
    title: 'User1 1BR Apartment',
    description: 'One-bedroom apartment near downtown.',
    address: '34 Pine St',
    lat: 40.714, lng: -74.025,
    rent: 1100,
    contact: 'user1@gmail.com',
    postedBy: user._id,
  });

  // Create jobs
  const jA = await Job.create({
    title: 'User1 Volunteer Coordinator',
    description: 'Coordinate volunteers for community events.',
    company: 'User1 Org',
    address: '100 Main St',
    lat: 40.71, lng: -74.0,
    pay: 0,
    contact: 'user1@gmail.com',
    postedBy: user._id,
  });

  const jB = await Job.create({
    title: 'User1 Catering Assistant',
    description: 'Help with food service at events.',
    company: 'User1 Catering',
    address: '300 Market St',
    lat: 40.715, lng: -74.03,
    pay: 14,
    contact: 'user1@gmail.com',
    postedBy: user._id,
  });

  console.log('Created posts:', evA.title, evB.title, hA.title, hB.title, jA.title, jB.title);
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
