'use strict';

const { body } = require('express-validator');

const passwordService = require('../services/password-service');

/**
 * Server-side validation rules for registration.
 *
 * Each rule both checks and sanitises: values are trimmed, the email is
 * normalised to a canonical form, and the escaping of output is handled where
 * the value is rendered. Messages are written for end users, because the
 * frontend displays them directly next to the offending field.
 */
const registerRules = [
  body('fullName')
    .exists({ values: 'falsy' })
    .withMessage('Please enter your full name.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Your name must be between 2 and 120 characters.')
    .matches(/^[\p{L}\p{M}'\-.\s]+$/u)
    .withMessage('Your name may only contain letters, spaces, apostrophes and hyphens.'),

  body('email')
    .exists({ values: 'falsy' })
    .withMessage('Please enter your email address.')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .bail()
    .isLength({ max: 255 })
    .withMessage('That email address is too long.')
    .normalizeEmail({ gmail_remove_dots: false }),

  body('password')
    .exists({ values: 'falsy' })
    .withMessage('Please choose a password.')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Your password must be at least 8 characters long.')
    .bail()
    .custom((value) => Buffer.byteLength(value, 'utf8') <= passwordService.MAX_PASSWORD_BYTES)
    .withMessage('Your password is too long; please use 72 characters or fewer.')
    .matches(/\p{L}/u)
    .withMessage('Your password must contain at least one letter.')
    .matches(/\d/)
    .withMessage('Your password must contain at least one number.'),
];

module.exports = { registerRules };
