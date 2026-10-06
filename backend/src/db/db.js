const mongoose = require("mongoose");

const connectDb = async () => {
  mongoose.connect(process.env.MONGO_DB);

  console.log("mongoDb Connected");
};

module.exports = connectDb;
