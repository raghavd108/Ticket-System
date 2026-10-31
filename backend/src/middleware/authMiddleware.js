const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

// =====================================================
// GET TOKEN
// =====================================================

function getToken(req) {
  // Check cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  // Check Authorization header
  if (req.headers.authorization) {
    const authHeader = req.headers.authorization;

    if (authHeader.startsWith("Bearer ")) {
      return authHeader.split(" ")[1];
    }
  }

  return null;
}

// =====================================================
// USER PERMISSIONS
// All permissions come from the database.
// Never trust frontend or JWT permission values.
// =====================================================

function getPermissions(user) {
  const isSuperAdmin = user?.isSuperAdmin === true;

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  const designation = user?.designationRef || {};

  return {
    isSuperAdmin,

    // ================================================
    // TICKET PERMISSIONS
    // ================================================

    canViewAllTickets:
      isSuperAdmin ||
      role === "admin" ||
      designation.canViewAllTickets === true,

    canAssignTickets:
      isSuperAdmin || role === "admin" || designation.canAssignTickets === true,

    // ================================================
    // USER MANAGEMENT PERMISSION
    // ================================================

    canManageUsers: isSuperAdmin || designation.canManageUsers === true,

    // ================================================
    // OFFERS PERMISSION
    // ================================================

    canPublishOffers: isSuperAdmin || designation.canPublishOffers === true,

    // ================================================
    // EMPLOYEE NOTIFICATION PERMISSION
    //
    // SuperAdmin OR employee with designation permission
    // CEO / CTO are configured through Designation table.
    // ================================================

    canNotifyEmployees:
      isSuperAdmin ||
      (role === "employee" && designation.canNotifyEmployees === true),

    // ================================================
    // MANAGEMENT LEVEL
    // ================================================

    managementLevel: isSuperAdmin
      ? 999999
      : Number(designation.managementLevel || 0),
  };
}

// =====================================================
// AUTHENTICATE USER
// =====================================================

async function authenticate(req, res) {
  const token = getToken(req);

  if (!token) {
    res.status(401).json({
      message: "Access denied. Token not found",
    });

    return null;
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    res.status(401).json({
      message: "Invalid or expired token",
    });

    return null;
  }

  // ================================================
  // FETCH CURRENT USER AND PERMISSIONS
  // ================================================

  const user = await prisma.user.findUnique({
    where: {
      id: String(decoded.id || ""),
    },

    select: {
      id: true,
      role: true,
      organisationId: true,
      userName: true,
      email: true,
      designation: true,
      tokenVersion: true,
      isRevoked: true,
      isSuperAdmin: true,

      designationRef: {
        select: {
          canViewAllTickets: true,
          canAssignTickets: true,
          canManageUsers: true,

          // OFFER PERMISSION
          canPublishOffers: true,

          // EMPLOYEE NOTIFICATION PERMISSION
          canNotifyEmployees: true,

          managementLevel: true,
        },
      },
    },
  });

  // ================================================
  // CHECK SESSION
  // ================================================

  if (!user || user.tokenVersion !== Number(decoded.tokenVersion ?? 0)) {
    res.status(401).json({
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please log in again.",
    });

    return null;
  }

  // ================================================
  // CHECK ACCOUNT REVOCATION
  // ================================================

  if (user.isRevoked) {
    res.status(401).json({
      code: "ACCOUNT_REVOKED",
      message:
        "Access to this account has been revoked. Please contact your administrator.",
    });

    return null;
  }

  // ================================================
  // GET CURRENT DATABASE PERMISSIONS
  // ================================================

  const permissions = getPermissions(user);

  return {
    id: user.id,

    role: user.role,

    organisation: user.organisationId,

    organisationId: user.organisationId,

    userName: user.userName,

    email: user.email,

    designation: user.designation,

    designationRef: user.designationRef,

    isSuperAdmin: user.isSuperAdmin === true,

    isRevoked: user.isRevoked,

    tokenVersion: user.tokenVersion,

    // Current database permissions
    permissions,
  };
}

// =====================================================
// VERIFY TOKEN
// All authenticated users
// =====================================================

async function verifyToken(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    req.user = user;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify session",
    });
  }
}

// =====================================================
// VERIFY ADMIN
// Admin OR SuperAdmin
// =====================================================

async function verifyAdmin(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.role !== "admin" && user.isSuperAdmin !== true) {
      return res.status(403).json({
        code: "ADMIN_ACCESS_DENIED",
        message: "Access denied. Admin only",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify session",
    });
  }
}

// =====================================================
// VERIFY MANAGEMENT ACCESS
// SuperAdmin OR canManageUsers
// =====================================================

async function verifyManagementAccess(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.permissions.canManageUsers !== true) {
      return res.status(403).json({
        code: "MANAGEMENT_ACCESS_DENIED",
        message: "Access denied. You do not have permission to manage users.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("MANAGEMENT AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify management access",
    });
  }
}

// =====================================================
// VERIFY SUPERADMIN
// Only SuperAdmin
// =====================================================

async function verifySuperAdmin(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.isSuperAdmin !== true) {
      return res.status(403).json({
        code: "SUPERADMIN_ACCESS_DENIED",
        message: "Access denied. Only SuperAdmin can perform this action.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("SUPERADMIN AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify SuperAdmin access",
    });
  }
}

// =====================================================
// VERIFY OFFER ACCESS
// SuperAdmin OR canPublishOffers
// =====================================================

async function verifyOfferAccess(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.permissions.canPublishOffers !== true) {
      return res.status(403).json({
        code: "OFFER_ACCESS_DENIED",
        message:
          "Access denied. You do not have permission to create, edit or publish offers.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("OFFER AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify offer permissions",
    });
  }
}

// =====================================================
// VERIFY EMPLOYEE NOTIFICATION ACCESS
//
// SuperAdmin OR employee whose designation has
// canNotifyEmployees = true
//
// Developer and unauthorized users are blocked.
// =====================================================

async function verifyEmployeeNotificationAccess(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.permissions.canNotifyEmployees !== true) {
      return res.status(403).json({
        code: "EMPLOYEE_NOTIFICATION_ACCESS_DENIED",
        message:
          "Access denied. You do not have permission to send employee notifications.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("EMPLOYEE NOTIFICATION AUTH ERROR:", error);

    return res.status(500).json({
      message: "Unable to verify employee notification permissions",
    });
  }
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyManagementAccess,
  verifySuperAdmin,
  verifyOfferAccess,
  verifyEmployeeNotificationAccess,
  getPermissions,
};
