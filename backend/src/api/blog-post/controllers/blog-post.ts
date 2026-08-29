/**
 * blog-post controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({

  async find(ctx) {
    const user = ctx.state.user;
    const roleName = user?.role?.name;
    const canSeeDrafts = roleName === 'Admin' || roleName === 'Content Manager';

    // Admin/Content Manager ছাড়া বাকি সবার জন্য জোর করে published-only দেখাবো,
    // যাই query-তে পাঠানো হোক না কেন।
    if (!canSeeDrafts) {
      ctx.query = { ...ctx.query, status: 'published' };
    }

    return super.find(ctx);
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    const roleName = user?.role?.name;
    const canSeeDrafts = roleName === 'Admin' || roleName === 'Content Manager';

    if (!canSeeDrafts) {
      ctx.query = { ...ctx.query, status: 'published' };
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    if (!['Admin', 'Content Manager'].includes(user.role?.name)) {
      return ctx.forbidden('তোমার blog post লেখার permission নেই।');
    }

    if (!ctx.request.body?.data) {
      ctx.request.body.data = {};
    }
    // Author সবসময় logged-in user, client থেকে পাঠানো যাবে না।
    ctx.request.body.data.author = user.id;

    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    if (!['Admin', 'Content Manager'].includes(user.role?.name)) {
      return ctx.forbidden('তোমার blog post edit করার permission নেই।');
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    if (!['Admin', 'Content Manager'].includes(user.role?.name)) {
      return ctx.forbidden('তোমার blog post delete করার permission নেই।');
    }

    return super.delete(ctx);
  },

}));