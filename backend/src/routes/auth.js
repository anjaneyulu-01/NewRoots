import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import EmailOtp from '../models/EmailOtp.js';
import Event from '../models/Event.js';
import Job from '../models/Job.js';
import Housing from '../models/Housing.js';
import Application from '../models/Application.js';
import Contact from '../models/Contact.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Brevo (Sendinblue) will be used for transactional emails only.
// No SMTP, Nodemailer, or Ethereal logic is present.

// Initialize Brevo (Sendinblue) transactional client when API key provided
let brevoEmailApi = null;
if (process.env.BREVO_API_KEY) {
  const client = SibApiV3Sdk.ApiClient.instance;
  client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
  brevoEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();
}

// Helper: send OTP email using Brevo transactional API
async function sendOtpEmail(address, otp) {
  const fromEnv = process.env.EMAIL_FROM || '';
  const match = fromEnv.match(/^(.*)<([^>]+)>$/);
  const sender = match
    ? { name: (match[1] || 'NewRoots').trim(), email: match[2].trim() }
    : { name: process.env.EMAIL_FROM_NAME || 'NewRoots', email: process.env.EMAIL_FROM_EMAIL || 'newroots.app@gmail.com' };

  const subject = 'Your NewRoots OTP';
  const textContent = `Your OTP is ${otp}. It is valid for 10 minutes.`;
  const htmlContent = `<h2>Your OTP: ${otp}</h2><p>This code is valid for 10 minutes.</p>`;

  // If explicitly requested, try SMTP first (useful when you want to use your Gmail account)
  if (process.env.USE_SMTP === 'true' && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: address,
        subject,
        text: textContent,
        html: htmlContent,
      };
      const info = await transporter.sendMail(mailOptions);
      if (process.env.DEBUG_EMAIL === 'true') console.log('SMTP send info:', info);
      return { fallback: 'smtp', info };
    } catch (smtpErr) {
      console.error('SMTP send failed', smtpErr);
      // fall through to Brevo/Ethereal fallback
  }

  // If Brevo API key not present, either fallback to Ethereal (debug) or throw
  if (!process.env.BREVO_API_KEY) {
    if (process.env.DEBUG_EMAIL === 'true') {
      // Ethereal fallback for local testing
      const mailOptions = {
        from: `${sender.name} <${sender.email}>`,
        to: address,
        subject,
        text: textContent,
        html: htmlContent,
      };
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info) || null;
      console.log('Ethereal preview URL:', previewUrl);
      return { fallback: 'ethereal', info, previewUrl };
    }
    throw new Error('BREVO_API_KEY not configured');
  }

  // Try Brevo (Sendinblue) transactional API
  try {
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    const api = new SibApiV3Sdk.TransactionalEmailsApi();
    const resp = await api.sendTransacEmail({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: address }],
      subject,
      htmlContent,
    });
    if (process.env.DEBUG_EMAIL === 'true') console.log('Brevo send response:', resp);
    return resp;
  } catch (err) {
    const statusCode = err && (err.status || err.statusCode || (err.response && err.response.status));
    const message = err && (err.message || (err.response && err.response.text));
    console.warn('Brevo send failed', { statusCode, message });
    // If DEBUG, try Ethereal as a last resort
    if (process.env.DEBUG_EMAIL === 'true') {
      try {
        const mailOptions = {
          from: `${sender.name} <${sender.email}>`,
          to: address,
          subject,
          text: textContent,
          html: htmlContent,
        };
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        const info = await transporter.sendMail(mailOptions);
        const previewUrl = nodemailer.getTestMessageUrl(info) || null;
        console.log('Ethereal preview URL:', previewUrl);
        return { fallback: 'ethereal', info, previewUrl };
      } catch (fallbackErr) {
        console.error('Ethereal/SMTP fallback failed', fallbackErr);
        throw err; // throw original Brevo error after fallback failure
      }
    }
    throw err;
  }
}
}

// Email link verification removed: verification is handled via OTP only.

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { name, email, password } = value;
  const existingEmail = await User.findOne({ email });
  if (existingEmail) return res.status(409).json({ error: 'Email already in use' });
  const existingName = await User.findOne({ name });
  if (existingName) return res.status(409).json({ error: 'Name already in use' });
  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await User.create({ name, email, passwordHash });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email or name already in use' });
    throw err;
  }
  // Do not send verification link by email; verification is done via OTP only.
  res.status(201).json({ message: 'Account created. Please verify your email using the OTP.' });
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const { email, password } = value;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (!user.emailVerified) {
    return res.status(403).json({ error: 'Email not verified', emailVerified: !!user.emailVerified });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

// Email link verification removed; use OTP verification endpoints instead.

// send email OTP (for registration verification)
router.post('/send-email-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });
  const code = (Math.floor(100000 + Math.random() * 900000)).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  try {
    await EmailOtp.findOneAndUpdate({ email }, { code, expiresAt }, { upsert: true, new: true });
    if (process.env.DEBUG_EMAIL === 'true') {
      try {
        console.log('DEBUG_EMAIL: will send OTP to', email);
      } catch (e) {
        console.warn('DEBUG_EMAIL: failed to log mail debug', e);
      }
    }
    const resp = await sendOtpEmail(email, code);
    if (process.env.DEBUG_EMAIL === 'true') {
      return res.json({ success: true, resp });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    if (process.env.DEBUG_EMAIL === 'true') {
      return res.status(500).json({ success: false, error: 'Failed to send OTP', details: err && err.message, stack: err && err.stack });
    }
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ success: false, error: 'Failed to send OTP', details });
  }
});

