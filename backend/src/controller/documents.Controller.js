const prisma = require("../config/prisma");

const { uploadFile } = require("../services/imagekitService");
const { getImageUrl } = require("../services/fileService");

// =====================================================
// FORMAT DOCUMENT RESPONSE
// =====================================================

function formatDocument(document) {
  if (!document) return null;

  const { id, employeeId, employee, files, ...rest } = document;

  return {
    ...rest,
    _id: id,

    // Preserve the existing response structure.
    employeeId: employee
      ? {
          ...employee,
          _id: employee.id,
          organisation: employee.organisation
            ? {
                ...employee.organisation,
                _id: employee.organisation.id,
              }
            : employee.organisationId,
        }
      : employeeId,

    files: (files || []).map((file) => ({
      ...file,
      _id: file.id,
      url: getImageUrl(file.fileName),
    })),
  };
}

function getOrganisationId(user) {
  if (!user?.organisation) return null;

  return typeof user.organisation === "object"
    ? user.organisation.id || user.organisation._id
    : user.organisation;
}

const employeeSelect = {
  id: true,
  userName: true,
  email: true,
  designation: true,
  organisationId: true,
  organisation: {
    select: {
      id: true,
      name: true,
    },
  },
};

// =====================================================
// ADMIN: UPLOAD DOCUMENTS FOR AN EMPLOYEE
// =====================================================

async function DocumentUpload(req, res) {
  try {
    const { employeeId, title } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can upload documents",
      });
    }

    if (!employeeId || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        message: "Employee ID and title are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Please upload at least one file",
      });
    }

    const organisationId = getOrganisationId(req.user);

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found",
      });
    }

    // Only allow an admin to upload documents for an employee
    // belonging to the admin's own organisation.
    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        role: "employee",
        organisationId,
      },
      select: {
        id: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    // Upload files to ImageKit.
    const uploadedFiles = [];

    for (const file of req.files) {
      const result = await uploadFile(file.buffer, file.originalname);

      uploadedFiles.push({
        fileName: result.fileName,
        originalName: file.originalname,
        mimeType: file.mimetype || null,
      });
    }

    // Create document and related file records in MySQL.
    const document = await prisma.document.create({
      data: {
        employeeId: employee.id,
        title: title.trim(),
        files: {
          create: uploadedFiles,
        },
      },
      include: {
        files: true,
      },
    });

    return res.status(201).json({
      message: "Documents uploaded and assigned successfully",
      document: formatDocument(document),
    });
  } catch (error) {
    console.error("Document upload error:", error);

    return res.status(500).json({
      message: "Failed to upload documents",
    });
  }
}

// =====================================================
// EMPLOYEE: FETCH OWN DOCUMENTS
// =====================================================

async function getMyDocuments(req, res) {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({
        message: "Only employees can access this endpoint",
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        employeeId: req.user.id,
      },
      include: {
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: documents.length,
      documents: documents.map(formatDocument),
    });
  } catch (error) {
    console.error("Get my documents error:", error);

    return res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
}

// =====================================================
// ADMIN: FETCH DOCUMENTS FOR A SELECTED EMPLOYEE
// =====================================================

async function getEmployeeDocuments(req, res) {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can access this endpoint",
      });
    }

    const { employeeId } = req.params;
    const organisationId = getOrganisationId(req.user);

    if (!organisationId) {
      return res.status(400).json({
        message: "Organisation not found",
      });
    }

    const employee = await prisma.user.findFirst({
      where: {
        id: employeeId,
        role: "employee",
        organisationId,
      },
      select: employeeSelect,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found in your organisation",
      });
    }

    const documents = await prisma.document.findMany({
      where: {
        employeeId: employee.id,
      },
      include: {
        files: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      count: documents.length,
      documents: documents.map((document) => ({
        ...formatDocument(document),
        employeeId: {
          ...employee,
          _id: employee.id,
          organisation: employee.organisation
            ? {
                ...employee.organisation,
                _id: employee.organisation.id,
              }
            : employee.organisationId,
        },
      })),
    });
  } catch (error) {
    console.error("Get employee documents error:", error);

    return res.status(500).json({
      message: "Failed to fetch employee documents",
    });
  }
}

module.exports = {
  DocumentUpload,
  getMyDocuments,
  getEmployeeDocuments,
};
