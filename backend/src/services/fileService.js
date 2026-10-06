const getImageUrl = (fileName) => {
  if (!fileName) return null;

  return `${process.env.IMAGEKIT_BASE_URL}${fileName}`;
};

module.exports = {
  getImageUrl,
};
