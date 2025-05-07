const express = require("express");
const { isAuth, isAdmin, isAdminOrSubAdmin } = require("../middlewares/auth");
const {
  create,
  getSubAdmin,
  getAuditManagers,
  getPortAgents,
  getPatients,
  getDoctors,
  getGeneralPhysician,
  getUsersByRoles,
  getUserById,
  deleteUser,
  updateUserState,
  updateUser,
} = require("../controllers/admin");
const { uploadFile } = require("../middlewares/multer");

const adminRouter = express.Router();

adminRouter.post(
  "/create",
  isAuth,
  isAdmin,
  uploadFile.single("licenseProof"),
  create
);

adminRouter.get("/sub-admin-list", isAuth, getSubAdmin);
adminRouter.get("/audit-manager-list", isAuth, getAuditManagers);
adminRouter.get("/port-agent-list", isAuth, getPortAgents);
adminRouter.get("/patient-list", isAuth, getPatients);
adminRouter.get("/doctors-list", isAuth, getDoctors);
adminRouter.get("/general-physician-list", isAuth, getGeneralPhysician);

adminRouter.get("/users-by-roles", isAuth, isAdminOrSubAdmin, getUsersByRoles);
adminRouter.get("/user/:userId", isAuth, isAdminOrSubAdmin, getUserById);

adminRouter.delete("/user/:userId", isAuth, isAdminOrSubAdmin, deleteUser);
adminRouter.put(
  "/user/:userId",
  isAuth,
  isAdminOrSubAdmin,
  uploadFile.single("licenseProof"),
  updateUser
);

// Update user state (Active/Deactivate)
adminRouter.put(
  "/update-state/:userId",
  isAuth,
  isAdminOrSubAdmin,
  updateUserState
);

module.exports = adminRouter;
