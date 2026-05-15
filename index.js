require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoute = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/upload', uploadRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Dateline is running' });
});

app.listen(PORT, () => {
  console.log(`Dateline running on port ${PORT}`);
});