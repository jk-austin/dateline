const express = require('express');
const router = express.Router();

// Helper function to extract metadata from the text
function extractMetadata(text) {
  const headerMatch = text.match(
    /Lancaster Farming,\s+\w+,\s+(\w+ \d+,\s+\d{4})\s+-\s+([A-Z])(\d+)/
  );

  if (!headerMatch) {
    return null;
  }

  // Extracted values, place 0 is the full match, so we start from 1
  const rawDate = headerMatch[1];
  const sectionLetter = headerMatch[2];
  const pageNumber = headerMatch[3].padStart(3, '0');

  // Format the date as YYYYMMDD
  const date = new Date(rawDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const formattedDate = `${year}${month}${day}`;

  // Map section letters to section names, need to update based on actual sections
  const sectionNames = {
    A: 'MAIN',
    B: 'FAMILY',
    C: 'BUSINESS',
    D: 'CLASSIFIEDS',
  };

  const sectionName = sectionNames[sectionLetter] || 'UNKNOWN';

  const filename = `LF_${formattedDate}_${sectionName}_${sectionLetter}_${pageNumber}.PDF`;

  return { filename, formattedDate, sectionLetter, sectionName, pageNumber };
}

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