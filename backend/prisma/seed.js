const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create the SP Infocom organisation
    let organisation = await tx.organisation.findFirst({
      where: {
        name: "spinfocom",
      },
    });

    if (!organisation) {
      organisation = await tx.organisation.create({
        data: {
          name: "spinfocom",
          orgType: "company",
        },
      });
    }

    // 2. Create or find the admin and connect the organisation
    const admin = await tx.user.upsert({
      where: {
        userName: "sp Infocom-admin",
      },
      update: {
        organisationId: organisation.id,
      },
      create: {
        userName: "sp Infocom-admin",
        email: "admin@example.com",
        password: await bcrypt.hash("Admin@123", 10),
        role: "admin",
        designation: "Administrator",
        organisationId: organisation.id,
      },
    });

    // 3. Link the admin as the organisation creator
    await tx.organisation.update({
      where: {
        id: organisation.id,
      },
      data: {
        createdBy: admin.id,
      },
    });

    return { admin, organisation };
  });

  console.log("Seeding completed successfully!");
  console.log("Username:", result.admin.userName);
  console.log("Email:", result.admin.email);
  console.log("Role:", result.admin.role);
  console.log("Organisation:", result.organisation.name);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
