import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/newroots';

async function main(){
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find().sort({ _id: 1 });
  if(!users.length){
    console.log('No users found');
    await mongoose.disconnect();
    process.exit(0);
  }

  const mapping = [];

  // Phase 1: assign temporary unique emails to avoid duplicate-key errors
  for(let i=0;i<users.length;i++){
    const u = users[i];
    const temp = `__tmp_user_${u._id.toString()}@local.newroots`;
    const old = u.email;
    u.email = temp;
    await u.save();
    mapping.push({ id: u._id.toString(), oldEmail: old, tempEmail: temp });
  }

  console.log('Assigned temporary emails to all users. Proceeding to final emails...');

  // Phase 2: assign final ordered emails
  const finalMapping = [];
  for(let i=0;i<users.length;i++){
    const u = users[i];
    const finalEmail = `user${i+1}@gmail.com`;
    const old = u.email;
    u.email = finalEmail;
    await u.save();
    finalMapping.push({ id: u._id.toString(), oldEmail: old, newEmail: finalEmail });
  }

  console.log('Final email mapping:');
  finalMapping.forEach(m=> console.log(`${m.id}  ${m.oldEmail} -> ${m.newEmail}`));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
