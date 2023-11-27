const express = require('express');
const { check } = require("express-validator");

const projectsCtrl = require('../ctrl/projects');
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

router.get('/getProjects', projectsCtrl.getProjects)
router.get('/getProjects/:uid', projectsCtrl.getProjectsByUserId)
router.get('/getTechnologies', projectsCtrl.getTechnologies)
router.get('/getProject/:pid', projectsCtrl.getProjectById)

// Protected routes
router.use(checkAuth);
router.post(
  '/addProject',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
    check('projectName').notEmpty().withMessage('Project name cannot be empty.').isLength({ max: 32 }).withMessage('Project name must be at most 32 characters.'),
    check('projectDesc').isLength({ min: 20, max: 512 }).withMessage('Project description must be between 20 and 512 characters.'),
    check('technologies').optional().isArray().withMessage('Technologies must be an array.'),
    check('technologies.*').optional().isNumeric().withMessage('Each technology ID must be a numeric value.'),
  ],
  projectsCtrl.addProject
)
router.patch(
  '/editProject/:pid',
  [
    check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
    check('projectName').notEmpty().withMessage('Project name cannot be empty').isLength({ max: 32 }).withMessage('Project name must be at most 32 characters.'),
    check('projectDesc').isLength({ min: 20, max: 512 }).withMessage('Project description must be between 20 and 512 characters.'),
    check('technologies').optional().isArray().withMessage('Technologies must be an array.'),
    check('technologies.*').optional().isNumeric().withMessage('Each technology ID must be a numeric value.'),
  ],
  projectsCtrl.editProject
)
router.delete(
  '/deleteProject/:pid',
  [
      check('userId').notEmpty().isNumeric().withMessage('User ID must be a non-empty numeric value.'),
  ],
  projectsCtrl.deleteProject
)

module.exports = router;