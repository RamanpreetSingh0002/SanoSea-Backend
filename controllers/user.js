const jwt = require("jsonwebtoken");
const { isValidObjectId } = require("mongoose");

const User = require("../models/user");
const {
  sendError,
  uploadImageToCloud,
  generateRandomByte,
} = require("../utils/helper");
const {
  generateOTP,
  mailTransporter,
  generateMailTransporter,
} = require("../utils/mail");
const emailVerificationToken = require("../models/emailVerificationToken");
const passwordResetToken = require("../models/passwordResetToken");

// create user
exports.signUp = async (req, res) => {
  const { fullName, phoneNumber, email, password, officeAddress } = req.body;
  const { file } = req;

  const oldUser = await User.findOne({ email });
  if (oldUser) return sendError(res, "This email already in use!");

  const newUser = new User({
    fullName,
    phoneNumber,
    email,
    password,
    officeAddress,
  });

  if (file) {
    const { url, public_id } = await uploadImageToCloud(file.path);
    newUser.profilePhoto = { url, public_id };
  }

  await newUser.save();

  // generate 6 digit OTP
  let OTP = generateOTP();

  // store OTP inside our DB
  const newEmailVerificationToken = new emailVerificationToken({
    owner: newUser._id,
    token: OTP,
  });

  await newEmailVerificationToken.save();

  // * send that OTP to out user
  // var transport = mailTransporter();
  var transport = generateMailTransporter();

  // * sending email verification OTP to mail
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: newUser.email,
    subject: "Email Verification",
    html: `
        <p>Your verification OTP</p>
        <h1>${OTP}</h1>
      `,
  });

  res.status(201).json({
    user: {
      id: newUser._id,
      profilePhoto: newUser?.profilePhoto?.url,
      fullName: newUser.fullName,
      phoneNumber: newUser.phoneNumber,
      email: newUser.email,
      password: newUser.password,
      officeAddress: newUser?.officeAddress,
    },
    // message:
    //   "Please verify your email. OTP has been sent to your email account!",
  });
};

// verify email
exports.verifyEmail = async (req, res) => {
  const { userId, OTP } = req.body;

  if (!isValidObjectId(userId)) return sendError(res, "Invalid user!");

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);

  if (user.isVerified) return sendError(res, "User is already verified!");

  const token = await emailVerificationToken.findOne({ owner: userId });
  if (!token) return sendError(res, "Token not found!");

  const isMatched = await token.compareToken(OTP);
  if (!isMatched) return sendError(res, "Please submit a valid OTP");

  user.isVerified = true;
  await user.save();

  await emailVerificationToken.findByIdAndDelete(token._id);

  var transport = generateMailTransporter();
  // var transport = mailTransporter();

  // * sending welcome email to mail
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: user.email,
    subject: "Welcome Email",
    html: "<h1>Welcome to our app and thanks for choosing us.</h1>",
  });

  // const htmlContent = "<h1>Welcome to our app and thanks for choosing us.</h1>";

  // await sendEmail(user.name, user.email, "Welcome Email", htmlContent);

  // const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.json({
    user: {
      id: user._id,
      profilePhoto: user?.profilePhoto?.url,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      email: user.email,
      password: user.password,
      officeAddress: user?.officeAddress,

      // token: jwtToken,
      isVerified: user.isVerified,
      role: user.role,
    },
    message: "Your email is verified.",
  });
};

