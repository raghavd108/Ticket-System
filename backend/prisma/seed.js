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
  {
    code: "cancelled",
    name: "Cancelled",
    sortOrder: 6,
    isFinal: true,
  },
];

// Higher managementLevel means greater authority.
// SuperAdmin has an effective level of 999999.
//
// Permission rules:
// CEO:
//   canNotifyEmployees = true
//   canPublishOffers = true
//
// CTO:
//   canNotifyEmployees = true
//   canPublishOffers = true
//
// All other default designations:
//   canNotifyEmployees = false
//   canPublishOffers = false
//
// SuperAdmin access is controlled separately through
// User.isSuperAdmin.

const DEFAULT_DESIGNATIONS = [
  {
    name: "Administrator",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: true,
    canPublishOffers: false,
    canNotifyEmployees: false,
    managementLevel: 80,
  },
  {
    name: "CEO",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: true,
    canPublishOffers: true,
    canNotifyEmployees: true,
    managementLevel: 100,
  },
  {
    name: "CTO",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: true,
    canPublishOffers: true,
    canNotifyEmployees: true,
    managementLevel: 90,
  },
  {
    name: "Customer Care",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: false,
    canPublishOffers: false,
    canNotifyEmployees: false,
    managementLevel: 0,
  },
  {
    name: "Business Development Manager",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: false,
    canPublishOffers: false,
    canNotifyEmployees: false,
    managementLevel: 0,
  },
  {
    name: "Sales Executive",
    canViewAllTickets: true,
    canAssignTickets: true,
    canManageUsers: false,
    canPublishOffers: false,
    canNotifyEmployees: false,
    managementLevel: 0,
  },
  {
    name: "Developer",
    canViewAllTickets: false,
    canAssignTickets: false,
    canManageUsers: false,
    canPublishOffers: false,
    canNotifyEmployees: false,
    managementLevel: 0,
  },
];

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    // --------------------------------------------------
    // 1. SEED TICKET STATUSES
    // --------------------------------------------------

    for (const status of DEFAULT_TICKET_STATUSES) {
      await tx.ticketStatus.upsert({
        where: {
          code: status.code,
        },

        update: {
          name: status.name,
          sortOrder: status.sortOrder,
          isFinal: status.isFinal,
        },

        create: status,
      });
    }

    // --------------------------------------------------
    // 2. SEED DESIGNATIONS AND PERMISSIONS
    // --------------------------------------------------

    for (const designation of DEFAULT_DESIGNATIONS) {
      await tx.designation.upsert({
        where: {
          name: designation.name,
        },

        update: {
          canViewAllTickets: designation.canViewAllTickets,
          canAssignTickets: designation.canAssignTickets,
          canManageUsers: designation.canManageUsers,

          // Offer publishing permission
          canPublishOffers: designation.canPublishOffers,

          // Employee notification permission
          canNotifyEmployees: designation.canNotifyEmployees,

          managementLevel: designation.managementLevel,
        },

        create: {
          name: designation.name,
          canViewAllTickets: designation.canViewAllTickets,
          canAssignTickets: designation.canAssignTickets,
          canManageUsers: designation.canManageUsers,

          // Offer publishing permission
          canPublishOffers: designation.canPublishOffers,

          // Employee notification permission
          canNotifyEmployees: designation.canNotifyEmployees,

          managementLevel: designation.managementLevel,
        },
      });
    }

    // --------------------------------------------------
    // 3. FIND SP INFOCOM ORGANISATION
    // --------------------------------------------------

    let organisation = await tx.organisation.findFirst({
      where: {
        name: {
          equals: "SP Infocom",
        },
      },
    });

    // Check for older capitalization.
    if (!organisation) {
      organisation = await tx.organisation.findFirst({
        where: {
          name: {
            equals: "sp Infocom",
          },
        },
      });
    }

    // Create organisation if it does not exist.
    if (!organisation) {
      organisation = await tx.organisation.create({
        data: {
          name: "SP Infocom",
          orgType: "company",
        },
      });
    } else {
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

    // --------------------------------------------------
    // 4. HASH DEFAULT ADMIN PASSWORD
    // --------------------------------------------------

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    // --------------------------------------------------
    // 5. CREATE OR UPDATE SUPERADMIN ACCOUNT
    // --------------------------------------------------

    const admin = await tx.user.upsert({
      where: {
        userName: "spinfocom",
      },

      // Existing password is not changed during reseeding.
      update: {
        email: "support@spinfocom.com",
        role: "admin",
        designation: "Administrator",
        organisationId: organisation.id,

        // Trusted SuperAdmin account.
        isSuperAdmin: true,
      },

      create: {
        userName: "spinfocom",
        email: "support@spinfocom.com",
        password: hashedPassword,
        role: "admin",
        designation: "Administrator",
        organisationId: organisation.id,

        // Trusted SuperAdmin account.
        isSuperAdmin: true,
      },
    });

    // --------------------------------------------------
    // 6. LINK ADMIN AS ORGANISATION CREATOR
    // --------------------------------------------------

    await tx.organisation.update({
      where: {
        id: organisation.id,
      },

      data: {
        createdBy: admin.id,
      },
    });

    // --------------------------------------------------
    // 7. FETCH SEEDED DESIGNATION PERMISSIONS
    // --------------------------------------------------

    const designations = await tx.designation.findMany({
      where: {
        name: {
          in: DEFAULT_DESIGNATIONS.map((item) => item.name),
        },
      },

      select: {
        name: true,
        canViewAllTickets: true,
        canAssignTickets: true,
        canManageUsers: true,
        canPublishOffers: true,
        canNotifyEmployees: true,
        managementLevel: true,
      },

      orderBy: {
        managementLevel: "desc",
      },
    });

    return {
      admin,
      organisation,
      designations,
    };
  });

  // --------------------------------------------------
  // 8. DISPLAY SEED RESULTS
  // --------------------------------------------------

  console.log("");
  console.log("======================================");
  console.log("          SEEDING COMPLETED");
  console.log("======================================");

  console.log("Organisation:", result.organisation.name);
  console.log("Organisation ID:", result.organisation.id);

  console.log("--------------------------------------");

  console.log("Admin username:", result.admin.userName);
  console.log("Admin email:", result.admin.email);
  console.log("Admin role:", result.admin.role);
  console.log("SuperAdmin:", result.admin.isSuperAdmin);

  console.log("--------------------------------------");

  console.log("DESIGNATION PERMISSIONS");

  result.designations.forEach((designation) => {
    console.log("");
    console.log("Designation:", designation.name);
    console.log("canViewAllTickets:", designation.canViewAllTickets);
    console.log("canAssignTickets:", designation.canAssignTickets);
    console.log("canManageUsers:", designation.canManageUsers);
    console.log("canPublishOffers:", designation.canPublishOffers);
    console.log("canNotifyEmployees:", designation.canNotifyEmployees);
    console.log("managementLevel:", designation.managementLevel);
  });

  console.log("--------------------------------------");

  console.log("Default password for a newly created account: Admin@123");
  console.log("Existing admin passwords are not reset.");

  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
