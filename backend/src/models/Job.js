import mongoose from 'mongoose';

const JobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    company: String,
    image: { type: String, default: 'https://media.istockphoto.com/id/506351726/photo/recruiter-advertising-for-job-vacancies-searching-candidates-to-hire.jpg?s=612x612&w=0&k=20&c=JNtjXENGX7igzXRDCaifzEcRox2FCUPzF0hptTK3dRw=' },
    address: String,
    lat: Number,
    lng: Number,
    pay: Number,
    contact: String,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model('Job', JobSchema);
