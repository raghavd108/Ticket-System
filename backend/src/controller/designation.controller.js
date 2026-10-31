const prisma = require("../config/prisma");
const { getPermissions } = require("../middleware/authMiddleware");

// =====================================================
// DESIGNATION SELECT
// =====================================================

const designationSelect = {
  id: true,
  name: true,

  canViewAllTickets: true,
  canAssignTickets: true,
  canManageUsers: true,

  canPublishOffers: true,
  canNotifyEmployees: true,

  managementLevel: true,

  _count: {
    select: {
      users: true,
    },
  },
};

// =====================================================
// AUTHORIZATION HELPERS
// =====================================================

function isSuperAdmin(user) {
  return user?.isSuperAdmin === true;
}

function canManageDesignations(user) {
  return isSuperAdmin(user) || getPermissions(user).canManageUsers === true;
}

function isElevatedDesignation(designation) {
  return (
    designation?.canManageUsers === true ||
    designation?.canViewAllTickets === true ||
    designation?.canPublishOffers === true ||
    designation?.canNotifyEmployees === true ||
    Number(designation?.managementLevel || 0) > 0
  );
}

// =====================================================
// FORMAT DESIGNATION
// =====================================================

function formatDesignation({ _count, ...designation }) {
  return {
    ...designation,
    userCount: _count?.users ?? 0,
  };
}

// =====================================================
// READ AND VALIDATE PERMISSIONS
// =====================================================

function readPermissions(body, actor) {
  const data = {};

  const permissionFields = [
    "canViewAllTickets",
    "canAssignTickets",
    "canManageUsers",
    "canPublishOffers",
    "canNotifyEmployees",
  ];

  for (const key of permissionFields) {
    if (body?.[key] !== undefined) {
      if (typeof body[key] !== "boolean") {
        return {
          error: `${key} must be true or false`,
        };
      }

      // Only SuperAdmin can change elevated permissions.
      if (key !== "canAssignTickets" && !isSuperAdmin(actor)) {
        return {
          error: `Only SuperAdmin can modify ${key}`,
          status: 403,
        };
      }

      data[key] = body[key];
    }
  }

  if (body?.managementLevel !== undefined) {
    const level = body.managementLevel;

    if (!Number.isInteger(level) || level < 0 || level > 1000) {
      return {
        error: "managementLevel must be an integer between 0 and 1000",
      };
    }

    if (!isSuperAdmin(actor)) {
      return {
        error: "Only SuperAdmin can modify management levels",
        status: 403,
      };
    }

    data.managementLevel = level;
  }

  // Prevent permission escalation.
  const finalPermissions = {
    canViewAllTickets: data.canViewAllTickets ?? false,

    canManageUsers: data.canManageUsers ?? false,

    canPublishOffers: data.canPublishOffers ?? false,

    canNotifyEmployees: data.canNotifyEmployees ?? false,

    managementLevel: data.managementLevel ?? 0,
  };

  if (
    !isSuperAdmin(actor) &&
    (finalPermissions.canViewAllTickets ||
      finalPermissions.canManageUsers ||
      finalPermissions.canPublishOffers ||
      finalPermissions.canNotifyEmployees ||
      finalPermissions.managementLevel > 0)
  ) {
    return {
      error: "Only SuperAdmin can assign elevated permissions",
      status: 403,
    };
  }

  return { data };
}

// =====================================================
// GET /api/designations
// =====================================================

async function getDesignations(req, res) {
  try {
    const designations = await prisma.designation.findMany({
      select: designationSelect,

      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      designations: designations.map(formatDesignation),
    });
  } catch (error) {
    console.error("GET DESIGNATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch designations",
    });
  }
}

// =====================================================
// POST /api/designations
// =====================================================

async function createDesignation(req, res) {
  try {
    if (!canManageDesignations(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create designations",
      });
    }

    const name = String(req.body?.name || "").trim();

    if (!name || name.length > 100) {
      return res.status(400).json({
        message: "Designation name is required (max 100 characters)",
      });
    }

    const { data, error, status } = readPermissions(req.body, req.user);

    if (error) {
      return res.status(status || 400).json({
        success: false,
        message: error,
      });
    }

    const designation = await prisma.designation.create({
      data: {
        name,

        canViewAllTickets: false,
        canAssignTickets: false,
        canManageUsers: false,

        canPublishOffers: false,
        canNotifyEmployees: false,

        managementLevel: 0,

        ...data,
      },

      select: designationSelect,
    });

    return res.status(201).json({
      success: true,
      message: "Designation created successfully",
      designation: formatDesignation(designation),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A designation with this name already exists",
      });
    }

    console.error("CREATE DESIGNATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create designation",
    });
  }
}

// =====================================================
// PATCH /api/designations/:id
// =====================================================

async function updateDesignation(req, res) {
  try {
    if (!canManageDesignations(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update designations",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid designation ID",
      });
    }

    const existingDesignation = await prisma.designation.findUnique({
      where: { id },
      select: designationSelect,
    });

    if (!existingDesignation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    // Non-SuperAdmin users cannot modify
    // existing elevated designations.
    if (!isSuperAdmin(req.user) && isElevatedDesignation(existingDesignation)) {
      return res.status(403).json({
        success: false,
        message:
          "Only SuperAdmin can modify management or elevated designations",
      });
    }

    const { data, error, status } = readPermissions(req.body, req.user);

    if (error) {
      return res.status(status || 400).json({
        success: false,
        message: error,
      });
    }

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();

      if (!name || name.length > 100) {
        return res.status(400).json({
          message: "Designation name is required (max 100 characters)",
        });
      }

      data.name = name;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    const finalDesignation = {
      ...existingDesignation,
      ...data,
    };

    if (!isSuperAdmin(req.user) && isElevatedDesignation(finalDesignation)) {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin can assign elevated permissions",
      });
    }

    const designation = await prisma.designation.update({
      where: { id },
      data,
      select: designationSelect,
    });

    return res.status(200).json({
      success: true,
      message: "Designation updated successfully",
      designation: formatDesignation(designation),
    });
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A designation with this name already exists",
      });
    }

    console.error("UPDATE DESIGNATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update designation",
    });
  }
}

// =====================================================
// DELETE /api/designations/:id
// SuperAdmin only
// =====================================================

async function deleteDesignation(req, res) {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Only SuperAdmin can delete designations",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "Invalid designation ID",
      });
    }

    const designation = await prisma.designation.findUnique({
      where: { id },
      select: designationSelect,
    });

    if (!designation) {
      return res.status(404).json({
        message: "Designation not found",
      });
    }

    if (designation._count.users > 0) {
      return res.status(409).json({
        message:
          "This designation is assigned to employees and cannot be deleted",
      });
    }

    await prisma.designation.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Designation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE DESIGNATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete designation",
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};
