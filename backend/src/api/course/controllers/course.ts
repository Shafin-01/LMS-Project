import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController(
  'api::course.course',
  ({ strapi }) => ({

    // find/findOne defer to the default core behavior (which already handles
    // published-vs-draft visibility, populate, filters, sorting, etc. via
    // permissions) and only add an "enrollmentCount" number onto each course.
    // A plain count is safe to expose publicly — unlike populating the
    // enrollments relation itself, it doesn't leak any student data.
    async find(ctx) {
      const result = await super.find(ctx);
      const courses = result?.data || [];

      const withCounts = await Promise.all(
        courses.map(async (course: any) => {
          const enrollmentCount = await strapi.db
            .query('api::enrollment.enrollment')
            .count({ where: { course: course.id } });
          return { ...course, enrollmentCount };
        })
      );

      return { ...result, data: withCounts };
    },

    async findOne(ctx) {
      const result = await super.findOne(ctx);
      if (!result?.data) return result;

      const enrollmentCount = await strapi.db
        .query('api::enrollment.enrollment')
        .count({ where: { course: result.data.id } });

      return { ...result, data: { ...result.data, enrollmentCount } };
    },

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to create a course.');
      }
      const requestData = ctx.request.body?.data || {};
      if (!requestData.Title || !requestData.Title.trim()) {
        return ctx.badRequest('Course Title is required.');
      }
      const instructorId = roleName === 'Instructor' ? user.id : requestData.instructor;
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
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to edit courses.');
      }

      const existingCourse = await strapi
        .documents('api::course.course')
        .findOne({
          documentId: ctx.params.id,
          populate: ['instructor'],
        });

      if (!existingCourse) {
        return ctx.notFound('Course not found.');
      }

      if (roleName === 'Instructor' && existingCourse.instructor?.id !== user.id) {
        return ctx.forbidden('You can only edit your own courses.');
      }

      const requestData = ctx.request.body?.data || {};
      const updateData: any = {};

      if (requestData.Title !== undefined) updateData.Title = requestData.Title;
      if (requestData.Description !== undefined) updateData.Description = requestData.Description;

      if (requestData.instructor !== undefined) {
        // An instructor cannot reassign their own course to a different instructor.
        updateData.instructor = roleName === 'Instructor' ? user.id : requestData.instructor;
      }

      // Using the Document Service directly instead of super.update() — because
      // super.update() silently publishes the entry when status is not specified.
      // The exact same bug was found in Lesson and is fixed here for the same reason
      // (it went unnoticed for a while because the course used to test Save Changes
      // was already published).
      const updatedCourse = await strapi.documents('api::course.course').update({
        documentId: ctx.params.id,
        data: updateData,
      });

      return { data: updatedCourse };
    },

    async delete(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to delete courses.');
      }
      if (roleName === 'Instructor') {
        const course = await strapi.documents('api::course.course').findOne({
          documentId: ctx.params.id,
          populate: ['instructor'],
        });
        if (!course) return ctx.notFound('Course not found.');
        if (course.instructor?.id !== user.id) {
          return ctx.forbidden('You can only delete your own courses.');
        }
      }
      return super.delete(ctx);
    },

    async myCourses(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to view this information.');
      }
      const isInstructor = roleName === 'Instructor';
      const filters = isInstructor ? { instructor: { id: { $eq: user.id } } } : {};
      const draftCourses = await strapi.documents('api::course.course').findMany({
        status: 'draft', filters, populate: { instructor: true, lessons: true },
      });
      const publishedCourses = await strapi.documents('api::course.course').findMany({
        status: 'published', filters,
      });
      const publishedDocIds = new Set(publishedCourses.map((c: any) => c.documentId));
      const data = draftCourses.map((course: any) => ({
        ...course,
        instructor: sanitizeUser(course.instructor),
        isPublished: publishedDocIds.has(course.documentId),
      }));
      return { data };
    },

    async publish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }
      const { id } = ctx.params;
      const course = await strapi.documents('api::course.course').findOne({ documentId: id, populate: ['instructor'] });
      if (!course) return ctx.notFound('Course not found.');
      if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
        return ctx.forbidden('You can only publish your own courses.');
      }
      await strapi.documents('api::course.course').publish({ documentId: id });
      const publishedCourse = await strapi.documents('api::course.course').findOne({ documentId: id, status: 'published' });
      return { data: publishedCourse };
    },

    async unpublish(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }
      const { id } = ctx.params;
      const course = await strapi.documents('api::course.course').findOne({ documentId: id, populate: ['instructor'] });
      if (!course) return ctx.notFound('Course not found.');
      if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
        return ctx.forbidden('You can only unpublish your own courses.');
      }
      await strapi.documents('api::course.course').unpublish({ documentId: id });
      const draftCourse = await strapi.documents('api::course.course').findOne({ documentId: id, status: 'draft' });
      return { data: draftCourse };
    },

  })
);