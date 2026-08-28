import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::enrollment.enrollment',
  ({ strapi }) => ({

    async enroll(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে enroll করার জন্য।'
        );
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden(
          'শুধুমাত্র Student course-এ enroll করতে পারবে।'
        );
      }

      const { courseId } = ctx.request.body || {};

      if (!courseId || typeof courseId !== 'string') {
        return ctx.badRequest(
          'Valid courseId দিতে হবে।'
        );
      }

      const course = await strapi
        .documents('api::course.course')
        .findOne({
          documentId: courseId,
        });

      if (!course) {
        return ctx.notFound(
          'Course পাওয়া যায়নি।'
        );
      }

      if (!course.publishedAt) {
        return ctx.badRequest(
          'এই course এখনো published হয়নি।'
        );
      }

      const existingEnrollments = await strapi
        .documents('api::enrollment.enrollment')
        .findMany({
          filters: {
            course: {
              documentId: {
                $eq: course.documentId,
              },
            },
            student: {
              id: {
                $eq: user.id,
              },
            },
          },
        });

      if (existingEnrollments.length > 0) {
        return ctx.badRequest(
          'তুমি আগে থেকেই এই course-এ enroll করা আছো।'
        );
      }

      const enrollment = await strapi
        .documents('api::enrollment.enrollment')
        .create({
          data: {
            student: user.id,
            course: course.id,
            enrolledAt: new Date(),
          },
        });

      return {
        data: enrollment,
      };
    },

    async myEnrollments(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে।'
        );
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden(
          'শুধুমাত্র Student নিজের enrollments দেখতে পারবে।'
        );
      }

      const enrollments = await strapi
        .documents('api::enrollment.enrollment')
        .findMany({
          filters: {
            student: {
              id: {
                $eq: user.id,
              },
            },
          },
          populate: ['course'],
        });

      return {
        data: enrollments,
      };
    },

    async myEnrollmentForCourse(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে।'
        );
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden(
          'শুধুমাত্র Student নিজের enrollment দেখতে পারবে।'
        );
      }

      const { courseId } = ctx.params;

      if (!courseId) {
        return ctx.badRequest(
          'courseId দিতে হবে।'
        );
      }

      const course = await strapi
        .documents('api::course.course')
        .findOne({
          documentId: courseId,
        });

      if (!course) {
        return ctx.notFound(
          'Course পাওয়া যায়নি।'
        );
      }

      const enrollments = await strapi
        .documents('api::enrollment.enrollment')
        .findMany({
          filters: {
            course: {
              documentId: {
                $eq: course.documentId,
              },
            },
            student: {
              id: {
                $eq: user.id,
              },
            },
          },
        });

      return {
        data: enrollments[0] || null,
      };
    },

    async completeLesson(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে।'
        );
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden(
          'শুধুমাত্র Student lesson complete করতে পারবে।'
        );
      }

      const { id } = ctx.params;
      const { lessonId } = ctx.request.body || {};

      if (!id || !lessonId) {
        return ctx.badRequest(
          'enrollmentId এবং lessonId দুটোই দিতে হবে।'
        );
      }

      const enrollment = await strapi
        .documents('api::enrollment.enrollment')
        .findOne({
          documentId: id,
          populate: {
            student: true,
            course: true,
            completedLessons: true,
          },
        });

      if (!enrollment) {
        return ctx.notFound(
          'Enrollment পাওয়া যায়নি।'
        );
      }

      if (enrollment.student?.id !== user.id) {
        return ctx.forbidden(
          'এটা তোমার enrollment না।'
        );
      }

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: lessonId,
          populate: ['course'],
        });

      if (!lesson) {
        return ctx.notFound(
          'Lesson পাওয়া যায়নি।'
        );
      }

      if (lesson.course?.id !== enrollment.course?.id) {
        return ctx.forbidden(
          'এই lesson তোমার enrolled course-এর অংশ নয়।'
        );
      }

      const alreadyCompleted =
        enrollment.completedLessons?.some(
          (completedLesson: any) =>
            completedLesson.documentId === lesson.documentId ||
            completedLesson.id === lesson.id
        );

      if (!alreadyCompleted) {
        const completedLessonIds =
          enrollment.completedLessons?.map(
            (lessonItem: any) => lessonItem.id
          ) || [];

        await strapi
          .documents('api::enrollment.enrollment')
          .update({
            documentId: id,
            data: {
              completedLessons: [
                ...completedLessonIds,
                lesson.id,
              ],
            },
          });
      }

      return {
        message: 'Lesson complete মার্ক করা হয়েছে।',
      };
    },

    async getProgress(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে।'
        );
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden(
          'শুধুমাত্র Student নিজের progress দেখতে পারবে।'
        );
      }

      const { id } = ctx.params;

      if (!id) {
        return ctx.badRequest(
          'enrollmentId দিতে হবে।'
        );
      }

      const enrollment = await strapi
        .documents('api::enrollment.enrollment')
        .findOne({
          documentId: id,
          populate: {
            student: true,
            completedLessons: true,
            course: {
              populate: ['lessons'],
            },
          },
        });

      if (!enrollment) {
        return ctx.notFound(
          'Enrollment পাওয়া যায়নি।'
        );
      }

      if (enrollment.student?.id !== user.id) {
        return ctx.forbidden(
          'এটা তোমার enrollment না।'
        );
      }

      const totalLessons =
        enrollment.course?.lessons?.length || 0;

      const completedCount =
        enrollment.completedLessons?.filter(
          (completedLesson: any) =>
            enrollment.course?.lessons?.some(
              (courseLesson: any) =>
                courseLesson.id === completedLesson.id
            )
        ).length || 0;

      const percentage =
        totalLessons > 0
          ? Math.round(
              (completedCount / totalLessons) * 100
            )
          : 0;

      return {
        totalLessons,
        completedCount,
        percentage,
      };
    },

  })
);