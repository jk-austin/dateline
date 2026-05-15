const express = require('express');
const router = express.Router();
const extractMetadata = require('../middleware/extractMetadata');

router.post('/', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const metadata = extractMetadata(text);

  if (!metadata) {
    return res.status(422).json({ error: 'Could not extract metadata from text' });
  }

  res.json(metadata);
});

module.exports = router;