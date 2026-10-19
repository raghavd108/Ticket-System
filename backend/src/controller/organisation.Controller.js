const prisma = require("../config/prisma");

// =====================================================
// ADD ORGANISATION
// POST /api/org/add-org/:adminId
// =====================================================

async function addOrganisation(req, res) {
  try {
    const { id } = req.params;
    const { name, orgType } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Organisation name is required",
      });
    }

    if (!orgType || !orgType.trim()) {
      return res.status(400).json({
        message: "Organisation type is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Only admins can create organisations.
    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create organisations",
      });
    }

    const org = await prisma.organisation.create({
      data: {
        name: name.trim(),
        orgType: orgType.trim(),
        createdBy: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: "Organisation created successfully",
      org: {
        ...org,
        _id: org.id,
        createdBy: org.creator
          ? {
              ...org.creator,
              _id: org.creator.id,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("ADD ORGANISATION ERROR:", error);

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}

// =====================================================
// GET ALL ORGANISATIONS
// GET /api/org/get-org
// =====================================================

async function getAllOrg(req, res) {
  try {
    const organisations = await prisma.organisation.findMany({
      include: {
        creator: {
          select: {
            id: true,
            userName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const org = organisations.map((organisation) => ({
      ...organisation,
      _id: organisation.id,
      createdBy: organisation.creator
        ? {
            ...organisation.creator,
            _id: organisation.creator.id,
          }
        : null,
    }));

    return res.status(200).json({
      message: "Organisations fetched successfully",
      org,
    });
  } catch (error) {
    console.error("GET ALL ORGANISATIONS ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch organisations",
    });
  }
}

module.exports = {
  addOrganisation,
  getAllOrg,
};
