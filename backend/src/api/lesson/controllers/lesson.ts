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
              student: { id: { $eq: user.id } },
              course: { documentId: { $eq: courseDocumentId } },
            },
          });

        if (enrollments.length === 0) {
          return ctx.forbidden(
            'এই lesson দেখতে হলে আগে এই course-এ enroll করতে হবে।'
          );
        }
      }

      // Student-দের কাছে quiz-এর সঠিক উত্তর leak হওয়া থেকে বাঁচাতে —
      // quiz.ts controller-এ এই সুরক্ষা আগে থেকেই ছিল, কিন্তু এখানে lesson-এর
      // populate দিয়ে quiz আনার সময় সেটা bypass হয়ে যাচ্ছিল। এখন এখানেও একই
      // সুরক্ষা যোগ করা হলো।
      const responseLesson: any = { ...lesson };

      if (roleName === 'Student' && Array.isArray(responseLesson.quizzes)) {
        responseLesson.quizzes = responseLesson.quizzes.map((quiz: any) => {
          const { CorrectAnswer, ...rest } = quiz;
          return rest;
        });
      }

      return { data: responseLesson };
    },

    async create(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার lesson তৈরি করার permission নেই।');
      }

      const requestData = ctx.request.body?.data || {};
      const courseDocId = requestData.course;

      if (!courseDocId) {
        return ctx.badRequest('Lesson-এর সাথে একটি course দিতে হবে।');
      }

      if (roleName === 'Instructor') {
        const course = await strapi
          .documents('api::course.course')
          .findOne({
            documentId: courseDocId,
            populate: ['instructor'],
          });

        if (!course) {
          return ctx.notFound('Course পাওয়া যায়নি।');
        }

        if (course.instructor?.id !== user.id) {
          return ctx.forbidden('তুমি শুধু নিজের course-এ lesson যোগ করতে পারবে।');
        }
      }

      const lesson = await strapi.documents('api::lesson.lesson').create({
        data: {
          Title: requestData.Title,
          Content: requestData.Content,
          VideoURL: requestData.VideoURL,
          course: courseDocId,
        },
      });

      return { data: lesson };
    },

    async update(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার lesson edit করার permission নেই।');
      }

      const existingLesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: ctx.params.id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!existingLesson) {
        return ctx.notFound('Lesson পাওয়া যায়নি।');
      }

      if (
        roleName === 'Instructor' &&
        existingLesson.course?.instructor?.id !== user.id
      ) {
        return ctx.forbidden('তুমি শুধু নিজের course-এর lesson edit করতে পারবে।');
      }

      const requestData = ctx.request.body?.data || {};
      const updateData: any = {};

      if (requestData.Title !== undefined) updateData.Title = requestData.Title;
      if (requestData.Content !== undefined) updateData.Content = requestData.Content;
      if (requestData.VideoURL !== undefined) updateData.VideoURL = requestData.VideoURL;

      const updatedLesson = await strapi.documents('api::lesson.lesson').update({
        documentId: ctx.params.id,
        data: updateData,
      });

      return { data: updatedLesson };
    },

    async delete(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার lesson delete করার permission নেই।');
      }

      if (roleName === 'Instructor') {
        const lesson = await strapi
          .documents('api::lesson.lesson')
          .findOne({
            documentId: ctx.params.id,
            populate: { course: { populate: ['instructor'] } },
          });

        if (!lesson) {
          return ctx.notFound('Lesson পাওয়া যায়নি।');
        }

        if (lesson.course?.instructor?.id !== user.id) {
          return ctx.forbidden('তুমি শুধু নিজের course-এর lesson delete করতে পারবে।');
        }
      }

      return super.delete(ctx);
    },

    async publish(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!lesson) {
        return ctx.notFound('Lesson পাওয়া যায়নি।');
      }

      if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-এর lesson-ই publish করতে পারবে।');
      }

      await strapi.documents('api::lesson.lesson').publish({ documentId: id });

      const publishedLesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({ documentId: id, status: 'published' });

      return { data: publishedLesson };
    },

    async unpublish(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('তোমার এই permission নেই।');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!lesson) {
        return ctx.notFound('Lesson পাওয়া যায়নি।');
      }

      if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('তুমি শুধু নিজের course-এর lesson-ই unpublish করতে পারবে।');
      }

      await strapi.documents('api::lesson.lesson').unpublish({ documentId: id });

      const draftLesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({ documentId: id, status: 'draft' });

      return { data: draftLesson };
    },

    async submitQuiz(ctx) {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const { answers } = ctx.request.body || {};

      if (!user) {
        return ctx.unauthorized('Login করা লাগবে।');
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden('শুধুমাত্র Student quiz submit করতে পারবে।');
      }

      if (!answers) {
        return ctx.badRequest('answers পাঠাতে হবে।');
      }

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: ['course'],
        });

      if (!lesson) {
        return ctx.notFound('Lesson পাওয়া যায়নি।');
      }

      const courseDocumentId = lesson.course?.documentId;

      if (!courseDocumentId) {
        return ctx.forbidden('এই lesson কোনো valid course-এর সাথে যুক্ত নয়।');
      }

      const enrollments = await strapi
        .documents('api::enrollment.enrollment')
        .findMany({
          filters: {
            student: { id: { $eq: user.id } },
            course: { documentId: { $eq: courseDocumentId } },
          },
        });

      if (enrollments.length === 0) {
        return ctx.forbidden('Quiz দিতে হলে আগে এই course-এ enroll করতে হবে।');
      }

      // একবার quiz দিয়ে ফেললে আর দ্বিতীয়বার দেওয়া যাবে না — সরাসরি API call
      // করলেও যাতে ব্লক থাকে, তাই এই চেক backend-এই রাখা হচ্ছে, শুধু frontend-এ না।
      const existingResults = await strapi
        .documents('api::quiz-result.quiz-result')
        .findMany({
          filters: {
            student: { id: { $eq: user.id } },
            lesson: { id: { $eq: lesson.id } },
          },
        });

      if (existingResults && existingResults.length > 0) {
        return ctx.forbidden('তুমি ইতিমধ্যে এই quiz দিয়ে ফেলেছ, আবার দেওয়া যাবে না।');
      }

      const quizzes = await strapi
        .documents('api::quiz.quiz')
        .findMany({
          filters: { lesson: { id: lesson.id } },
        });

      if (!quizzes || quizzes.length === 0) {
        return ctx.badRequest('এই lesson-এ কোনো quiz নেই।');
      }

      let score = 0;

      for (const quiz of quizzes) {
        const studentAnswer = answers[quiz.documentId];

        if (studentAnswer && studentAnswer === quiz.CorrectAnswer) {
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

    // Student আগে quiz দিয়ে থাকলে তার score + প্রতিটা প্রশ্নের সঠিক উত্তর ও
    // নিজের দেওয়া উত্তর একসাথে ফেরত দেয় — review দেখানোর জন্য। এখানে
    // CorrectAnswer দেওয়া নিরাপদ, কারণ এটা শুধু তখনই দেখানো হয় যখন সেই
    // student ইতিমধ্যে quiz জমা দিয়ে ফেলেছে (আর দিতে পারবে না)।
    async myQuizResult(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login করা বাধ্যতামূলক।');
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden('শুধুমাত্র Student-এর নিজের quiz result এভাবে দেখা যাবে।');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({ documentId: id });

      if (!lesson) {
        return ctx.notFound('Lesson পাওয়া যায়নি।');
      }

      const results = await strapi
        .documents('api::quiz-result.quiz-result')
        .findMany({
          filters: {
            student: { id: { $eq: user.id } },
            lesson: { id: { $eq: lesson.id } },
          },
        });

      if (!results || results.length === 0) {
        return { data: null };
      }

      const result: any = results[0];

      const quizzes = await strapi
        .documents('api::quiz.quiz')
        .findMany({
          filters: { lesson: { id: lesson.id } },
        });

      const review = quizzes.map((quiz: any) => ({
        documentId: quiz.documentId,
        Question: quiz.Question,
        OptionA: quiz.OptionA,
        OptionB: quiz.OptionB,
        OptionC: quiz.OptionC,
        OptionD: quiz.OptionD,
        CorrectAnswer: quiz.CorrectAnswer,
        yourAnswer: (result.answers as any)?.[quiz.documentId] || null,
      }));

      return {
        data: {
          score: result.score,
          totalQuestions: result.totalQuestions,
          submittedAt: result.submittedAt,
          review,
        },
      };
    },

  })
);