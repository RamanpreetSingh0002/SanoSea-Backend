const { check, validationResult } = require("express-validator");

// minimize the error length
exports.validate = (req, res, next) => {
  const error = validationResult(req).array();

  if (error.length) return res.json({ error: error[0].msg });

  next();
};

// checking the email, password is valid for Sign IN
exports.signInValidator = [
  check("email").normalizeEmail().isEmail().withMessage("Email is invalid!"),
  check("password").trim().not().isEmpty().withMessage("Password is missing!"),
];
