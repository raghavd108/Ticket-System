const jwt = require("jsonwebtoken");

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

function verifyToken(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Token not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// =====================================================
// VERIFY ADMIN
// =====================================================

function verifyAdmin(req, res, next) {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Token not found",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin only",
      });
    }

    req.user = decoded;

    next();
  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

module.exports = {
  verifyToken,
  verifyAdmin,
};
