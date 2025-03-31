const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// user schema
const userSchema = new mongoose.Schema({
  profilePhoto: {
    type: Object,
    url: String,
    public_id: String,
    required: false,
  },
  fullName: {
    type: String,
    trim: true,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  // rememberMe: {
  //   type: Boolean,
  //   required: false,
  //   default: false,
  // },
  officeAddress: {
    type: String,
    required: false,
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
  role: {
    type: String,
    require: true,
    default: "Patient",
    enum: [
      "Admin",
      "Patient",
      "General Physician",
      "Audit Manager",
      "Doctor",
      "Port Agent",
      "Coordinator",
    ],
  },
});

// bcrypt and save the password
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// compare password (is it new or old)
userSchema.methods.comparePassword = async function (password) {
  const result = await bcrypt.compare(password, this.password);
  return result;
};

module.exports = mongoose.model("User", userSchema);
