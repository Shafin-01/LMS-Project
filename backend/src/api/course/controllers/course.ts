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

      const requestData = ctx.request.body?.data || {};

      if (!requestData.Title || !requestData.Title.trim()) {
        return ctx.badRequest('Course-এর Title দিতে হবে।');
      }

      const instructorId =
        roleName === 'Instructor' ? user.id : requestData.instructor;

      const course = await strapi.documents('api::course.course').create({
        data: {
          Title: requestData.Title,
          Description: requestData.Description,
          ...(instructorId ? { instructor: instructorId } : {}),
        },
      });

      return { data: course };
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

    /**
     * Course publish করা — Strapi-র default router এটা নিজে থেকে
     * বানিয়ে দেয় না, তাই নিজেরাই Document Service API-এর publish()
     * ব্যবহার করে বানিয়ে দিচ্ছি।
     */
    async publish(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;

      const course = await strapi.documents('api::course.course').findOne({
        documentId: id,
        populate: ['instructor'],
      });

      if (!course) {
        return ctx.notFound('Course পাওয়া যায়নি।');
      }

      if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-ই publish করতে পারবে।');
      }

      await strapi.documents('api::course.course').publish({ documentId: id });

      const publishedCourse = await strapi.documents('api::course.course').findOne({
        documentId: id,
        status: 'published',
      });

      return { data: publishedCourse };
    },

    /**
     * Course unpublish করা।
     */
    async unpublish(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;

      const course = await strapi.documents('api::course.course').findOne({
        documentId: id,
        populate: ['instructor'],
      });

      if (!course) {
        return ctx.notFound('Course পাওয়া যায়নি।');
      }

      if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-ই unpublish করতে পারবে।');
      }

      await strapi.documents('api::course.course').unpublish({ documentId: id });

      const draftCourse = await strapi.documents('api::course.course').findOne({
        documentId: id,
        status: 'draft',
      });

      return { data: draftCourse };
    },

  })
);