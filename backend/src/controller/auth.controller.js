const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { getPermissions } = require("../middleware/authMiddleware");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000,
};

// Employees must use a designation that exists in the Designation table.
async function findDesignation(name) {
  const value = String(name || "").trim();

  if (!value) return null;

  return prisma.designation.findUnique({
    where: {
      name: value,
    },
  });
}

// SuperAdmins manage every client and every SP Infocom employee.
function manageableUserWhere(adminOrganisationId) {
  return {
    OR: [
      {
        role: "employee",
        organisationId: adminOrganisationId,
      },
      {
        role: "client",
      },
    ],
  };
}

// =====================================================
// SERIALIZE USER
// =====================================================

function serializeUser(user) {
  if (!user) return null;

  const {
    password,
    organisationId,
    assignedEmployees,
    assignedToClients,
    organisationsCreated,
    designationRef,
    tokenVersion,
    fcmToken,
    ...rest
  } = user;

  const result = {
    ...rest,
    _id: user.id,
  };

  if (designationRef !== undefined) {
    result.permissions = getPermissions(user);
  }

  if (user.organisation) {
    result.organisation = {
      _id: user.organisation.id,
      name: user.organisation.name,
    };
  } else if (organisationId) {
    result.organisation = organisationId;
  }

  if (Array.isArray(assignedEmployees)) {
    result.assignedEmployee = assignedEmployees.map((assignment) => {
      if (!assignment.employee) {
        return assignment.employeeId;
      }

      return {
        _id: assignment.employee.id,
        userName: assignment.employee.userName,
        email: assignment.employee.email,
        mobileNumber: assignment.employee.mobileNumber ?? null,
        ...(assignment.employee.designation !== undefined
          ? { designation: assignment.employee.designation }
          : {}),
      };
    });
  }

  return result;
}

// =====================================================
// REGISTER USER
// =====================================================

