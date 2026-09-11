import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController(
  'api::course.course',
  ({ strapi }) => ({


    //course list.

    async find(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const requestedDraft = ctx.query?.status === 'draft';
      const canListDrafts = roleName === 'Admin' || roleName === 'Content Manager';
      // Admin and CM has access for draft. otherwise published.
      ctx.query = { ...ctx.query, status: requestedDraft && canListDrafts ? 'draft' : 'published' };

      const result = await super.find(ctx);

      const courses = result?.data || [];

      const withCounts = await Promise.all(
        courses.map(async (course: any) => {
          const enrollmentCount = await strapi.db
            .query('api::enrollment.enrollment')
            .count({ where: { course: course.id } });
          const { lessons, ...safeCourse } = course;
          return { ...safeCourse, enrollmentCount };
        })
      );

      return { ...result, data: withCounts };
    },


    //Individual course.

    async findOne(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const requestedDraft = ctx.query?.status === 'draft';

      // Admin ,CM and Instructor has access for draft. otherwise published.

      let allowDraft = roleName === 'Admin' || roleName === 'Content Manager';

      if (!allowDraft && requestedDraft && roleName === 'Instructor') {
        const draftCourse = await strapi.documents('api::course.course').findOne({
          documentId: ctx.params.id,
          status: 'draft',
          populate: ['instructor'],
        });
        allowDraft = draftCourse?.instructor?.id === user.id;
      }

      const resolvedStatus = requestedDraft && allowDraft ? 'draft' : 'published';
      ctx.query = { ...ctx.query, status: resolvedStatus };

      const result = await super.findOne(ctx);
      if (!result?.data) return result;

      const enrollmentCount = await strapi.db
        .query('api::enrollment.enrollment')
        .count({ where: { course: result.data.id } });

      // Course will be shown with enrollment count and lesson list. but wont be aable to see the contents inside lesson.
      
      const lessons = await strapi.documents('api::lesson.lesson').findMany({
        status: resolvedStatus,
        filters: { course: { documentId: { $eq: result.data.documentId } } },
        fields: ['Title'],
      });

      return {
        ...result,
        data: {
          ...result.data,
          enrollmentCount,
          lessons: lessons.map((lesson: any) => ({
            id: lesson.id,
            documentId: lesson.documentId,
            Title: lesson.Title,
          })),
        },
      };
    },


    // Creating Course

    async create(ctx) {

      // Authorization Check

      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to create a course.');
      }

      // Course Title check

      const requestData = ctx.request.body?.data || {};
      if (!requestData.Title || !requestData.Title.trim()) {
        return ctx.badRequest('Course Title is required.');
      }

      // Admin & CM can give instructor name. In case of instructor creating a course instructor id will be his own.

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

    //Managing/updating course.

    async update(ctx) {

      // Authorization Check

      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to edit courses.');
      }

      //Checking if the course actually exist

      const existingCourse = await strapi
        .documents('api::course.course')
        .findOne({
          documentId: ctx.params.id,
          populate: ['instructor'],
        });

      if (!existingCourse) {
        return ctx.notFound('Course not found.');
      }

      // An instructor cant edit others instructors course

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

      // Whether this course is currently live BEFORE the edit — decides whether the edit below should also go live.
      const publishedBeforeEdit = await strapi.documents('api::course.course').findOne({
        documentId: ctx.params.id,
        status: 'published',
      });
      const updatedCourse = await strapi.documents('api::course.course').update({
        documentId: ctx.params.id,
        data: updateData,
      });



      if (publishedBeforeEdit) {
        await strapi.documents('api::course.course').publish({ documentId: ctx.params.id });
      }

      return { data: updatedCourse };
    },

    //Deleting courses

    async delete(ctx) {

      // Authorizxation check

      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Login is required.');
      const roleName = user.role?.name;
      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to delete courses.');
      }

      const course = await strapi.documents('api::course.course').findOne({
        documentId: ctx.params.id,
        populate: ['instructor'],
      });
      if (!course) return ctx.notFound('Course not found.');
      if (roleName === 'Instructor' && course.instructor?.id !== user.id) {
        return ctx.forbidden('You can only delete your own courses.');
      }

      // Deleting every lesson with everything inside it.

      const lessons = await strapi.documents('api::lesson.lesson').findMany({
        status: 'draft',
        filters: { course: { documentId: { $eq: course.documentId } } },
        fields: ['id'],
      });

      for (const lesson of lessons as any[]) {
        const quizzes = await strapi.documents('api::quiz.quiz').findMany({
          filters: { lesson: { documentId: { $eq: lesson.documentId } } },
          fields: ['id'],
        });
        for (const quiz of quizzes as any[]) {
          await strapi.documents('api::quiz.quiz').delete({ documentId: quiz.documentId });
        }

        const quizResults = await strapi.documents('api::quiz-result.quiz-result').findMany({
          filters: { lesson: { documentId: { $eq: lesson.documentId } } },
          fields: ['id'],
        });
        for (const result of quizResults as any[]) {
          await strapi.documents('api::quiz-result.quiz-result').delete({ documentId: result.documentId });
        }

        await strapi.documents('api::lesson.lesson').delete({ documentId: lesson.documentId });
      }

      //Deleting Enrollment info.

      const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
        filters: { course: { documentId: { $eq: course.documentId } } },
        fields: ['id'],
      });
      for (const enrollment of enrollments as any[]) {
        await strapi.documents('api::enrollment.enrollment').delete({ documentId: enrollment.documentId });
      }

      await strapi.documents('api::course.course').delete({ documentId: course.documentId });

      return { data: { id: course.id } };
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