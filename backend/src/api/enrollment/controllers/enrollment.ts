import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({

  async enroll(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login করা লাগবে enroll করার জন্য।');

    const { courseId } = ctx.request.body; // course এর documentId
    if (!courseId) return ctx.badRequest('courseId দিতে হবে।');

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseId,
    });
    if (!course) return ctx.notFound('Course পাওয়া যায়নি।');

    const existing = await strapi.db.query('api::enrollment.enrollment').findOne({
      where: { student: user.id, course: course.id },
    });

    if (existing) return ctx.badRequest('তুমি আগে থেকেই এই course এ enroll করা আছো।');

    const enrollment = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: user.id,
        course: course.id,
        enrolledAt: new Date(),
      },
    });

    return { data: enrollment };
  },

  // Lesson complete মার্ক করা
  async completeLesson(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params; // enrollment এর documentId
    const { lessonId } = ctx.request.body; // lesson এর documentId

    const enrollment = await strapi.documents('api::enrollment.enrollment').findOne({
      documentId: id,
      populate: ['student', 'completedLessons'],
    });

    if (!enrollment) return ctx.notFound('Enrollment পাওয়া যায়নি।');

    // শুধু নিজের enrollment এ নিজে মার্ক করতে পারবে
    if (enrollment.student?.id !== user.id) {
      return ctx.forbidden('এটা তোমার enrollment না।');
    }

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonId,
    });
    if (!lesson) return ctx.notFound('Lesson পাওয়া যায়নি।');

    const alreadyCompleted = enrollment.completedLessons?.some((l: any) => l.id === lesson.id);

    if (!alreadyCompleted) {
      const updatedIds = [...(enrollment.completedLessons?.map((l: any) => l.id) || []), lesson.id];

      await strapi.documents('api::enrollment.enrollment').update({
        documentId: id,
        data: { completedLessons: updatedIds },
      });
    }

    return { message: 'Lesson complete মার্ক করা হয়েছে।' };
  },

  // Progress percentage বের করা
  async getProgress(ctx) {
    const user = ctx.state.user;
    const { id } = ctx.params; // enrollment এর documentId

    const enrollment = await strapi.documents('api::enrollment.enrollment').findOne({
      documentId: id,
      populate: {
        student: true,
        completedLessons: true,
        course: { populate: ['lessons'] },
      },
    });

    if (!enrollment) return ctx.notFound('Enrollment পাওয়া যায়নি।');

    if (enrollment.student?.id !== user.id) {
      return ctx.forbidden('এটা তোমার enrollment না।');
    }

    const totalLessons = enrollment.course?.lessons?.length || 0;
    const completedCount = enrollment.completedLessons?.length || 0;
    const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedCount,
      percentage,
    };
  },

}));