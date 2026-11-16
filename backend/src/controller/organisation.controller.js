const prisma = require("../config/prisma");

async function addOrganisation(req, res) {
  try {
    const id = String(req.user.id);
    const { name, orgType } = req.body;

    // VALIDATE ORGANISATION NAME
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organisation name is required",
      });
    }

    // VALIDATE ORGANISATION TYPE
    if (typeof orgType !== "string" || !orgType.trim()) {
      return res.status(400).json({
        message: "Organisation type is required",
      });
    }

    // FETCH CURRENT USER
    const user = await prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        role: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // VERIFY ORGANISATION CREATION PERMISSION
    const hasAccess =
      user.role?.toLowerCase() === "admin" ||
      user.isSuperAdmin === true ||
      req.user.permissions?.canCreateOrganisation === true;

    if (!hasAccess) {
      return res.status(403).json({
        code: "ORGANISATION_ACCESS_DENIED",
        message: "You do not have permission to create organisations.",
      });
    }

    // VALIDATE ORGANISATION TYPE AGAINST SAVED TYPES
    const selectedType = orgType.trim();

    const organisationType = await prisma.organisationType.findFirst({
      where: {
        name: selectedType,
      },
    });

    if (!organisationType) {
      return res.status(400).json({
        message: "Invalid organisation type. Please select a valid type.",
      });
    }

    // CREATE ORGANISATION
    const org = await prisma.organisation.create({
      data: {
        name: name.trim(),
        orgType: organisationType.name,
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

// =====================================================
// GET ORGANISATION TYPES
// GET /api/org/types
// =====================================================

async function getOrganisationTypes(req, res) {
  try {
    const types = await prisma.organisationType.findMany({
      orderBy: {
        name: "asc",
      },
    });

    const organisationTypes = types.map((type) => ({
      ...type,
      _id: type.id,
    }));

    return res.status(200).json({
      message: "Organisation types fetched successfully",
      types: organisationTypes,
    });
  } catch (error) {
    console.error("GET ORGANISATION TYPES ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch organisation types",
    });
  }
}

// =====================================================
// ADD ORGANISATION TYPE
// POST /api/org/add-type
//
// Only Admins can add organisation types.
// =====================================================

async function addOrganisationType(req, res) {
  try {
    const userId = String(req.user.id);
    const { name } = req.body;

    // VALIDATE TYPE NAME
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Organisation type name is required",
      });
    }

    const cleanName = name.trim().replace(/\s+/g, " ");

    if (cleanName.length > 100) {
      return res.status(400).json({
        message: "Organisation type cannot exceed 100 characters",
      });
    }

    // FETCH CURRENT USER
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        isSuperAdmin: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // ONLY ADMINS AND SUPERADMIN CAN ADD TYPES
    if (user.role?.toLowerCase() !== "admin" && user.isSuperAdmin !== true) {
      return res.status(403).json({
        message: "Only admins can add organisation types",
      });
    }

    // CHECK DUPLICATES WITHOUT DEPENDING ON DATABASE COLLATION
    const existingTypes = await prisma.organisationType.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    const duplicate = existingTypes.find(
      (type) => type.name.trim().toLowerCase() === cleanName.toLowerCase(),
    );

    if (duplicate) {
      return res.status(409).json({
        message: "This organisation type already exists",
      });
    }

    // CREATE ORGANISATION TYPE
    const newType = await prisma.organisationType.create({
      data: {
        name: cleanName,
      },
    });

    return res.status(201).json({
      message: "Organisation type added successfully",
      type: {
        ...newType,
        _id: newType.id,
      },
    });
  } catch (error) {
    // HANDLE DUPLICATE UNIQUE-KEY ERRORS
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "This organisation type already exists",
      });
    }

    console.error("ADD ORGANISATION TYPE ERROR:", error);

    return res.status(500).json({
      message: "Unable to add organisation type",
    });
  }
}

// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
  addOrganisation,
  getAllOrg,
  getOrganisationTypes,
  addOrganisationType,
};
