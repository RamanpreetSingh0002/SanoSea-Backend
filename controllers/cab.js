const Appointment = require("../models/appointment");
const Cab = require("../models/cab");
const { sendError } = require("../utils/helper");
const { generateMailTransporter } = require("../utils/mail");

// * Route for Port Agents to add cab details
exports.addCab = async (req, res) => {
  const { appointmentId } = req.params;
  const portAgentId = req.user._id; // Get Port Agent ID from logged-in user
  const {
    cabNumber,
    driverName,
    phoneNumber,
    pickupTime,
    dropOffTime,
    pickupLocation,
    dropOffLocation,
  } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId).populate(
      "patientId"
    );
    if (!appointment) return sendError(res, "Appointment not found!", 404);

    const cab = new Cab({
      appointmentId,
      cabNumber,
      driverName,
      phoneNumber,
      pickupTime,
      dropOffTime,
      pickupLocation,
      dropOffLocation,
    });

    await cab.save();

    // Link cab & port agent to appointment
    appointment.cabDetails = cab._id;
    appointment.portAgentId = portAgentId;
    await appointment.save();

    // Fetch Patient Details
    const patient = appointment.patientId;

    // Setup email transporter
    const transport = generateMailTransporter();

    // Send email to Patient with updated cab details
    transport.sendMail({
      from: "portAgent@sanosea.com",
      to: patient.email,
      subject: "Cab Details for Your Upcoming Appointment",
      html: `
          <h1>Your Cab Booking Details</h1>
          <p>Dear ${patient.fullName},</p>
          <p>Cab details have been updated for your upcoming appointment.</p>
  
          <h3>Appointment Details:</h3>
          <ul>
              <li><strong>Date:</strong> ${appointment.dateOfAppointment}</li>
              <li><strong>Specialty Required:</strong> ${appointment.doctorSpeciality}</li>
              <li><strong>Reason:</strong> ${appointment.reason}</li>
          </ul>
  
          <h3>Cab Details:</h3>
          <ul>
              <li><strong>Cab Number:</strong> ${cab.cabNumber}</li>
              <li><strong>Driver Name:</strong> ${cab.driverName}</li>
              <li><strong>Driver Phone:</strong> ${cab.phoneNumber}</li>
              <li><strong>Pickup Location:</strong> ${cab.pickupLocation}</li>
              <li><strong>Drop Off Location:</strong> ${cab.dropOffLocation}</li>
              <li><strong>Pickup Time:</strong> ${cab.pickupTime}</li>
              <li><strong>Drop Off Time:</strong> ${cab.dropOffTime}</li>
          </ul>
  
          <p>If you have any questions regarding transportation, please contact our support team.</p>
  
          <p>Best regards,</p>
          <p><strong>SanoSea Admin Team</strong></p>
        `,
    });

    res.status(201).json({
      message: "Cab details added successfully! Email sent to patient.",
      appointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
