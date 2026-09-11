import { factories } from '@strapi/strapi';
import { sanitizePublicAuthor } from '../../../utils/sanitize-user';

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({

    
    async find(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const canViewDrafts = roleName === 'Admin' || roleName === 'Content Manager';

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
        author: sanitizePublicAuthor(post.author),
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

      return { data: { ...post, author: sanitizePublicAuthor(post.author) } };
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

      const publishedBeforeEdit = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: ctx.params.id,
        status: 'published',
      });

      const requestData = ctx.request.body?.data || {};
      const updateData: any = {};
      if (requestData.Title !== undefined) updateData.Title = requestData.Title;
      if (requestData.Body !== undefined) updateData.Body = requestData.Body;
      if (requestData.CoverImageURL !== undefined) updateData.CoverImageURL = requestData.CoverImageURL;

      
      const updatedPost = await strapi.documents('api::blog-post.blog-post').update({
        documentId: ctx.params.id,
        data: updateData,
      });

      
      if (publishedBeforeEdit) {
        await strapi.documents('api::blog-post.blog-post').publish({ documentId: ctx.params.id });
      }

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