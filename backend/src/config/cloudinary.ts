import { v2 as cloudinary } from 'cloudinary';

const CLOUDINARY_URL = process.env.CLOUDINARY_URL;

if (CLOUDINARY_URL) {
  cloudinary.config({
    secure: true,
  });
}

export async function uploadProfileImage(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'tanzmatch/profiles',
        public_id: `${userId}-${Date.now()}-${fileName.replace(/\.[^.]+$/, '')}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed'));
          return;
        }

        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });
}