async function register(req, res) {
  try {
    const {
      organisation,
      userName,
      email,
      password,
      role,
      designation,
      mobileNumber,
      assignedEmployee,
    } = req.body;

    if (!userName || !email || !password || !role) {
      return res.status(400).json({
        message: "Username, email, password and role are required",
      });
    }

    if (!["admin", "client", "employee"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    const normalizedUserName = String(userName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobileNumber = String(mobileNumber || "").trim();
    const normalizedDesignation = String(designation || "").trim();

    if (!normalizedUserName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Username, email and password cannot be empty",
      });
    }

    if (role === "employee" && !normalizedDesignation) {
      return res.status(400).json({
        message: "Designation is required for employee",
      });
    }

    const designationRecord =
      role === "employee" ? await findDesignation(normalizedDesignation) : null;

    if (role === "employee" && !designationRecord) {
      return res.status(400).json({
        message: "Select a valid designation",
      });
    }

    if (role === "employee" && !/^\d{10}$/.test(normalizedMobileNumber)) {
      return res.status(400).json({
        message: "A valid 10-digit mobile number is required for employee",
      });
    }

    const isAuthenticatedAdmin = req.user?.role === "admin";

    const adminOrganisationId = String(
      req.user?.organisation?.id ||
        req.user?.organisationId ||
        req.user?.organisation ||
        "",
    );

    if (isAuthenticatedAdmin && role === "admin") {
      return res.status(403).json({
        message: "An admin cannot create another admin account",
      });
    }

    let targetOrganisationId = organisation ? String(organisation) : "";

    if (isAuthenticatedAdmin && role === "employee") {
      targetOrganisationId = adminOrganisationId;
    }

    if (isAuthenticatedAdmin && !adminOrganisationId) {
      return res.status(400).json({
        message: "Your account is not linked to an organisation",
      });
    }

    if (!targetOrganisationId) {
      return res.status(400).json({
        message: "Organisation is required",
      });
    }

    const org = await prisma.organisation.findUnique({
      where: {
        id: targetOrganisationId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!org) {
      return res.status(404).json({
        message: "Organisation not found",
      });
    }

    if (
      isAuthenticatedAdmin &&
      role !== "client" &&
      targetOrganisationId !== adminOrganisationId
    ) {
      return res.status(403).json({
        message: "You can only create users in your own organisation",
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { userName: normalizedUserName },
          { organisationId: org.id, email: normalizedEmail },
        ],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists in this organisation",
      });
    }

    let employeeIds = [];

    if (role === "client" && assignedEmployee !== undefined) {
      if (!Array.isArray(assignedEmployee)) {
        return res.status(400).json({
          message: "assignedEmployee must be an array of employee IDs",
        });
      }

      employeeIds = [...new Set(assignedEmployee.map(String))];

      if (
        employeeIds.some((id) => !id || id === "undefined" || id === "null")
      ) {
        return res.status(400).json({
          message: "Every assignedEmployee value must be a valid employee ID",
        });
      }

      const employeeOrganisationId = isAuthenticatedAdmin
        ? adminOrganisationId
        : org.id;

      if (!employeeOrganisationId) {
        return res.status(400).json({
          message: "Unable to determine the employee organisation",
        });
      }

      const employees = await prisma.user.findMany({
        where: {
          id: {
            in: employeeIds,
          },
          role: "employee",
          organisationId: employeeOrganisationId,
        },
        select: {
          id: true,
        },
      });

      if (employees.length !== employeeIds.length) {
        return res.status(400).json({
          message: isAuthenticatedAdmin
            ? "One or more selected employees do not belong to your organisation"
            : "One or more selected employees are invalid or do not belong to this organisation",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        userName: normalizedUserName,
        email: normalizedEmail,
        password: hashedPassword,
        role,
        organisationId: org.id,
        designation: designationRecord ? designationRecord.name : null,
        mobileNumber: role === "employee" ? normalizedMobileNumber : null,

        ...(role === "client" && employeeIds.length > 0
          ? {
              assignedEmployees: {
                create: employeeIds.map((employeeId) => ({
                  employee: {
                    connect: {
                      id: employeeId,
                    },
                  },
                })),
              },
            }
          : {}),
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                userName: true,
                email: true,
                designation: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "A user with this username or email already exists",
      });
    }

    if (error.code === "P2003" || error.code === "P2025") {
      return res.status(400).json({
        message: "Invalid organisation or employee assignment",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// LOGIN — REVOKED ACCOUNTS CANNOT LOG IN
// =====================================================

async function login(req, res) {
  try {
    const { userName, password } = req.body;

    if (
      userName === undefined ||
      userName === null ||
      !String(userName).trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        message: "Username, email, or mobile number and password are required",
      });
    }

    const loginId = String(userName).trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { userName: { equals: loginId } },
          { email: { equals: loginId } },
          { mobileNumber: { equals: loginId } },
        ],
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username/email/mobile number or password",
      });
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid username/email/mobile number or password",
      });
    }

    // Only reveal revocation to someone who knows the password.
    if (user.isRevoked) {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_REVOKED",
        message:
          "Access to this account has been revoked. Please contact your administrator.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        message: "Server configuration error",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organisation: user.organisation?.id || user.organisationId,
        userName: user.userName,
        email: user.email,
        tokenVersion: user.tokenVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    res.cookie("token", token, COOKIE_OPTIONS);

    return res.status(200).json({
      message: "User login successful",
      token,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.email,
        mobileNumber: user.mobileNumber ?? null,
        role: user.role,
        organisation: user.organisation
          ? {
              id: user.organisation.id,
              name: user.organisation.name,
            }
          : null,
        designation: user.designation,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// LOGOUT — INVALIDATE EXISTING SESSIONS
// =====================================================

async function logout(req, res) {
  try {
    await prisma.user.update({
      where: {
        id: String(req.user.id),
      },
      data: {
        tokenVersion: {
          increment: 1,
        },
        fcmToken: null,
      },
    });

    res.clearCookie("token", COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
}

// =====================================================
// GET CURRENT USER
// =====================================================

async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: String(req.user.id),
      },
      include: {
        designationRef: {
          select: {
            canViewAllTickets: true,
            canAssignTickets: true,
          },
        },
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                userName: true,
                email: true,
                designation: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User is authenticated",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// UPDATE PROFILE
// =====================================================

async function updateProfile(req, res) {
  try {
    const { userName, email, mobileNumber } = req.body;

    if (!userName || !email) {
      return res.status(400).json({
        message: "Username and email are required",
      });
    }

    const userId = String(req.user.id);
    const normalizedUserName = String(userName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!normalizedUserName || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Enter a valid username and email address",
      });
    }

    const normalizedMobileNumber =
      mobileNumber === undefined || mobileNumber === null
        ? undefined
        : String(mobileNumber).trim();

    if (
      normalizedMobileNumber !== undefined &&
      normalizedMobileNumber !== "" &&
      !/^\d{10}$/.test(normalizedMobileNumber)
    ) {
      return res.status(400).json({
        message: "Mobile number must contain exactly 10 digits",
      });
    }

    if (req.user.role === "employee" && normalizedMobileNumber === "") {
      return res.status(400).json({
        message: "A valid 10-digit mobile number is required for employees",
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        id: {
          not: userId,
        },
        OR: [{ userName: normalizedUserName }, { email: normalizedEmail }],
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return res.status(409).json({
        message: "Username or email is already in use",
      });
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        userName: normalizedUserName,
        email: normalizedEmail,
        ...(normalizedMobileNumber !== undefined
          ? { mobileNumber: normalizedMobileNumber || null }
          : {}),
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                userName: true,
                email: true,
                designation: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Username or email is already in use",
      });
    }

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
}

// =====================================================
// UPDATE PASSWORD — INVALIDATE EXISTING SESSIONS
// =====================================================

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (String(newPassword).length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: String(req.user.id),
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const passwordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        tokenVersion: {
          increment: 1,
        },
        fcmToken: null,
      },
    });

    return res.status(200).json({
      message: "Password updated successfully. Please log in again.",
    });
  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Failed to update password",
    });
  }
}

