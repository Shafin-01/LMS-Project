import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({

  async create(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const lessonDocId = ctx.request.body.data.lesson;
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
    if (user?.role?.name === 'Instructor') {
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
    if (user?.role?.name === 'Instructor') {
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