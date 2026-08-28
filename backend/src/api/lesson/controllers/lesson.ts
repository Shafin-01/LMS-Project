import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({

  async create(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const courseDocId = ctx.request.body.data.course;
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseDocId,
        populate: ['instructor'],
      });
      if (!course || course.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এ lesson যোগ করতে পারবে।');
      }
    }
    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const lesson = await strapi.documents('api::lesson.lesson').findOne({
        documentId: ctx.params.id,
        populate: { course: { populate: ['instructor'] } },
      });
      if (!lesson || lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এর lesson edit করতে পারবে।');
      }
    }
    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const lesson = await strapi.documents('api::lesson.lesson').findOne({
        documentId: ctx.params.id,
        populate: { course: { populate: ['instructor'] } },
      });
      if (!lesson || lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course এর lesson delete করতে পারবে।');
      }
    }
    return super.delete(ctx);
  },

}));