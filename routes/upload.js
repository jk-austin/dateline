const express = require('express');
const router = express.Router();
const multer = require('../middleware/multerConfig');
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

router.post('/', multer.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const dataBuffer = new Uint8Array(fs.readFileSync(req.file.path));
    const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');

    fs.unlinkSync(req.file.path);

    res.json({ text });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;