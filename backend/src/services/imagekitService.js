const ImageKit = require("@imagekit/nodejs").default;
const crypto = require("crypto");

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const uploadImage = async (buffer) => {
  const fileName = `${crypto.randomUUID()}.jpg`;

  const result = await imagekit.files.upload({
    file: buffer.toString("base64"),
    fileName,
  });

  return {
    fileName: result.name,
    fileId: result.fileId,
  };
};

module.exports = { uploadImage };
