import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController(
  'api::course.course',
  ({ strapi }) => ({

    // find/findOne add an "enrollmentCount" number onto each course (a plain
    // count is safe to expose publicly — unlike populating the enrollments
    // relation itself, it doesn't leak any student data), and — this is the
    // important part — explicitly decide who is allowed to request the
    // draft (unpublished) version via ?status=draft.
    //
    // Strapi's default core find/findOne does NOT restrict the status query
    // param by role on its own: as long as a role has the base "find"
    // permission checked (which Student/Public must have, so they can
    // browse published courses), it can also pass status=draft and get
    // unpublished courses back. Only Admin/Content Manager may see any
    // course's draft; an Instructor may only see the draft of their OWN
    // course; everyone else always gets published-only, no matter what
    // status they ask for. This mirrors the same guard already applied to
    // blog-post.ts's find/findOne.
    async find(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const requestedDraft = ctx.query?.status === 'draft';

      // Instructor is deliberately left out here: the dashboard never lists
      // drafts through this endpoint for an Instructor (it uses the
      // ownership-scoped myCourses() action for that), so there's no
      // legitimate case to support and the safest default is to deny it.
      const canListDrafts = roleName === 'Admin' || roleName === 'Content Manager';
      ctx.query = { ...ctx.query, status: requestedDraft && canListDrafts ? 'draft' : 'published' };

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
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const requestedDraft = ctx.query?.status === 'draft';

      let allowDraft = roleName === 'Admin' || roleName === 'Content Manager';

      if (!allowDraft && requestedDraft && roleName === 'Instructor') {
        // An Instructor may see a draft only for their own course — checked
        // by looking the course up in draft status and comparing ownership,
        // same ownership check already used for edit/delete/publish above.
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

      // The public course page (frontend/src/app/courses/[id]/page.tsx) needs
      // a lesson list — even for a guest who isn't logged in — so it can show
      // the syllabus (title only, greyed out until enrolled) and let
      // LessonList's own client-side access check unlock it after enrollment.
      // super.findOne()'s own populate=* can't be relied on for this: Strapi
      // silently drops a populated relation the requester's role doesn't have
      // "find" permission for, and Lesson's find permission is deliberately
      // NOT open to Public/Student, because that endpoint's response includes
      // VideoURL/Content — the actual paid content, which must stay behind
      // the enrollment check in lesson.ts's findOne(). Fetching the lessons
      // here instead, through the Document Service directly, bypasses that
      // REST permission layer entirely (the same pattern myCourses() above
      // already uses) and only the safe title fields are attached below, so
      // no Strapi Admin Panel permission change is needed for this.
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