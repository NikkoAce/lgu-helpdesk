const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to use Cloudinary for storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'lgu-helpdesk-attachments', // A folder name in your Cloudinary account
        allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
        // You can add transformations or other parameters here if needed
    },
});

const upload = multer({ storage: storage });

module.exports = upload;
