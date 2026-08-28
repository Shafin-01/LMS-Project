import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::course.course',
  ({ strapi }) => ({

    async create(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার course তৈরি করার permission নেই।');
      }

      // Instructor কখনো নিজের instructor ID নিজে choose করতে পারবে না।
      // Backend logged-in Instructor-কে automatically assign করবে।
      if (roleName === 'Instructor') {
        if (!ctx.request.body?.data) {
          ctx.request.body.data = {};
        }

        ctx.request.body.data.instructor = user.id;
      }

      return super.create(ctx);
    },

    async update(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার course edit করার permission নেই।');
      }

      if (roleName === 'Instructor') {
        const course = await strapi
          .documents('api::course.course')
          .findOne({
            documentId: ctx.params.id,
            populate: ['instructor'],
          });

        if (!course) {
          return ctx.notFound('Course পাওয়া যায়নি।');
        }

        if (course.instructor?.id !== user.id) {
          return ctx.forbidden(
            'তুমি শুধু নিজের course-ই edit করতে পারবে।'
          );
        }

        // Instructor course-এর instructor অন্য user-এ change করতে পারবে না।
        if (ctx.request.body?.data?.instructor !== undefined) {
          ctx.request.body.data.instructor = user.id;
        }
      }

      return super.update(ctx);
    },

    async delete(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার course delete করার permission নেই।');
      }

      if (roleName === 'Instructor') {
        const course = await strapi
          .documents('api::course.course')
          .findOne({
            documentId: ctx.params.id,
            populate: ['instructor'],
          });

        if (!course) {
          return ctx.notFound('Course পাওয়া যায়নি।');
        }

        if (course.instructor?.id !== user.id) {
          return ctx.forbidden(
            'তুমি শুধু নিজের course-ই delete করতে পারবে।'
          );
        }
      }

      return super.delete(ctx);
    },

  })
);