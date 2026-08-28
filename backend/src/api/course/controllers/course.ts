import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({

  async create(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      ctx.request.body.data.instructor = user.id;
    }
    return super.create(ctx);
  },

  async update(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const course = await strapi.documents('api::course.course').findOne({
        documentId: ctx.params.id,
        populate: ['instructor'],
      });
      if (!course || course.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-ই edit করতে পারবে।');
      }
    }
    return super.update(ctx);
  },

  async delete(ctx) {
    const user = ctx.state.user;
    if (user?.role?.name === 'Instructor') {
      const course = await strapi.documents('api::course.course').findOne({
        documentId: ctx.params.id,
        populate: ['instructor'],
      });
      if (!course || course.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-ই delete করতে পারবে।');
      }
    }
    return super.delete(ctx);
  },

}));