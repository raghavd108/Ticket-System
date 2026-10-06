const complaintModel = require("../model/complain.model");
const userModel = require("../model/user.model");
const notifiModel = require("../model/notification.model");

const { uploadImage } = require("../services/imagekitService");
const { getImageUrl } = require("../services/fileService");
const { sendNotification } = require("../services/fcmService");

// FORMAT COMPLAINT RESPONSE

const formatComplaint = (complaint) => {
  const complaintData = complaint.toObject ? complaint.toObject() : complaint;

  return {
    ...complaintData,

    image: (complaintData.image || []).map((image) => ({
      ...image,
      url: getImageUrl(image.fileName),
    })),
  };
};

// CREATE COMPLAINT

async function complain(req, res) {
  try {
    const { module, problem } = req.body;

    if (!module || !problem) {
      return res.status(400).json({
        message: "Module and problem are required",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Complaint image is required",
      });
    }

    const user = req.user.id;

    const organisation = req.user.organisation?._id || req.user.organisation;

    if (!organisation) {
      return res.status(400).json({
        message: "Organisation not found",
      });
    }

    // UPLOAD IMAGES

    const uploadImages = [];

    for (const file of req.files) {
      const result = await uploadImage(file.buffer);

      uploadImages.push({
        fileName: result.fileName,
      });
    }

    // CREATE COMPLAINT

    const complaint = await complaintModel.create({
      module,
      problem,
      user,
      organisation,
      status: "pending",
      image: uploadImages,
    });

    // NOTIFY ADMINS AND EMPLOYEES

    try {
      // 1. Get all admins
      const admins = await userModel
        .find({
          role: "admin",
        })
        .select("_id userName role fcmToken");

      const client = await userModel
        .findById(user)
        .select("userName assignedEmployee");

      const assignedEmployees = client?.assignedEmployee?.length
        ? await userModel
            .find({
              _id: { $in: client.assignedEmployee },
              role: "employee",
            })
            .select("_id userName role fcmToken")
        : [];

      // 4. Admins + assigned employees
      const notificationUsers = [...admins, ...assignedEmployees];

      // 5. Send notification
      for (const notificationUser of notificationUsers) {
        // Save notification in database
        await notifiModel.create({
          user: notificationUser._id,
          title: "New Ticket Created",
          body: `${req.user.userName || "A client"} created a new ticket`,
          type: "NEW_TICKET",
          complaint: complaint._id,
        });

        // Send FCM notification to THIS user's token
        if (notificationUser.fcmToken) {
          console.log(
            "Sending notification to:",
            notificationUser.userName,
            notificationUser.role,
            notificationUser.fcmToken,
          );

          await sendNotification({
            fcmToken: notificationUser.fcmToken,
            title: "New Ticket Created",
            body: `${req.user.userName || "A client"} created a new ticket`,
            type: "NEW_TICKET",
            targetRole: notificationUser.role,
          });
        }
      }
    } catch (notificationError) {
      console.log("Notification error:", notificationError);
    }

    // FORMAT RESPONSE

    const formattedComplaint = formatComplaint(complaint);

    return res.status(201).json({
      message: "Complaint registered successfully",
      complaint: formattedComplaint,
    });
  } catch (error) {
    console.error("Complaint creation error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
}

// GET COMPLAINTS

const getComplain = async (req, res) => {
  try {
    let complaints;

    // ADMIN

    if (req.user.role === "admin") {
      complaints = await complaintModel
        .find()
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({
          createdAt: -1,
        });
    }

    // EMPLOYEE
    else if (req.user.role === "employee") {
      const assignedClients = await userModel
        .find({
          role: "client",
          assignedEmployee: req.user.id,
        })
        .select("_id");

      const clientIds = assignedClients.map((user) => user._id);

      if (clientIds.length === 0) {
        return res.status(200).json({
          complains: [],
        });
      }

      complaints = await complaintModel
        .find({
          user: {
            $in: clientIds,
          },
        })
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({
          createdAt: -1,
        });
    }

    // CLIENT
    else {
      const organisation = req.user.organisation?._id || req.user.organisation;

      complaints = await complaintModel
        .find({
          user: req.user.id,
          organisation,
        })
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({
          createdAt: -1,
        });
    }

    // ADD FULL IMAGE URL

    const formattedComplaints = complaints.map(formatComplaint);

    return res.status(200).json({
      complains: formattedComplaints,
    });
  } catch (error) {
    console.log("Get complaints error:", error);

    return res.status(500).json({
      message: "Unable to fetch complaints",
    });
  }
};

// UPDATE COMPLAINT STATUS

const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required",
      });
    }

    const complaint = await complaintModel.findById(id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found",
      });
    }

    // EMPLOYEE AUTHORIZATION

    if (req.user.role === "employee") {
      const assignedClient = await userModel.findOne({
        _id: complaint.user,
        role: "client",
        assignedEmployee: req.user.id,
      });

      if (!assignedClient) {
        return res.status(403).json({
          message: "You are not authorized to update this complaint",
        });
      }
    }

    // ADMIN AUTHORIZATION
    else if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to update complaint status",
      });
    }

    // UPDATE STATUS

    complaint.status = status;

    await complaint.save();

    // NOTIFY CLIENT

    try {
      const client = await userModel.findById(complaint.user);

      if (client) {
        await notifiModel.create({
          user: client._id,
          title: "Ticket Status Updated",
          body: `Your ticket status is now ${status}`,
          type: "STATUS_UPDATE",
          complaint: complaint._id,
        });

        if (client.fcmToken) {
          await sendNotification({
            fcmToken: client?.fcmToken,
            title: "Ticket Status Updated",
            body: `Your ticket status is now ${status}`,
            type: "STATUS_UPDATE",
            targetRole: "client",
          });
        }
      }
    } catch (notificationError) {
      console.log("Client notification error:", notificationError);
    }

    // RETURN FULL IMAGE URL

    const formattedComplaint = formatComplaint(complaint);

    return res.status(200).json({
      message: "Status updated successfully",
      complaint: formattedComplaint,
    });
  } catch (error) {
    console.log("Status update error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
};

// SEARCH COMPLAINT

async function searchCompalin(req, res) {
  try {
    const { q } = req.query;

    // Validate search query
    if (!q || !q.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const searchText = q.trim();

    // Common search condition
    const searchQuery = {
      $or: [
        {
          module: {
            $regex: searchText,
            $options: "i",
          },
        },
        {
          problem: {
            $regex: searchText,
            $options: "i",
          },
        },
      ],
    };

    let complaints = [];

    // ADMIN

    if (req.user.role === "admin") {
      complaints = await complaintModel
        .find(searchQuery)
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({ createdAt: -1 });
    }

    // EMPLOYEE
    else if (req.user.role === "employee") {
      const assignedClients = await userModel
        .find({
          role: "client",
          assignedEmployee: req.user._id || req.user.id,
        })
        .select("_id");

      const clientIds = assignedClients.map((client) => client._id);

      // Employee has no assigned clients
      if (clientIds.length === 0) {
        return res.status(200).json({
          message: "Complaint fetched successfully",
          complaint: [],
        });
      }

      complaints = await complaintModel
        .find({
          $and: [
            {
              user: {
                $in: clientIds,
              },
            },
            searchQuery,
          ],
        })
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({ createdAt: -1 });
    }

    // CLIENT
    else if (req.user.role === "client") {
      const organisation = req.user.organisation?._id || req.user.organisation;

      complaints = await complaintModel
        .find({
          $and: [
            {
              user: req.user._id || req.user.id,
            },
            {
              organisation: organisation,
            },
            searchQuery,
          ],
        })
        .populate("user", "userName email")
        .populate("organisation", "name orgType")
        .sort({ createdAt: -1 });
    }

    // UNKNOWN ROLE
    else {
      return res.status(403).json({
        message: "You are not authorized to search complaints",
      });
    }

    // FORMAT COMPLAINTS

    const formattedComplaints = complaints.map(formatComplaint);

    return res.status(200).json({
      message: "Complaint fetched successfully",
      complaint: formattedComplaints,
    });
  } catch (error) {
    console.error("Complaint search error:", error);

    return res.status(500).json({
      message: "Unable to search complaints",
      error: error.message,
    });
  }
}

module.exports = {
  complain,
  getComplain,
  updateComplaintStatus,
  searchCompalin,
};
