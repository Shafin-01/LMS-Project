import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({

  async enroll(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা লাগবে enroll করার জন্য।');
    }

    const { courseId } = ctx.request.body; // course এর documentId

    if (!courseId) {
      return ctx.badRequest('courseId দিতে হবে।');
    }

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseId,
    });

    if (!course) {
      return ctx.notFound('Course পাওয়া যায়নি।');
    }

    const existing = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: {
        student: user.id,
        course: course.id,
      },
    });

    if (existing) {
      return ctx.badRequest('তুমি আগে থেকেই এই course এ enroll করা আছো।');
    }

    const enrollment = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: user.id,
        course: course.id,
        enrolledAt: new Date(),
      },
    });

    return { data: enrollment };
  },

}));