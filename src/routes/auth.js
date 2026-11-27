'use strict';

const express = require('express');

const authController = require('../controllers/auth-controller');
const asyncHandler = require('../middleware/async-handler');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/require-auth');
const { registerRules, loginRules } = require('../validators/auth-validators');

const router = express.Router();

// Register a new member account.
router.post('/auth/register', registerRules, validate, asyncHandler(authController.register));

// Exchange credentials for a token.
router.post('/auth/login', loginRules, validate, asyncHandler(authController.login));

// Discard the token cookie.
router.post('/auth/logout', asyncHandler(authController.logout));

// Who am I? Used by the frontend to restore session state on page load.
router.get('/auth/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
