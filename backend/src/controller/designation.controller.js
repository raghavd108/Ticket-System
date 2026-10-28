const prisma = require("../config/prisma");

const designationSelect = {
  id: true,
  name: true,
  canViewAllTickets: true,
  canAssignTickets: true,
  _count: {
    select: {
      users: true,
    },
  },
};

function formatDesignation({ _count, ...designation }) {
  return {
    ...designation,
    userCount: _count?.users ?? 0,
  };
}

function readPermissions(body) {
  const data = {};

  for (const key of ["canViewAllTickets", "canAssignTickets"]) {
    if (body?.[key] !== undefined) {
      if (typeof body[key] !== "boolean") {
        return { error: `${key} must be true or false` };
      }

      data[key] = body[key];
    }
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
      designations: designations.map(formatDesignation),
    });
  } catch (error) {
    console.error("GET DESIGNATIONS ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch designations",
    });
  }
}

// =====================================================
// POST /api/designations   (admin)
// =====================================================

async function createDesignation(req, res) {
  try {
    const name = String(req.body?.name || "").trim();

    if (!name || name.length > 100) {
      return res.status(400).json({
        message: "Designation name is required (max 100 characters)",
      });
    }

    const { data, error } = readPermissions(req.body);

    if (error) {
      return res.status(400).json({ message: error });
    }

    const designation = await prisma.designation.create({
      data: {
        name,
        ...data,
      },
      select: designationSelect,
    });

    return res.status(201).json({
      message: "Designation created successfully",
      designation: formatDesignation(designation),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A designation with this name already exists",
      });
    }

    console.error("CREATE DESIGNATION ERROR:", error);

    return res.status(500).json({
      message: "Unable to create designation",
    });
  }
}

// =====================================================
// PATCH /api/designations/:id   (admin)
// Renaming cascades to users through the foreign key.
// =====================================================

async function updateDesignation(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        message: "Invalid designation ID",
      });
    }

    const { data, error } = readPermissions(req.body);

    if (error) {
      return res.status(400).json({ message: error });
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

    const designation = await prisma.designation.update({
      where: {
        id,
      },
      data,
      select: designationSelect,
    });

    return res.status(200).json({
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
      message: "Unable to update designation",
    });
  }
}

// =====================================================
// DELETE /api/designations/:id   (admin, only when unused)
// =====================================================

async function deleteDesignation(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
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
        message: "This designation is assigned to employees and cannot be deleted",
      });
    }

    await prisma.designation.delete({
      where: { id },
    });

    return res.status(200).json({
      message: "Designation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE DESIGNATION ERROR:", error);

    return res.status(500).json({
      message: "Unable to delete designation",
    });
  }
}

module.exports = {
  getDesignations,
  createDesignation,
  updateDesignation,
  deleteDesignation,
};
