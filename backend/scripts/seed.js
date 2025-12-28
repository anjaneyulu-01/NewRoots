import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import Event from '../src/models/Event.js';
import Housing from '../src/models/Housing.js';
import Job from '../src/models/Job.js';
import Application from '../src/models/Application.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  // Clear previous demo data
  await Event.deleteMany({});
  await Housing.deleteMany({});
  await Job.deleteMany({});
  await Application.deleteMany({});

  // Create demo users (upsert)
  const pw = 'password123';
  const hash = await bcrypt.hash(pw, 10);

  const usersData = [
    { name: 'Alice Example', email: 'alice@example.com', passwordHash: hash },
    { name: 'Bob Example', email: 'bob@example.com', passwordHash: hash },
    { name: 'Charlie Example', email: 'charlie@example.com', passwordHash: hash },
  ];

  const users = [];
  for (const u of usersData) {
    const doc = await User.findOneAndUpdate(
      { email: u.email },
      { $setOnInsert: u },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    users.push(doc);
  }

  const [alice, bob, charlie] = users;

  // Create Events
  const ev1 = await Event.create({
    title: 'Community Cleanup',
    description: 'Join us to clean the neighborhood park.',
    date: new Date(Date.now() + 86400000 * 7),
    location: { address: '123 Park Ave', lat: 40.7128, lng: -74.006 },
    createdBy: alice._id,
  });

  const ev2 = await Event.create({
    title: 'Free Yoga Class',
    description: 'Outdoor yoga for all levels.',
    date: new Date(Date.now() + 86400000 * 14),
    location: { address: '456 Yoga St', lat: 40.7138, lng: -74.000 },
    createdBy: bob._id,
  });

  // Create Housings
  const h1 = await Housing.create({
    title: 'Cozy Studio Near Downtown',
    description: 'Bright studio perfect for one person.',
    address: '12 Maple St',
    lat: 40.714, lng: -74.01,
    rent: 850,
    contact: 'owner1@example.com',
    postedBy: bob._id,
  });

  const h2 = await Housing.create({
    title: '2BR Apartment',
    description: 'Spacious 2 bedroom apartment with balcony.',
    address: '78 Elm St',
    lat: 40.715, lng: -74.012,
    rent: 1200,
    contact: 'owner2@example.com',
    postedBy: charlie._id,
  });

  // Create Jobs
  const j1 = await Job.create({
    title: 'Event Staff Needed',
    description: 'Looking for friendly staff to help run events.',
    company: 'Community Org',
    address: '500 Center Blvd',
    lat: 40.716, lng: -74.02,
    pay: 15,
    contact: 'hr@example.com',
    postedBy: alice._id,
  });

  const j2 = await Job.create({
    title: 'Delivery Driver',
    description: 'Part-time delivery driver.',
    company: 'Local Deliveries',
    address: '200 Market St',
    lat: 40.717, lng: -74.03,
    pay: 18,
    contact: 'jobs@example.com',
    postedBy: bob._id,
  });

  // Create Applications for events
  const app1 = await Application.create({
    event: ev1._id,
    applicant: charlie._id,
    note: 'Happy to help!',
    amount: 0,
    status: 'pending',
  });

  const app2 = await Application.create({
    event: ev1._id,
    applicant: bob._id,
    note: 'Available weekends.',
    amount: 0,
    status: 'pending',
  });

  console.log('Seeding complete:');
  console.log('Users:', users.map(u => u.email));
  console.log('Events:', [ev1.title, ev2.title]);
  console.log('Housing:', [h1.title, h2.title]);
  console.log('Jobs:', [j1.title, j2.title]);
  console.log('Applications:', [app1._id.toString(), app2._id.toString()]);

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error', err);
  process.exit(1);
});
