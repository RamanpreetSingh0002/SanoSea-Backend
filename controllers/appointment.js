const Appointment = require("../models/appointment");
const Role = require("../models/role");
const User = require("../models/user");
const { sendError } = require("../utils/helper");
const { generateMailTransporter } = require("../utils/mail");
const mongoose = require("mongoose");
// * Route to book an appointment
exports.bookAppointment = async (req, res) => {
  const {
    fullName,
    email,
    dateOfAppointment,
    timeOfAppointment,
    doctorSpeciality,
    reason,
  } = req.body;
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
      timeOfAppointment,
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
    //? const transport = generateMailTransporter();

    // Send email to the patient
    // ?transport.sendMail({
    //   from: "generalPhysician@sanosea.com",
    //   to: patient.email,
    //   subject: "Your Appointment Has Been Successfully Booked!",
    //   html: `
    //         <h1>Appointment Confirmation</h1>
    //         <p>Dear ${patient.fullName},</p>
    //         <p>Your appointment has been successfully scheduled.</p>

    //         <h3>Appointment Details:</h3>
    //         <ul>
    //             <li><strong>Date:</strong> ${dateOfAppointment}</li>
    //             <li><strong>Doctor Specialty:</strong> ${doctorSpeciality}</li>
    //             <li><strong>Reason:</strong> ${reason}</li>
    //             <li><strong>Booked By:</strong> ${req.user.fullName} (General Physician)</li>
    //         </ul>

    //         <p>The coordinator will soon assign a doctor to your case. You will receive further updates via email.</p>

    //         <p>If you have any questions, please contact our support team.</p>

    //         <p>Best regards,</p>
    //         <p><strong>SanoSea App Team</strong></p>
    //     `,
    // });

    // Send email notification to all Coordinators
    // ?transport.sendMail({
    //   from: "generalPhysician@sanosea.com",
    //   to: coordinatorEmails,
    //   subject: "New Appointment Requires Doctor Assignment",
    //   html: `
    //       <h1>Doctor Assignment Required</h1>
    //       <p>A new appointment has been booked and requires a doctor assignment.</p>

    //       <h3>Appointment Details:</h3>
    //       <ul>
    //           <li><strong>Patient Name:</strong> ${patient.fullName}</li>
    //           <li><strong>Date:</strong> ${dateOfAppointment}</li>
    //           <li><strong>Doctor Specialty:</strong> ${doctorSpeciality}</li>
    //           <li><strong>Reason:</strong> ${reason}</li>
    //           <li><strong>Booked By:</strong> ${req.user.fullName} (General Physician)</li>
    //       </ul>

    //       <p>Please review the appointment and assign a doctor accordingly.</p>

    //       <p>Best regards,</p>
    //       <p><strong>SanoSea Admin Team</strong></p>
    //     `,
    // });

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
  const coordinatorId = req.user._id; // Logged-in Coordinator ID

  try {
    // Fetch Appointment
    const appointment = await Appointment.findById(appointmentId).populate(
      "patientId generalPhysicianId"
    );
    if (!appointment) return sendError(res, "Appointment not found!", 404);

    // Fetch Doctor Details
    const doctor = await User.findById(doctorId);
    if (!doctor) return sendError(res, "Doctor not found!", 404);

    // Assign the Coordinator and Doctor
    appointment.coordinatorId = coordinatorId;
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
    // ?const transport = generateMailTransporter();

    // Send email to Assigned Doctor
    // ?transport.sendMail({
    //   from: "coordinator@sanosea.com",
    //   to: doctor.email,
    //   subject: "New Appointment Assigned to You",
    //   html: `
    //       <h1>New Patient Appointment</h1>
    //       <p>Dear Dr. ${doctor.firstName},</p>
    //       <p>You have been assigned a new appointment.</p>

    //       <h3>Appointment Details:</h3>
    //       <ul>
    //           <li><strong>Patient Name:</strong> ${patient.fullName}</li>
    //           <li><strong>Date:</strong> ${dateOfAppointment}</li>
    //           <li><strong>Specialty Required:</strong> ${doctorSpeciality}</li>
    //           <li><strong>Reason:</strong> ${reason}</li>
    //           <li><strong>Booked By:</strong> Dr. ${generalPhysician.fullName} (General Physician)</li>
    //       </ul>

    //       <p>Please review the details and prepare for the appointment.</p>

    //       <p>Best regards,</p>
    //       <p><strong>SanoSea Admin Team</strong></p>
    //     `,
    // });

    // Send email to Port Agent for cab arrangement
    // ?transport.sendMail({
    //   from: "coordinator@sanosea.com",
    //   to: portAgentEmails,
    //   subject: "Cab Assignment Required for Patient",
    //   html: `
    //       <h1>Cab Booking Required for Patient</h1>
    //       <p>Dear Port Agent,</p>
    //       <p>A patient requires transportation for their upcoming appointment. If you are available, please arrange a cab for the patient and update the system with the details.</p>

    //       <h3>Patient & Appointment Details:</h3>
    //       <ul>
    //           <li><strong>Patient Name:</strong> ${patient.fullName}</li>
    //           <li><strong>Date:</strong> ${dateOfAppointment}</li>
    //           <li><strong>Specialty Required:</strong> ${doctorSpeciality}</li>
    //           <li><strong>Reason:</strong> ${reason}</li>
    //       </ul>

    //       <p>Thank you for assisting in providing smooth transportation for our patients.</p>

    //       <p>Best regards,</p>
    //       <p><strong>SanoSea Admin Team</strong></p>
    //     `,
    // });

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
  const { pageNo = 0, limit = 10, state, date } = req.query;

  try {
    // Build query dynamically based on state filter
    const query = {};
    if (state) query.currentStatus = state; // Apply filter only if state is provided

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1); // Ensure time range covers the full day
      query.dateOfAppointment = { $gte: targetDate, $lt: nextDay }; // Filter by selected date
    }

    // Get total count of users matching the query
    const totalAppointments = await Appointment.countDocuments(query);

    const appointments = await Appointment.find(query) // Query by currentStatus
      .populate("patientId", "profilePhoto fullName email phoneNumber") // Get patient details
      .populate("generalPhysicianId", "profilePhoto fullName email") // Get general physician details
      .populate("assignedDoctorId", "profilePhoto fullName email") // Get assigned doctor details
      .populate("coordinatorId", "profilePhoto fullName email") // Get coordinator details
      .populate("portAgentId", "profilePhoto fullName email")
      .populate("cabDetails") // Get cab details if available
      .sort({ dateOfAppointment: -1 })
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
      .populate({
        path: "patientId",
        select: "profilePhoto fullName email phoneNumber roleId",
        populate: { path: "roleId", select: "name" },
      })
      .populate({
        path: "generalPhysicianId",
        select: "profilePhoto fullName email phoneNumber roleId",
        populate: { path: "roleId", select: "name" },
      })
      .populate({
        path: "assignedDoctorId",
        select:
          "profilePhoto fullName email phoneNumber doctorProfile officeAddress",
        populate: { path: "doctorProfile", select: "doctorSpeciality" },
      })
      .populate({
        path: "portAgentId",
        select: "profilePhoto fullName email phoneNumber roleId",
        populate: { path: "roleId", select: "name" },
      })
      .populate({
        path: "cabDetails",
        select:
          "pickupLocation dropOffLocation pickupTime dropOffTime cabNumber driverName phoneNumber",
      });

    if (!appointment) return sendError(res, "Appointment not found!", 404);

    // Format response with desired fields
    const modifiedAppointment = {
      _id: appointment._id,
      dateOfAppointment: appointment?.dateOfAppointment,
      timeOfAppointment: appointment?.timeOfAppointment,
      reason: appointment?.reason,
      status: appointment?.currentStatus,

      // Patient details
      patient: appointment?.patientId
        ? {
            fullName: appointment?.patientId?.fullName,
            profilePhoto: appointment?.patientId?.profilePhoto?.url,
            email: appointment?.patientId.email,
            phoneNumber: appointment?.patientId?.phoneNumber,
            role: appointment?.patientId?.roleId?.name || "N/A",
          }
        : null,

      // General Physician details
      generalPhysician: appointment?.generalPhysicianId
        ? {
            fullName: appointment?.generalPhysicianId?.fullName,
            profilePhoto: appointment?.generalPhysicianId?.profilePhoto?.url,
            email: appointment?.generalPhysicianId?.email,
            phoneNumber: appointment?.generalPhysicianId?.phoneNumber,
            role: appointment?.generalPhysicianId?.roleId?.name || "N/A",
          }
        : null,

      // Assigned Doctor details
      doctor: appointment?.assignedDoctorId
        ? {
            fullName: appointment?.assignedDoctorId?.fullName,
            profilePhoto: appointment?.assignedDoctorId?.profilePhoto?.url,
            email: appointment?.assignedDoctorId?.email,
            phoneNumber: appointment?.assignedDoctorId?.phoneNumber,
            doctorSpeciality:
              appointment?.assignedDoctorId?.doctorProfile?.doctorSpeciality,
            officeAddress: appointment?.assignedDoctorId?.officeAddress,
          }
        : null,

      // Port Agent details
      portAgent: appointment?.portAgentId
        ? {
            fullName: appointment?.portAgentId?.fullName,
            profilePhoto: appointment?.portAgentId?.profilePhoto?.url,
            email: appointment?.portAgentId.email,
            phoneNumber: appointment?.portAgentId?.phoneNumber,
            role: appointment?.portAgentId?.roleId?.name || "N/A",
          }
        : null,

      // Cab Details
      cabDetails: appointment?.cabDetails
        ? {
            pickupLocation: appointment?.cabDetails?.pickupLocation,
            dropOffLocation: appointment?.cabDetails?.dropOffLocation,
            pickupTime: appointment?.cabDetails?.pickupTime,
            dropOffTime: appointment?.cabDetails?.dropOffTime,
            cabNumber: appointment?.cabDetails?.cabNumber,
            driverName: appointment?.cabDetails?.driverName,
            phoneNumber: appointment?.cabDetails?.phoneNumber,
          }
        : null,
    };

    res.status(200).json({
      message: "Appointment retrieved successfully!",
      appointment: modifiedAppointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * fetch users appointment (patient or doctor)
exports.userAppointments = async (req, res) => {
  const { userId } = req.params; // Extract User ID from request parameters
  const { pageNo = 0, limit = 10, state, date } = req.query;

  try {
    // Validate that the user exists
    const user = await User.findById(userId);
    if (!user) return sendError(res, "User not found!", 404);

    // Build query dynamically to fetch appointments
    const query = {
      $or: [{ patientId: userId }, { assignedDoctorId: userId }], // Fetch based on patient or doctor ID
    };
    if (state) query.currentStatus = state; // Apply filtering if `state` is provided

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      query.dateOfAppointment = { $gte: targetDate, $lt: nextDay }; // Filter appointments by selected date
    }

    // Count total matching appointments
    const totalAppointments = await Appointment.countDocuments(query);

    // Fetch paginated appointments
    const appointments = await Appointment.find(query)
      .populate("patientId", "profilePhoto fullName email phoneNumber")
      .populate("generalPhysicianId", "profilePhoto fullName email")
      .populate("assignedDoctorId", "profilePhoto fullName email")
      .populate("coordinatorId", "profilePhoto fullName email")
      .populate("portAgentId", "profilePhoto fullName email")
      .populate("cabDetails")
      .sort({ dateOfAppointment: -1 })
      .skip(parseInt(pageNo) * parseInt(limit))
      .limit(parseInt(limit));

    // Override `status` with `currentStatus`
    const modifiedAppointments = appointments.map(appointment => ({
      ...appointment._doc,
      status: appointment.currentStatus,
    }));

    res.status(200).json({
      message: `Appointments retrieved successfully for user: ${user.fullName}`,
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

// * Cancel appointment
exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    // Find Appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return sendError(res, "Appointment not found!", 404);

    // Check if already cancelled
    if (appointment.status === "cancelled")
      return sendError(res, "This appointment is already cancelled!", 400);

    // Update status & currentStatus
    appointment.status = "cancelled";

    await appointment.save();

    res.status(200).json({
      message: "Appointment cancelled successfully!",
      appointment,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * Today's Appointment
exports.todayAppointments = async (req, res) => {
  const { pageNo = 0, limit = 10 } = req.query;

  try {
    // Build query to filter only today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set start of the day
    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1); // Set end of the day

    const query = { dateOfAppointment: { $gte: today, $lt: nextDay } }; // Filter only today's bookings

    // Get total count of today's appointments
    const totalAppointments = await Appointment.countDocuments(query);

    // Fetch appointments for today
    const appointments = await Appointment.find(query)
      .populate("patientId", "profilePhoto fullName email phoneNumber")
      .populate("generalPhysicianId", "profilePhoto fullName email")
      .populate("assignedDoctorId", "profilePhoto fullName email")
      .populate("coordinatorId", "profilePhoto fullName email")
      .populate("portAgentId", "profilePhoto fullName email")
      .populate("cabDetails")
      .sort({ dateOfAppointment: -1 })
      .skip(parseInt(pageNo) * parseInt(limit))
      .limit(parseInt(limit));

    // Replace actual status with currentStatus before sending response
    const modifiedAppointments = appointments.map(appointment => ({
      ...appointment._doc, // Spread existing appointment data
      status: appointment.currentStatus, // Override `status` with `currentStatus`
    }));

    if (!appointments || appointments.length === 0) {
      return res.status(200).json({
        message: "No appointments found for today.",
        appointments: [],
        pagination: {
          currentPage: parseInt(pageNo),
          limit: parseInt(limit),
          totalAppointments: 0,
        },
      });
    }

    res.status(200).json({
      message: "Today's appointments retrieved successfully!",
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

// * Fetching Dashboard Stats
exports.fetchDashboardStats = async (req, res) => {
  try {
    // Fetch total registered patients
    const patientRole = await Role.findOne({ name: "Patient" });
    const totalPatients = await User.countDocuments({
      roleId: patientRole?._id,
    });

    // Fetch total port agents
    const portAgentRole = await Role.findOne({ name: "Port Agent" });
    const totalPortAgents = await User.countDocuments({
      roleId: portAgentRole?._id,
    });

    // Fetch total doctors
    const doctorRole = await Role.findOne({ name: "Doctor" });
    const totalDoctors = await User.countDocuments({ roleId: doctorRole?._id });

    // Fetch appointment stats
    const totalUpcomingAppointments = await Appointment.countDocuments({
      currentStatus: "Upcoming",
    });
    const totalNewAppointments = await Appointment.countDocuments({
      currentStatus: "New",
    });
    const totalCancelledAppointments = await Appointment.countDocuments({
      currentStatus: "Cancelled",
    });
    const totalCompletedAppointments = await Appointment.countDocuments({
      currentStatus: "Complete",
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDay = new Date(today);
    nextDay.setDate(today.getDate() + 1);

    const totalAppointmentsBookedToday = await Appointment.countDocuments({
      createdAt: { $gte: today, $lt: nextDay },
    });

    res.status(200).json({
      message: "Dashboard statistics fetched successfully!",
      stats: {
        totalPatients,
        totalPortAgents,
        totalDoctors,
        totalUpcomingAppointments,
        totalNewAppointments,
        totalCancelledAppointments,
        totalCompletedAppointments,
        totalAppointmentsBookedToday,
      },
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

exports.getCurrentBooking = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Fetch the latest appointment that is NOT completed
    const appointment = await Appointment.findOne({
      patientId,
      currentStatus: { $in: ["New", "Waiting", "Upcoming"] }, // Filter only current bookings
    })
      .populate({
        path: "portAgentId",
        select: "profilePhoto fullName roleId",
        populate: { path: "roleId", select: "name" },
      })
      .populate({
        path: "assignedDoctorId",
        select: "profilePhoto fullName roleId",
        populate: { path: "roleId", select: "name" },
      })
      .populate({
        path: "cabDetails",
        select: "pickupLocation dropOffLocation pickupTime driverName",
      })
      .sort({ dateOfAppointment: -1 }); // Get latest booking first

    if (!appointment)
      return sendError(res, "No current booking found for this patient.", 404);

    res.status(200).json({
      message: "Current booking retrieved successfully!",
      appointment: {
        reason: appointment.reason,
        date: appointment.dateOfAppointment,
        time: appointment.timeOfAppointment,
        portAgent: appointment.portAgentId
          ? {
              id: appointment.portAgentId?._id,
              profilePhoto: appointment.portAgentId.profilePhoto?.url,
              fullName: appointment.portAgentId.fullName,
              role: appointment.portAgentId.roleId.name,
            }
          : null,
        doctor: appointment.assignedDoctorId
          ? {
              id: appointment.assignedDoctorId?._id,
              profilePhoto: appointment.assignedDoctorId.profilePhoto?.url,
              fullName: appointment.assignedDoctorId.fullName,
              role: appointment.assignedDoctorId.roleId.name,
            }
          : null,
        cabDetails: appointment.cabDetails
          ? {
              driverName: appointment.cabDetails.driverName,
              pickupTime: appointment.cabDetails.pickupTime,
              pickupLocation: appointment.cabDetails.pickupLocation,
              dropOffLocation: appointment.cabDetails.dropOffLocation,
            }
          : null,
      },
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * Top 5 newly Assigned Appointments
exports.getNewlyAssignedAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id; // Get logged-in doctor's ID
    // const { doctorId } = req.params;
    // console.log(doctorId);

    // Fetch latest 5 appointments assigned to this doctor
    const appointments = await Appointment.find({
      assignedDoctorId: doctorId, // Ensure appointments belong to the logged-in doctor
      currentStatus: { $in: ["New", "Upcoming"] }, // Include only new/upcoming appointments
    })
      .populate("patientId", "fullName profilePhoto") // Get patient details
      // .populate(
      //   "cabDetails",
      //   "driverName pickupTime pickupLocation dropOffLocation"
      // ) // Get cab details if available
      .sort({ createdAt: -1 }) // Fetch latest assigned appointments first
      .limit(5); // Limit the result to 5 appointments

    if (!appointments.length)
      return sendError(res, "No newly assigned appointments found!", 404);

    res.status(200).json({
      message: "Newly assigned appointments retrieved successfully!",
      appointments,
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

// * fetch appointment counts for the logged-in doctor across a full month
exports.getDoctorAppointmentsByMonth = async (req, res) => {
  const { month, year } = req.params;
  const doctorId = req.user._id; // Get logged-in doctor's ID

  try {
    // const objectDoctorId = new mongoose.Types.ObjectId(doctorId);

    // Calculate start and end of month
    const startDate = new Date(year, month - 1, 1); // First day of the month
    // startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0); // Last day of the month
    // endDate.setHours(23, 59, 59, 999);

    console.log(startDate);
    console.log(endDate);

    // Fetch appointment counts grouped by date
    const appointmentCounts = await Appointment.aggregate([
      {
        $match: {
          assignedDoctorId: doctorId, // Match logged-in doctor
          dateOfAppointment: { $gte: startDate, $lte: endDate }, // Match selected month
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateOfAppointment" },
          }, // Group by date
          count: { $sum: 1 }, // Count appointments per date
        },
      },
      { $sort: { _id: 1 } }, // Sort by date (ascending)
    ]);

    console.log(appointmentCounts);

    // Convert results to an object for easy frontend usage
    const appointmentsByDate = {};
    appointmentCounts.forEach(({ _id, count }) => {
      appointmentsByDate[_id] = count;
    });

    res.status(200).json({
      message: "Doctor's monthly appointment counts retrieved successfully!",
      month,
      year,
      appointmentsByDate, // Returns an object { "2025-05-10": 2, "2025-05-15": 3 }
    });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};
