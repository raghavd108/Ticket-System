const ImageKit = require("@imagekit/nodejs").default;
const crypto = require("crypto");
const path = require("path");

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const uploadFile = async (buffer, originalName) => {
  const extension = path.extname(originalName || "").toLowerCase() || ".jpg";
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

// Keep this function for your existing complaint controller
const uploadImage = async (buffer, originalName = "image.jpg") => {
  return uploadFile(buffer, originalName);
};

module.exports = {
  uploadImage,
  uploadFile,
};
