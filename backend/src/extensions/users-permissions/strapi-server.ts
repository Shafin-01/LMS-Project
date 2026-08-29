export default (plugin: any) => {
  const originalUpdate = plugin.controllers.user.update;

  plugin.controllers.user.update = async (ctx: any) => {
    const requester = ctx.state.user;

    if (!requester) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const isSelf = String(ctx.params.id) === String(requester.id);
    const isAdmin = requester.role?.name === 'Admin';

    if (!isSelf && !isAdmin) {
      return ctx.forbidden('তুমি অন্য user-এর তথ্য পরিবর্তন করতে পারবে না।');
    }

    if (ctx.request.body?.role !== undefined && !isAdmin) {
      return ctx.forbidden('তোমার নিজের role পরিবর্তন করার permission নেই।');
    }

    return originalUpdate(ctx);
  };

  // Strapi-র default /api/users/me endpoint "?populate=role" query param
  // ignore করে ফেলে (ctx.state.user সরাসরি sanitize করে রিটার্ন করে, নতুন
  // করে populate করে না) — ফলে frontend কখনো role পায় না। তাই এখানে "me"
  // override করে সরাসরি database থেকে role সহ user নিয়ে আসছি।
  plugin.controllers.user.me = async (ctx: any) => {
    const requester = ctx.state.user;

    if (!requester) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: requester.id },
      populate: ['role'],
    });

    if (!fullUser) {
      return ctx.notFound('User পাওয়া যায়নি।');
    }

    const { password, resetPasswordToken, confirmationToken, ...safeUser } = fullUser as any;

    ctx.body = safeUser;
  };

  return plugin;
};