const cron = require("node-cron");
const Appointment = require("../models/appointment.js");

const updateAppointmentStatuses = async () => {
  // Runs at midnight daily
  console.log("Updating appointment statuses...");

  const today = new Date();
  const appointments = await Appointment.find();

  for (const appointment of appointments) {
    const appointmentDate = new Date(appointment.dateOfAppointment);

    if (appointment.status === "cancelled") {
      appointment.currentStatus = "Cancelled";
    } else if (!appointment.assignedDoctorId) {
      appointment.currentStatus = "Waiting"; // Waiting for doctor assignment
    } else if (
      appointmentDate >= today &&
      appointmentDate <= new Date(today.setDate(today.getDate() + 2))
    ) {
      appointment.currentStatus = "Upcoming";
    } else if (
      appointmentDate < today &&
      appointmentDate >= new Date(today.setDate(today.getDate() - 7))
    ) {
      appointment.currentStatus = "Complete";
      appointment.status = "complete"; // Update status field
    } else if (appointmentDate < new Date(today.setDate(today.getDate() - 7))) {
      appointment.currentStatus = "Past";
    } else {
      appointment.currentStatus = "New";
    }

    await appointment.save();
  }

  console.log("Appointment statuses updated successfully!");
};

// Schedule Cron Job (Runs at midnight daily)
cron.schedule("0 0 * * *", updateAppointmentStatuses);

module.exports = updateAppointmentStatuses;
