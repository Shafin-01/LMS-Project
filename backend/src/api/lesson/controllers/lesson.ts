import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::lesson.lesson',
  ({ strapi }) => ({

    async findOne(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Lesson দেখতে হলে আগে login করতে হবে।'
        );
      }

      const lessonId = ctx.params.id;

      if (!lessonId) {
        return ctx.badRequest(
          'Valid lessonId দিতে হবে।'
        );
      }

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: lessonId,
          populate: ['course', 'quizzes'],
        });

      if (!lesson) {
        return ctx.notFound(
          'Lesson পাওয়া যায়নি।'
        );
      }

      const roleName = user.role?.name;

      /*
       * Student-এর জন্য lesson access অবশ্যই enrollment-এর
       * মাধ্যমে verify করতে হবে।
       *
       * অন্য roles (Admin / Content Manager / Instructor)
       * এখানে block করা হচ্ছে না, কারণ তাদের lesson management/
       * platform access আলাদা permission দিয়ে নিয়ন্ত্রিত হবে।
       */
      if (roleName === 'Student') {
        const courseDocumentId = lesson.course?.documentId;

        if (!courseDocumentId) {
          return ctx.forbidden(
            'এই lesson কোনো valid course-এর সাথে যুক্ত নয়।'
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
              course: {
                documentId: {
                  $eq: courseDocumentId,
                },
              },
            },
          });

        if (enrollments.length === 0) {
          return ctx.forbidden(
            'এই lesson দেখতে হলে আগে এই course-এ enroll করতে হবে।'
          );
        }
      }

      return {
        data: lesson,
      };
    },

    async create(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা বাধ্যতামূলক।'
        );
      }

      if (user.role?.name === 'Instructor') {
        const courseDocId = ctx.request.body?.data?.course;

        if (!courseDocId) {
          return ctx.badRequest(
            'Lesson-এর সাথে একটি course দিতে হবে।'
          );
        }

        const course = await strapi
          .documents('api::course.course')
          .findOne({
            documentId: courseDocId,
            populate: ['instructor'],
          });

        if (!course) {
          return ctx.notFound(
            'Course পাওয়া যায়নি।'
          );
        }

        if (course.instructor?.id !== user.id) {
          return ctx.forbidden(
            'তুমি শুধু নিজের course-এ lesson যোগ করতে পারবে।'
          );
        }
      }

      return super.create(ctx);
    },

    async update(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা বাধ্যতামূলক।'
        );
      }

      if (user.role?.name === 'Instructor') {
        const lesson = await strapi
          .documents('api::lesson.lesson')
          .findOne({
            documentId: ctx.params.id,
            populate: {
              course: {
                populate: ['instructor'],
              },
            },
          });

        if (!lesson) {
          return ctx.notFound(
            'Lesson পাওয়া যায়নি।'
          );
        }

        if (lesson.course?.instructor?.id !== user.id) {
          return ctx.forbidden(
            'তুমি শুধু নিজের course-এর lesson edit করতে পারবে।'
          );
        }
      }

      return super.update(ctx);
    },

    async delete(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'Login করা বাধ্যতামূলক।'
        );
      }

      if (user.role?.name === 'Instructor') {
        const lesson = await strapi
          .documents('api::lesson.lesson')
          .findOne({
            documentId: ctx.params.id,
            populate: {
              course: {
                populate: ['instructor'],
              },
            },
          });

        if (!lesson) {
          return ctx.notFound(
            'Lesson পাওয়া যায়নি।'
          );
        }

        if (lesson.course?.instructor?.id !== user.id) {
          return ctx.forbidden(
            'তুমি শুধু নিজের course-এর lesson delete করতে পারবে।'
          );
        }
      }

      return super.delete(ctx);
    },

    async submitQuiz(ctx) {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const { answers } = ctx.request.body || {};

      if (!user) {
        return ctx.unauthorized(
          'Login করা লাগবে।'
        );
      }

      if (!answers) {
        return ctx.badRequest(
          'answers পাঠাতে হবে।'
        );
      }

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: ['course'],
        });

      if (!lesson) {
        return ctx.notFound(
          'Lesson পাওয়া যায়নি।'
        );
      }

      /*
       * Student হলে quiz submit করার আগেও enrollment verify করতে হবে।
       * এতে non-enrolled student direct API call করে quiz submit
       * করতে পারবে না।
       */
      if (user.role?.name === 'Student') {
        const courseDocumentId = lesson.course?.documentId;

        if (!courseDocumentId) {
          return ctx.forbidden(
            'এই lesson কোনো valid course-এর সাথে যুক্ত নয়।'
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
              course: {
                documentId: {
                  $eq: courseDocumentId,
                },
              },
            },
          });

        if (enrollments.length === 0) {
          return ctx.forbidden(
            'Quiz দিতে হলে আগে এই course-এ enroll করতে হবে।'
          );
        }
      }

      const quizzes = await strapi
        .documents('api::quiz.quiz')
        .findMany({
          filters: {
            lesson: {
              id: lesson.id,
            },
          },
        });

      if (!quizzes || quizzes.length === 0) {
        return ctx.badRequest(
          'এই lesson-এ কোনো quiz নেই।'
        );
      }

      let score = 0;

      for (const quiz of quizzes) {
        const studentAnswer = answers[quiz.documentId];

        if (
          studentAnswer &&
          studentAnswer === quiz.CorrectAnswer
        ) {
          score += 1;
        }
      }

      const result = await strapi
        .documents('api::quiz-result.quiz-result')
        .create({
          data: {
            student: user.id,
            lesson: lesson.id,
            score,
            totalQuestions: quizzes.length,
            answers,
            submittedAt: new Date(),
          },
        });

      return {
        score,
        totalQuestions: quizzes.length,
        result,
      };
    },

  })
);