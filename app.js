const express = require('express');
const axios = require('axios');
const { remini } = require('betabotz-tools');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utility function to validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Utility function to get file size
async function getFileSize(url) {
  try {
    const response = await axios.head(url, {
      timeout: 5000, // 5 seconds timeout
      maxRedirects: 3 // Follow up to 3 redirects
    });
    
    const sizeInBytes = parseInt(response.headers['content-length'] || '0', 10);
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);
    return `${sizeInKB} KB`;
  } catch (error) {
    console.error('Error getting file size:', error.message);
    return 'Unknown';
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Remini Enhancement API is running',
    timestamp: new Date().toISOString()
  });
});

// Shared enhancement logic
async function enhanceImage(url) {
  // Validate URL input
  if (!url) {
    throw new Error('URL is required');
  }

  // Check URL validity
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL format');
  }

  // Call Remini enhancement
  let enhancedImageUrl;
  try {
    enhancedImageUrl = await remini(url);
  } catch (reminiError) {
    console.error('Remini Enhancement Specific Error:', reminiError);
    throw new Error('Failed to enhance the image');
  }

  // Validate enhanced image URL
  if (!enhancedImageUrl || !isValidUrl(enhancedImageUrl)) {
    throw new Error('Enhanced image URL is invalid');
  }

  // Get image size
  const image_size = await getFileSize(enhancedImageUrl);

  return {
    image_data: enhancedImageUrl,
    image_size: image_size
  };
}

// POST endpoint for image enhancement
app.post('/enhance-image', async (req, res) => {
  try {
    const { url } = req.body;
    const result = await enhanceImage(url);
    res.json(result);
  } catch (error) {
    console.error('Enhancement Error:', error);
    res.status(400).json({ 
      error: 'ENHANCEMENT_FAILED',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// GET endpoint for image enhancement
app.get('/enhance-image', async (req, res) => {
  try {
    const { url } = req.query;
    const result = await enhanceImage(url);
    res.json(result);
  } catch (error) {
    console.error('Enhancement Error:', error);
    res.status(400).json({ 
      error: 'ENHANCEMENT_FAILED',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected server error occurred'
  });
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Remini Enhancement API running on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
