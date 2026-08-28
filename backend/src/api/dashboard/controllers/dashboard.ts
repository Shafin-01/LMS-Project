export default {
  async stats(ctx: any) {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.forbidden('লগইন করা বাধ্যতামূলক।');
    }

    // ডেটাবেজ থেকে রোলসহ ইউজার ফেচ করা
    const user: any = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
      populate: ['role'],
    });

    if (!user || user.role?.name !== 'Admin') {
      console.log("DEBUG - Full User Object:", JSON.stringify(user, null, 2));
      return ctx.forbidden('শুধু Admin এই তথ্য দেখতে পারবে।');
    }

    const totalCourses = await strapi.db.query('api::course.course').count();
    const totalEnrollments = await strapi.db.query('api::enrollment.enrollment').count();
    const totalBlogPosts = await strapi.db.query('api::blog-post.blog-post').count();

    const allRoles = await strapi.db.query('plugin::users-permissions.role').findMany();

    const usersPerRole: Record<string, number> = {};
    for (const role of allRoles) {
      const count = await strapi.db.query('plugin::users-permissions.user').count({
        where: { role: role.id },
      });
      usersPerRole[role.name] = count;
    }

    return {
      totalCourses,
      totalEnrollments,
      totalBlogPosts,
      usersPerRole,
    };
  },
};