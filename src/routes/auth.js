'use strict';

const express = require('express');

const authController = require('../controllers/auth-controller');
const asyncHandler = require('../middleware/async-handler');
const validate = require('../middleware/validate');
const { registerRules } = require('../validators/auth-validators');

const router = express.Router();

// Register a new member account.
router.post('/auth/register', registerRules, validate, asyncHandler(authController.register));

module.exports = router;
