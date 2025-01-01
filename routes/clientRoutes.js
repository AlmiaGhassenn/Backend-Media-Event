// Client Routes.js

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Folder = require('../models/Folder');
const File = require('../models/File');
const path = require('path');
const router = express.Router();
const fs = require('fs');
const mongoose = require('mongoose');
const AdmZip = require('adm-zip');

// Get Shared Folders for Client
router.get('/folders', protect, async (req, res) => {
  try {
    // Fetch folders where the client is in the 'sharedWith' array
    const folders = await Folder.find({ sharedWith: req.user._id })
      .populate('files'); // Populating files associated with the folders

    if (folders.length === 0) {
      return res.status(404).json({ message: 'No folders found for the client' });
    }

    res.json(folders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching folders' });
  }
});


// Download File
router.get('/files/:fileId', protect, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    const filePath = path.join(__dirname, '..', 'uploads', path.basename(file.url));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on the server' });
    }

    console.log('Serving file:', filePath);

    // Set the proper Content-Disposition with the actual file name from the database
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Send file
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error while serving file:', err.message);
    res.status(500).json({ message: 'Server error while downloading file' });
  }
});

// Route to preview a file
router.get('/files/preview/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Validate the fileId to check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).send("Invalid file ID");
    }

    // Fetch the file from the database
    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).send("File not found");
    }

    // Check if the file URL exists
    if (!file.url) {
      return res.status(400).send("File URL not found");
    }

    // Redirect to the file URL or send the file as a response
    res.redirect(file.url); // or use file.url directly if serving from a different location

  } catch (error) {
    console.error("Error fetching file preview:", error);
    res.status(500).send("Internal server error");
  }
});


// Download all files in a folder
router.get('/files/folder/:folderId', protect, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId).populate('files');
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    // Array to store all file paths
    const filePaths = folder.files.map(file => path.join(__dirname, '..', 'uploads', path.basename(file.url)));

    // Check if files exist
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'One or more files not found on the server' });
      }
    }

    // Create a ZIP archive with the files
    const zip = new AdmZip();
    filePaths.forEach(filePath => {
      zip.addLocalFile(filePath);
    });

    const zipBuffer = zip.toBuffer();
    
    // Set headers for the ZIP download, using the folder's name
    res.setHeader('Content-Disposition', `attachment; filename="${folder.name}_files.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    // Send the ZIP file buffer
    res.send(zipBuffer);
  } catch (err) {
    console.error('Error while serving files:', err.message);
    res.status(500).json({ message: 'Server error while downloading files' });
  }
});






module.exports = router;
