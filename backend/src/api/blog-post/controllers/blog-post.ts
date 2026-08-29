import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login করা বাধ্যতামূলক।');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('তোমার blog post তৈরি করার permission নেই।');
      }

      const requestData = ctx.request.body?.data || {};
      if (!requestData.Title) {
        return ctx.badRequest('Title দিতে হবে।');
      }

      // super.create() বাইপাস করা হলো — Course/Lesson-এ যেমন দেখেছি,
      // status unspecified রাখলে super.create() auto-publish করে দেয়,
      // কিন্তু Document Service সরাসরি ব্যবহার করলে draft-ই থাকে।
      // author field client থেকে না নিয়ে, logged-in user থেকেই বসানো হচ্ছে (security)।
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
      if (!user) return ctx.unauthorized('Login করা বাধ্যতামূলক।');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('তোমার blog post edit করার permission নেই।');
      }

      const existingPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: ctx.params.id,
      });
      if (!existingPost) return ctx.notFound('Blog post পাওয়া যায়নি।');

      const requestData = ctx.request.body?.data || {};
      const updateData: any = {};
      if (requestData.Title !== undefined) updateData.Title = requestData.Title;
      if (requestData.Body !== undefined) updateData.Body = requestData.Body;
      if (requestData.CoverImageURL !== undefined) updateData.CoverImageURL = requestData.CoverImageURL;

      // super.update() বাইপাস — একই auto-publish bug fix
      const updatedPost = await strapi.documents('api::blog-post.blog-post').update({
        documentId: ctx.params.id,
        data: updateData,
      });

      return { data: updatedPost };
    },

    async delete(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login করা বাধ্যতামূলক।');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('তোমার blog post delete করার permission নেই।');
      }

      return super.delete(ctx);
    },

    async publish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login করা বাধ্যতামূলক।');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({ documentId: id });
      if (!post) return ctx.notFound('Blog post পাওয়া যায়নি।');

      await strapi.documents('api::blog-post.blog-post').publish({ documentId: id });

      const publishedPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: id,
        status: 'published',
      });

      return { data: publishedPost };
    },

    async unpublish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login করা বাধ্যতামূলক।');

      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;
      const post = await strapi.documents('api::blog-post.blog-post').findOne({ documentId: id });
      if (!post) return ctx.notFound('Blog post পাওয়া যায়নি।');

      await strapi.documents('api::blog-post.blog-post').unpublish({ documentId: id });

      const draftPost = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId: id,
        status: 'draft',
      });

      return { data: draftPost };
    },

  })
);