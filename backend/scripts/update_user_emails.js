import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/newroots';

async function main(){
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const users = await User.find().sort({ _id: 1 });
  if(!users.length){
    console.log('No users found');
    process.exit(0);
  }

  const mapping = [];
  const used = new Set();
  // seed used with current emails (to avoid collisions with non-updated users)
  const allEmails = await User.find().distinct('email');
  allEmails.forEach(e=> used.add(e));

  for(let i=0;i<users.length;i++){
    const u = users[i];
    const old = u.email;
    // find next available userN@gmail.com
    let n = i+1;
    let candidate = `user${n}@gmail.com`;
    while(used.has(candidate)){
      n += 1;
      candidate = `user${n}@gmail.com`;
    }
    u.email = candidate;
    await u.save();
    used.add(candidate);
    mapping.push({ id: u._id.toString(), oldEmail: old, newEmail: candidate });
  }

  console.log('Updated emails:');
  mapping.forEach(m=> console.log(`${m.id}  ${m.oldEmail} -> ${m.newEmail}`));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err=>{ console.error(err); process.exit(1); });
