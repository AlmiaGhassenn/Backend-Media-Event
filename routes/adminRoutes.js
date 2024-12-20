const express = require('express');
const multer = require('multer');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage });

// Create Folder
router.post('/folders', protect, admin, async (req, res) => {
  const { name, sharedWith, permission } = req.body;

  const folder = await Folder.create({
    name,
    createdBy: req.user._id,
    sharedWith,
    permission,
  });

  res.status(201).json(folder);
});

// Upload File
router.post('/files/:folderId', protect, admin, upload.single('file'), async (req, res) => {
  const folder = await Folder.findById(req.params.folderId);
  if (!folder) return res.status(404).json({ message: 'Folder not found' });

  const file = await File.create({
    name: req.file.originalname,
    url: `/uploads/${req.file.filename}`,
    folder: folder._id,
  });

  folder.files.push(file._id);
  await folder.save();

  res.status(201).json(file);
});

// Update Permissions
router.patch('/folders/:id', protect, admin, async (req, res) => {
  const { permission, sharedWith } = req.body;
  const folder = await Folder.findById(req.params.id);

  if (!folder) return res.status(404).json({ message: 'Folder not found' });

  folder.permission = permission;
  folder.sharedWith = sharedWith;
  await folder.save();

  res.json(folder);
});

module.exports = router;
