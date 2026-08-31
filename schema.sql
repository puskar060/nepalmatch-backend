schema.sql
CREATE DATABASE nepal_match_db;
\c nepal_match_db;
-- 1. Users Table
CREATE TABLE users (
id SERIAL PRIMARY KEY,
name VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
looking_for VARCHAR(10) CHECK (looking_for IN ('Male', 'Female', 'Other')),
age INT CHECK (age >= 18),
origin_country VARCHAR(50) DEFAULT 'Nepal',
current_city VARCHAR(100) NOT NULL, -- e.g., 'Tokyo, Japan'
qualification VARCHAR(100) NOT NULL, -- e.g., 'Bachelor in Computer Science'
occupation VARCHAR(100),
intent VARCHAR(20) CHECK (intent IN ('Dating', 'Marriage', 'Both')),
profile_picture TEXT,
bio TEXT,
allow_direct_calls BOOLEAN DEFAULT FALSE, -- Privacy Setting: Direct calls without match
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 2. Match Requests Table
CREATE TABLE match_requests (
id SERIAL PRIMARY KEY,
sender_id INT REFERENCES users(id) ON DELETE CASCADE,
receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
status VARCHAR(20) CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED')) DEFAULT
'PENDING',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
UNIQUE(sender_id, receiver_id)
);
-- 3. Stories Table (24-hour expiration)
CREATE TABLE stories (
id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(id) ON DELETE CASCADE,
media_url TEXT NOT NULL,
caption TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- 4. Reports & Blocks Table
CREATE TABLE reports_and_blocks (
id SERIAL PRIMARY KEY,
reporter_id INT REFERENCES users(id) ON DELETE CASCADE,
reported_id INT REFERENCES users(id) ON DELETE CASCADE,
type VARCHAR(20) CHECK (type IN ('REPORT', 'BLOCK')),
reason TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);