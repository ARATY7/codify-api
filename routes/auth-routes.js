const express = require('express');
const { check } = require("express-validator");

const authCtrl = require('../ctrl/auth');

const router = express.Router();

const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_=;:,.?])(?=.{8,64}).*$/

router.post(
  '/email',
  [
    check('email').isEmail().withMessage('Invalid email format, please provide a valid email address.')
  ],
  authCtrl.email
);

router.post(
  '/signup',
  [
    check('name').notEmpty().escape().withMessage('Invalid name format, please provide a valid name.'),
    check('email').isEmail().withMessage('Invalid email format, please provide a valid email address.'),
    check('password').matches(regexPassword).withMessage('Password requirements not met, please make sure your password contains at least one lowercase and one uppercase letter, one special character (!@#$%^&*()_=;:,.?) and must be between 8 and 64 characters in length.')
  ],
  authCtrl.signup
);

router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Invalid email format, please provide a valid email address.'),
    check('password').matches(regexPassword).withMessage('Password requirements not met, please make sure your password contains at least one lowercase and one uppercase letter, one special character (!@#$%^&*()_=;:,.?) and must be between 8 and 64 characters in length.')
  ],
  authCtrl.login
);

module.exports = router;