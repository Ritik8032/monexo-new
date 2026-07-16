// @ts-nocheck
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import crypto from 'crypto';

let currentDirname = process.cwd();
try {
  // @ts-ignore
  currentDirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  // @ts-ignore
  currentDirname = __dirname;
}

const app = express();
const PORT = 3000;

const upload = multer();

// Enable JSON and URL-encoded parsing with generous limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(upload.any());

// Gracefully handle multer errors (e.g. Multipart: Boundary not found)
app.use((err, req, res, next) => {
  if (err) {
    console.error('[Multer / BodyParser Error Handler]', err.message);
    if (err.message && err.message.includes('Boundary not found')) {
      // Skip the error and let express parse the body via urlencoded/json
      return next();
    }
    return res.json({ code: 400, msg: err.message });
  }
  next();
});

// MongoDB Connection
const MONGO_URI = 'mongodb+srv://Ritik:Ritik906087@tdm.uwkxmdo.mongodb.net/TDM?retryWrites=true&w=majority';
console.log('Connecting to MongoDB...');
mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Mongoose Schemas
const userSchema = new mongoose.Schema({
  phone: { type: String, sparse: true, index: true },
  mobileNo: { type: String, sparse: true, index: true },
  email: { type: String },
  fullName: { type: String },
  password: { type: String },
  repassword: { type: String },
  invitercode: { type: String },
  safetyCode: { type: String },
  bankDetails: { type: Array, default: [] },
  upiDetails: { type: Array, default: [] },
  utrLogs: { type: Array, default: [] },
  balance: { type: Number, default: 10000 },
  commission: { type: Number, default: 120 },
  recharge: { type: Number, default: 0 },
  vipLevel: { type: Number, default: 1 },
  kycStatus: { type: Number, default: 0 },
  realName: { type: String, default: '' },
  parentUser: { type: String, default: '' },
  todayProfit: { type: Number, default: 0 },
  trc20Address: { type: String, default: '' },
  net: { type: String, default: '' },
  pageSize: { type: Number, default: 10 },
  totalTransferValue: { type: Number, default: 0 },
  collectionTools: { type: Array, default: null },
  token: { type: String },
  zoopayPhone: { type: String },
  zoopayUsername: { type: String },
  zoopayPassword: { type: String },
  zoopayToken: { type: String },
  zoopaySessionId: { type: String },
  zoopayUpis: { type: Array, default: [] },
  zoopaySelectedUpi: { type: String },
  zoopayUpiType: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const logSchema = new mongoose.Schema({
  endpoint: String,
  method: String,
  headers: mongoose.Schema.Types.Mixed,
  body: mongoose.Schema.Types.Mixed,
  query: mongoose.Schema.Types.Mixed,
  ip: String,
  timestamp: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  phone: String,
  rptNo: { type: String, unique: true },
  amount: Number,
  utr: { type: String, default: '' },
  currentStep: { type: Number, default: 0 }, // 0: unpaid/instructions, 1: upload cert, 2: reviewed/success
  payee_recipients_name: { type: String, default: 'Monexo Merchant' },
  payee_ifsc: { type: String, default: 'SBIN0001234' },
  payee_bank_account: { type: String, default: '918273645019' },
  payee_bankname: { type: String, default: 'State Bank of India' },
  payment_method: { type: Number, default: 0 }, // 0: bank, 1: upi
  payer_status: { type: Number, default: 2 }, // 2: pending, 1: paying, 3: success, 4: cancel, 5: timeout
  confirm_mode: { type: Number, default: 0 }, // 0: auto, 1: certify
  countdown: { type: Number, default: 1800 },
  reason_for_rejection: { type: String, default: '' },
  ctime: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  type: { type: String, default: 'recharge' } // 'recharge' or 'sell'
});

const User = mongoose.model('User', userSchema);
const GeneralLog = mongoose.model('GeneralLog', logSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

// ZOOPAY API INTEGRATION HELPERS
function generateRandomPhone() {
  const firstDigit = ['6', '7', '8', '9'][Math.floor(Math.random() * 4)];
  let remainingDigits = '';
  for (let i = 0; i < 9; i++) {
    remainingDigits += Math.floor(Math.random() * 10);
  }
  return firstDigit + remainingDigits;
}

function generateRandomUsername() {
  const firstNames = ["Amit", "Ram", "Ritik", "Rahul", "Vijay", "Raj", "Sanjay", "Sunil", "Karan", "Ravi", "Anil", "Deepak", "Aman", "Rohan", "Mohit", "Arjun", "Vikram", "Abhi", "Pooja", "Neha", "Aarti", "Priya"];
  const randomName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomDigits = Math.floor(100 + Math.random() * 9000); // 3 or 4 digits
  return `${randomName}${randomDigits}`;
}

function generateMd5Password(phone) {
  return crypto.createHash('md5').update(phone + 'secret_salt_123').digest('hex');
}

function mapCtTypeToUpiType(ct_type) {
  if (!ct_type) return "paytm";
  const typeStr = String(ct_type).trim().toLowerCase();
  if (typeStr.includes("paytm")) return "paytm";
  if (typeStr.includes("phonepe")) return "phonepe";
  if (typeStr.includes("mobikwik")) return "mobikwik";
  if (typeStr.includes("freecharge")) return "freecharge";
  if (typeStr.includes("bharatpe")) return "bharatpe";
  if (typeStr.includes("airtel")) return "airtel";
  if (typeStr.includes("slice")) return "slice";
  if (typeStr.includes("iob")) return "iob";
  if (typeStr.includes("amazon")) return "amazon";
  if (typeStr.includes("jio")) return "jiof";

  const typeNum = Number(ct_type);
  switch (typeNum) {
    case 1: return "phonepe";
    case 2: return "mobikwik";
    case 3: return "freecharge";
    case 4: return "bharatpe";
    case 6: return "airtel";
    case 9: return "paytm";
    case 14: return "jiof";
    case 15: return "slice";
    case 16: return "paytm"; // Paytm Business
    case 17: return "iob";
    case 18: return "amazon";
    case 19: return "phonepe"; // PhonePe Business
    default: return "paytm"; // Default fallback
  }
}

function mapCtTypeToName(ct_type) {
  if (!ct_type) return "UPI Partner";
  const typeStr = String(ct_type).trim().toLowerCase();
  if (typeStr.includes("paytm")) return typeStr.includes("business") ? "PayTM Business" : "PayTM";
  if (typeStr.includes("phonepe")) return typeStr.includes("business") ? "PhonePe Business" : "PhonePe";
  if (typeStr.includes("mobikwik")) return "MobiKwik";
  if (typeStr.includes("freecharge")) return "Freecharge";
  if (typeStr.includes("bharatpe")) return "BharatPe";
  if (typeStr.includes("airtel")) return "Airtel Pay";
  if (typeStr.includes("slice")) return "Slice Pay";
  if (typeStr.includes("iob")) return "IOB";
  if (typeStr.includes("amazon")) return "Amazon Pay";
  if (typeStr.includes("jio")) return "Jio Money";

  const typeNum = Number(ct_type);
  switch (typeNum) {
    case 1: return "PhonePe";
    case 2: return "MobiKwik";
    case 3: return "Freecharge";
    case 4: return "BharatPe";
    case 6: return "Airtel Pay";
    case 9: return "PayTM";
    case 14: return "Jio Money";
    case 15: return "Slice Pay";
    case 16: return "PayTM Business";
    case 17: return "IOB";
    case 18: return "Amazon Pay";
    case 19: return "PhonePe Business";
    default: return "UPI Partner";
  }
}

async function getOrRegisterZoopayUser(user, forceRefresh = false) {
  if (user.zoopayToken && !forceRefresh) {
    console.log(`[Zoopay] Reusing stored token for ${user.phone}: ${user.zoopayToken}`);
    return user.zoopayToken;
  }

  if (user.zoopayPhone && user.zoopayPassword) {
    try {
      console.log(`[Zoopay] Stored credentials found for ${user.phone}: ${user.zoopayPhone}. Attempting login...`);
      const loginRes = await fetch('https://api.zoopay.vip/api/user/login', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: user.zoopayPhone,
          password: user.zoopayPassword
        })
      });
      const loginJson = await loginRes.json();
      if (loginJson && loginJson.code === 200 && loginJson.data && loginJson.data.token) {
        user.zoopayToken = loginJson.data.token;
        user.markModified('zoopayToken');
        await user.save();
        console.log(`[Zoopay] Login success. Token updated.`);
        return user.zoopayToken;
      } else {
        console.warn(`[Zoopay] Login failed with stored credentials:`, loginJson);
        // If the credentials are old/invalid or user not found, we can clear them to allow re-registration
        if (loginJson && (loginJson.code === 400 || loginJson.code === 401 || loginJson.code === 404 || (loginJson.message && loginJson.message.toLowerCase().includes('not found')))) {
          console.log(`[Zoopay] Credentials appear invalid, clearing to trigger re-registration.`);
          user.zoopayPhone = undefined;
          user.zoopayPassword = undefined;
          user.zoopayUsername = undefined;
          user.zoopayToken = undefined;
          user.markModified('zoopayPhone');
          user.markModified('zoopayPassword');
          user.markModified('zoopayUsername');
          user.markModified('zoopayToken');
          await user.save();
        }
      }
    } catch (err) {
      console.error('[Zoopay] Login error with stored credentials:', err);
    }
  }

  // Generate and register new user
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const generatedPhone = generateRandomPhone();
    const generatedUsername = generateRandomUsername();
    const generatedPassword = generateMd5Password(generatedPhone);

    try {
      console.log(`[Zoopay] Attempting new registration (attempt ${attempts}): Phone=${generatedPhone}, Username=${generatedUsername}`);
      const regRes = await fetch('https://api.zoopay.vip/api/user/register', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: generatedPhone,
          user_name: generatedUsername,
          password: generatedPassword,
          bonus_ratio: 3
        })
      });
      const regJson = await regRes.json();
      console.log(`[Zoopay] Registration result (attempt ${attempts}):`, JSON.stringify(regJson));

      if (regJson && regJson.code === 200) {
        const loginRes = await fetch('https://api.zoopay.vip/api/user/login', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone: generatedPhone,
            password: generatedPassword
          })
        });
        const loginJson = await loginRes.json();
        if (loginJson && loginJson.code === 200 && loginJson.data && loginJson.data.token) {
          user.zoopayPhone = generatedPhone;
          user.zoopayUsername = generatedUsername;
          user.zoopayPassword = generatedPassword;
          user.zoopayToken = loginJson.data.token;
          
          user.markModified('zoopayPhone');
          user.markModified('zoopayUsername');
          user.markModified('zoopayPassword');
          user.markModified('zoopayToken');
          
          await user.save();
          console.log(`[Zoopay] Registered & logged in successfully. Phone=${generatedPhone}`);
          return user.zoopayToken;
        }
      }
    } catch (err) {
      console.error(`[Zoopay] Registration attempt ${attempts} failed:`, err);
    }
  }
  throw new Error('Failed to register or login with Zoopay API after 3 attempts');
}

