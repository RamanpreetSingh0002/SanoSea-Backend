const express = require("express");
const { isAuth, isAdmin } = require("../middlewares/auth");
const { create } = require("../controllers/admin");

const adminRouter = express.Router();

adminRouter.post("/create", isAuth, isAdmin, create);

module.exports = adminRouter;
