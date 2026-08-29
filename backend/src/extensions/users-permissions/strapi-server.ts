export default (plugin: any) => {
  const originalUpdate = plugin.controllers.user.update;

  plugin.controllers.user.update = async (ctx: any) => {
    const requester = ctx.state.user;

    if (!requester) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const isSelf = String(ctx.params.id) === String(requester.id);
    const isAdmin = requester.role?.name === 'Admin';

    // নিজের প্রোফাইল অথবা Admin ছাড়া কেউ অন্য user-কে update করতে পারবে না।
    if (!isSelf && !isAdmin) {
      return ctx.forbidden('তুমি অন্য user-এর তথ্য পরিবর্তন করতে পারবে না।');
    }

    // role field শুধুমাত্র Admin-ই পাঠাতে পারবে। Student নিজে নিজের
    // role change করে Admin বনে যেতে পারবে না।
    if (ctx.request.body?.role !== undefined && !isAdmin) {
      return ctx.forbidden('তোমার নিজের role পরিবর্তন করার permission নেই।');
    }

    return originalUpdate(ctx);
  };

  return plugin;
};