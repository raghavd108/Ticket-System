const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find the existing SP Infocom organisation
    let organisation = await tx.organisation.findFirst({
      where: {
        name: {
          equals: "SP Infocom",
        },
      },
    });

    // 2. Check for an existing organisation with different capitalization
    if (!organisation) {
      organisation = await tx.organisation.findFirst({
        where: {
          name: {
            equals: "sp Infocom",
          },
        },
      });
    }

    // 3. Create the organisation if it doesn't exist
    if (!organisation) {
      organisation = await tx.organisation.create({
        data: {
          name: "SP Infocom",
          orgType: "company",
        },
      });
    } else {
      // Update the existing organisation details
      organisation = await tx.organisation.update({
        where: {
          id: organisation.id,
        },
        data: {
          name: "SP Infocom",
          orgType: "company",
        },
      });
    }

    // 4. Hash the admin password
    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // 5. Create or update the SP Infocom admin
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

    // 6. Link the admin as the organisation creator
    await tx.organisation.update({
      where: {
        id: organisation.id,
      },
      data: {
        createdBy: admin.id,
      },
    });

    return {
      admin,
      organisation,
    };
  });

  // 7. Display the result
  console.log("Seeding completed successfully!");
  console.log("--------------------------------");
  console.log("Organisation:", result.organisation.name);
  console.log("Organisation ID:", result.organisation.id);
  console.log("Admin username:", result.admin.userName);
  console.log("Admin email:", result.admin.email);
  console.log("Admin role:", result.admin.role);
  console.log("--------------------------------");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
