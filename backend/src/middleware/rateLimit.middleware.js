const { rateLimit } = require("express-rate-limit");

// =====================================================
// GENERAL API RATE LIMITER
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
// =====================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  message: {
    success: false,
    code: "AUTH_RATE_LIMIT_EXCEEDED",
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

// =====================================================
// REGISTRATION RATE LIMITER
// =====================================================

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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
// =====================================================

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
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

const notificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 3,

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
