const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Setup Socket.io for Real-Time Chat & WebRTC
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// PostgreSQL Database Connection Pool
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Secret key for JWT signing
const JWT_SECRET = process.env.JWT_SECRET || 'nepalmatch_super_secret_key';

// Middleware to protect routes via Token Verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// 1. Health Check Route
app.get('/', (req, res) => {
  res.send('NepalMatch Backend API Server is Live & Running!');
});

// 2. User Register API
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, gender, age, origin_country, current_city, qualification, occupation, bio } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password, gender, age, origin_country, current_city, qualification, occupation, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, email`,
      [name, email, hashedPassword, gender, age, origin_country, current_city, qualification, occupation, bio]
    );

    const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'User registered successfully', token, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed or email already exists.' });
  }
});

// 3. User Login API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    delete user.password;
    res.json({ message: 'Login successful', token, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 4. Send Match Request API
app.post('/api/requests/send', authenticateToken, async (req, res) => {
  const { receiverId } = req.body;
  try {
    await db.query(
      'INSERT INTO match_requests (sender_id, receiver_id, status) VALUES ($1, $2, $3)',
      [req.user.userId, receiverId, 'pending']
    );
    res.json({ message: 'Match request sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// 5. Accept Match Request API
app.post('/api/requests/accept', authenticateToken, async (req, res) => {
  const { requestId } = req.body;
  try {
    await db.query('UPDATE match_requests SET status = $1 WHERE id = $2', ['accepted', requestId]);
    res.json({ message: 'Match request accepted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// 6. Privacy Settings Update API
app.put('/api/settings/privacy', authenticateToken, async (req, res) => {
  const { isPrivate } = req.body;
  try {
    await db.query('UPDATE users SET is_private = $1 WHERE id = $2', [isPrivate, req.user.userId]);
    res.json({ message: 'Privacy settings updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 7. Report/Block User API
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

// 8. Fetch/Download All Users API (For App Frontend)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, gender, age, origin_country, current_city, qualification, occupation, profile_picture, bio FROM users WHERE id != $1',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

// Socket.io Signaling Handlers for WebRTC & Chat
io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  socket.on('webrtc-offer', (data) => {
    socket.to(data.roomId).emit('webrtc-offer', data);
  });

  socket.on('webrtc-answer', (data) => {
    socket.to(data.roomId).emit('webrtc-answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Bind and listen to specified Port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running with Security & WebRTC on port ${PORT}`);
});