// Removed SMTP test route; use the /send-email-otp route to trigger transactional emails.

// verify email OTP
router.post('/verify-email-otp', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });
  try {
    const record = await EmailOtp.findOne({ email, code });
    if (!record) return res.status(400).json({ error: 'Invalid code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ error: 'Code expired' });
    // remove used codes
    await EmailOtp.deleteMany({ email });
    // if user exists, mark verified
    const user = await User.findOne({ email });
    if (user) {
      user.emailVerified = true;
      await user.save();
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('verify-email-otp error', err);
    return res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Register using OTP: verifies OTP then creates the user and marks emailVerified
router.post('/register-with-otp', async (req, res) => {
  const { name, email, password, code } = req.body;
  // basic validation
  if (!name || !email || !password || !code) return res.status(400).json({ error: 'Missing registration fields' });
  try {
    const record = await EmailOtp.findOne({ email, code });
    if (!record) return res.status(400).json({ error: 'Invalid or missing OTP' });
    if (record.expiresAt < new Date()) return res.status(400).json({ error: 'OTP expired' });
    // check for existing user
    let existingUser = await User.findOne({ email });
    // if a user exists and is already verified, reject
    if (existingUser && existingUser.emailVerified) return res.status(409).json({ error: 'Email already in use' });
    // check name conflict with other user (if name taken by another account)
    const nameOwner = await User.findOne({ name });
    if (nameOwner && (!existingUser || nameOwner._id.toString() !== existingUser._id.toString())) {
      return res.status(409).json({ error: 'Name already in use' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    if (existingUser) {
      // update existing unverified user
      existingUser.name = name;
      existingUser.passwordHash = passwordHash;
      existingUser.emailVerified = true;
      await existingUser.save();
    } else {
      // create new user
      await User.create({ name, email, passwordHash, emailVerified: true });
    }
    // remove used OTPs
    await EmailOtp.deleteMany({ email });
    return res.status(201).json({ success: true, message: 'Account created' });
  } catch (err) {
    console.error('register-with-otp error', err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
});

// Note: phone verification via Firebase has been removed — email verification is used.

// Google sign-in: client sends Google idToken
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;
    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({ name: name || email.split('@')[0], email, passwordHash: '', googleId, emailVerified: true });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.emailVerified = true;
      await user.save();
    }
    // Phone verification is optional for login now — allow Google sign-ins with verified email
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Google token', details: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const me = await User.findById(req.user.id).select('name email createdAt emailVerified');
  res.json({ user: me });
});

// delete authenticated user's account
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    // delete events created by user and their applications
    const events = await Event.find({ createdBy: userId }).select('_id');
    const eventIds = events.map((e) => e._id);
    if (eventIds.length) {
      await Application.deleteMany({ event: { $in: eventIds } });
      await Event.deleteMany({ _id: { $in: eventIds } });
    }
    // delete jobs posted by user and related applications
    const jobs = await Job.find({ postedBy: userId }).select('_id');
    const jobIds = jobs.map((j) => j._id);
    if (jobIds.length) {
      await Application.deleteMany({ job: { $in: jobIds } });
      await Job.deleteMany({ _id: { $in: jobIds } });
    }
    // delete housing posted by user and related applications
    const housings = await Housing.find({ postedBy: userId }).select('_id');
    const housingIds = housings.map((h) => h._id);
    if (housingIds.length) {
      await Application.deleteMany({ housing: { $in: housingIds } });
      await Housing.deleteMany({ _id: { $in: housingIds } });
    }
    // delete applications made by the user
    await Application.deleteMany({ applicant: userId });
    // delete contacts where user is sender or recipient
    await Contact.deleteMany({ $or: [{ toUser: userId }, { fromUser: userId }] });
    // delete any OTPs for user's email
    const me = await User.findById(userId).select('email');
    if (me && me.email) await EmailOtp.deleteMany({ email: me.email });
    // finally delete user
    await User.findByIdAndDelete(userId);
    return res.json({ success: true, message: 'Account and related data deleted' });
  } catch (err) {
    console.error('delete account error', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

export { sendOtpEmail };
export default router;