// =====================================================
// GET CLIENTS AND EMPLOYEES
// =====================================================

async function getUser(req, res) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can view client and employee management",
      });
    }

    const adminOrganisationId = String(
      req.user?.organisation?.id ||
        req.user?.organisationId ||
        req.user?.organisation ||
        "",
    );

    if (!adminOrganisationId) {
      return res.status(400).json({
        message: "Your admin account is not linked to an organisation",
      });
    }

    const users = await prisma.user.findMany({
      where: manageableUserWhere(adminOrganisationId),
      select: {
        id: true,
        userName: true,
        email: true,
        role: true,
        mobileNumber: true,
        designation: true,
        isRevoked: true,
        revokedAt: true,
        revokedReason: true,
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                userName: true,
                designation: true,
                email: true,
                mobileNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        userName: "asc",
      },
    });

    return res.status(200).json({
      message: "Users fetched successfully",
      users: users.map(serializeUser),
    });
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch users",
    });
  }
}

// =====================================================
// ADMIN UPDATE USER — EMPLOYEES AND CLIENTS
// PATCH /api/auth/update-user/:userId
// =====================================================

async function updateUser(req, res) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can update employee and client details",
      });
    }

    const userId = String(req.params.userId || "").trim();

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const adminOrganisationId = String(
      req.user?.organisation?.id ||
        req.user?.organisationId ||
        req.user?.organisation ||
        "",
    );

    if (!adminOrganisationId) {
      return res.status(400).json({
        message: "Your admin account is not linked to an organisation",
      });
    }

    const target = await prisma.user.findFirst({
      where: {
        id: userId,
        ...manageableUserWhere(adminOrganisationId),
      },
      select: {
        id: true,
        role: true,
        organisationId: true,
      },
    });

    if (!target) {
      return res.status(404).json({
        message:
          "Employee or client not found, or you do not have permission to update this user",
      });
    }

    const {
      userName,
      email,
      mobileNumber,
      designation,
      assignedEmployee,
      password,
    } = req.body || {};

    const data = {};

    if (userName !== undefined) {
      const value = String(userName).trim();

      if (!value) {
        return res.status(400).json({
          message: "Username cannot be empty",
        });
      }

      data.userName = value;
    }

    if (email !== undefined) {
      const value = String(email).trim().toLowerCase();

      if (!value) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      data.email = value;
    }

    if (mobileNumber !== undefined) {
      const value = mobileNumber === null ? "" : String(mobileNumber).trim();

      if (value && !/^\d{10}$/.test(value)) {
        return res.status(400).json({
          message: "Mobile number must contain exactly 10 digits",
        });
      }

      if (target.role === "employee" && !value) {
        return res.status(400).json({
          message: "A valid 10-digit mobile number is required for employees",
        });
      }

      data.mobileNumber = value || null;
    }

    if (password !== undefined && password !== "") {
      if (typeof password !== "string") {
        return res.status(400).json({
          message: "Password must be a valid string",
        });
      }

      if (!password.trim()) {
        return res.status(400).json({
          message: "Password cannot contain only spaces",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          message: "Password must be at least 8 characters long",
        });
      }

      data.password = await bcrypt.hash(password, 10);
      data.tokenVersion = {
        increment: 1,
      };
      data.fcmToken = null;
    }

    if (designation !== undefined) {
      if (target.role !== "employee") {
        return res.status(400).json({
          message: "Designation can only be changed for employees",
        });
      }

      const designationRecord = await findDesignation(designation);

      if (!designationRecord) {
        return res.status(400).json({
          message: "Select a valid designation",
        });
      }

      data.designation = designationRecord.name;
    }

    if (assignedEmployee !== undefined) {
      if (target.role !== "client" || !Array.isArray(assignedEmployee)) {
        return res.status(400).json({
          message: "assignedEmployee must be an array for a client",
        });
      }

      const employeeIds = [...new Set(assignedEmployee.map(String))];

      if (
        employeeIds.some(
          (id) => !id.trim() || id === "undefined" || id === "null",
        )
      ) {
        return res.status(400).json({
          message: "Every assigned employee ID must be valid",
        });
      }

      const validEmployees = await prisma.user.findMany({
        where: {
          id: {
            in: employeeIds,
          },
          role: "employee",
          organisationId: adminOrganisationId,
        },
        select: {
          id: true,
        },
      });

      if (validEmployees.length !== employeeIds.length) {
        return res.status(400).json({
          message:
            "One or more employees are invalid or outside your organisation",
        });
      }

      data.assignedEmployees = {
        deleteMany: {},
        ...(employeeIds.length
          ? {
              create: employeeIds.map((employeeId) => ({
                employee: {
                  connect: {
                    id: employeeId,
                  },
                },
              })),
            }
          : {}),
      };
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    if (data.userName !== undefined || data.email !== undefined) {
      const duplicateOr = [];

      if (data.userName !== undefined) {
        duplicateOr.push({
          userName: data.userName,
        });
      }

      if (data.email !== undefined) {
        duplicateOr.push({
          email: data.email,
        });
      }

      const duplicate = await prisma.user.findFirst({
        where: {
          id: {
            not: target.id,
          },
          OR: duplicateOr.map((condition) =>
            condition.email
              ? { ...condition, organisationId: target.organisationId }
              : condition,
          ),
        },
        select: {
          id: true,
        },
      });

      if (duplicate) {
        return res.status(409).json({
          message: "Username or email is already in use in this organisation",
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: target.id,
      },
      data,
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedEmployees: {
          include: {
            employee: {
              select: {
                id: true,
                userName: true,
                email: true,
                mobileNumber: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: `${
        target.role === "employee" ? "Employee" : "Client"
      } details updated successfully`,
      user: serializeUser(updatedUser),
    });
  } catch (error) {
    console.error("ADMIN UPDATE USER ERROR:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Username or email is already in use",
      });
    }

    if (error.code === "P2025" || error.code === "P2003") {
      return res.status(400).json({
        message: "Invalid user or employee assignment",
      });
    }

    return res.status(500).json({
      message: "Failed to update user details",
    });
  }
}

// =====================================================
// SAVE FCM TOKEN
// =====================================================

async function saveFcmToken(req, res) {
  try {
    const { fcmToken } = req.body;

    if (typeof fcmToken !== "string" || !fcmToken.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid FCM token is required",
      });
    }

    await prisma.user.update({
      where: {
        id: String(req.user.id),
      },
      data: {
        fcmToken: fcmToken.trim(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "FCM token saved",
    });
  } catch (error) {
    console.error("FCM TOKEN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save FCM token",
    });
  }
}

// =====================================================
// GET EMPLOYEES OF LOGGED-IN ADMIN'S ORGANISATION
// =====================================================

async function getEmployees(req, res) {
  try {
    const organisationId = String(
      req.user?.organisation?.id ||
        req.user?.organisationId ||
        req.user?.organisation ||
        "",
    );

    if (!organisationId) {
      return res.status(400).json({
        message: "Your account is not linked to an organisation",
      });
    }

    const employees = await prisma.user.findMany({
      where: {
        role: "employee",
        organisationId,
      },
      select: {
        id: true,
        userName: true,
        email: true,
        mobileNumber: true,
        designation: true,
        organisation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        userName: "asc",
      },
    });

    return res.status(200).json({
      message: "Employees fetched successfully",
      employees: employees.map(serializeUser),
    });
  } catch (error) {
    console.error("GET EMPLOYEES ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch employees",
    });
  }
}