async function fetchZoopay(user, url, options: any = {}) {
  let token = await getOrRegisterZoopayUser(user);
  
  if (!options.headers) options.headers = {};
  options.headers['Authorization'] = `Bearer ${token}`;
  options.headers['Accept'] = 'application/json';
  if (!options.headers['Content-Type'] && options.body) {
    options.headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(url, options);
  
  let isUnauthorized = (res.status === 401 || res.status === 403);
  let json: any = null;
  
  if (!isUnauthorized) {
    try {
      const clone = res.clone();
      json = await clone.json();
      if (json && (json.code === 401 || json.code === 403 || (json.message && json.message.toLowerCase().includes('unauthorized')))) {
        isUnauthorized = true;
      }
    } catch (e) {
      // Not JSON
    }
  }

  if (isUnauthorized) {
    console.log(`[Zoopay Fetch] Unauthorized error detected. Fetching a fresh token and retrying...`);
    token = await getOrRegisterZoopayUser(user, true); // force refresh
    options.headers['Authorization'] = `Bearer ${token}`;
    res = await fetch(url, options);
  }

  return res;
}

async function seedAdminUser() {
  try {
    const adminPhone = '7870873927';
    let admin = await User.findOne({ $or: [{ phone: adminPhone }, { mobileNo: adminPhone }] });
    if (!admin) {
      admin = new User({
        phone: adminPhone,
        mobileNo: adminPhone,
        password: 'Ritik@123',
        repassword: 'Ritik@123',
        balance: 100000,
        vipLevel: 5,
        kycStatus: 1,
        realName: 'Ritik Admin'
      });
      await admin.save();
      console.log('[Seeding] Created Admin user 7870873927 successfully.');
    } else {
      admin.password = 'Ritik@123';
      await admin.save();
    }
  } catch (err) {
    console.error('Error seeding admin user:', err);
  }
}
seedAdminUser();

function isPasswordEmpty(password) {
  if (password === undefined || password === null) return true;
  const p = String(password).trim();
  return p === '' || p === 'undefined' || p === 'null';
}

function getDefaultCollectionTools() {
  return [];
}

// Dynamic URL Normalization and Rewrite Middleware for Serverless Compatibility (Netlify/Vercel)
app.use((req, res, next) => {
  const originalUrl = req.url;
  
  // Strip Netlify/Vercel serverless function path prefixes if present
  if (req.url.startsWith('/.netlify/functions/xxapi')) {
    req.url = req.url.replace('/.netlify/functions/xxapi', '/xxapi');
  } else if (req.url.startsWith('/api/xxapi')) {
    req.url = req.url.replace('/api/xxapi', '/xxapi');
  } else if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '/xxapi');
  }

  // Prepend /xxapi if a clean API request path is accessed without it (e.g. checkSmsNew)
  if (!req.url.startsWith('/xxapi') && req.method !== 'GET' && !req.url.includes('.')) {
    req.url = '/xxapi' + (req.url.startsWith('/') ? '' : '/') + req.url;
  }
  
  if (originalUrl !== req.url) {
    console.log(`[URL Rewrite] Normalized: ${originalUrl} -> ${req.url}`);
  }
  next();
});

