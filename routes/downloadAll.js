const express = require('express');
const router = express.Router();
const { ZipArchive } = require('archiver');

// Route to handle downloading all files as a zip
router.post('/', async (req, res) => {
  const { files } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="dateline-export.zip"');

  // Create a new zip archive
  const archive = new ZipArchive({ zlib: { level: 9 } });

  // Handle archive errors
  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create zip: ' + err.message });
    }
  });

  archive.pipe(res);

  // Add each file to the archive
  try {
    files.forEach(({ filename, data }) => {
      const buffer = Buffer.from(data, 'base64');
      archive.append(buffer, { name: filename });
    });

    // Finalize the archive (this will trigger the download)
    await archive.finalize();
    // Note: We do not call res.end() here because the archive will end the response when it's done
  } catch (err) {
    console.error('Zip error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create zip: ' + err.message });
    }
  }
});

module.exports = router;