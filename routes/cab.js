const express = require("express");
const { isAuth, isPortAgent } = require("../middlewares/auth");
const { addCab } = require("../controllers/cab");

const router = express.Router();

router.post("/add/:appointmentId", isAuth, isPortAgent, addCab);

module.exports = router;
