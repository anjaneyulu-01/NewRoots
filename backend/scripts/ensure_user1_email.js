import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/newroots';

async function main(){
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const targetEmail = 'user1@gmail.com';
  const existing = await User.findOne({ email: targetEmail });
  if(existing){
    console.log(`A user already has ${targetEmail}: ${existing._id} (${existing.email})`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // prefer a user with name or username 'user1'
  let user = await User.findOne({ $or: [ { name: 'user1' }, { username: 'user1' } ] });
  if(!user){
    // fallback: take the first user
    user = await User.findOne().sort({ _id: 1 });
  }

  if(!user){
    console.log('No users found to update');
    await mongoose.disconnect();
    process.exit(0);
  }

  const old = user.email;
  // ensure uniqueness by checking again
  const collision = await User.findOne({ email: targetEmail });
  if(collision){
    console.log(`Unexpected collision: ${targetEmail} already taken by ${collision._id}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.email = targetEmail;
  await user.save();
  console.log(`Updated user ${user._id}: ${old} -> ${targetEmail}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
