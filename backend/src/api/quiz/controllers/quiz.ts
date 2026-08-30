import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({

  // A Student never reads quiz data through this endpoint at all — they get
  // quiz questions (with CorrectAnswer already stripped) through
  // lesson.ts's findOne(), which also verifies enrollment first, and submit
  // through lesson.ts's submitQuiz(), which grades server-side. So find/
  // findOne here are for the course-management side only (Admin/Content
  // Manager/Instructor), the same three roles allowed to create/update/
  // delete a quiz below — and an Instructor is further scoped to quizzes
  // that belong to their own courses, same ownership check used by
  // create/update/delete. Without this, any authenticated user (Student
  // included) could hit GET /api/quizzes directly and read every course's
  // quiz questions without ever enrolling.
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Login is required.');
    }
    const roleName = user.role?.name;
    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('You do not have permission to view quizzes this way.');
    }

    const response: any = await super.find(ctx);

    if (roleName === 'Instructor' && Array.isArray(response?.data)) {
      const owned = await Promise.all(
        response.data.map(async (quiz: any) => {
          const full = await strapi.documents('api::quiz.quiz').findOne({
            documentId: quiz.documentId,
            populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
          });
          return full?.lesson?.course?.instructor?.id === user.id ? quiz : null;
        })
      );
      response.data = owned.filter(Boolean);
    }

    return response;
  },

  async findOne(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Login is required.');
    }
    const roleName = user.role?.name;
    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('You do not have permission to view this quiz.');
    }

    if (roleName === 'Instructor') {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
      });
      if (!quiz || quiz.lesson?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only view quizzes for your own courses.');
      }
    }

    return super.findOne(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login is required.');
    }

    const roleName = user.role?.name;

    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('You do not have permission to create a quiz.');
    }

    const lessonDocId = ctx.request.body?.data?.lesson;

    // Only the Instructor branch used to check this, so an Admin/Content
    // Manager request missing "lesson" (never sent by the shipped UI, but
    // reachable via a direct API call) fell straight through to
    // super.create() and silently created an orphan quiz attached to no
    // lesson — it would never show up anywhere, but would sit in the
    // database and inflate quiz counts. Requiring it up front closes that
    // for every role, not just Instructor.
    if (!lessonDocId) {
      return ctx.badRequest('A lesson must be provided for the quiz.');
    }

    if (roleName === 'Instructor') {
      const lesson = await strapi.documents('api::lesson.lesson').findOne({
        documentId: lessonDocId,
        populate: { course: { populate: ['instructor'] } },
      });
      if (!lesson || lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only create quizzes for your own courses.');
      }
    }

    const response: any = await super.create(ctx);

    // A quiz question has no separate Publish button in the UI — it's a
    // small piece of sub-content inside a Lesson, not something that needs
    // its own draft/publish workflow. So it's published immediately on
    // creation, so a Student's submitQuiz() can pick it up right away.
    const documentId = response?.data?.documentId;
    if (documentId) {
      await strapi.documents('api::quiz.quiz').publish({ documentId });
    }

    return response;
  },

  async update(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login is required.');
    }

    const roleName = user.role?.name;

    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('You do not have permission to edit quizzes.');
    }

    if (roleName === 'Instructor') {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
      });
      if (!quiz || quiz.lesson?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only edit quizzes for your own courses.');
      }
    }

    const response: any = await super.update(ctx);

    // Published again after every update, otherwise an edited
    // answer/question wouldn't be reflected in the published version, and a
    // Student would keep seeing the old version.
    const documentId = ctx.params.id;
    if (documentId) {
      await strapi.documents('api::quiz.quiz').publish({ documentId });
    }

    return response;
  },

  async delete(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login is required.');
    }

    const roleName = user.role?.name;

    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('You do not have permission to delete quizzes.');
    }

    if (roleName === 'Instructor') {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
      });
      if (!quiz || quiz.lesson?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only delete quizzes for your own courses.');
      }
    }
    return super.delete(ctx);
  },

}));