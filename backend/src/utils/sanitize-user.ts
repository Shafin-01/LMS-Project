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

/**
 * Safe copy of a user relation for a response any anonymous visitor can
 * read (currently: blog-post's author, on find/findOne — the only user
 * relation populated on a route with no login requirement at all).
 *
 * sanitizeUser() above is deliberately loose — it only strips the
 * password hash and reset/confirmation tokens, because every place that
 * calls it (enrollment/quiz-result's "student", this same author field
 * once through an Admin/Content Manager's own request) is already gated
 * behind a login check, so the requester is a specific, authenticated
 * staff member or the user themself. GET /api/blog-posts has no such
 * gate — it's public, unauthenticated, world-readable — so passing that
 * same loosely-sanitized object through it was leaking the author's real
 * email address (plus provider/confirmed/blocked/id/documentId/
 * timestamps) to anyone on the internet, not just to logged-in staff.
 * This keeps only what a byline actually needs to show.
 */
export function sanitizePublicAuthor(user: any): any {
  if (!user) {
    return user;
  }

  return {
    id: user.id,
    username: user.username,
  };
}