const cloudinary = require("../cloud/index.js");
const crypto = require("crypto");
const role = require("../models/role.js");

// * send Error
exports.sendError = (res, error, statusCode = 401) => {
  res.status(statusCode).json({ error: error || "Internal Server Error" });
};

// * uploading image to cloud
exports.uploadImageToCloud = async (file, userId, userName) => {
  const folderName = `users/${userId}_${userName.replace(/\s+/g, "_")}`;

  const { secure_url: url, public_id } = await cloudinary.uploader.upload(
    file,
    {
      folder: folderName, // Store images in the user's folder
      gravity: "face",
      height: 500,
      width: 500,
      crop: "thumb",
    }
  );
  return { url, public_id };
};

// * uploading file to cloud
exports.uploadFileToCloud = async (file, userId, userName) => {
  // Generate a consistent folder name for the user
  const folderName = `users/${userId}_${userName.replace(/\s+/g, "_")}`;

  try {
    const { secure_url: url, public_id } = await cloudinary.uploader.upload(
      file,
      {
        folder: folderName, // Store files in the same user folder
        resource_type: "auto", // Allows all file types (PDF, images, etc.)
        // timeout: 60000, // Increase timeout to 60 seconds
      }
    );

    return { url, public_id };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("File upload failed!");
  }
};

// * This function deletes an image from Cloudinary using its public ID.
exports.removeImageFromCloud = async publicId => {
  try {
    if (!publicId) return false; // No image provided

    const { result } = await cloudinary.uploader.destroy(publicId);

    return result === "ok"; // Returns `true` if deletion was successful
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    return false;
  }
};

// * This function deletes a file from Cloudinary using its public ID.
exports.removeFileFromCloud = async publicId => {
  try {
    if (!publicId) return false; // No file provided

    const { result } = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto", // Allows all file types (PDF, images, etc.)
    });

    return result === "ok"; // Returns `true` if deletion was successful
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    return false;
  }
};

// * This function deletes a folder from Cloudinary, including all its contents.
exports.removeFolderFromCloud = async (userId, userName) => {
  try {
    const folderName = `users/${userId}_${userName.replace(/\s+/g, "_")}`; // ✅ User-specific folder

    // Step 1: Get all assets within the folder
    const { resources } = await cloudinary.api.resources({
      type: "upload",
      prefix: folderName, // Finds all files within the folder
    });

    if (!resources.length) {
      console.log(`No assets found in folder: ${folderName}`);
      return true; // If no assets, folder doesn't exist—skip deletion
    }

    // Step 2: Delete all files individually before removing the folder
    for (const resource of resources) {
      await cloudinary.uploader.destroy(resource.public_id);
    }

    // Step 3: Delete the folder itself (only if empty)
    await cloudinary.api.delete_folder(folderName);

    return true;
  } catch (error) {
    console.error("Error deleting folder from Cloudinary:", error);
    return false;
  }
};

// generating random byte
exports.generateRandomByte = () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(30, (err, buff) => {
      if (err) reject(err);
      const buffString = buff.toString("hex");

      resolve(buffString);
    });
  });
};

exports.generatePassword = () => {
  const length = 8;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specialChars = "@$!%*?&";
  const allChars = uppercase + lowercase + digits + specialChars;

  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the rest of the password length with random characters
  for (let i = 3; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password characters to ensure randomness
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

// formatting user data to send to client
exports.formatUser = user => {
  const {
    _id,
    firstName,
    lastName,
    fullName,
    email,
    phoneNumber,
    profilePhoto,
    officeAddress,
    roleId,
    state,
  } = user;
  return {
    _id,
    firstName,
    lastName,
    fullName,
    email,
    phoneNumber,
    profilePhoto: profilePhoto?.url,
    officeAddress,
    role: roleId?.name,
    state,
  };
};
