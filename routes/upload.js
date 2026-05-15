const express = require('express');
const router = express.Router();
const multer = require('../middleware/multerConfig');
const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const extractMetadata = require('../middleware/extractMetadata');

async function extractWithClaude(text) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are processing a page from Lancaster Farming newspaper. Extract the following from the text and return ONLY a raw JSON object. Do not use markdown. Do not use backticks. Do not include any explanation. Return only the JSON object itself:
          {
            "date": "YYYYMMDD",
            "sectionLetter": "A",
            "pageNumber": "001",
            "sectionName": "MAIN"
          }
          
          Section name mapping: A=MAIN, B=NEWS, C=CLASSIFIEDS, D=GROWER
          
          If you cannot determine a value, use "UNKNOWN".
          
          Text to process:
          ${text}`
        }
      ]
    })
  });

  const data = await response.json();
  console.log('Claude response:', JSON.stringify(data, null, 2));
  const content = data.content[0].text;
  const parsed = JSON.parse(content);

  const filename = `LF_${parsed.date}_${parsed.sectionName}_${parsed.sectionLetter}_${parsed.pageNumber}.PDF`;
  return { ...parsed, filename };
}

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

    let metadata = extractMetadata(text);
    let source = 'regex';

    if (!metadata) {
      metadata = await extractWithClaude(text);
      source = 'claude';
    }

    res.json({ ...metadata, source });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;