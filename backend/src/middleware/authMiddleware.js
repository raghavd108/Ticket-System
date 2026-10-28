const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

function getToken(req) {
  // Check cookie
  if (req.cookies && req.cookies.token) {
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

// Verify the JWT and confirm the session is still valid in the database.
// Logout, password changes and revocation increment tokenVersion, so an
// older token is rejected. Role, organisation and designation are read
// from the database so permission changes apply immediately.
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
      designationRef: {
        select: {
          canViewAllTickets: true,
          canAssignTickets: true,
        },
      },
    },
  });

  if (!user || user.tokenVersion !== Number(decoded.tokenVersion ?? 0)) {
    res.status(401).json({
      code: "SESSION_EXPIRED",
      message: "Your session has expired. Please log in again.",
    });
    return null;
  }

  if (user.isRevoked) {
    res.status(401).json({
      code: "ACCOUNT_REVOKED",
      message:
        "Access to this account has been revoked. Please contact your administrator.",
    });
    return null;
  }

  return {
    id: user.id,
    role: user.role,
    organisation: user.organisationId,
    userName: user.userName,
    email: user.email,
    designation: user.designation,
    tokenVersion: user.tokenVersion,
    permissions: getPermissions(user),
  };
}

function getPermissions(user) {
  const isAdmin = user.role === "admin";

  return {
    canViewAllTickets:
      isAdmin || Boolean(user.designationRef?.canViewAllTickets),
    canAssignTickets: isAdmin || Boolean(user.designationRef?.canAssignTickets),
  };
}

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
// =====================================================

async function verifyAdmin(req, res, next) {
  try {
    const user = await authenticate(req, res);

    if (!user) return;

    if (user.role !== "admin") {
      return res.status(403).json({
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

module.exports = {
  verifyToken,
  verifyAdmin,
  getPermissions,
};
