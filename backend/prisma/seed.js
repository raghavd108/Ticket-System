const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  // Find the existing SP Infocom organisation
  const organisation = await prisma.organisation.findFirst({
    where: {
      name: "spinfocom",
    },
  });

  if (!organisation) {
    throw new Error(
      'Organisation "spinfocom" does not exist. Create it first.',
    );
  }

  // Create or find the SP Infocom admin using unique userName
  const admin = await prisma.user.upsert({
    where: {
      userName: "spinfocom-admin",
    },
    update: {
      organisationId: organisation.id,
    },
    create: {
      userName: "spinfocom-admin",
      email: "admin@example.com",
      password: await bcrypt.hash("Admin@123", 10),
      role: "admin",
      designation: "Administrator",
      organisationId: organisation.id,
    },
  });

  console.log("SP Infocom admin seeded successfully:", admin.userName);
  console.log("Organisation:", organisation.name);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
