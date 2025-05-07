const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generalPhysicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateOfAppointment: {
      type: Date,
      required: true,
    },
    doctorSpeciality: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "complete"],
      default: "confirmed",
    },
    currentStatus: {
      type: String,
      enum: ["New", "Waiting", "Upcoming", "Complete", "Past", "Cancelled"],
      default: "New",
    },
    cabDetails: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cab",
      default: null,
    },
  },
  { timestamps: true }
);

appointmentSchema.pre("save", function (next) {
  const today = new Date();
  const appointmentDate = new Date(this.dateOfAppointment);

  // ✅ Automatically update `currentStatus`
  if (this.status === "cancelled") {
    this.currentStatus = "Cancelled";
  } else if (!this.assignedDoctorId) {
    this.currentStatus = "Waiting"; // Waiting for doctor assignment
  } else if (
    appointmentDate >= today &&
    appointmentDate <= new Date(today.setDate(today.getDate() + 2))
  ) {
    this.currentStatus = "Upcoming"; // Appointment in next 2 days
  } else if (
    appointmentDate < today &&
    appointmentDate >= new Date(today.setDate(today.getDate() - 7))
  ) {
    this.currentStatus = "Complete"; // Appointment date crossed but within 1 week
    this.status = "complete"; // Update status to complete
  } else if (appointmentDate < new Date(today.setDate(today.getDate() - 7))) {
    this.currentStatus = "Past"; // Appointment date older than 1 week
  } else {
    this.currentStatus = "New"; // Default state
  }

  next();
});

module.exports = mongoose.model("Appointment", appointmentSchema);
