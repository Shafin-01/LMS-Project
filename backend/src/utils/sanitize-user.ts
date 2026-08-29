/**
 * Returns a safe copy of a populated user relation (student/instructor/
 * author, etc.) with sensitive fields — the password hash and the reset/
 * confirmation tokens — stripped out.
 *
 * Why this is needed: a relation populated directly through
 * strapi.documents(...).findMany()/findOne() is not sanitized
 * automatically (the automatic sanitization that super.find() does isn't
 * applied here) — so the raw response could include a populated user's
 * password hash. Every populated user relation needs to be passed through
 * this function before it's sent to the client.
 */
export function sanitizeUser(user: any): any {
  if (!user) {
    return user;
  }

  const {
    password,
    resetPasswordToken,
    confirmationToken,
    ...safeUser
  } = user;

  return safeUser;
}