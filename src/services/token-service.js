'use strict';

const jwt = require('jsonwebtoken');

const config = require('../config/env');

/**
 * JSON Web Token issuing and verification.
 *
 * HTTP is stateless: nothing in the protocol links two requests from the same
 * user. This application closes that gap with a signed token rather than
 * server-side session storage, so no shared session store is needed and the API
 * stays horizontally scalable.
 *
 * The token is signed with HS256 using JWT_SECRET. It is signed, not encrypted:
 * the payload is readable by anyone holding the token, so it carries only the
 * user id and role and never anything sensitive. Integrity is what matters -
 * a tampered payload fails signature verification.
 */

const ALGORITHM = 'HS256';

/**
 * Issues a token for a user.
 * @param {{ id: number, role: string }} user
 * @returns {string} the signed JWT
 */
function sign(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    algorithm: ALGORITHM,
    subject: String(user.id),
    expiresIn: config.jwtExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
}

/**
 * Verifies a token's signature, expiry, issuer and audience.
 *
 * The permitted algorithm is pinned, which prevents the classic attack of
 * presenting a token whose header claims "alg": "none".
 *
 * @param {string} token
 * @returns {{ userId: number, role: string, expiresAt: Date }}
 * @throws {jwt.JsonWebTokenError} when the token is invalid or expired
 */
function verify(token) {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: [ALGORITHM],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  return {
    userId: Number.parseInt(payload.sub, 10),
    role: payload.role,
    expiresAt: new Date(payload.exp * 1000),
  };
}

/**
 * Cookie options for the token.
 *
 * httpOnly keeps the token out of reach of JavaScript, so an injected script
 * cannot read it (which is the main advantage over localStorage). sameSite
 * 'lax' stops the cookie riding along with cross-site form posts, blocking
 * CSRF for state-changing requests while still allowing normal navigation.
 * secure restricts it to HTTPS, and is enabled in production where TLS is
 * terminated by the platform.
 */
function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: maxAgeMs,
  };
}

module.exports = { sign, verify, cookieOptions, ALGORITHM };
