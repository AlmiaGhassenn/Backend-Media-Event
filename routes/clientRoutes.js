const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Folder = require('../models/Folder');
const File = require('../models/File');
const path = require('path');
const router = express.Router();

// Get Shared Folders
router.get('/folders', protect, async (req, res) => {
  const folders = await Folder.find({ sharedWith: req.user._id }).populate('files');
  res.json(folders);
});

// Download File
router.get('/files/:fileId', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Construct the absolute path
    const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.url));

    // Check if the file exists
    if (!require('fs').existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on the server' });
    }

    // Download the file
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
