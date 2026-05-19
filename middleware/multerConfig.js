const multer = require('multer');

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('PDFs only'), false);
  }
};

module.exports = multer({ storage: multer.memoryStorage(), fileFilter });