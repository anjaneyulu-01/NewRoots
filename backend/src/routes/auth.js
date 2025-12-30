import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
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

// configure nodemailer transporter from env (prefer Gmail app-password when provided)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER || process.env.SMTP_EMAIL;
const smtpPass = process.env.SMTP_PASS;

let transporter;
if (process.env.SMTP_EMAIL && process.env.SMTP_PASS) {
  // Prefer Gmail/App-password style config when provided
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('Using Gmail service for SMTP via SMTP_EMAIL');
} else if (smtpHost) {
  // Use safer defaults for common SMTP providers (port 587, STARTTLS)
  const smtpPortNum = smtpPort || 587;
  const secureFlag = smtpPortNum === 465 || smtpSecure;
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPortNum,
    secure: secureFlag,
    auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
    // On some hosts (Render) TLS certificate verification needs to be disabled
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
  });
  if (!smtpUser || !smtpPass) {
    console.warn('SMTP user or pass is not set. Transport may fail.');
  }
} else {
  console.warn('No SMTP settings provided. Nodemailer will attempt connection and likely fall back to Ethereal in development.');
  transporter = nodemailer.createTransport({});
}

// Verify transporter at startup and fall back to Ethereal in non-production
(async () => {
  try {
    await transporter.verify();
    console.log('SMTP transporter verified');
  } catch (err) {
    console.error('SMTP transporter verification failed:', err);
    if (process.env.NODE_ENV !== 'production') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.log('Using Ethereal test account for email (development).');
        console.log(`Ethereal account user=${testAccount.user} pass=${testAccount.pass}`);
      } catch (e) {
        console.error('Failed to create Ethereal test account:', e);
      }
    }
  }
})();

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
    // Ensure RFC-compliant From using SMTP_EMAIL when available
    const smtpEmail = process.env.SMTP_EMAIL || process.env.SMTP_USER || null;
    const fromEnv = process.env.SMTP_FROM || process.env.EMAIL_FROM;
    const from = fromEnv || (smtpEmail ? `NewRoots <${smtpEmail}>` : 'no-reply@newroots.local');
    const mailOpts = {
      from,
      to: email,
      subject: 'Your NewRoots verification code',
      text: `Your verification code is: ${code}. It expires in 10 minutes.`,
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>It expires in 10 minutes.</p>`,
    };
    if (process.env.DEBUG_EMAIL === 'true') {
      try {
        console.log('DEBUG_EMAIL: transporter options', transporter && transporter.options ? transporter.options : 'no-transporter-options');
        console.log('DEBUG_EMAIL: mail options', { from: mailOpts.from, to: mailOpts.to, subject: mailOpts.subject });
      } catch (e) {
        console.warn('DEBUG_EMAIL: failed to log mail options', e);
      }
    }

    const info = await transporter.sendMail(mailOpts);
    // If using ethereal, log preview URL
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log('Preview email URL:', preview);
    const resp = { success: true, message: 'OTP sent', preview: preview || null };
    if (process.env.DEBUG_EMAIL === 'true') resp.info = info && (info.response || info);
    return res.json(resp);
  } catch (err) {
    console.error('SEND OTP ERROR:', err);
    if (process.env.DEBUG_EMAIL === 'true') {
      return res.status(500).json({ success: false, error: 'Failed to send OTP', details: err && err.message, stack: err && err.stack });
    }
    const details = process.env.NODE_ENV !== 'production' && err && err.message ? err.message : undefined;
    return res.status(500).json({ success: false, error: 'Failed to send OTP', details });
  }
});

// Temporary health/test route to verify SMTP from production
router.get('/test-email', async (req, res) => {
  const to = req.query.to || process.env.SMTP_EMAIL || null;
  if (!to) return res.status(400).json({ success: false, error: 'Missing `to` query parameter or SMTP_EMAIL env' });
  try {
    const smtpEmail = process.env.SMTP_EMAIL || process.env.SMTP_USER || null;
    const fromEnv = process.env.SMTP_FROM || process.env.EMAIL_FROM;
    const from = fromEnv || (smtpEmail ? `NewRoots <${smtpEmail}>` : 'no-reply@newroots.local');
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'NewRoots test email',
      text: 'This is a test email from NewRoots',
    });
    const preview = nodemailer.getTestMessageUrl(info);
    return res.json({ success: true, preview: preview || null, info: info.response || info });
  } catch (err) {
    console.error('TEST EMAIL ERROR:', err);
    return res.status(500).json({ success: false, error: 'Failed to send test email', details: err && err.message });
  }
});

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

export default router;