// =====================================================
// ADMIN ACCOUNT ACCESS REVOCATION
// =====================================================

function getAdminOrganisationId(req) {
  return String(
    req.user?.organisation?.id ||
      req.user?.organisationId ||
      req.user?.organisation ||
      "",
  );
}

async function findManageableUser(userId, adminOrganisationId) {
  return prisma.user.findFirst({
    where: {
      id: userId,
      ...manageableUserWhere(adminOrganisationId),
    },
    select: {
      id: true,
      userName: true,
      role: true,
      isRevoked: true,
      revokedAt: true,
      revokedReason: true,
    },
  });
}

// =====================================================
// REVOKE USER ACCESS
// PATCH /api/auth/revoke-user/:userId
// =====================================================

async function revokeUser(req, res) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can revoke account access",
      });
    }

    const userId = String(req.params.userId || "").trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const adminOrganisationId = getAdminOrganisationId(req);

    if (!adminOrganisationId) {
      return res.status(400).json({
        success: false,
        message: "Your admin account is not linked to an organisation",
      });
    }

    const target = await findManageableUser(userId, adminOrganisationId);

    if (!target) {
      return res.status(404).json({
        success: false,
        message:
          "Client or employee not found, or you do not have permission to manage this user",
      });
    }

    if (target.isRevoked) {
      return res.status(200).json({
        success: true,
        message: "This account's access is already revoked",
        user: target,
      });
    }

    const reason =
      typeof req.body?.reason === "string"
        ? req.body.reason.trim().slice(0, 500)
        : "";

    const user = await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason || null,
        tokenVersion: {
          increment: 1,
        },
        fcmToken: null,
      },
      select: {
        id: true,
        userName: true,
        role: true,
        isRevoked: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `${
        target.role === "employee" ? "Employee" : "Client"
      } access revoked successfully`,
      user,
    });
  } catch (error) {
    console.error("REVOKE USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to revoke account access",
    });
  }
}

