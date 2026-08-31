// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Express Server लाई HTTP Server सँग जोड्ने
const server = http.createServer(app);

// Socket.io Setup (CORS अनुमति दिने)
const io = new Server(server, {
  cors: {
    origin: "*", // सबै Front-end बाट Connection स्वीकार गर्न
    methods: ["GET", "POST"]
  }
});

// Real-time Socket Connection Listener
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Client बाट म्यासेज आउँदा सुन्ने (Listen गर्ने)
  socket.on('send_message', (data) => {
    console.log('Message received:', data);
    
    // आएको म्यासेज अरू सबै Connected प्रयोगकर्तालाई पठाउने (Broadcast गर्ने)
    io.emit('receive_message', data);
  });

  // User Disconnect हुँदा
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// app.listen को सट्टा server.listen प्रयोग गर्नुहोस्
server.listen(5000, () => {
  console.log('Server is running on http://localhost:5000');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json()); // JSON डाटा प्राप्त गर्न

// १. Register API Endpoint
app.post('/api/register', (req, res) => {
  const { name, email, password, dob, age, origin, city, qual } = req.body;
  
  // यहाँ SQL Database मा DATA Save गर्ने कोड लेखिन्छ
  console.log("New User Data Received:", req.body);
  
  res.status(201).json({ 
    message: "User registered successfully!", 
    user: { name, email, city, qual } 
  });
});

// २. Login API Endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // यहाँ Database बाट Email/Password Check गरिन्छ
  res.status(200).json({ 
    message: "Login successful!", 
    token: "fake-jwt-token-xyz" 
  });
});
app.listen(5000, () => console.log("Server running on port 5000"));
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.use(express.json({ limit: '50mb' }));
app.use(cors());
const JWT_SECRET = 'facebook_level_super_secure_secret_key_2026';
const db = new Pool({
user: 'postgres',
host: 'localhost',
database: 'nepal_match_db',
password: 'your_db_password',
port: 5432,
});
// Middleware: Authentication & Security Check
const authenticateToken = (req, res, next) => {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[1];
if (!token) return res.status(401).json({ error: 'Access token required.' });
jwt.verify(token, JWT_SECRET, (err, user) => {
if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
req.user = user;
next();
});
};
// 1. User Register API
app.post('/api/auth/register', async (req, res) => {
const { name, email, password, gender, lookingFor, age, originCountry, currentCity, qualification,
occupation, intent, profilePicture, bio } = req.body;
try {
const hashedPassword = await bcrypt.hash(password, 12);
const query = `
INSERT INTO users (name, email, password_hash, gender, looking_for, age, origin_country,
current_city, qualification, occupation, intent, profile_picture, bio)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, name, email;
`;
const values = [name, email, hashedPassword, gender, lookingFor, age, originCountry || 'Nepal',
currentCity, qualification, occupation, intent, profilePicture, bio];
const result = await db.query(query, values);
res.status(201).json({ message: 'Registration Successful', user: result.rows[0] });
} catch (err) {
res.status(500).json({ error: 'Email already exists or invalid data.' });
}
});
// 2. User Login API
app.post('/api/auth/login', async (req, res) => {
const { email, password } = req.body;
try {
const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
if (userRes.rows.length === 0) return res.status(400).json({ error: 'User not found.' });
const user = userRes.rows[0];
const validPassword = await bcrypt.compare(password, user.password_hash);
if (!validPassword) return res.status(400).json({ error: 'Incorrect password.' });
const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
res.json({ message: 'Login Successful', token, user });
} catch (err) {
res.status(500).json({ error: 'Login server error.' });
}
});
// 3. Send Match Request
app.post('/api/requests/send', authenticateToken, async (req, res) => {
const { receiverId } = req.body;
try {
await db.query(
'INSERT INTO match_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
[req.user.userId, receiverId, 'PENDING']
);
res.json({ message: 'Match request sent successfully.' });
} catch (err) {
res.status(500).json({ error: 'Request already sent or error occurred.' });
}
});
// 4. Accept Match Request
app.post('/api/requests/accept', authenticateToken, async (req, res) => {
const { requestId } = req.body;
try {
await db.query('UPDATE match_requests SET status = $1 WHERE id = $2', ['ACCEPTED', requestId]);
res.json({ message: 'Request accepted! You can now chat and video call.' });
} catch (err) {
res.status(500).json({ error: 'Failed to accept request.' });
}
});
// 5. Privacy Settings Update (Allow/Block Direct Calls)
app.put('/api/settings/privacy', authenticateToken, async (req, res) => {
const { allowDirectCalls } = req.body;
try {
await db.query('UPDATE users SET allow_direct_calls = $1 WHERE id = $2', [allowDirectCalls,
req.user.userId]);
res.json({ message: 'Privacy settings updated.' });
} catch (err) {
res.status(500).json({ error: 'Failed to update settings.' });
}
});
// 6. Report/Block User
app.post('/api/user/report-block', authenticateToken, async (req, res) => {
const { reportedId, type, reason } = req.body;
try {
await db.query('INSERT INTO reports_and_blocks (reporter_id, reported_id, type, reason) VALUES (?, ?, ?, ?)', [reporter_id, reported_id, type, reason]);
res.json({ message: `User ${type.toLowerCase()}ed successfully.` });
} catch (err) {
res.status(500).json({ error: 'Action failed.' });
}
});
// WebRTC Socket.io Real-time Video Call Signaling
io.on('connection', (socket) => {
socket.on('join-room', (roomId) => {
socket.join(roomId);
});
socket.on('call-user', ({ userToCall, signalData, from }) => {
io.to(userToCall).emit('incoming-call', { signal: signalData, from });
});
socket.on('answer-call', (data) => {
io.to(data.to).emit('call-accepted', data.signal);
});
socket.on('end-call', ({ to }) => {
io.to(to).emit('call-ended');
});
});
const PORT = 5000;
server.listen(PORT, () => console.log(`Server running with Security & WebRTC on port ${PORT}`));
// Register page photo preview handler
document.getElementById('regImageInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      document.getElementById('regProfilePreview').src = e.target.result;
      document.getElementById('profilePreview').src = e.target.result; // Copies to profile page as well
    };
    reader.readAsDataURL(file);
  }
});