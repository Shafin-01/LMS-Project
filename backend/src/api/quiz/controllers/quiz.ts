import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({

  // Student / not-logged-in কাউকে CorrectAnswer field দেখানো হবে না,
  // যাতে quiz দেওয়ার আগেই উত্তর leak না হয়।
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
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const roleName = user.role?.name;

    if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
      return ctx.forbidden('তোমার quiz তৈরি করার permission নেই।');
    }

    if (roleName === 'Instructor') {
      const lessonDocId = ctx.request.body?.data?.lesson;
      const lesson = await strapi.documents('api::lesson.lesson').findOne({
        documentId: lessonDocId,
        populate: { course: { populate: ['instructor'] } },
      });
      if (!lesson || lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এর quiz বানাতে পারবে।');
      }
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
      return ctx.forbidden('তোমার quiz edit করার permission নেই।');
    }

    if (roleName === 'Instructor') {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
      });
      if (!quiz || quiz.lesson?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এর quiz edit করতে পারবে।');
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
      return ctx.forbidden('তোমার quiz delete করার permission নেই।');
    }

    if (roleName === 'Instructor') {
      const quiz = await strapi.documents('api::quiz.quiz').findOne({
        documentId: ctx.params.id,
        populate: { lesson: { populate: { course: { populate: ['instructor'] } } } },
      });
      if (!quiz || quiz.lesson?.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এর quiz delete করতে পারবে।');
      }
    }
    return super.delete(ctx);
  },

}));