const express = require("express");
const {
  bookAppointment,
  assignDoctor,
  allAppointments,
  singleAppointment,
} = require("../controllers/appointment");
const {
  isAuth,
  isGeneralPhysician,
  isCoordinator,
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

module.exports = router;
