export default (plugin: any) => {
  const originalUpdate = plugin.controllers.user.update;

  plugin.controllers.user.update = async (ctx: any) => {
    const requester = ctx.state.user;

    if (!requester) {
      return ctx.unauthorized('Login is required.');
    }

    const isSelf = String(ctx.params.id) === String(requester.id);
    const isAdmin = requester.role?.name === 'Admin';

    if (!isSelf && !isAdmin) {
      return ctx.forbidden('You cannot modify another user\'s account.');
    }

    if (ctx.request.body?.role !== undefined && !isAdmin) {
      return ctx.forbidden('You do not have permission to change your own role.');
    }

    return originalUpdate(ctx);
  };

  // Strapi's default /api/users/me endpoint ignores the "?populate=role"
  // query param (it sanitizes and returns ctx.state.user directly, without
  // re-populating it) — so the frontend would never receive the role. The
  // "me" action is overridden here to fetch the user, with its role, straight
  // from the database instead.
  plugin.controllers.user.me = async (ctx: any) => {
    const requester = ctx.state.user;

    if (!requester) {
      return ctx.unauthorized('Login is required.');
    }

    const fullUser = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: requester.id },
      populate: ['role'],
    });

    if (!fullUser) {
      return ctx.notFound('User not found.');
    }

    const { password, resetPasswordToken, confirmationToken, ...safeUser } = fullUser as any;

    ctx.body = safeUser;
  };

  return plugin;
};