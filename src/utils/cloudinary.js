import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Create a method for uploading files on cloudinary.
// On successful upload, unlink the file locally.
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return new Error("File not found!");
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    console.log(
      "file uploaded successfully on cloudinary",
      "Full Response OBJ:",
      response,
      "Cloudinary URL",
      response.url
    );
    return response;
  } catch (error) {
    // remove the locally saved file as the upload operation failed.
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
