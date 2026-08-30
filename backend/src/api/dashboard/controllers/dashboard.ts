import { sanitizeUser } from '../../../utils/sanitize-user';

// Only these four roles are part of the platform's actual role system.
// Strapi's built-in "Public" and "Authenticated" roles exist for the
// permissions plugin itself and are intentionally excluded from every
// admin-facing role count, role list and role-change option.
const MANAGED_ROLE_NAMES = ['Admin', 'Content Manager', 'Instructor', 'Student'];

async function requireAdmin(ctx: any) {
  const requesterId = ctx.state.user?.id;
  if (!requesterId) {
    ctx.forbidden('Login is required.');
    return null;
  }
  const requester: any = await strapi.entityService.findOne(
    'plugin::users-permissions.user',
    requesterId,
    { populate: ['role'] }
  );
  if (!requester || requester.role?.name !== 'Admin') {
    ctx.forbidden('Only an Admin can access this.');
    return null;
  }
  return requester;
}

export default {
  async stats(ctx: any) {
    const requester = await requireAdmin(ctx);
    if (!requester) return;

    // Course/Lesson/Blog-post all have Draft & Publish enabled, which stores
    // a draft row AND a published row for the same document once it has
    // ever been published — two rows sharing one documentId. strapi.db.query
    // is the raw table layer, so a plain .count() with no status filtering
    // counts BOTH rows, silently doubling these three numbers for anything
    // that's live (e.g. 2 real courses would show as "4"). Enrollment has
    // Draft & Publish OFF, so it only ever has one row per enrollment and
    // its raw count is already correct as-is.
    // Every document always has exactly one draft row (drafting is the
    // working copy that exists whether or not it's also published), so
    // asking the Document Service for the draft rows gives the true,
    // de-duplicated count of distinct courses/lessons/posts.
    const totalCourses = (
      await strapi.documents('api::course.course').findMany({ status: 'draft', fields: ['id'] })
    ).length;
    const totalLessons = (
      await strapi.documents('api::lesson.lesson').findMany({ status: 'draft', fields: ['id'] })
    ).length;
    const totalEnrollments = await strapi.db.query('api::enrollment.enrollment').count();
    const totalBlogPosts = (
      await strapi.documents('api::blog-post.blog-post').findMany({ status: 'draft', fields: ['id'] })
    ).length;

    const allRoles = await strapi.db.query('plugin::users-permissions.role').findMany();
    const usersPerRole: Record<string, number> = {};
    for (const role of allRoles) {
      if (!MANAGED_ROLE_NAMES.includes(role.name)) continue;
      const count = await strapi.db.query('plugin::users-permissions.user').count({ where: { role: role.id } });
      usersPerRole[role.name] = count;
    }

    return { totalCourses, totalLessons, totalEnrollments, totalBlogPosts, usersPerRole };
  },

  // Full user list — Admin only.
  async listUsers(ctx: any) {
    const requester = await requireAdmin(ctx);
    if (!requester) return;

    const users: any[] = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role'],
      orderBy: { id: 'asc' },
    });

    const sanitized = users.map((u) => sanitizeUser(u));
    return { data: sanitized };
  },

  // Only the platform's own roles (Public/Authenticated excluded), used to
  // populate the "change role" dropdown.
  async listRoles(ctx: any) {
    const requester = await requireAdmin(ctx);
    if (!requester) return;

    const allRoles: any[] = await strapi.db.query('plugin::users-permissions.role').findMany();
    const filtered = allRoles.filter((r) => MANAGED_ROLE_NAMES.includes(r.name));

    return { data: filtered.map((r) => ({ id: r.id, name: r.name })) };
  },

  // Change a user's role — an Admin cannot change their own role, so the
  // platform can never end up with zero Admins by accident.
  async updateUserRole(ctx: any) {
    const requester = await requireAdmin(ctx);
    if (!requester) return;

    const { userId, roleId } = ctx.request.body || {};
    if (!userId || !roleId) {
      return ctx.badRequest('Both userId and roleId are required.');
    }

    if (String(userId) === String(requester.id)) {
      return ctx.badRequest('You cannot change your own role.');
    }

    const targetRole: any = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { id: roleId } });
    if (!targetRole || !MANAGED_ROLE_NAMES.includes(targetRole.name)) {
      return ctx.badRequest('A valid role is required (Admin / Content Manager / Instructor / Student).');
    }

    const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: userId } });
    if (!targetUser) {
      return ctx.notFound('User not found.');
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { role: roleId },
    });

    const updatedUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      populate: ['role'],
    });

    return { data: sanitizeUser(updatedUser) };
  },

  // Delete a user account — an Admin cannot delete their own account, for
  // the same reason they cannot change their own role: the platform must
  // always keep at least one Admin able to manage it.
  async deleteUser(ctx: any) {
    const requester = await requireAdmin(ctx);
    if (!requester) return;

    const { userId } = ctx.params || {};
    if (!userId) {
      return ctx.badRequest('A userId is required.');
    }

    if (String(userId) === String(requester.id)) {
      return ctx.badRequest('You cannot delete your own account.');
    }

    const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: userId } });
    if (!targetUser) {
      return ctx.notFound('User not found.');
    }

    await strapi.db.query('plugin::users-permissions.user').delete({ where: { id: userId } });

    return { data: { id: Number(userId) } };
  },
};