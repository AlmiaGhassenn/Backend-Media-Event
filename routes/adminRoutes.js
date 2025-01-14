const express = require('express');
const multer = require('multer');
const Folder = require('../models/Folder');
const File = require('../models/File');
const { protect, admin } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Ensure the path is correct
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

// Upload Multiple Files
router.post('/files/:folderId', protect, admin, upload.array('files', 10), async (req, res) => {
  const folder = await Folder.findById(req.params.folderId);
  if (!folder) return res.status(404).json({ message: 'Folder not found' });

  const uploadedFiles = [];

  for (const file of req.files) {
    const createdFile = await File.create({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      folder: folder._id,
    });
    folder.files.push(createdFile._id);
    uploadedFiles.push(createdFile);
  }

  await folder.save();

  res.status(201).json(uploadedFiles);
});

// Update Folder Permissions (sharedWith and permission)
router.patch('/folders/:id', protect, admin, async (req, res) => {
  const { sharedWith, permission } = req.body;
  const folderId = req.params.id;

  try {
    const folder = await Folder.findById(folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Update permissions and sharedWith fields
    folder.sharedWith = sharedWith || folder.sharedWith; // Only update if provided
    folder.permission = permission || folder.permission; // Only update if provided

    await folder.save();

    res.status(200).json({
      message: 'Folder permissions updated successfully',
      folder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating folder permissions' });
  }
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

// Get All Folders
router.get('/folders', protect, admin, async (req, res) => {
  try {
    // Fetch folders with populated user data (createdBy and sharedWith fields)
    const folders = await Folder.find()
      .populate('createdBy', 'name email') // Populating createdBy with name and email
      .populate('sharedWith', 'name email') // Populating sharedWith with name and email
      .populate('files', 'name url'); // Populating files related to the folder

    res.status(200).json(folders);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching folders' });
  }
});

// Get all users (for sharing folders)
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find(); // You can add filters if needed
    res.json(users); // Send the list of users
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Delete Folder
router.delete('/folders/:folderId', protect, admin, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Optionally, delete the files associated with the folder
    await File.deleteMany({ folder: folder._id });

    // Delete the folder itself
    await Folder.findByIdAndDelete(req.params.folderId);

    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting folder' });
  }
});

// Delete File from Folder
router.delete('/files/:folderId/:fileId', protect, admin, async (req, res) => {
  try {
    const { folderId, fileId } = req.params;

    // Find the folder
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    // Find the file inside the folder
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Remove the file from the folder's files array
    folder.files = folder.files.filter((fileId) => fileId.toString() !== fileId);
    await folder.save();

    // Delete the file from the File collection
    await File.findByIdAndDelete(fileId);

    // Optionally, you can delete the physical file from the server (ensure it exists)
    const fs = require('fs');
    const filePath = `uploads/${file.filename}`;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Delete the file from the server
    }

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting file' });
  }
});

// Delete User
router.delete('/users/:userId', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});


module.exports = router;
