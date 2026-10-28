const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

const DEFAULT_TICKET_STATUSES = [
  { code: "pending", name: "Pending", sortOrder: 1, isFinal: false },
  { code: "assigned", name: "Assigned", sortOrder: 2, isFinal: false },
  { code: "in-progress", name: "In Progress", sortOrder: 3, isFinal: false },
  {
    code: "work-completed",
    name: "Work Completed",
    sortOrder: 4,
    isFinal: false,
  },
  {
    code: "release-updated",
    name: "Release Updated",
    sortOrder: 5,
    isFinal: true,
  },
  { code: "cancelled", name: "Cancelled", sortOrder: 6, isFinal: true },
];

// Management designations see every ticket and can assign tickets.
// Developers only see tickets assigned to them for their mapped clients.
const DEFAULT_DESIGNATIONS = [
  { name: "Administrator", canViewAllTickets: true, canAssignTickets: true },
  { name: "CEO", canViewAllTickets: true, canAssignTickets: true },
  { name: "CTO", canViewAllTickets: true, canAssignTickets: true },
  { name: "Customer Care", canViewAllTickets: true, canAssignTickets: true },
  {
    name: "Business Development Manager",
    canViewAllTickets: true,
    canAssignTickets: true,
  },
  { name: "Sales Executive", canViewAllTickets: true, canAssignTickets: true },
  { name: "Developer", canViewAllTickets: false, canAssignTickets: false },
];

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // 0. Lookup tables. Existing permission changes made by an admin
    // are not overwritten; only missing rows are created.
    for (const status of DEFAULT_TICKET_STATUSES) {
      await tx.ticketStatus.upsert({
        where: { code: status.code },
        update: {
          name: status.name,
          sortOrder: status.sortOrder,
          isFinal: status.isFinal,
        },
        create: status,
      });
    }

    for (const designation of DEFAULT_DESIGNATIONS) {
      await tx.designation.upsert({
        where: { name: designation.name },
        update: {},
        create: designation,
      });
    }

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
      // Never reset an existing admin's password when re-seeding.
      update: {
        email: "support@spinfocom.com",
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
