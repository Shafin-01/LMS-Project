/**
 * Populated user relation (student/instructor/author ইত্যাদি) থেকে
 * password hash এবং reset/confirmation token-এর মতো sensitive field
 * বাদ দিয়ে একটা নিরাপদ object রিটার্ন করে।
 *
 * কেন দরকার: strapi.documents(...).findMany()/findOne() দিয়ে সরাসরি
 * populate করা relation নিজে থেকে sanitize হয় না (super.find()-এর
 * মতো automatic sanitization এখানে কাজ করে না) — তাই raw response-এ
 * populated user-এর password hash-ও চলে আসতে পারে। এই function দিয়ে
 * প্রতিটা populated user relation client-এ পাঠানোর আগে পরিষ্কার করে
 * নিতে হবে।
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