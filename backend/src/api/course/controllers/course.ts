import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

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

    /**
     * Dashboard-এর জন্য: Instructor নিজের সব course (draft + published)
     * দেখবে, Admin/Content Manager সবার সব course দেখবে।
     */
    async myCourses(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার এই তথ্য দেখার permission নেই।');
      }

      const isInstructor = roleName === 'Instructor';
      const filters = isInstructor
        ? { instructor: { id: { $eq: user.id } } }
        : {};

      const draftCourses = await strapi.documents('api::course.course').findMany({
        status: 'draft',
        filters,
        populate: { instructor: true, lessons: true },
      });

      const publishedCourses = await strapi.documents('api::course.course').findMany({
        status: 'published',
        filters,
      });
      const publishedDocIds = new Set(
        publishedCourses.map((c: any) => c.documentId)
      );

      const data = draftCourses.map((course: any) => ({
        ...course,
        instructor: sanitizeUser(course.instructor),
        isPublished: publishedDocIds.has(course.documentId),
      }));

      return { data };
    },

  })
);