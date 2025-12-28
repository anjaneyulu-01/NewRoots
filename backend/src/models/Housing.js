import mongoose from 'mongoose';

const HousingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    address: String,
    image: { type: String, default: 'https://tse2.mm.bing.net/th/id/OIP.HyPO0GQqnsGoMcauAHz_MQHaE7?rs=1&pid=ImgDetMain&o=7&rm=3' },
    lat: Number,
    lng: Number,
    rent: { type: Number, required: true },
    contact: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Housing', HousingSchema);
