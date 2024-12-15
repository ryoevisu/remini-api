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

// Remini Image Enhancement API Endpoint
app.post('/enhance-image', async (req, res) => {
  try {
    // Extract URL from request body
    const { url } = req.body;

    // Validate URL input
    if (!url) {
      return res.status(400).json({ 
        error: 'URL_REQUIRED',
        message: 'Please provide an image URL in the request body'
      });
    }

    // Check URL validity
    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: 'INVALID_URL',
        message: 'The provided URL is not valid'
      });
    }

    // Call Remini enhancement with error handling
    let enhancedImageUrl;
    try {
      enhancedImageUrl = await remini(url);
    } catch (reminiError) {
      console.error('Remini Enhancement Specific Error:', reminiError);
      return res.status(500).json({
        error: 'ENHANCEMENT_FAILED',
        message: 'Failed to enhance the image',
        details: reminiError.message || 'Unknown error occurred'
      });
    }

    // Validate enhanced image URL
    if (!enhancedImageUrl || !isValidUrl(enhancedImageUrl)) {
      return res.status(500).json({
        error: 'INVALID_RESULT',
        message: 'Enhanced image URL is invalid'
      });
    }

    // Get image size
    const image_size = await getFileSize(enhancedImageUrl);

    // Respond with enhanced image results
    res.json({
      image_data: enhancedImageUrl,
      image_size: image_size
    });
  } catch (error) {
    console.error('Unexpected Enhancement Error:', error);
    res.status(500).json({ 
      error: 'UNEXPECTED_ERROR',
      message: 'An unexpected error occurred during image enhancement',
      details: error.message || 'Unknown error'
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
