const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create the SP Infocom organisation
    let organisation = await tx.organisation.findFirst({
      where: {
        name: "sp Infocom",
      },
    });

    if (!organisation) {
      organisation = await tx.organisation.create({
        data: {
          name: "sp Infocom",
          orgType: "company",
        },
      });
    } else {
      // Update existing organisation details
      organisation = await tx.organisation.update({
        where: {
          id: organisation.id,
        },
        data: {
          orgType: "company",
        },
      });
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // 3. Create or update the SP Infocom admin
    const admin = await tx.user.upsert({
      where: {
        userName: "spinfocom",
      },
      update: {
        email: "support@spinfocom.com",
        password: hashedPassword,
        role: "admin",
        designation: "Administrator",
        organisationId: organisation.id,
      },
      create: {
        userName: "spinfocom",
        email: "support@spinfocom.com",
        password: hashedPassword,
        role: "admin",
        designation: "Administrator",
        organisationId: organisation.id,
      },
    });

    // 4. Link the admin as the organisation creator
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
