const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Environment Variables or Default Setup
const JWT_SECRET = process.env.JWT_SECRET || 'facebook_level_super_secure_secret_key_2026';
const PORT = process.env.PORT || 5000;

// PostgreSQL Database Connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:your_db_password@localhost:5432/nepal_match_db',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Express Server लाई HTTP Server सँग जोड्ने
const server = http.createServer(app);

// Socket.io Setup (CORS अनुमति)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

// ----------------------
// API ENDPOINTS
// ----------------------

// 1. User Register API
app.post('/api/auth/register', async (req, res) => {
  const { 
    name, email, password, gender, lookingFor, age, originCountry, 
    currentCity, qualification, occupation, intent, profilePicture, bio 
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const query = `
      INSERT INTO users (
        name, email, password_hash, gender, looking_for, age, origin_country,
        current_city, qualification, occupation, intent, profile_picture, bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
      RETURNING id, name, email;
    `;
    const values = [
      name, email, hashedPassword, gender, lookingFor, age, originCountry || 'Nepal',
      currentCity, qualification, occupation, intent, profilePicture, bio
    ];
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

// 5. Privacy Settings Update
app.put('/api/settings/privacy', authenticateToken, async (req, res) => {
  const { allowDirectCalls } = req.body;
  try {
    await db.query('UPDATE users SET allow_direct_calls = $1 WHERE id = $2', [allowDirectCalls, req.user.userId]);
    res.json({ message: 'Privacy settings updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// 6. Report/Block User (PostgreSQL Format)
app.post('/api/user/report-block', authenticateToken, async (req, res) => {
  const { reportedId, type, reason } = req.body;
  try {
    await db.query(
      'INSERT INTO reports_and_blocks (reporter_id, reported_id, type, reason) VALUES ($1, $2, $3, $4)', 
      [req.user.userId, reportedId, type, reason]
    );
    res.json({ message: `User ${type.toLowerCase()}ed successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Action failed.' });
  }
});

// ----------------------
// SOCKET.IO REAL-TIME CALL / CHAT
// ----------------------
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('send_message', (data) => {
    io.emit('receive_message', data);
  });

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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ----------------------
// SERVER START
// ----------------------
server.listen(PORT, () => {
  console.log(`Server running with Security & WebRTC on port ${PORT}`);
});