// CORS configuration helper
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, INDIATOKEN, token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware to capture and log ALL API requests to MongoDB
app.use('/xxapi', async (req, res, next) => {
  try {
    const log = new GeneralLog({
      endpoint: req.originalUrl,
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
    await log.save();
    console.log(`[API Log] Saved request to ${req.originalUrl}`);
  } catch (err) {
    console.error('Error saving API log to MongoDB:', err);
  }
  next();
});

// Helper function to find user by header token
async function getUserByToken(req) {
  let token = req.headers['indiatoken'] || req.headers['token'] || req.headers['INDIATOKEN'] || req.query?.token || req.query?.indiatoken;
  if (!token) return null;
  
  // If token is comma-separated due to proxy aggregation, clean and extract the correct token part
  if (typeof token === 'string') {
    if (token.includes(',')) {
      const parts = token.split(',').map(t => t.trim()).filter(Boolean);
      // Prefer a token starting with "token-" or just take the first one
      token = parts.find(p => p.startsWith('token-')) || parts[0];
    }
  }

  if (!token) return null;

  if (token === 'token-7870873927' || token.includes('token-7870873927')) {
    return await User.findOne({ $or: [{ phone: '7870873927' }, { mobileNo: '7870873927' }] });
  }
  return await User.findOne({ token });
}

// 1. REGISTER ENDPOINT
app.post('/xxapi/register', async (req, res) => {
  try {
    const { phone, password, repassword, smscode } = req.body;
    const invitercode = req.body.invitercode || req.body.referral_code || '';
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });

    if (user) {
      return res.json({ code: 400, msg: 'Phone number is already registered. Please login.' });
    }

    user = new User({
      phone,
      mobileNo: phone, // Store in both fields for cross-system script compatibility
      password,
      repassword: repassword || password,
      invitercode: invitercode || '',
      token,
      balance: 10000,
      commission: 120,
      collectionTools: getDefaultCollectionTools()
    });
    await user.save();

    console.log(`[Register] User ${phone} registered successfully with valid OTP 1234.`);
    return res.json({
      code: 0,
      msg: 'success',
      data: token
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// SMS and Registration flow helpers
app.post('/xxapi/checkSmsNew', async (req, res) => {
  console.log('[checkSmsNew] Called', req.body);
  const { phone, password } = req.body;
  if (!phone || String(phone).trim() === '') {
    return res.json({ code: 400, msg: 'Phone number is required' });
  }
  if (isPasswordEmpty(password)) {
    return res.json({ code: 400, msg: 'Password cannot be empty' });
  }

  // To allow Login button to show the OTP captcha dialog,
  // checkSmsNew must return success code: 0 even if user already exists in DB.
  console.log(`[checkSmsNew] Success. Temporary OTP 1234 generated for phone: ${phone}`);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.post('/xxapi/resetpassword', async (req, res) => {
  console.log('[resetpassword] Called', req.body);
  try {
    const { phone, password, sendtoken, smscode } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });
    if (!user) {
      return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
    }

    user.password = password;
    user.repassword = password;
    await user.save();
    console.log(`[ResetPassword] User ${phone} reset password successfully.`);

    return res.json({
      code: 0,
      msg: 'success'
    });
  } catch (err) {
    console.error('Reset Password Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/getsendtken', async (req, res) => {
  console.log('[getsendtken] Called', req.body);
  const phone = req.body.phone || 'default';
  return res.json({
    code: 0,
    msg: 'success',
    data: `sendtoken-${phone}-${Date.now()}`
  });
});

app.post('/xxapi/sendLoginSms', async (req, res) => {
  console.log('[sendLoginSms] Called', req.body);
  const { phone, password } = req.body;
  if (!phone || String(phone).trim() === '') {
    return res.json({ code: 400, msg: 'Phone number is required' });
  }
  if (isPasswordEmpty(password)) {
    return res.json({ code: 400, msg: 'Password cannot be empty' });
  }

  // Check if user is registered in the database (via either phone or mobileNo)
  const registeredUser = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });
  if (!registeredUser) {
    return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
  }

  console.log(`[OTP Sent] Temporary OTP 1234 generated for login of phone: ${phone}`);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.post('/xxapi/sendsms', async (req, res) => {
  console.log('[sendsms] Called', req.body);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

app.get('/xxapi/sliderCaptcha', async (req, res) => {
  console.log('[sliderCaptcha] Called');
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// 2. LOGIN ENDPOINT
app.post('/xxapi/login', async (req, res) => {
  try {
    const { phone, password, smscode } = req.body;
    if (!phone || String(phone).trim() === '') {
      return res.json({ code: 400, msg: 'Phone number is required' });
    }
    if (isPasswordEmpty(password)) {
      return res.json({ code: 400, msg: 'Password cannot be empty' });
    }
    if (!smscode || String(smscode).trim() !== '1234') {
      return res.json({ code: 400, msg: 'Incorrect OTP. Please enter 1234.' });
    }

    const token = `token-${phone}`;
    let user = await User.findOne({ $or: [{ phone }, { mobileNo: phone }] });

    if (!user) {
      return res.json({ code: 400, msg: 'User does not exist. Please register first.' });
    }

    if (user.password !== password) {
      return res.json({ code: 400, msg: 'Incorrect password' });
    }

    user.token = token;
    await user.save();
    console.log(`[Login] User ${phone} logged in successfully.`);

    return res.json({
      code: 0,
      msg: 'success',
      data: token
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 3. USERINFO ENDPOINT
app.get('/xxapi/userinfo', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({
        code: 403,
        msg: 'Unauthorized'
      });
    }

    return res.json({
      code: 0,
      msg: 'success',
      data: {
        uid: user._id,
        id: user._id,
        username: user.phone || user.mobileNo || '',
        phone: user.phone || user.mobileNo || '',
        teamWorkId: user.phone || user.mobileNo || '',
        balance: user.balance ?? 10000,
        commission: user.commission ?? 120,
        withdrawable: user.balance ?? 10000,
        recharge: user.recharge ?? 0,
        vipLevel: user.vipLevel ?? 1,
        invitercode: user.invitercode || '123456',
        safetyCodeSet: !!user.safetyCode,
        bankCount: user.bankDetails ? user.bankDetails.length : 0,
        upiCount: user.upiDetails ? user.upiDetails.length : 0,
        kycStatus: user.kycStatus ?? 0,
        realName: user.realName || user.fullName || '',
        parentUser: user.parentUser || '',
        todayProfit: user.todayProfit ?? 0,
        trc20Address: user.trc20Address || '',
        net: user.net || '',
        pageSize: user.pageSize || 10,
        totalTransferValue: user.totalTransferValue || 0,
        itoken: user.balance ?? 10000,
        frozenItoken: 0
      }
    });
  } catch (err) {
    console.error('Userinfo Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 4. BANK ENDPOINTS
app.post('/xxapi/bank', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const bankData = req.body;
    if (!user.bankDetails) user.bankDetails = [];
    user.bankDetails.push(bankData);
    user.markModified('bankDetails');
    await user.save();

    console.log(`[Bank] Added bank details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Bank Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/bank/edit', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const bankData = req.body;
    user.bankDetails = [bankData];
    user.markModified('bankDetails');
    await user.save();

    console.log(`[Bank] Edited bank details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Bank Edit Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.get('/xxapi/bank', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    return res.json({
      code: 0,
      msg: 'success',
      data: user ? (user.bankDetails || []) : []
    });
  } catch (err) {
    console.error('Get Bank List Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.post('/xxapi/bank/pause', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/bank/active', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/availablebank', async (req, res) => {
  const user = await getUserByToken(req);
  return res.json({
    code: 0,
    msg: 'success',
    data: user ? (user.bankDetails || []) : []
  });
});

// 5. UPI ENDPOINTS
app.post('/xxapi/authupi', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const { ctid, utr } = req.body;
    
    // Set the state of collection tool with matching id to active
    if (!user.collectionTools) {
      user.collectionTools = getDefaultCollectionTools();
    }
    
    const tool = user.collectionTools.find(t => t.id === ctid);
    if (tool) {
      tool.state = 2; // Idle / online
      tool.inSell = 1; // Active in sell
    }
    
    if (!user.upiDetails) user.upiDetails = [];
    user.upiDetails.push({ ctid, utr, date: new Date() });
    
    user.markModified('collectionTools');
    user.markModified('upiDetails');
    await user.save();

    console.log(`[UPI] Authenticated UPI details for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Auth UPI Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

app.get('/xxapi/upidetail/:id', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: {} });
});

// 6. SAFETY CODE ENDPOINT
app.post('/xxapi/safety_code', async (req, res) => {
  try {
    const user = await getUserByToken(req);
    if (!user) {
      return res.json({ code: 403, msg: 'Unauthorized' });
    }

    const code = req.body.safety_code || req.body.code || req.body.safetyCode;
    user.safetyCode = code;
    await user.save();

    console.log(`[Safety Code] Saved safety code for ${user.phone}`);
    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('Safety Code Error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 7. KYC ENDPOINTS
app.get('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  return res.json({
    code: 0,
    msg: "success",
    data: user.kycDetails || {
      realName: user.realName || '',
      idCard: '',
      status: user.kycStatus ?? 0,
      rejectReason: ''
    }
  });
});

app.post('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  user.kycDetails = req.body;
  user.realName = req.body.realName || req.body.name || user.realName;
  user.kycStatus = 1; // Submitted / Approved (we can instantly approve for premium UX!)
  user.markModified('kycDetails');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.patch('/xxapi/cwkyc', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  user.kycDetails = { ...(user.kycDetails || {}), ...req.body };
  user.realName = req.body.realName || req.body.name || user.realName;
  user.kycStatus = 1;
  user.markModified('kycDetails');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

// 8. CONFIG ENDPOINTS (No live vercel fetch - completely isolated local data)
app.get('/xxapi/config', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      usdtExchangerate: "80",
      currency: "INR",
      registerHost: "https://refer.vantage.top/#/rs/",
      tgChannelLink: "xxxx",
      rewardRules: {
        freeze_comp_reward: { name: "freeze_comp_reward", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 0, rule: "{}" },
        inr_buy_dividend: { name: "inr_buy_dividend", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 1, rule: "{\"1\": 0.003, \"2\": 0.002, \"3\": 0.001}" },
        inr_buy_reward: { name: "inr_buy_reward", fixed: 0, ratio: 2.5, minCondi: 1, ruleActive: 0, rule: "{\"rate_change\": \"2.0,2.5\", \"fixed_change\": \"0,0\"}" },
        inr_buy_reward_0: { name: "inr_buy_reward_0", fixed: 0, ratio: 2.5, minCondi: 0, ruleActive: 1, rule: "{\"rate_change\": \"2.0,2.5\", \"fixed_change\": \"0,0\"}" },
        today_buy_times_reward: { name: "today_buy_times_reward", fixed: 0, ratio: 0, minCondi: 0, ruleActive: 1, rule: "{\"1\": 10, \"3\": 20, \"5\": 20, \"10\": 50}" },
        usdt_buy_dividend: { name: "usdt_buy_dividend", fixed: 0, ratio: 0, minCondi: 100, ruleActive: 1, rule: "{\"1\": 0.003, \"2\": 0.001, \"3\": 0.0}" }
      },
      bannerSrcs: [
        "https://picsum.photos/seed/1/800/400",
        "https://picsum.photos/seed/2/800/400",
        "https://picsum.photos/seed/3/800/400"
      ],
      newsList: [
        { id: 32, cover: "", name: "securityupdate", code: "", type: 1, content: "Update verified", crtDate: 1779259339, crtUser: "alan", sort: 4 }
      ],
      pinFlag: false,
      ctTypes: [16, 1, 17, 2, 18, 3, 19, 4, 7, 9],
      ctTypesPayType: { "1": 2, "2": 2, "3": 1, "4": 2, "7": 3, "9": 2, "16": 2, "17": 2, "18": 1, "19": 2 },
      ifFinishNewbieActivity: 0,
      rptPaymentMode: 1,
      webLicenseId: "19711455",
      userBalShowReal: 0,
      sevenDayBuyEnabled: 0,
      v: 2039,
      pv: 3
    }
  });
});

app.post('/xxapi/client_error', (req, res) => {
  console.log('--- CLIENT ERROR RECEIVED ---');
  console.log('Message:', req.body.message);
  console.log('Filename:', req.body.filename);
  console.log('Line:', req.body.lineno, 'Col:', req.body.colno);
  console.log('Stack:', req.body.stack);
  console.log('-----------------------------');
  return res.json({ code: 0, msg: 'logged' });
});

app.get('/xxapi/simpConfig', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      siteName: "Monexo",
      logo: "favicon.ico",
      customerServiceUrl: "https://t.me/xxxx",
      okTurnstileSitekey: "0",
      payerTimeoutTime: 600
    }
  });
});

// Newbie, Activity and Rewards fallback/stub API endpoints to prevent SPA router HTML fallbacks
app.get('/xxapi/newbieDayStep/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false,
      buyToken: "0"
    }
  });
});

app.get('/xxapi/newbieStepTotal/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      newbieStepRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false,
      finishNewbie: 1
    }
  });
});

app.get('/xxapi/inviteNewbieStepTotal/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      inviteDayStepRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      oldRptNewReward: { fixed: 0 },
      dayStepParams: "{}",
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/newbieDayStep/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/inviteDayStep/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/inviteDayStep/reward/:id', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyInrTimes/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/buyInrTimes/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyInrAmount/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/buyInrAmount/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/sellInrAmount/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/sellInrAmount/reward/:id/:amount', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/freezeComp/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: 0, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/freezeComp/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/bguide/activityCodeDone/:code', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.post('/xxapi/bguide/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/todayLotteryReward/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      activityRecord: { done: false, condition: 0, settleAmt: 0, params: "{}" },
      activityRules: [],
      allDone: false
    }
  });
});

app.post('/xxapi/todayLotteryReward/claim', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/dailyFreeLottery/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      status: 0,
      rewards: []
    }
  });
});

app.post('/xxapi/dailyFreeLottery/spin', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/sevenDayBuy/init', async (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      list: []
    }
  });
});

app.post('/xxapi/sevenDayBuy/reward', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

// Additional API stubs to ensure all possible external/client routes do not fall back to HTML
app.post('/xxapi/tgbotbindtoken', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/tgbotbindtoken', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/upidetail/:upi', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/teamDailyData/:id', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/minSellIToken/:id/:amount', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.get('/xxapi/minMaxUpiSell/:id/:amount/:something', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: {} });
});

app.post('/xxapi/checkSmsNew', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/buyUsdt/list', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.post('/xxapi/wallet/sendVerifySms/:id/:other', async (req, res) => {
  return res.json({ code: 0, msg: "success" });
});

app.get('/xxapi/bank/history', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/TgBindUserservice', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: [] });
});

app.get('/xxapi/checkTgBindStatus', async (req, res) => {
  return res.json({ code: 0, msg: "success", data: { bound: false } });
});

app.get('/xxapi/buyitoken/waitconfirm', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      waitconfirm: []
    }
  });
});

app.get('/xxapi/buyitoken/history', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      total: 0,
      list: []
    }
  });
});

app.get('/xxapi/buyitoken/waitpayerpaymentslip', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      total: 0,
      list: []
    }
  });
});

app.get('/xxapi/buyitoken/paymentslipdetail', async (req, res) => {
  const id = req.query.id || 'TXN' + Math.floor(100000 + Math.random() * 900000);
  const amount = req.query.amount || '500';
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      id: id,
      orderid: id,
      amount: amount,
      payee_bankname: "State Bank of India",
      payment_method: "bank",
      payee_recipients_name: "Admin",
      payee_ifsc: "SBIN0001234",
      payee_bank_account: "9876543210",
      reason_for_rejection: "",
      payer_status: 1,
      confirm_mode: 0,
      ctType: 1,
      ct_type: 1,
      countdown: 600,
      ctime: req.query.ctime || Date.now(),
      walletDomain: "https://example.com"
    }
  });
});

app.get('/xxapi/buyitoken/check', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {
      cnt: 1,
      chargeFlag: 0,
      chargeAmt: '0'
    }
  });
});

app.get('/xxapi/customerservice', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: [
      {
        nickname: "Telegram Customer Service",
        label: "@MonexoSupport",
        type: "service",
        url: "https://t.me/xxxx"
      },
      {
        nickname: "Official Channel",
        label: "Monexo Announcements",
        type: "customer",
        url: "https://t.me/xxxx"
      }
    ]
  });
});

app.get('/xxapi/addAgentGroup/:id', async (req, res) => {
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// 9. COLLECTION TOOL ENDPOINTS
async function healAndGetCleanTools(user) {
  if (!user.collectionTools) {
    user.collectionTools = [];
  }
  
  let modified = false;
  const cleanTools = (user.collectionTools || []).filter(
    t => t && t.id && !t.id.startsWith('tool-paytm-business') && !t.id.startsWith('tool-phonepe-business') && !t.id.startsWith('tool-amazon') && t.state !== 7
  ).map(t => {
    const typeVal = t.type !== undefined ? t.type : 16;
    let upiVal = t.upi;
    
    // Find first available verified UPI ID from backup_upi or user.zoopayUpis
    let verifiedUpi = '';
    if (t.backup_upi && t.backup_upi.length > 0) {
      verifiedUpi = t.backup_upi[0];
    } else if (user.zoopayUpis && user.zoopayUpis.length > 0) {
      verifiedUpi = user.zoopayUpis[0];
    }
    
    // If upi is empty or "Pending verification", auto-heal it with the verified UPI ID
    if ((!upiVal || upiVal === 'Pending verification' || upiVal === 'Pending') && verifiedUpi) {
      upiVal = verifiedUpi;
      t.upi = verifiedUpi;
      modified = true;
    }
    
    // Auto-heal other fields if missing
    if (t.status === undefined) {
      t.status = 1; // available
      modified = true;
    }
    if (t.ctType === undefined || t.ct_type === undefined) {
      t.ctType = typeVal;
      t.ct_type = typeVal;
      modified = true;
    }
    
    return {
      ...t,
      status: t.status !== undefined ? t.status : 1,
      state: t.state !== undefined ? t.state : 2,
      upi: upiVal,
      ctType: t.ctType !== undefined ? t.ctType : typeVal,
      ct_type: t.ct_type !== undefined ? t.ct_type : typeVal
    };
  });
  
  if (modified) {
    user.markModified('collectionTools');
    try {
      await user.save();
      console.log(`[Collection Tool Healing] Saved auto-healed tool fields for user: ${user.phone}`);
    } catch (err) {
      console.error(`[Collection Tool Healing] Error saving user:`, err);
    }
  }
  
  return cleanTools;
}

app.get('/xxapi/collectiontoollist', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const cleanTools = await healAndGetCleanTools(user);
  return res.json({ code: 0, msg: 'success', data: cleanTools });
});

app.get('/xxapi/collectiontool', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const cleanTools = await healAndGetCleanTools(user);
  return res.json({ code: 0, msg: 'success', data: cleanTools[0] || null });
});

// Edit or Update collection tool details
app.post('/xxapi/collectiontool', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });

  const { id, upi, account, password, pnname } = req.body;
  if (!user.collectionTools) {
    user.collectionTools = [];
  }

  const tool = user.collectionTools.find(t => t.id === id);
  if (!tool) {
    return res.json({ code: 404, msg: 'Collection tool not found' });
  }

    try {
    const zoopayToken = await getOrRegisterZoopayUser(user);
    const sessionId = user.zoopaySessionId;

    if (!sessionId) {
      return res.json({ code: 400, msg: 'Session not found. Please verify OTP first.' });
    }

    console.log(`[Zoopay] Linking UPI ID: sessionId=${sessionId}, upi_id=${upi}`);
    const linkRes = await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tool/link', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        upi_id: upi
      })
    });
    const linkJson = await linkRes.json();
    console.log(`[Zoopay] Link response:`, JSON.stringify(linkJson));

    if (!linkJson || linkJson.code !== 200) {
      return res.json({ 
        code: linkJson ? linkJson.code : 400, 
        msg: linkJson ? (linkJson.message || 'Linking failed') : 'Failed to link UPI with Zoopay' 
      });
    }

    const zoopayToolId = linkJson.data.id;

    console.log(`[Zoopay] Activating tool (updateState): id=${zoopayToolId}`);
    const stateRes = await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/updateState', {
      method: 'POST',
      body: JSON.stringify({
        id: zoopayToolId,
        state: 'enabled'
      })
    });
    const stateJson = await stateRes.json();
    console.log(`[Zoopay] updateState response:`, JSON.stringify(stateJson));

    // Update local DB tool data
    tool.upi = upi;
    tool.state = 2; // idle / online
    tool.inSell = 1;
    tool.zoopayToolId = zoopayToolId;
    if (pnname !== undefined) tool.pnname = pnname;
    if (account !== undefined) tool.account = account;

    user.markModified('collectionTools');
    await user.save();

    return res.json({ code: 0, msg: 'success' });
  } catch (err) {
    console.error('[Zoopay] collectiontool link error:', err);
    return res.json({ code: 500, msg: err.message || 'Internal Server Error' });
  }
});

app.post('/xxapi/collectiontoolStatus', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id, inSell, state } = req.body;
  if (!user.collectionTools) user.collectionTools = [];
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    if (inSell !== undefined) tool.inSell = Number(inSell);
    if (state !== undefined) tool.state = Number(state);
    
    // If we have a Zoopay ID, push state update to Zoopay too
    if (tool.zoopayToolId) {
      try {
        const zoopayState = (Number(inSell) === 1 || Number(state) === 2) ? 'enabled' : 'disabled';
        console.log(`[Zoopay] Syncing manual state update: id=${tool.zoopayToolId}, state=${zoopayState}`);
        await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/updateState', {
          method: 'POST',
          body: JSON.stringify({
            id: tool.zoopayToolId,
            state: zoopayState
          })
        });
      } catch (err) {
        console.error('[Zoopay] Error syncing status:', err);
      }
    }
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/collectiontool/startsell', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id } = req.body;
  if (!user.collectionTools) user.collectionTools = [];
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    tool.inSell = 1;
    tool.state = 2; // idle / active
    
    if (tool.zoopayToolId) {
      try {
        await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/updateState', {
          method: 'POST',
          body: JSON.stringify({
            id: tool.zoopayToolId,
            state: 'enabled'
          })
        });
      } catch (err) {
        console.error('[Zoopay] startsell sync error:', err);
      }
    }
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.post('/xxapi/collectiontool/stopsell', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const { id } = req.body;
  if (!user.collectionTools) user.collectionTools = [];
  const tool = user.collectionTools.find(t => t.id === id);
  if (tool) {
    tool.inSell = 0;
    tool.state = 0; // disabled
    
    if (tool.zoopayToolId) {
      try {
        await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/updateState', {
          method: 'POST',
          body: JSON.stringify({
            id: tool.zoopayToolId,
            state: 'disabled'
          })
        });
      } catch (err) {
        console.error('[Zoopay] stopsell sync error:', err);
      }
    }
  }
  user.markModified('collectionTools');
  await user.save();
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/availablect', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 0, msg: 'success', data: [] });
  const cleanTools = await healAndGetCleanTools(user);
  return res.json({ code: 0, msg: 'success', data: cleanTools });
});

// MONITORFLOW / UPI LINKING STEP-FLOW ENDPOINTS
app.post('/xxapi/monitorflow/one', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });

  const { ct_type, account, pnname, ct_id, pin, deviceId } = req.body;
  if (!user.collectionTools) {
    user.collectionTools = [];
  }

  const upiType = mapCtTypeToUpiType(ct_type);
  const partnerName = mapCtTypeToName(ct_type);
  const typeNum = isNaN(Number(ct_type)) ? 16 : Number(ct_type);

  try {
    // 1. Get or Register on Zoopay and obtain JWT token
    const zoopayToken = await getOrRegisterZoopayUser(user);

    // 2. Call sendWalletOtp on Zoopay API
    console.log(`[Zoopay] Sending Wallet OTP: account=${account}, upiType=${upiType}`);
    const otpRes = await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/sendWalletOtp', {
      method: 'POST',
      body: JSON.stringify({
        upi_account: account,
        upi_type: upiType
      })
    });

    if (!otpRes.ok) {
      let errMsg = `Zoopay API error (status ${otpRes.status})`;
      try {
        const errJson = await otpRes.json();
        errMsg = errJson.message || errJson.msg || errMsg;
      } catch (e) {
        try {
          const txt = await otpRes.text();
          if (txt) errMsg = txt;
        } catch (_) {}
      }
      return res.json({
        code: otpRes.status || 500,
        msg: errMsg
      });
    }

    const otpJson = await otpRes.json();
    console.log(`[Zoopay] sendWalletOtp response:`, JSON.stringify(otpJson));

    if (!otpJson || otpJson.code !== 200) {
      return res.json({ 
        code: otpJson ? (otpJson.code || 500) : 500, 
        msg: otpJson ? (otpJson.message || otpJson.msg || 'Zoopay OTP Sending Failed') : 'Zoopay API error' 
      });
    }

    const sessionId = otpJson.data.sessionId;
    user.zoopaySessionId = sessionId;
    user.zoopayUpiType = upiType;
    user.markModified('zoopaySessionId');
    user.markModified('zoopayUpiType');

    // Create or locate the tool
    let tool;
    const toolId = ct_id || `tool-user-${Date.now()}`;
    tool = user.collectionTools.find(t => t.id === toolId);

    if (!tool) {
      tool = {
        id: toolId,
        name: partnerName,
        type: typeNum,
        ctType: typeNum,
        ct_type: typeNum,
        onlyPaymentFlag: 3,
        state: 7, // waiting for OTP / Auth UPI
        minSellToken: 2,
        limitConfig: JSON.stringify({ min: 100, max: 100000 }),
        inSell: 1,
        ctGuide: "If you Change your upi id, please relink right now!",
        account: account,
        upi: "Pending verification",
        phone: user.phone,
        pnname: pnname || "Merchant Partner",
        remark: "Verified partner"
      };
      user.collectionTools.push(tool);
    } else {
      tool.account = account;
      tool.type = typeNum;
      tool.ctType = typeNum;
      tool.ct_type = typeNum;
      tool.state = 7;
      tool.inSell = 1;
      if (pnname) tool.pnname = pnname;
    }

    user.markModified('collectionTools');
    await user.save();

    return res.json({
      code: 0,
      msg: 'success',
      data: {
        needRelink: false,
        ctId: tool.id,
        ct_id: tool.id,
        pk: tool.id
      }
    });
  } catch (err) {
    console.error('[Zoopay] monitorflow/one error:', err);
    return res.json({ code: 500, msg: err.message || 'Internal Server Error' });
  }
});

app.post('/xxapi/monitorflow/two', (req, res) => {
  const { pk } = req.body;
  res.json({ code: 0, msg: 'success', data: pk || {} });
});

app.post('/xxapi/monitorflow/two/getpreloginresult', (req, res) => {
  res.json({ code: 0, msg: 'success', data: {} });
});

app.post('/xxapi/monitorflow/two/getpreloginresult2', (req, res) => {
  res.json({ code: 0, msg: 'success', data: {} });
});

app.post('/xxapi/monitorflow/three', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });

  const { pk, ct_type, account, login_params } = req.body;
  let otp = '';
  try {
    if (login_params) {
      const params = typeof login_params === 'string' ? JSON.parse(login_params) : login_params;
      otp = params.otp;
    }
  } catch (e) {
    console.error('[Zoopay] Error parsing login_params:', e);
  }

  if (!otp) {
    return res.json({ code: 400, msg: 'OTP is required' });
  }

  try {
    const sessionId = user.zoopaySessionId;

    if (!sessionId) {
      return res.json({ code: 400, msg: 'Session expired, please request OTP again.' });
    }

    console.log(`[Zoopay] Verifying OTP: sessionId=${sessionId}, otp=${otp}`);
    const verifyRes = await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/verifyWalletOtp', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        otp
      })
    });
    if (!verifyRes.ok) {
      let errMsg = `Zoopay API error (status ${verifyRes.status})`;
      try {
        const errJson = await verifyRes.json();
        errMsg = errJson.message || errJson.msg || errMsg;
      } catch (e) {
        try {
          const txt = await verifyRes.text();
          if (txt) errMsg = txt;
        } catch (_) {}
      }
      return res.json({
        code: verifyRes.status || 400,
        msg: errMsg
      });
    }

    const verifyJson = await verifyRes.json();
    console.log(`[Zoopay] verifyWalletOtp response:`, JSON.stringify(verifyJson));

    if (!verifyJson || verifyJson.code !== 200) {
      return res.json({ 
        code: verifyJson ? (verifyJson.code || 400) : 400, 
        msg: verifyJson ? (verifyJson.message || verifyJson.msg || 'Incorrect OTP, please try again') : 'Incorrect OTP, please try again'
      });
    }

    // Retrieve verified UPI IDs from Zoopay
    const upis = (verifyJson.data && verifyJson.data.upis) || [];
    user.zoopayUpis = upis;
    user.markModified('zoopayUpis');

    // Update tool state to ready
    if (user.collectionTools) {
      let tool = user.collectionTools.find(t => t.id === pk);
      if (!tool && account) {
        const typeNum = isNaN(Number(ct_type)) ? 16 : Number(ct_type);
        tool = user.collectionTools.find(t => t.account === account && t.type === typeNum);
      }
      if (tool) {
        tool.state = 2; // set to idle/ready to enable selection checking in check
        tool.backup_upi = upis;
        if (upis && upis.length > 0) {
          tool.upi = upis[0];
        }
      }
      user.markModified('collectionTools');
    }

    await user.save();
    return res.json({ code: 0, msg: 'success', data: { upis } });
  } catch (err) {
    console.error('[Zoopay] monitorflow/three error:', err);
    return res.json({ code: 500, msg: err.message || 'Internal Server Error' });
  }
});

app.post('/xxapi/monitorflow/three2', (req, res) => {
  res.json({ code: 0, msg: 'success', data: {} });
});

app.post('/xxapi/monitorflow/four', (req, res) => {
  res.json({ code: 0, msg: 'success', data: {} });
});

app.post('/xxapi/monitorflow/check', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });

  const { ct_type, account, ct_id } = req.body;
  const typeNum = isNaN(Number(ct_type)) ? 16 : Number(ct_type);

  let tool = null;
  if (user.collectionTools) {
    if (ct_id) {
      tool = user.collectionTools.find(t => t.id === ct_id);
    }
    if (!tool && account) {
      tool = user.collectionTools.find(t => t.account === account && t.type === typeNum);
    }
  }

  let state = tool ? (tool.state !== undefined ? tool.state : 7) : 7;
  let upis = tool ? (tool.backup_upi || []) : (user.zoopayUpis || []);

  // Auto-healing / auto-recovery: If we have verified UPIs in user.zoopayUpis, but tool's state is still 7 or backup_upi is empty, auto-recover it to 2 (ready) and save it.
  if (user.zoopayUpis && user.zoopayUpis.length > 0) {
    if (upis.length === 0) {
      upis = user.zoopayUpis;
    }
    if (tool && (tool.state === 7 || !tool.backup_upi || tool.backup_upi.length === 0 || !tool.upi || tool.upi === 'Pending verification')) {
      tool.state = 2;
      tool.backup_upi = upis;
      if (upis && upis.length > 0) {
        tool.upi = upis[0];
      }
      state = 2;
      user.markModified('collectionTools');
      await user.save();
      console.log(`[Zoopay Check] Auto-healed tool ${tool.id} to state 2, backup_upi and upi populated.`);
    }
  }

  console.log(`[Zoopay Check] User: ${user.phone}, Account: ${account}, CtID: ${ct_id}, Tool found: ${!!tool}, State: ${state}, UPI Count: ${upis.length}`);

  return res.json({
    code: 0,
    msg: 'success',
    data: {
      state, // return actual state (7 for waiting_authupi, 2 for idle/ready)
      id: tool ? tool.id : (ct_id || ''),
      backup_upi: upis
    }
  });
});

app.post('/xxapi/monitorflow/upi/list', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  
  const { ct_type, account, ct_id } = req.body;
  const typeNum = isNaN(Number(ct_type)) ? 16 : Number(ct_type);

  let tool = null;
  if (user.collectionTools) {
    if (ct_id) {
      tool = user.collectionTools.find(t => t.id === ct_id);
    }
    if (!tool && account) {
      tool = user.collectionTools.find(t => t.account === account && t.type === typeNum);
    }
  }

  const upis = tool && tool.backup_upi && tool.backup_upi.length > 0
    ? tool.backup_upi
    : (user.zoopayUpis && user.zoopayUpis.length > 0 ? user.zoopayUpis : []);

  console.log(`[Zoopay UPI List] User: ${user.phone}, Account: ${account}, CtID: ${ct_id}, Tool found: ${!!tool}, UPI Count: ${upis.length}`);

  return res.json({
    code: 0,
    msg: 'success',
    data: {
      id: tool ? tool.id : (ct_id || ''),
      backup_upi: upis
    }
  });
});

// 10. RECHARGE, DEPOSIT AND TRANSACTION ENDPOINTS
app.all('/xxapi/rechargeConfirm', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  
  const amount = Number(req.body.amount || req.query.amount || 1000);
  const rptNo = `RPT${Date.now()}`;
  
  const tx = new Transaction({
    userId: user._id,
    phone: user.phone,
    rptNo: rptNo,
    amount: amount,
    type: 'recharge',
    currentStep: 0,
    payer_status: 1
  });
  await tx.save();
  
  return res.json({
    code: 0,
    msg: 'success',
    data: rptNo
  });
});

app.get('/xxapi/rechargeToken', async (req, res) => {
  const rptNo = req.query.rptNo || req.body.rptNo;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) {
    return res.json({ code: 404, msg: 'Transaction not found' });
  }
  return res.json({
    code: 0,
    msg: 'success',
    data: tx
  });
});

app.get('/xxapi/chargeUtr/:rptNo/:utr', async (req, res) => {
  const { rptNo, utr } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  
  tx.utr = utr;
  tx.currentStep = 2; // review step
  tx.payer_status = 3; // Success! Auto-approve for amazing UX
  await tx.save();
  
  // Instant local credit to user balance
  const user = await User.findOne({ phone: tx.phone });
  if (user) {
    user.balance = (user.balance || 0) + tx.amount;
    await user.save();
  }
  
  return res.json({ code: 0, msg: 'success', data: tx });
});

app.get('/xxapi/chargeCancel/:rptNo', async (req, res) => {
  const { rptNo } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  
  tx.payer_status = 4; // Cancelled
  await tx.save();
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/chargeStatus/:rptNo', async (req, res) => {
  const { rptNo } = req.params;
  const tx = await Transaction.findOne({ rptNo });
  if (!tx) return res.json({ code: 404, msg: 'Transaction not found' });
  return res.json({ code: 0, msg: 'success', data: tx.payer_status });
});

app.get('/xxapi/chargeToken/history', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const txs = await Transaction.find({ userId: user._id, type: 'recharge' }).sort({ ctime: -1 });
  return res.json({ code: 0, msg: 'success', data: txs });
});

app.get('/xxapi/transferToken/history', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

// 11. SELL AND WITHDRAWAL ENDPOINTS
app.get('/xxapi/sell/history', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.json({ code: 403, msg: 'Unauthorized' });
  const txs = await Transaction.find({ userId: user._id, type: 'sell' }).sort({ ctime: -1 });
  return res.json({ code: 0, msg: 'success', data: txs });
});

app.post('/xxapi/sell/question', async (req, res) => {
  return res.json({ code: 0, msg: 'success' });
});

app.get('/xxapi/minSellIToken/:param1/:param2', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: 100 });
});

app.get('/xxapi/minMaxUpiSell/:param1/:param2/:param3', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: { min: 100, max: 100000 } });
});

// 12. TEAM & LOGISTICS
app.get('/xxapi/teaminfo', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) {
    return res.json({ code: 403, msg: 'Unauthorized' });
  }
  const teamWorkId = user.phone;
  
  // Dynamically generate a unique 6-digit numeric invite code derived from user's phone number to make it real and fully functional
  const inviteCode = user.phone ? user.phone.slice(-6) : '123456';

  // Construct dynamic real invitation URL based on the active hosting domain (Netlify/Vercel/Local)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const rsUrl = `${protocol}://${host}/#/register?code=`;

  return res.json({
    code: 0,
    msg: "success",
    data: {
      teaminfo: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0,
        teamWorkId: teamWorkId,
        count: 0
      },
      today: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0
      },
      yesterday: {
        recharge: 0,
        dividend: 0,
        reward: 0,
        bonus: 0
      },
      inviteCode: inviteCode,
      rsUrl: rsUrl,
      teamSize: 0,
      totalRecharge: 0,
      totalWithdraw: 0,
      todayActiveCount: 0,
      yesterdayActiveCount: 0,
      commissionRate: "1.2%",
      level1Count: 0,
      level2Count: 0,
      level3Count: 0
    }
  });
});

app.get('/xxapi/teaminfothree/:param', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

app.get('/xxapi/myTeam', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

app.get('/xxapi/quotaLog', async (req, res) => {
  return res.json({ code: 0, msg: 'success', data: [] });
});

// 13. NEWS & OTHER HELPERS
app.get('/xxapi/news/code/:code', (req, res) => {
  return res.json({
    code: 0,
    msg: "success",
    data: {
      id: 32,
      cover: "",
      name: "securityupdate",
      code: req.params.code,
      type: 1,
      content: "All services running securely. Local fast trading enabled.",
      crtDate: 1779259339,
      crtUser: "Admin",
      sort: 4
    }
  });
});

app.get('/xxapi/bguide/guides', (req, res) => {
  const defaultGuides = [
    { id: 1, name: 'Bind Telegram Username', activityCode: 'newbie_Bind_Tgid', title: 'Bind Telegram Username', reward: 50, status: 'done' },
    { id: 2, name: 'Contact Customer Service', activityCode: 'newbie_tg_customer', title: 'Contact Customer Service', reward: 50, status: 'done' },
    { id: 3, name: 'Watch Video Tutorial', activityCode: 'newbie_watch_video', title: 'Watch Video Tutorial', reward: 50, status: 'done' },
    { id: 4, name: 'Join Telegram Channel', activityCode: 'newbie_tg_channel', title: 'Join Telegram Channel', reward: 50, status: 'done' },
    { id: 5, name: 'Pin Channel', activityCode: 'newbie_pin', title: 'Pin Channel', reward: 50, status: 'done' },
    { id: 6, name: 'Bind UPI/Bank Account', activityCode: 'newbie_newct', title: 'Bind UPI/Bank Account', reward: 100, status: 'done' },
    { id: 7, name: 'First Buy iToken', activityCode: 'newbie_buyitoken', title: 'First Buy iToken', reward: 200, status: 'done' },
    { id: 8, name: 'Invite Friends', activityCode: 'newbie_invite', title: 'Invite Friends', reward: 150, status: 'done' }
  ];

  return res.json({
    code: 0,
    msg: 'success',
    data: {
      reward: "200",
      can_reward: false,
      guides: defaultGuides,
      tgGroup: "https://t.me/xxxx",
      newbieReward: 200,
      buyToken: "0",
      activityRecord: {
        done: 0,
        condition: 0,
        settleAmt: 0,
        params: JSON.stringify({
          newbie_Bind_Tgid: 1,
          newbie_tg_customer: 1,
          newbie_watch_video: 1,
          newbie_tg_channel: 1,
          newbie_pin: 1,
          newbie_newct: 1,
          newbie_buyitoken: 1,
          newbie_invite: 1
        })
      },
      allDone: false,
      activityRules: defaultGuides
    }
  });
});

app.get('/xxapi/todayProfit', (req, res) => {
  return res.json({ code: 0, msg: 'success', data: { todayProfit: 0 } });
});

app.get('/xxapi/unread_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));
app.get('/xxapi/all_list', (req, res) => res.json({ code: 0, msg: "success", data: [] }));


// Route for favicon.ico to serve a high-quality PNG instead of an .ico file, preventing Canvas drawing errors
app.get('/favicon.ico', (req, res) => {
  return res.sendFile(path.join(currentDirname, 'static', 'images', 'logo.png'));
});

// Dynamic fallback handler for missing static icon or image assets to prevent image load errors
app.get(['/static/icon/:filename', '/static/images/:filename', '/assets/:filename'], (req, res) => {
  const filename = req.params.filename;
  const rootDir = process.cwd();
  
  // Try to find the file in physical directories, prioritizing the requested directory
  const pathsToTry = [];
  if (req.path.startsWith('/static/icon/')) {
    pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
    pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
  } else if (req.path.startsWith('/static/images/')) {
    pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
    pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
    pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
  } else if (req.path.startsWith('/assets/')) {
    pathsToTry.push(path.join(rootDir, 'assets', filename));
    pathsToTry.push(path.join(currentDirname, 'assets', filename));
  }
  
  // General fallback paths
  pathsToTry.push(path.join(rootDir, 'static', 'images', filename));
  pathsToTry.push(path.join(currentDirname, 'static', 'images', filename));
  pathsToTry.push(path.join(rootDir, 'static', 'icon', filename));
  pathsToTry.push(path.join(currentDirname, 'static', 'icon', filename));
  pathsToTry.push(path.join(rootDir, 'assets', filename));
  pathsToTry.push(path.join(currentDirname, 'assets', filename));
  pathsToTry.push(path.join(rootDir, filename));
  pathsToTry.push(path.join(currentDirname, filename));
  
  let foundPath = null;
  for (const p of pathsToTry) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }
  
  if (foundPath) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(foundPath);
  }
  
  // If not found physically, return a safe placeholder for images to avoid HTML 404 falling back to index.html
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.svg', '.gif'].includes(ext)) {
    const nameWithoutExt = path.basename(filename, ext);
    const cleanName = nameWithoutExt.toUpperCase();
    
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    const colors = ['#198cff', '#00b900', '#f0b90b', '#ff4d4f', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];
    const bg = colors[sum % colors.length];
    
    let label = cleanName;
    if (label.length > 4) {
      label = label.substring(0, 3);
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect width="100" height="100" rx="20" fill="${bg}"/>
        <text x="50" y="55" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </svg>
    `.trim();
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }
  
  return res.status(404).end();
});

// Admin Authentication Middleware
async function requireAdmin(req, res, next) {
  try {
    const user = await getUserByToken(req);
    if (!user || user.phone !== '7870873927') {
      return res.status(403).json({ code: 403, msg: 'Access denied. Admin only.' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requireAdmin error:', err);
    return res.status(500).json({ code: 500, msg: 'Internal server error' });
  }
}

// 1. Serves the file admin.html directly
app.get('/admin', (req, res) => {
  res.sendFile(path.join(currentDirname, 'admin.html'));
});

// 2. Admin Stats
app.get('/xxapi/admin/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalBalance: { $sum: "$balance" },
          totalRecharge: { $sum: "$recharge" }
        }
      }
    ]);
    
    const totalBalance = stats[0] ? stats[0].totalBalance : 0;
    const totalRecharge = stats[0] ? stats[0].totalRecharge : 0;
    
    const kycVerified = await User.countDocuments({ kycStatus: 1 });
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRegistrations = await User.countDocuments({ createdAt: { $gte: todayStart } });
    
    return res.json({
      code: 0,
      msg: 'success',
      data: {
        totalUsers,
        totalBalance,
        totalRecharge,
        kycVerified,
        todayRegistrations
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 3. Admin Users List with Search
app.get('/xxapi/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search && String(search).trim() !== '') {
      const trimmed = String(search).trim();
      if (mongoose.Types.ObjectId.isValid(trimmed)) {
        filter = { _id: trimmed };
      } else {
        filter = { 
          $or: [
            { phone: new RegExp(trimmed, 'i') }, 
            { mobileNo: new RegExp(trimmed, 'i') }
          ] 
        };
      }
    }
    
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(50);
    
    // Enrich users with IP, device info from logs
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const latestLog = await GeneralLog.findOne({
        $or: [
          { "body.phone": user.phone },
          { "body.phone": user.mobileNo },
          { "headers.token": user.token },
          { "headers.indiatoken": user.token }
        ]
      }).sort({ timestamp: -1 });
      
      return {
        _id: user._id,
        phone: user.phone || user.mobileNo || 'N/A',
        balance: user.balance || 0,
        recharge: user.recharge || 0,
        vipLevel: user.vipLevel || 1,
        kycStatus: user.kycStatus || 0,
        realName: user.realName || user.fullName || '',
        upiDetails: user.upiDetails || [],
        net: user.net || 'WiFi/Cellular',
        ip: latestLog ? latestLog.ip : 'N/A',
        deviceType: latestLog && latestLog.headers ? latestLog.headers['user-agent'] : 'N/A',
        createdAt: user.createdAt
      };
    }));
    
    return res.json({
      code: 0,
      msg: 'success',
      data: enrichedUsers
    });
  } catch (err) {
    console.error('Admin users error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// 4. Admin Update User Balance
app.post('/xxapi/admin/updateBalance', requireAdmin, async (req, res) => {
  try {
    const { userId, phone, amount, type } = req.body; // type: 'add' | 'subtract' | 'set'
    let filter = {};
    if (userId) filter._id = userId;
    else if (phone) filter = { $or: [{ phone }, { mobileNo: phone }] };
    else {
      return res.json({ code: 400, msg: 'User ID or Phone is required' });
    }
    
    const user = await User.findOne(filter);
    if (!user) {
      return res.json({ code: 404, msg: 'User not found' });
    }
    
    const val = parseFloat(amount);
    if (isNaN(val)) {
      return res.json({ code: 400, msg: 'Invalid amount' });
    }
    
    if (type === 'add') {
      user.balance = (user.balance || 0) + val;
    } else if (type === 'subtract') {
      user.balance = (user.balance || 0) - val;
    } else if (type === 'set') {
      user.balance = val;
    } else {
      return res.json({ code: 400, msg: 'Invalid operation type' });
    }
    
    await user.save();
    return res.json({ code: 0, msg: 'Balance updated successfully', balance: user.balance });
  } catch (err) {
    console.error('Update balance error:', err);
    return res.json({ code: 500, msg: 'Internal server error' });
  }
});

// Generic fallback for any other unhandled xxapi requests
app.all('/xxapi/*', async (req, res) => {
  console.log(`[Local API Fallback] ${req.method} called on ${req.originalUrl}`, req.body);
  return res.json({
    code: 0,
    msg: 'success',
    data: {}
  });
});

// Serve static assets from the current directory
app.use(express.static(currentDirname));

// For SPA routing fallback to index.html
app.get('*', (req, res) => {
  const urlPath = req.path.toLowerCase();
  
  // If it's an image request or a static file request that wasn't handled, do not serve index.html
  const isImage = /\.(png|jpg|jpeg|gif|svg|ico)$/i.test(urlPath);
  const isStaticAsset = urlPath.includes('/static/') || urlPath.includes('/assets/') || /\.(css|js|woff|woff2|ttf|json)$/i.test(urlPath);
  
  if (isImage) {
    const filename = path.basename(req.path);
    const ext = path.extname(filename).toLowerCase() || '.png';
    const nameWithoutExt = path.basename(filename, ext) || 'IMG';
    const cleanName = nameWithoutExt.toUpperCase();
    
    let sum = 0;
    for (let i = 0; i < cleanName.length; i++) {
      sum += cleanName.charCodeAt(i);
    }
    const colors = ['#198cff', '#00b900', '#f0b90b', '#ff4d4f', '#722ed1', '#eb2f96', '#13c2c2', '#fa8c16'];
    const bg = colors[sum % colors.length];
    
    let label = cleanName;
    if (label.length > 4) {
      label = label.substring(0, 3);
    }
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect width="100" height="100" rx="20" fill="${bg}"/>
        <text x="50" y="55" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
      </svg>
    `.trim();
    
    res.setHeader('Content-Type', 'image/svg+xml');
    return res.send(svg);
  }
  
  if (isStaticAsset) {
    return res.status(404).send('Not Found');
  }
  
  res.sendFile(path.join(currentDirname, 'index.html'));
});

if (process.env.NODE_ENV !== 'production' || (!process.env.VERCEL && !process.env.NETLIFY && !process.env.LAMBDA)) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

// Keep Zoopay collection tools enabled by calling updateState every 10 seconds
setInterval(async () => {
  try {
    const users = await User.find({ 'collectionTools.zoopayToolId': { $exists: true } });
    for (const user of users) {
      if (!user.collectionTools) continue;
      for (const tool of user.collectionTools) {
        if (tool && tool.zoopayToolId) {
          try {
            console.log(`[Zoopay KeepAlive] Updating state for tool ${tool.zoopayToolId} of user ${user.phone}`);
            await fetchZoopay(user, 'https://api.zoopay.vip/api/collection/tools/updateState', {
              method: 'POST',
              body: JSON.stringify({
                id: tool.zoopayToolId,
                state: 'enabled'
              })
            });
          } catch (err) {
            console.error(`[Zoopay KeepAlive] Error updating tool ${tool.zoopayToolId}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Zoopay KeepAlive] Error in keepalive interval:', err);
  }
}, 10000); // 10 seconds

export default app;
