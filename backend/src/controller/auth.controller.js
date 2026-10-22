const prisma = require("../config/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
    ...rest
  } = user;

  const result = {
    ...rest,
    _id: user.id,
  };

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

    if (role === "employee" && !designation) {
      return res.status(400).json({
        message: "Designation is required for employee",
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

    if (!targetOrganisationId) {
      return res.status(400).json({
        message: "Organisation is required",
      });
    }

    if (isAuthenticatedAdmin && !adminOrganisationId) {
      return res.status(400).json({
        message: "Your account is not linked to an organisation",
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

    const normalizedUserName = String(userName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        organisationId: org.id,
        OR: [{ userName: normalizedUserName }, { email: normalizedEmail }],
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

    // Validate employee assignments for clients.
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
        designation: role === "employee" ? String(designation).trim() : null,

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
// LOGIN — CREATE VERSIONED JWT
// =====================================================

async function login(req, res) {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        userName: String(userName).trim(),
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
        message: "Invalid username or password",
      });
    }

    const passwordCorrect = await bcrypt.compare(password, user.password);

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Invalid username or password",
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

    res.cookie("token", token);

    return res.status(200).json({
      message: "User login successful",
      token,
      user: {
        id: user.id,
        userName: user.userName,
        email: user.email,
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
// LOGOUT — REVOKE SESSIONS AND CLEAR FCM TOKEN
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

    res.clearCookie("token");

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
    const { userName, email } = req.body;

    if (!userName || !email) {
      return res.status(400).json({
        message: "Username and email are required",
      });
    }

    const userId = String(req.user.id);
    const normalizedUserName = String(userName).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

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
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Username and email updated successfully",
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
// UPDATE PASSWORD — REVOKE EXISTING SESSIONS
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
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ["client", "employee"],
        },
      },
      select: {
        id: true,
        userName: true,
        email: true,
        role: true,
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
  saveFcmToken,
  getEmployees,
};
