require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoute = require('./routes/upload');
const renameRoute = require('./routes/rename');
const downloadAllRoute = require('./routes/downloadAll');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'https://dateline-addh4wnku-jk-austins-projects.vercel.app'
}));
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

app.use('/upload', uploadRoute);
app.use('/rename', renameRoute);
app.use('/download-all', downloadAllRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Dateline is running' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dateline running on port ${PORT}`);
});
