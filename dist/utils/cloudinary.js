import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
// Validate Cloudinary config
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️  Cloudinary credentials not found in environment variables. Using default values.');
}
cloudinary.config({
    cloud_name: cloudName || 'dycxmy3tq',
    api_key: apiKey || '728763913524778',
    api_secret: apiSecret || 'S6hvz7VYYQ81LFkctZacoWXer7E'
});
export const uploadToCloudinary = async (file, folder = 'location-management') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: folder,
            resource_type: 'image'
        }, (error, result) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(result?.secure_url || '');
            }
        });
        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
    });
};
export const deleteFromCloudinary = async (url) => {
    try {
        // Extract public ID from Cloudinary URL
        // URL format: https://res.cloudinary.com/{cloud_name}/image/upload/{folder}/{public_id}.{ext}
        const urlParts = url.split('/');
        const uploadIndex = urlParts.findIndex(part => part === 'upload');
        if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
            // Get everything after 'upload' and before the file extension
            const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
            const publicId = pathAfterUpload.split('.')[0];
            await cloudinary.uploader.destroy(publicId);
        }
        else {
            // Fallback to old method
            const publicId = url.split('/').slice(-2).join('/').split('.')[0];
            await cloudinary.uploader.destroy(`location-management/${publicId}`);
        }
    }
    catch (error) {
        console.error('Error deleting from Cloudinary:', error);
    }
};
//# sourceMappingURL=cloudinary.js.map