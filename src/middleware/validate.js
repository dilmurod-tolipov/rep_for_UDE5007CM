'use strict';

const { validationResult } = require('express-validator');

const AppError = require('../utils/app-error');

/**
 * Terminates the request with 422 when any express-validator rule failed.
 *
 * Placed after the rule array on each route, so a handler only ever runs with
 * data that has already been checked and sanitised. This is the server-side
 * half of validation: the browser's checks improve the experience but cannot
 * be trusted, because a client can post directly to the API.
 */
function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    next();
    return;
  }

  const details = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg,
  }));

  next(AppError.validation(details));
}

module.exports = validate;
