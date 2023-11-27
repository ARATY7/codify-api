const express = require('express');
const { check } = require("express-validator");

const usersCtrl = require('../ctrl/users');
const checkAuth = require('../middleware/check-auth')

const router = express.Router();

const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_=;:,.?])(?=.{8,64}).*$/

router.get('/getUsersName', usersCtrl.getUsersName)
router.get('/:uid', usersCtrl.getUserInfos)

// Protected routes
router.use(checkAuth);
router.delete(
  '/deleteUser/:uid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  usersCtrl.deleteUser
);
router.patch(
  '/:uid/edit',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
    check('name').notEmpty().withMessage('Name cannot be empty.').isLength({ max: 32 }).withMessage('Name must be at most 32 characters.'),
    check('email').isEmail().withMessage('Invalid email format, please provide a valid email address.'),
    check('currentPassword').optional().matches(regexPassword).withMessage('Password requirements not met, please make sure your password contains at least one lowercase and one uppercase letter, one special character (!@#$%^&*()_=;:,.?) and must be between 8 and 64 characters in length.'),
    check('newPassword').optional().matches(regexPassword).withMessage('Password requirements not met, please make sure your password contains at least one lowercase and one uppercase letter, one special character (!@#$%^&*()_=;:,.?) and must be between 8 and 64 characters in length.')
  ],
  usersCtrl.editUser
);

module.exports = router;