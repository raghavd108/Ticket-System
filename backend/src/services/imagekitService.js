const ImageKit = require("@imagekit/nodejs").default;
const crypto = require("crypto");
const path = require("path");

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXTENSIONS = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
};

// Validate file content, not just the filename or MIME header.
const validateImage = async (buffer, originalName = "image.jpg") => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Invalid or empty image");
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("File must not exceed 5 MB");
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected || !ALLOWED_TYPES.has(detected.mime)) {
    throw new Error("Only JPEG, PNG, WebP, PDF and Word files are allowed");
  }

  // Prevent a misleading extension from being used. Every allowed type
  // needs an entry here, otherwise valid documents (e.g. PDF) are rejected.
  const allowedExtensions = ALLOWED_EXTENSIONS[detected.mime];
  const expectedExtension = allowedExtensions[0];

  const extension = path.extname(originalName).toLowerCase();

  if (extension && !allowedExtensions.includes(extension)) {
    throw new Error("File extension does not match its content");
  }

  return { mime: detected.mime, extension: expectedExtension };
};

const uploadFile = async (buffer, originalName = "image.jpg") => {
  const { extension } = await validateImage(buffer, originalName);

  const fileName = `${crypto.randomUUID()}${extension}`;

  const result = await imagekit.files.upload({
    file: buffer.toString("base64"),
    fileName,
  });

  return {
    fileName: result.name,
    fileId: result.fileId,
  };
};

// Keep this function for the existing complaint controller.
const uploadImage = async (buffer, originalName = "image.jpg") => {
  return uploadFile(buffer, originalName);
};

module.exports = {
  uploadImage,
  uploadFile,
  validateImage,
  MAX_FILE_SIZE,
};
