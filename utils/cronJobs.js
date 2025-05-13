const cron = require("node-cron");
const Appointment = require("../models/appointment.js");

const updateAppointmentStatuses = async () => {
  // Runs at midnight daily
  console.log("Updating appointment statuses...");

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1); // Yesterday for marking completed appointments

  const appointments = await Appointment.find();

  for (const appointment of appointments) {
    const appointmentDate = new Date(appointment.dateOfAppointment);
    appointmentDate.setHours(0, 0, 0, 0); // Ensure consistency in comparison

    const dayAfterAppointment = new Date(appointmentDate);
    dayAfterAppointment.setDate(appointmentDate.getDate() + 1); // Day after the appointment

    if (appointment.status === "cancelled") {
      appointment.currentStatus = "Cancelled";
    } else if (!appointment.assignedDoctorId) {
      if (today >= dayAfterAppointment) {
        appointment.currentStatus = "Cancelled"; // Automatically cancel if no doctor assigned and date passed
        appointment.status = "cancelled";
      } else {
        appointment.currentStatus = "Waiting"; // Waiting for doctor assignment
      }
    } else if (
      appointmentDate >= today &&
      appointmentDate <= new Date(today.setDate(today.getDate() + 2))
    ) {
      appointment.currentStatus = "Upcoming";
    } else if (appointmentDate.getTime() === yesterday.getTime()) {
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
