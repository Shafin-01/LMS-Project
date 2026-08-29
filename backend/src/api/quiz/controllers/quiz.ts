import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({

  // The CorrectAnswer field is never shown to a Student or a logged-out
  // visitor, so the answer can't leak before the quiz is taken.
  async find(ctx) {
    const response: any = await super.find(ctx);
    const user = ctx.state.user;
    const roleName = user?.role?.name;

    const shouldHideAnswer = !user || roleName === 'Student';

    if (shouldHideAnswer && Array.isArray(response?.data)) {
      response.data = response.data.map((quiz: any) => {
        const { CorrectAnswer, ...rest } = quiz;
        return rest;
      });
    }

    return response;
  },

  async findOne(ctx) {
    const response: any = await super.findOne(ctx);
    const user = ctx.state.user;
    const roleName = user?.role?.name;

    const shouldHideAnswer = !user || roleName === 'Student';

    if (shouldHideAnswer && response?.data) {
      const { CorrectAnswer, ...rest } = response.data;
      response.data = rest;
    }

    return response;
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

    if (roleName === 'Instructor') {
      const lessonDocId = ctx.request.body?.data?.lesson;
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