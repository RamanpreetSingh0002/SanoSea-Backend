const mongoose = require("mongoose");

const cabSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    cabNumber: {
      type: String,
      required: true,
    },
    driverName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    pickupTime: {
      type: String,
      required: true,
    },
    dropOffTime: {
      type: String,
      required: true,
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    dropOffLocation: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cab", cabSchema);
