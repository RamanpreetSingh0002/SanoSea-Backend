const express = require("express");
const {
  bookAppointment,
  assignDoctor,
  allAppointments,
  singleAppointment,
  userAppointments,
  cancelAppointment,
  todayAppointments,
  fetchDashboardStats,
  getCurrentBooking,
  getNewlyAssignedAppointments,
  getDoctorAppointmentsByMonth,
} = require("../controllers/appointment");
const {
  isAuth,
  isGeneralPhysician,
  isCoordinator,
  isAdminOrSubAdmin,
  isDoctor,
} = require("../middlewares/auth");

const router = express.Router();

router.post("/book", isAuth, isGeneralPhysician, bookAppointment);
router.post(
  "/assign-doctor/:appointmentId",
  isAuth,
  isCoordinator,
  assignDoctor
);
router.get("/appointments", isAuth, allAppointments);
router.get("/appointments/:appointmentId", isAuth, singleAppointment);
router.get("/appointments/user/:userId", isAuth, userAppointments);
router.put(
  "/cancel/:appointmentId",
  isAuth,
  isAdminOrSubAdmin,
  cancelAppointment
);
router.get("/today", isAuth, todayAppointments);
router.get("/dashboard-stats", isAuth, fetchDashboardStats);
router.get("/current-booking/:patientId", isAuth, getCurrentBooking);
router.get("/newly-assigned", isAuth, isDoctor, getNewlyAssignedAppointments);
router.get(
  "/doctor-appointments-month/:month/:year",
  isAuth,
  isDoctor,
  getDoctorAppointmentsByMonth
);

module.exports = router;
