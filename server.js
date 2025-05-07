const path = require("path");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

require("dotenv").config();
require("./db/dbConnect.js");
// require("events").EventEmitter.defaultMaxListeners = 20;

const updateAppointmentStatuses = require("./utils/cronJobs.js");

const userRouter = require("./routes/user");
const adminRouter = require("./routes/admin.js");
const appointmentRouter = require("./routes/appointment.js");
const cabRouter = require("./routes/cab.js");

const app = express();

app.use(cors());

// middlewares
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(morgan("dev"));

updateAppointmentStatuses();

app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/appointment", appointmentRouter);
app.use("/api/cab", cabRouter);

// connecting server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server is running on PORT " + PORT);
});
