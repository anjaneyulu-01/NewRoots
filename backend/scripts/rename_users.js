import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';
import bcrypt from 'bcryptjs';

const run = async () => {
  await connectDB();
  const users = await User.find({}).sort({ createdAt: 1 });
  if (users.length === 0) {
    console.log('No users found');
    process.exit(0);
  }
  const pw = 'password123';
  const hash = await bcrypt.hash(pw, 10);
  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const newName = `user${i+1}`;
    await User.updateOne({ _id: u._id }, { $set: { name: newName, passwordHash: hash } });
    console.log(`Updated ${u.email} -> name=${newName}`);
  }
  console.log('All users updated. Password for all set to password123');
  process.exit(0);
};

run().catch((err) => { console.error(err); process.exit(1); });
