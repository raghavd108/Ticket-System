require("dotenv").config();
const app = require("./src/app");

const connectDb = require("./src/db/db");

connectDb();

app.listen(3000, () => {
  console.log("server is running on the port 3000");
});
