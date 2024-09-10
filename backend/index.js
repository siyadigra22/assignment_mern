const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const bodyParser = require('body-parser');
const { Readable } = require('stream');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

// Import the Submission model
const Submission = require('./models/Submission'); // Update the path if necessary

app.use(cors());

// MongoDB URI and connection setup
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

const conn = mongoose.connection;
conn.on('error', console.error.bind(console, 'MongoDB connection error:'));
conn.once('open', () => {
  console.log('MongoDB connected successfully.');
  bucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('GridFS Bucket initialized.');
});

// Custom storage engine
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint to handle file upload
app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const uploadPromises = req.files.map(file => {
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(file.originalname, {
        contentType: file.mimetype,
      });

      const readStream = Readable.from(file.buffer);

      readStream.pipe(uploadStream);

      uploadStream.on('finish', () => {
        resolve({
          id: uploadStream.id,
          filename: file.originalname,
          size: file.buffer.length
        });
      });

      uploadStream.on('error', reject);
    });
  });

  Promise.all(uploadPromises)
    .then(results => {
      res.status(200).json({ message: 'Files uploaded successfully', files: results });
    })
    .catch(err => {
      console.error('Error uploading files:', err);
      res.status(500).json({ message: 'Error uploading files', error: err.message });
    });
});

// Endpoint to retrieve files
app.get('/api/files/:filename', (req, res) => {
  const downloadStream = bucket.openDownloadStreamByName(req.params.filename);

  downloadStream.on('error', (err) => {
    console.error('Error reading file stream:', err);
    res.status(500).json({ err: 'Error reading file stream' });
  });

  downloadStream.pipe(res);
});

// Endpoint to delete files
app.delete('/api/files/:filename', (req, res) => {
  bucket.find({ filename: req.params.filename }).toArray((err, files) => {
    if (err) {
      console.error('Error finding file to delete:', err);
      return res.status(500).json({ err: 'Error finding file to delete' });
    }
    if (!files || files.length === 0) {
      return res.status(404).json({ err: 'No file exists' });
    }

    bucket.delete(files[0]._id, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        return res.status(500).json({ err: 'Error deleting file' });
      }
      res.status(200).json({ message: 'File deleted successfully' });
    });
  });
});

// Endpoint to handle form submission
app.post('/api/submit', async (req, res) => {
  try {
    // Create a new Submission document
    const newSubmission = new Submission(req.body);

    // Save the form data
    await newSubmission.save();

    res.status(200).json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ message: 'Error submitting form', error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
