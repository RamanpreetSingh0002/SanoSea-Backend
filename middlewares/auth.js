const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/helper");
const User = require("../models/user");
require("../models/role");

exports.isAuth = async (req, res, next) => {
  const token = req.headers?.authorization;
  if (!token) return sendError(res, "Invalid token!");

  const jwtToken = token.split(" ")[1];
  if (!jwtToken) return sendError(res, "Invalid token!");

  const decode = jwt.verify(jwtToken, process.env.JWT_SECRET);
  const { userId } = decode;

  const user = await User.findById(userId).populate("roleId");
  if (!user) return sendError(res, "Invalid token, user not found!", 404);

  req.user = user;
  next();
};

exports.isAdmin = (req, res, next) => {
  const { user } = req;

  if (!user) return sendError(res, "Unauthorized access!");

  if (user.roleId?.name !== "Admin")
    return sendError(res, "Unauthorized access!");

  next();
};

exports.isAdminOrSubAdmin = (req, res, next) => {
  const { user } = req;

  if (!user) return sendError(res, "Unauthorized access!");

  const allowedRoles = ["Admin", "Coordinator", "Audit Manager"]; // Allow both Admin & Sub-Admin roles

  if (!allowedRoles.includes(user.roleId?.name)) {
    return sendError(res, "Unauthorized access!");
  }

  next(); // If user is Admin or Sub-Admin, proceed
};

exports.isGeneralPhysician = (req, res, next) => {
  const { user } = req;

  if (!user) return sendError(res, "Unauthorized access!");

  if (user.roleId?.name !== "General Physician")
    return sendError(res, "Unauthorized access!");

  next();
};

exports.isCoordinator = (req, res, next) => {
  const { user } = req;

  if (!user) return sendError(res, "Unauthorized access!");

  if (user.roleId?.name !== "Coordinator")
    return sendError(res, "Unauthorized access!");

  next();
};

exports.isPortAgent = (req, res, next) => {
  const { user } = req;

  if (!user) return sendError(res, "Unauthorized access!");

  if (user.roleId?.name !== "Port Agent")
    return sendError(res, "Unauthorized access!");

  next();
};
