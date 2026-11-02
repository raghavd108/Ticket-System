const { rateLimit } = require("express-rate-limit");

// =====================================================
// PER-USER KEY GENERATOR
//
// Must be used AFTER verifyToken / authentication.
// Uses the authenticated database user ID.
// =====================================================

const userKeyGenerator = (req) => {
  if (!req.user?.id) {
    return "missing-authenticated-user";
  }

  return `user:${req.user.id}`;
};

// =====================================================
// GENERAL API RATE LIMITER
// OLD LOGIC PRESERVED
// =====================================================

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again after 15 minutes.",
  },
});

// =====================================================
// LOGIN RATE LIMITER
// OLD LOGIC PRESERVED
// =====================================================

const authLimiter = rateLimit({
  windowMs: 30 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Too many login attempts. Please try again after 30 seconds.",
  },
});

// =====================================================
// REGISTRATION RATE LIMITER
// 10 REQUESTS / 15 MINUTES / USER
// =====================================================

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: userKeyGenerator,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "REGISTER_RATE_LIMIT_EXCEEDED",
    message: "Too many registration requests. Please try again later.",
  },
});

// =====================================================
// PASSWORD UPDATE RATE LIMITER
// 5 REQUESTS / 15 MINUTES / USER
// =====================================================

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: userKeyGenerator,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "PASSWORD_RATE_LIMIT_EXCEEDED",
    message: "Too many password update attempts. Please try again later.",
  },
});

// =====================================================
// FILE UPLOAD RATE LIMITER
// OLD LOGIC PRESERVED
// =====================================================

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "UPLOAD_RATE_LIMIT_EXCEEDED",
    message: "Too many upload requests. Please try again later.",
  },
});

// =====================================================
// ATTENDANCE RATE LIMITER
// OLD LOGIC PRESERVED
// =====================================================

const attendanceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "ATTENDANCE_RATE_LIMIT_EXCEEDED",
    message: "Too many attendance requests. Please try again after 15 minutes.",
  },
});

// =====================================================
// LEAVE RATE LIMITER
// OLD LOGIC PRESERVED
// =====================================================

const leaveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "LEAVE_RATE_LIMIT_EXCEEDED",
    message: "Too many leave requests. Please try again after 15 minutes.",
  },
});

// =====================================================
// NOTIFICATION RATE LIMITER
// 10 REQUESTS / 5 MINUTES / USER
// =====================================================

const notificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  keyGenerator: userKeyGenerator,

  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "NOTIFICATION_RATE_LIMIT_EXCEEDED",
    message:
      "Too many notification requests. Please try again after 5 minutes.",
  },
});

// =====================================================
// EXPORT MIDDLEWARE
// =====================================================

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordLimiter,
  uploadLimiter,
  attendanceLimiter,
  leaveLimiter,
  notificationLimiter,
};
