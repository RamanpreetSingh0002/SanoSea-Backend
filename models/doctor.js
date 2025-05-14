const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctorSpeciality: {
    type: String,
    required: true,
  },
  licenseProof: {
    type: Object,
    url: String,
    public_id: String,
    required: false,
  },
  availability: {
    days: [{ type: String, required: true }], // Example: ["Monday", "Wednesday"]
    hours: [{ type: String, required: true }], // Example: ["09:00 AM - 12:00 PM"]
  },
});

module.exports = mongoose.model("Doctor", doctorSchema);
