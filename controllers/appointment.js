const Appointment = require("../models/appointment");
const Role = require("../models/role");
const User = require("../models/user");
const { sendError } = require("../utils/helper");
const { generateMailTransporter } = require("../utils/mail");

// * Route to book an appointment
exports.bookAppointment = async (req, res) => {
  const { fullName, email, dateOfAppointment, doctorSpeciality, reason } =
    req.body;
  const generalPhysicianId = req.user._id; // Logged-in General Physician ID

  try {
    // Fetch Role ID for "Patient"
    const patientRole = await Role.findOne({ name: "Patient" });
    const coordinatorRole = await Role.findOne({ name: "Coordinator" });

    if (!patientRole || !coordinatorRole)
      return sendError(res, "Required roles not found!", 404);

    // Now search for the patient using the role ID
    const patient = await User.findOne({
      fullName,
      email,
      roleId: patientRole._id,
    });

    if (!patient) return sendError(res, "Patient not found!", 404);

    // Create Appointment
    const appointment = new Appointment({
      patientId: patient._id,
      generalPhysicianId,
      dateOfAppointment,
      doctorSpeciality,
      reason,
    });

    await appointment.save();

    // Assign Appointment ID to User Model
    await User.findByIdAndUpdate(patient._id, {
      $push: { appointments: appointment._id },
    });

    // Fetch all Coordinators to send email notifications
    const coordinators = await User.find({
      roleId: coordinatorRole._id,
    }).select("email");

    if (coordinators.length === 0)
      return sendError(
        res,
        "No coordinators available to assign a doctor!",
        404
      );

    const coordinatorEmails = coordinators.map(
      coordinator => coordinator.email
    );

    // Send email notification
    const transport = generateMailTransporter();

    // Send email to the patient
    transport.sendMail({
      from: "generalPhysician@sanosea.com",
      to: patient.email,
      subject: "Your Appointment Has Been Successfully Booked!",
      html: `
            <h1>Appointment Confirmation</h1>
            <p>Dear ${patient.fullName},</p>
            <p>Your appointment has been successfully scheduled.</p>

            <h3>Appointment Details:</h3>
            <ul>
                <li><strong>Date:</strong> ${dateOfAppointment}</li>
                <li><strong>Doctor Specialty:</strong> ${doctorSpeciality}</li>
                <li><strong>Reason:</strong> ${reason}</li>
                <li><strong>Booked By:</strong> ${req.user.fullName} (General Physician)</li>
            </ul>

            <p>The coordinator will soon assign a doctor to your case. You will receive further updates via email.</p>

            <p>If you have any questions, please contact our support team.</p>

            <p>Best regards,</p>
            <p><strong>SanoSea App Team</strong></p>
        `,
    });

    // Send email notification to all Coordinators
    transport.sendMail({
      from: "generalPhysician@sanosea.com",
      to: coordinatorEmails,
      subject: "New Appointment Requires Doctor Assignment",
      html: `
          <h1>Doctor Assignment Required</h1>
          <p>A new appointment has been booked and requires a doctor assignment.</p>
  
          <h3>Appointment Details:</h3>
          <ul>
              <li><strong>Patient Name:</strong> ${patient.fullName}</li>
              <li><strong>Date:</strong> ${dateOfAppointment}</li>
              <li><strong>Doctor Specialty:</strong> ${doctorSpeciality}</li>
              <li><strong>Reason:</strong> ${reason}</li>
              <li><strong>Booked By:</strong> ${req.user.fullName} (General Physician)</li>
          </ul>
  
          <p>Please review the appointment and assign a doctor accordingly.</p>
  
          <p>Best regards,</p>
          <p><strong>SanoSea Admin Team</strong></p>
        `,
    });

    res.status(201).json({
      message: `Appointment booked successfully! Coordinators will assign a doctor soon.`,
      appointment: appointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * Route to assign a doctor (Coordinator updates)
exports.assignDoctor = async (req, res) => {
  const { appointmentId } = req.params;
  const { doctorId } = req.body;

  try {
    // Fetch Appointment
    const appointment = await Appointment.findById(appointmentId).populate(
      "patientId generalPhysicianId"
    );
    if (!appointment) return sendError(res, "Appointment not found!", 404);

    // Fetch Doctor Details
    const doctor = await User.findById(doctorId);
    if (!doctor) return sendError(res, "Doctor not found!", 404);

    // Assign the Doctor
    appointment.assignedDoctorId = doctorId;
    await appointment.save();

    // Get patient & physician details
    const {
      patientId,
      generalPhysicianId,
      dateOfAppointment,
      doctorSpeciality,
      reason,
    } = appointment;
    const patient = patientId;
    const generalPhysician = generalPhysicianId;

    // Fetch Role ID for "Port Agent"
    const portAgentRole = await Role.findOne({ name: "Port Agent" });

    if (!portAgentRole)
      return sendError(res, "Port Agent role not found!", 404);

    // Fetch all Port Agents
    const portAgents = await User.find({ roleId: portAgentRole._id }).select(
      "email"
    );

    if (portAgents.length === 0)
      return sendError(res, "No Port Agents available to assign a cab!", 404);

    const portAgentEmails = portAgents.map(portAgent => portAgent.email);

    // Setup email transporter
    const transport = generateMailTransporter();

    // Send email to Assigned Doctor
    transport.sendMail({
      from: "coordinator@sanosea.com",
      to: doctor.email,
      subject: "New Appointment Assigned to You",
      html: `
          <h1>New Patient Appointment</h1>
          <p>Dear Dr. ${doctor.firstName},</p>
          <p>You have been assigned a new appointment.</p>
  
          <h3>Appointment Details:</h3>
          <ul>
              <li><strong>Patient Name:</strong> ${patient.fullName}</li>
              <li><strong>Date:</strong> ${dateOfAppointment}</li>
              <li><strong>Specialty Required:</strong> ${doctorSpeciality}</li>
              <li><strong>Reason:</strong> ${reason}</li>
              <li><strong>Booked By:</strong> Dr. ${generalPhysician.fullName} (General Physician)</li>
          </ul>
  
          <p>Please review the details and prepare for the appointment.</p>
  
          <p>Best regards,</p>
          <p><strong>SanoSea Admin Team</strong></p>
        `,
    });

    // Send email to Port Agent for cab arrangement
    transport.sendMail({
      from: "coordinator@sanosea.com",
      to: portAgentEmails,
      subject: "Cab Assignment Required for Patient",
      html: `
          <h1>Cab Booking Required for Patient</h1>
          <p>Dear Port Agent,</p>
          <p>A patient requires transportation for their upcoming appointment. If you are available, please arrange a cab for the patient and update the system with the details.</p>
  
          <h3>Patient & Appointment Details:</h3>
          <ul>
              <li><strong>Patient Name:</strong> ${patient.fullName}</li>
              <li><strong>Date:</strong> ${dateOfAppointment}</li>
              <li><strong>Specialty Required:</strong> ${doctorSpeciality}</li>
              <li><strong>Reason:</strong> ${reason}</li>
          </ul>
  
          <p>Thank you for assisting in providing smooth transportation for our patients.</p>
  
          <p>Best regards,</p>
          <p><strong>SanoSea Admin Team</strong></p>
        `,
    });

    res.status(200).json({
      message:
        "Doctor assigned successfully! Emails have been sent to the Doctor and all available Port Agents.",
      appointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * Fetch all appointments
exports.allAppointments = async (req, res) => {
  const { pageNo = 0, limit = 10, state } = req.query;
  try {
    // Build query dynamically based on state filter
    const query = {};
    if (state) query.currentStatus = state; // Apply filter only if state is provided

    // Get total count of users matching the query
    const totalAppointments = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query) // Query by currentStatus
      .populate("patientId", "profilePhoto fullName email phoneNumber") // Get patient details
      .populate("generalPhysicianId", "fullName email") // Get general physician details
      .populate("assignedDoctorId", "fullName email") // Get assigned doctor details
      .populate("cabDetails") // Get cab details if available
      .sort({ createdAt: -1 })
      .skip(parseInt(pageNo) * parseInt(limit)) // Pagination
      .limit(parseInt(limit)); // Limit results per page

    // Replace actual status with currentStatus before sending response
    const modifiedAppointments = appointments.map(appointment => ({
      ...appointment._doc, // Spread existing appointment data
      status: appointment.currentStatus, // Override `status` with `currentStatus`
    }));

    if (!appointments || appointments.length === 0) {
      return res.status(200).json({
        message: `No appointments found matching the state: ${state}.`,
        appointments: [], // Return an empty array
        pagination: {
          currentPage: parseInt(pageNo),
          limit: parseInt(limit),
          totalAppointments: 0, // Indicate no matching records
        },
      });
    }

    res.status(200).json({
      message: "Appointments retrieved successfully!",
      appointments: modifiedAppointments,
      pagination: {
        currentPage: parseInt(pageNo),
        limit: parseInt(limit),
        totalAppointments,
      },
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * fetch a single appointment by ID
exports.singleAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("patientId", "profilePhoto fullName email phoneNumber") // Get patient details
      .populate("generalPhysicianId", "fullName email") // Get general physician details
      .populate("assignedDoctorId", "fullName email") // Get assigned doctor details
      .populate("cabDetails"); // Get cab details if available

    if (!appointment) return sendError(res, "Appointment not found!", 404);

    // Override status with currentStatus
    const modifiedAppointment = {
      ...appointment._doc, // Spread existing data
      status: appointment.currentStatus, // Replace actual status
    };

    res.status(200).json({
      message: "Appointment retrieved successfully!",
      appointment: modifiedAppointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