// =====================================================
// RESTORE USER ACCESS
// PATCH /api/auth/restore-user/:userId
// =====================================================

async function restoreUser(req, res) {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can restore account access",
      });
    }

    const userId = String(req.params.userId || "").trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const adminOrganisationId = getAdminOrganisationId(req);

    if (!adminOrganisationId) {
      return res.status(400).json({
        success: false,
        message: "Your admin account is not linked to an organisation",
      });
    }

    const target = await findManageableUser(userId, adminOrganisationId);

    if (!target) {
      return res.status(404).json({
        success: false,
        message:
          "Client or employee not found, or you do not have permission to manage this user",
      });
    }

    if (!target.isRevoked) {
      return res.status(200).json({
        success: true,
        message: "This account is already active",
        user: target,
      });
    }

    const user = await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        isRevoked: false,
        revokedAt: null,
        revokedReason: null,
        tokenVersion: {
          increment: 1,
        },
        fcmToken: null,
      },
      select: {
        id: true,
        userName: true,
        role: true,
        isRevoked: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: `${
        target.role === "employee" ? "Employee" : "Client"
      } access restored successfully`,
      user,
    });
  } catch (error) {
    console.error("RESTORE USER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to restore account access",
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  updatePassword,
  getUser,
  updateUser,
  saveFcmToken,
  getEmployees,
  revokeUser,
  restoreUser,
};
