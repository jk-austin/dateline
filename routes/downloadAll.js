const express = require('express');
const router = express.Router();
const { ZipArchive } = require('archiver');

router.post('/', async (req, res) => {
  const { files } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="dateline-export.zip"');

  const archive = new ZipArchive({ zlib: { level: 9 } });
  archive.pipe(res);

  files.forEach(({ filename, data }) => {
    const buffer = Buffer.from(data, 'base64');
    archive.append(buffer, { name: filename });
  });

  await archive.finalize();
});

module.exports = router;