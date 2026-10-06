const userModel = require("../model/user.model");
const organisationModel = require("../model/organisations.model");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

// =====================================================
// REGISTER
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

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!organisation || !userName || !email || !password || !role) {
      return res.status(400).json({
        message:
          "Organisation, username, email, password and role are required",
      });
    }

    // Validate role
    if (!["admin", "client", "employee"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    // Employee must have designation
    if (role === "employee" && !designation) {
      return res.status(400).json({
        message: "Designation is required for employee",
      });
    }

    // ==========================================
    // FIND ORGANISATION
    // ==========================================

    const org = await organisationModel.findById(organisation);

    if (!org) {
      return res.status(404).json({
        message: "Organisation not found",
      });
    }

    // ==========================================
    // CHECK DUPLICATE USER
    // ==========================================

    const existingUser = await userModel.findOne({
      organisation: org._id,
      $or: [{ userName }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username or email already exists in this organisation",
      });
    }

    // ==========================================
    // VALIDATE ASSIGNED EMPLOYEES
    // ==========================================

    let employeeIds = [];

    if (role === "client" && assignedEmployee) {
      if (!Array.isArray(assignedEmployee)) {
        return res.status(400).json({
          message: "assignedEmployee must be an array",
        });
      }

      employeeIds = assignedEmployee;

      // Find employees
      const employees = await userModel.find({
        _id: { $in: employeeIds },
        role: "employee",
      });

      // Make sure all selected employees exist
      if (employees.length !== employeeIds.length) {
        return res.status(400).json({
          message:
            "One or more selected employees are invalid or do not belong to this organisation",
        });
      }
    }

    // ==========================================
    // HASH PASSWORD
    // ==========================================

    const hash = await bcrypt.hash(password, 10);

    // ==========================================
    // CREATE USER
    // ==========================================

    const user = await userModel.create({
      organisation: org._id,
      userName,
      email,
      password: hash,
      role,

      designation: role === "employee" ? designation : undefined,

      // Only clients get assigned employees
      assignedEmployee: role === "client" ? employeeIds : [],
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    const populatedUser = await userModel
      .findById(user._id)
      .select("-password")
      .populate("organisation", "name")
      .populate("assignedEmployee", "userName email designation");

    return res.status(201).json({
      message: "User registered successfully",

      user: populatedUser,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// =====================================================
// LOGIN
// =====================================================

async function login(req, res) {
  try {
    const { userName, password } = req.body;

    if (!userName || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await userModel
      .findOne({
        userName,
      })
      .populate("organisation", "name");

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        organisation: user.organisation._id,
        userName: user.userName,
        email: user.email,
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
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,

        organisation: {
          id: user.organisation._id,
          name: user.organisation.name,
        },

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
// GET CURRENT USER
// =====================================================

const getMe = async (req, res) => {
  try {
    const user = await userModel
      .findById(req.user.id)
      .select("-password")
      .populate("organisation", "name");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User is authenticated",
      user,
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

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

    const user = await userModel
      .findByIdAndUpdate(
        req.user.id,
        {
          userName,
          email,
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Username and email updated successfully",
      user,
    });
  } catch (error) {
    console.error("UPDATE PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
}

// =====================================================
// UPDATE PASSWORD
// =====================================================

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check old password
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid current password",
      });
    }

    // Hash new password
    const hashNewPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashNewPassword;

    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);

    return res.status(500).json({
      message: "Failed to update password",
    });
  }
}

// =====================================================
// GET CLIENTS
// =====================================================

async function getUser(req, res) {
  try {
    const clients = await userModel
      .find({
        role: {
          $in: ["client", "employee"],
        },
      })
      .populate("organisation", "name")
      .populate("assignedEmployee", "userName designation email")
      .select("userName email organisation role");

    return res.status(200).json({
      message: "Clients fetched successfully",
      users: clients,
    });
  } catch (error) {
    console.error("GET CLIENTS ERROR:", error);

    return res.status(500).json({
      message: "Unable to fetch clients",
    });
  }
}

// =====================================================
// SAVE FCM TOKEN
// =====================================================

async function saveFcmToken(req, res) {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "FCM token is required",
      });
    }

    await userModel.findByIdAndUpdate(
      req.user.id,
      {
        fcmToken,
      },
      {
        new: true,
      },
    );

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
// GET EMPLOYEES
// =====================================================

async function getEmployees(req, res) {
  try {
    const employees = await userModel
      .find({
        role: "employee",
        organisation: req.user.organisation,
      })
      .select("_id userName email designation organisation")
      .populate("organisation", "name");

    return res.status(200).json({
      message: "Employees fetched successfully",
      employees,
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
  getMe,
  updateProfile,
  updatePassword,
  getUser,
  saveFcmToken,
  getEmployees,
};
