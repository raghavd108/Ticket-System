require("dotenv").config();

const app = require("./src/app");
const prisma = require("./src/config/prisma");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "127.0.0.1";

async function startServer() {
  try {
    await prisma.$connect();
    console.log("MySQL connected successfully through Prisma");

    const server = app.listen(PORT, HOST, () => {
      console.log(`Server is running on http://${HOST}:${PORT}`);
    });

    server.on("error", async (error) => {
      console.error("HTTP server error:", error);
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    });

    const shutdown = async () => {
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

startServer();
