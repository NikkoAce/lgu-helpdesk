import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer to use Cloudinary for storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (_req: any, _file: any) => {
        return {
            folder: 'lgu-helpdesk-attachments',
            allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
        };
    }
});

const upload = multer({ storage: storage });

export default upload;
