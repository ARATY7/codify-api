const express = require('express');
const { check } = require("express-validator");

const favoritesCtrl = require('../ctrl/favorites');
const checkAuth = require('../middleware/check-auth')

const router = express.Router();

// Protected routes
router.use(checkAuth);
router.get(
  '/users/:uid',
  favoritesCtrl.getUsersFavorites
);

router.get(
  '/projects/:uid',
  favoritesCtrl.getProjectsFavorites
);

router.post(
  '/user/:uid/isFav',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.')
  ],
  favoritesCtrl.checkIfUserIsFav
);

router.post(
  '/user/add/:uid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  favoritesCtrl.addUserFav
);

router.delete(
  '/user/remove/:uid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  favoritesCtrl.removeUserFav
);

router.post(
  '/project/:uid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.')
  ],
  favoritesCtrl.checkProjectsFav
);

router.post(
  '/project/add/:pid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  favoritesCtrl.addProjectFav
);

router.delete(
  '/project/remove/:pid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  favoritesCtrl.removeProjectFav
);

module.exports = router;