// resend email verification OTP
exports.resendEmailVerification = async (req, res) => {
  const { userId } = req.body;

  const user = await User.findById(userId);
  if (!user) return sendError(res, "User not found!", 404);

  if (user.isVerified) return sendError(res, "This email is already verified!");

  const existingToken = await emailVerificationToken.findOne({
    owner: userId,
  });

  // Delete the existing token, if it exists
  if (existingToken) {
    await emailVerificationToken.findByIdAndDelete(existingToken._id);
  }

  // generate 6 digit OTP
  let OTP = generateOTP();

  // store OTP inside our DB
  const newEmailVerificationToken = new emailVerificationToken({
    owner: user._id,
    token: OTP,
  });

  await newEmailVerificationToken.save();

  // * send that OTP to out user
  // var transport = mailTransporter();

  var transport = generateMailTransporter();

  // * sending email verification OTP to mail
  transport.sendMail({
    from: "verification@reviewapp.com",
    to: user.email,
    subject: "Email Verification",
    html: `
      <p>Your verification OTP</p>
      <h1>${OTP}</h1>
    `,
  });

  // const htmlContent = `
  //   <p>Your verification OTP</p>
  //   <h1>${OTP}</h1>
  // `;

  // await sendEmail(user.name, user.email, "Email Verification", htmlContent);

  res.json({
    message: "New OTP has been sent to your registered email account!",
  });
};

// forget password
exports.forgetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) return sendError(res, "Email is Missing!");

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "User not found!", 404);

  const alreadyHasToken = await passwordResetToken.findOne({ owner: user._id });
  if (alreadyHasToken)
    return sendError(
      res,
      "Only after one hour you can request for another token!"
    );

  const token = await generateRandomByte();
  const newPasswordResetToken = await passwordResetToken({
    owner: user._id,
    token,
  });
  await newPasswordResetToken.save();

  // replace with live server link
  // http://localhost:3000
  // https://filmster.netlify.app
  const resetPasswordUrl = `http://localhost:3000/auth/reset-password?token=${token}&id=${user._id}`;

  // var transport = mailTransporter();

  const transport = generateMailTransporter();

  // * sending reset password link to mail
  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Reset Password Link",
    html: `
       <p>Click here to reset password</p>
       <a href='${resetPasswordUrl}'>Change Password</a>
    `,
  });

  // const htmlContent = `
  //   <p>Click here to reset password</p>
  //   <a href='${resetPasswordUrl}'>Change Password</a>
  // `;

  // await sendEmail(user.name, user.email, "Reset Password Link", htmlContent);

  res.json({
    message: "Link sent to your email!",
  });
};

// reset password token(OTP)
exports.sendResetPasswordTokenStatus = (req, res) => {
  res.json({ valid: true });
};

// reset password
exports.resetPassword = async (req, res) => {
  const { newPassword, userId } = req.body;

  const user = await User.findById(userId);
  const matched = await user.comparePassword(newPassword);
  if (matched)
    return sendError(
      res,
      "The new password must be different from the old one!"
    );

  user.password = newPassword;
  await user.save();

  await passwordResetToken.findByIdAndDelete(req.resetToken._id);

  // const transport = generateMailTransporter();
  var transport = mailTransporter();

  // * sending password reset successful message to mail
  transport.sendMail({
    from: "security@reviewapp.com",
    to: user.email,
    subject: "Password Reset Successfully",
    html: `
       <h1>Password Reset Successfully</h1>
       <p'>Now you can use new password.</p>
    `,
  });

  // const htmlContent = `
  //   <h1>Password Reset Successfully</h1>
  //   <p'>Now you can use new password.</p>
  // `;

  // await sendEmail(
  //   user.name,
  //   user.email,
  //   "Password Reset Successfully",
  //   htmlContent
  // );

  res.json({
    message: "Password reset successfully, now you can use new password.",
  });
};

// Sign In
exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return sendError(res, "Invalid login credentials!", 404);

  const matched = await user.comparePassword(password);
  if (!matched) return sendError(res, "Invalid login credentials!", 404);

  // const { _id, name, role, isVerified } = user;
  const { _id, fullName, phoneNumber, role } = user;

  const jwtToken = jwt.sign({ userId: _id }, process.env.JWT_SECRET);
  res.json({
    user: { id: _id, fullName, phoneNumber, email, role, token: jwtToken },
    // user: { id: _id, name, email, role, token: jwtToken },
  });
};
