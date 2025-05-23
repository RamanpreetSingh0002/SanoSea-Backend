const express = require("express");
const {
  signUp,
  signIn,
  verifyEmail,
  resendEmailVerification,
  forgetPassword,
  resetPassword,
  sendResetPasswordTokenStatus,
  changePassword,
  uploadProfilePhoto,
  updateUser,
  getPatientsByName,
  getDoctorsBySpeciality,
} = require("../controllers/user");
const { uploadImage } = require("../middlewares/multer");
const { isAuth } = require("../middlewares/auth");
const { isValidPassResetToken } = require("../middlewares/user");
const {
  signInValidator,
  validate,
  userValidator,
} = require("../middlewares/validator");

const usersRouter = express.Router();

// making different users Router
usersRouter.post(
  "/sign-up",
  uploadImage.single("profilePhoto"),
  userValidator,
  validate,
  signUp
);
usersRouter.post("/sign-in", signInValidator, validate, signIn);
usersRouter.post("/verify-email", verifyEmail);
usersRouter.post("/resend-email-verification-token", resendEmailVerification);
usersRouter.post("/forget-password", forgetPassword);

usersRouter.post("/verify-pass-reset-token", sendResetPasswordTokenStatus);
usersRouter.post("/reset-password", isValidPassResetToken, resetPassword);
usersRouter.post("/change-password", changePassword);

usersRouter.get("/is-auth", isAuth, (req, res) => {
  const { user } = req;
  res.json({
    user: {
      id: user._id,
      profilePhoto: user?.profilePhoto,
      fullName: user.fullName,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      officeAddress: user?.officeAddress,
      isVerified: user.isVerified,
      role: user?.roleId?.name,
    },
  });
});

usersRouter.post(
  "/upload-profile-photo",
  isAuth,
  uploadImage.single("profilePhoto"),
  uploadProfilePhoto
);

// Update user profile
usersRouter.put("/update-user/:userId", isAuth, updateUser);
usersRouter.get("/patients", isAuth, getPatientsByName);
usersRouter.get("/doctors", isAuth, getDoctorsBySpeciality);

module.exports = usersRouter;
