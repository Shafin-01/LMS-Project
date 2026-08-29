import { sanitizeUser } from '../../../utils/sanitize-user';

export default {
  async stats(ctx: any) {
    const userId = ctx.state.user?.id;
    if (!userId) {
      return ctx.forbidden('লগইন করা বাধ্যতামূলক।');
    }
    const user: any = await strapi.entityService.findOne('plugin::users-permissions.user', userId, { populate: ['role'] });
    if (!user || user.role?.name !== 'Admin') {
      return ctx.forbidden('শুধু Admin এই তথ্য দেখতে পারবে।');
    }
    const totalCourses = await strapi.db.query('api::course.course').count();
    const totalEnrollments = await strapi.db.query('api::enrollment.enrollment').count();
    const totalBlogPosts = await strapi.db.query('api::blog-post.blog-post').count();
    const allRoles = await strapi.db.query('plugin::users-permissions.role').findMany();
    const usersPerRole: Record<string, number> = {};
    for (const role of allRoles) {
      const count = await strapi.db.query('plugin::users-permissions.user').count({ where: { role: role.id } });
      usersPerRole[role.name] = count;
    }
    return { totalCourses, totalEnrollments, totalBlogPosts, usersPerRole };
  },

  // NEW: সব user-এর তালিকা — শুধু Admin দেখতে পারবে
  async listUsers(ctx: any) {
    const requesterId = ctx.state.user?.id;
    if (!requesterId) {
      return ctx.forbidden('লগইন করা বাধ্যতামূলক।');
    }
    const requester: any = await strapi.entityService.findOne('plugin::users-permissions.user', requesterId, { populate: ['role'] });
    if (!requester || requester.role?.name !== 'Admin') {
      return ctx.forbidden('শুধু Admin ইউজার লিস্ট দেখতে পারবে।');
    }

    const users: any[] = await strapi.db.query('plugin::users-permissions.user').findMany({
      populate: ['role'],
      orderBy: { id: 'asc' },
    });

    const sanitized = users.map((u) => sanitizeUser(u));
    return { data: sanitized };
  },

  // NEW: শুধু project-এর কাজের role গুলো (Public/Authenticated বাদ দিয়ে)
  async listRoles(ctx: any) {
    const requesterId = ctx.state.user?.id;
    if (!requesterId) {
      return ctx.forbidden('লগইন করা বাধ্যতামূলক।');
    }
    const requester: any = await strapi.entityService.findOne('plugin::users-permissions.user', requesterId, { populate: ['role'] });
    if (!requester || requester.role?.name !== 'Admin') {
      return ctx.forbidden('শুধু Admin role লিস্ট দেখতে পারবে।');
    }

    const allowedRoleNames = ['Admin', 'Content Manager', 'Instructor', 'Student'];
    const allRoles: any[] = await strapi.db.query('plugin::users-permissions.role').findMany();
    const filtered = allRoles.filter((r) => allowedRoleNames.includes(r.name));

    return { data: filtered.map((r) => ({ id: r.id, name: r.name })) };
  },

  // NEW: কোনো user-এর role change করা — নিজের role নিজে change করা যাবে না
  async updateUserRole(ctx: any) {
    const requesterId = ctx.state.user?.id;
    if (!requesterId) {
      return ctx.forbidden('লগইন করা বাধ্যতামূলক।');
    }
    const requester: any = await strapi.entityService.findOne('plugin::users-permissions.user', requesterId, { populate: ['role'] });
    if (!requester || requester.role?.name !== 'Admin') {
      return ctx.forbidden('শুধু Admin role change করতে পারবে।');
    }

    const { userId, roleId } = ctx.request.body || {};
    if (!userId || !roleId) {
      return ctx.badRequest('userId এবং roleId দুটোই দিতে হবে।');
    }

    if (String(userId) === String(requesterId)) {
      return ctx.badRequest('তুমি নিজের role নিজে change করতে পারবে না।');
    }

    const allowedRoleNames = ['Admin', 'Content Manager', 'Instructor', 'Student'];
    const targetRole: any = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { id: roleId } });
    if (!targetRole || !allowedRoleNames.includes(targetRole.name)) {
      return ctx.badRequest('Valid role দিতে হবে (Admin / Content Manager / Instructor / Student)।');
    }

    const targetUser: any = await strapi.db.query('plugin::users-permissions.user').findOne({ where: { id: userId } });
    if (!targetUser) {
      return ctx.notFound('User পাওয়া যায়নি।');
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
};