import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({

    // find/findOne are overridden (instead of relying on the default core
    // controller) purely to populate the "author" relation reliably.
    // Strapi's default output sanitizer strips a populated relation to
    // plugin::users-permissions.user for any role that lacks a "find"
    // permission on Users — and the Public role intentionally does NOT have
    // that permission (granting it would expose the full user list via
    // /api/users). So we populate the author manually through the Document
    // Service, which isn't subject to that same relation-stripping, and
    // sanitize it ourselves with sanitizeUser() so nothing sensitive leaks.
    async find(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const canViewDrafts = roleName === 'Admin' || roleName === 'Content Manager';

      // Only Admin/Content Manager may request draft posts (the dashboard's
      // management page); everyone else always gets published-only results,
      // regardless of what status query param they send.
      const requestedStatus = ctx.query?.status === 'draft' ? 'draft' : 'published';
      const status = canViewDrafts ? requestedStatus : 'published';

      const filters = (ctx.query?.filters as any) || undefined;
      const sort = (ctx.query?.sort as any) || 'publishedAt:desc';

      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        status,
        filters,
        sort,
        populate: { author: true },
      });

      const sanitizedPosts = posts.map((post: any) => ({
        ...post,
        author: sanitizeUser(post.author),
      }));

      return { data: sanitizedPosts };
    },

    async findOne(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const canViewDrafts = roleName === 'Admin' || roleName === 'Content Manager';

      const requestedStatus = ctx.query?.status === 'draft' ? 'draft' : 'published';
      const status = canViewDrafts ? requestedStatus : 'published';

      const { id } = ctx.params;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: id,
        status,
        populate: { author: true },
      });

      if (!post) return ctx.notFound('Blog post not found.');

      return { data: { ...post, author: sanitizeUser(post.author) } };
    },

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to create blog posts.');
      }

      const requestData = ctx.request.body?.data || {};
      if (!requestData.Title) {
        return ctx.badRequest('Title is required.');
      }

      // Bypassing super.create() — as we saw with Course/Lesson, leaving status
      // unspecified causes super.create() to auto-publish, but calling the
      // Document Service directly keeps it as a draft.
      // The author field is set from the logged-in user rather than trusting
      // the client, for security.
      const blogPost = await strapi.documents('api::blog-post.blog-post').create({
        data: {
          Title: requestData.Title,
          Body: requestData.Body,
          CoverImageURL: requestData.CoverImageURL || null,
          author: user.id,
        },
      });

      return { data: blogPost };
    },

    async update(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to edit blog posts.');
      }

      const existingPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: ctx.params.id,
      });
      if (!existingPost) return ctx.notFound('Blog post not found.');

      const requestData = ctx.request.body?.data || {};
      const updateData: any = {};
      if (requestData.Title !== undefined) updateData.Title = requestData.Title;
      if (requestData.Body !== undefined) updateData.Body = requestData.Body;
      if (requestData.CoverImageURL !== undefined) updateData.CoverImageURL = requestData.CoverImageURL;

      // Bypassing super.update() — same auto-publish fix as above
      const updatedPost = await strapi.documents('api::blog-post.blog-post').update({
        documentId: ctx.params.id,
        data: updateData,
      });

      return { data: updatedPost };
    },

    async delete(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to delete blog posts.');
      }

      return super.delete(ctx);
    },

    async publish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }

      const { id } = ctx.params;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({ documentId: id });
      if (!post) return ctx.notFound('Blog post not found.');

      await strapi.documents('api::blog-post.blog-post').publish({ documentId: id });

      const publishedPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: id,
        status: 'published',
      });

      return { data: publishedPost };
    },

    async unpublish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }

      const { id } = ctx.params;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({ documentId: id });
      if (!post) return ctx.notFound('Blog post not found.');

      await strapi.documents('api::blog-post.blog-post').unpublish({ documentId: id });

      const draftPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: id,
        status: 'draft',
      });

      return { data: draftPost };
    },

  })
);