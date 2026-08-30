import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::lesson.lesson',
  ({ strapi }) => ({

    // Strapi's default core find() does NOT restrict the ?status=draft query
    // param by role beyond the base "find" permission checkbox — so without
    // this override, any authenticated user with lesson.find enabled
    // (Students need it indirectly, since the dashboard's lesson list is the
    // only caller of this endpoint... but a Student could still call it
    // directly) could pass status=draft and see unpublished lesson content
    // for any course, not just enrolled/published ones. Only Admin/Content
    // Manager may list drafts for any course; an Instructor only for a
    // single course they own (the only way this endpoint is actually
    // called, filtered by course.documentId); everyone else always gets
    // published-only lessons regardless of what status they request.
    async find(ctx) {
      const user = ctx.state.user;
      const roleName = user?.role?.name;
      const requestedDraft = ctx.query?.status === 'draft';

      let allowDraft = roleName === 'Admin' || roleName === 'Content Manager';

      if (!allowDraft && requestedDraft && roleName === 'Instructor') {
        const filters: any = ctx.query?.filters || {};
        const courseDocId = filters?.course?.documentId?.$eq;

        if (courseDocId) {
          const course = await strapi.documents('api::course.course').findOne({
            documentId: courseDocId,
            populate: ['instructor'],
          });
          allowDraft = course?.instructor?.id === user.id;
        }
      }

      ctx.query = { ...ctx.query, status: requestedDraft && allowDraft ? 'draft' : 'published' };

      return super.find(ctx);
    },

    async findOne(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized(
          'You must log in to view this lesson.'
        );
      }

      const lessonId = ctx.params.id;

      if (!lessonId) {
        return ctx.badRequest(
          'A valid lessonId is required.'
        );
      }

      const roleName = user.role?.name;
      const canViewAnyDraft = roleName === 'Admin' || roleName === 'Content Manager';

      // strapi.documents().findOne() defaults to the DRAFT row when no
      // "status" is given — so without asking for 'published' explicitly
      // here, an enrolled Student (or anyone who knows/guesses a lessonId)
      // could read a lesson's Content/VideoURL before it was ever
      // published, completely bypassing the Publish step. Only Admin/
      // Content Manager (any lesson) or the Instructor who owns the
      // lesson's course (previewing their own draft) may see the draft
      // version; everyone else only ever gets the published one.
      //
      // "instructor" is populated one level under course on BOTH branches
      // below, purely for the ownership check further down — it is deleted
      // back off before the lesson is used any further, so it never reaches
      // the response. The populate shape is written out on each call
      // (rather than shared through one variable) because Strapi's
      // generated types infer a precise literal-array type for populate
      // only when the object is written directly at the call site;
      // hoisting it into a shared variable loses that inference and fails
      // to compile.
      let lesson: any = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: lessonId,
          status: 'published',
          populate: { course: { populate: ['instructor'] }, quizzes: true },
        });

      if (!lesson) {
        const draftLesson: any = await strapi
          .documents('api::lesson.lesson')
          .findOne({
            documentId: lessonId,
            status: 'draft',
            populate: { course: { populate: ['instructor'] }, quizzes: true },
          });

        const isOwningInstructor =
          roleName === 'Instructor' &&
          draftLesson?.course?.instructor?.id === user.id;

        if (draftLesson && (canViewAnyDraft || isOwningInstructor)) {
          lesson = draftLesson;
        }
      }

      if (!lesson) {
        return ctx.notFound(
          'Lesson not found.'
        );
      }

      // Every other action in this file (update/delete/publish/unpublish)
      // restricts an Instructor to only their own courses' lessons — this
      // was previously only enforced for the draft-preview branch above,
      // leaving a gap where an Instructor could fetch ANY other
      // instructor's already-published lesson (full Content/VideoURL, plus
      // its quizzes) with no ownership check at all. Closing that here.
      if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden(
          'You can only view lessons in your own courses.'
        );
      }

      if (lesson.course) delete lesson.course.instructor;

      if (roleName === 'Student') {
        const courseDocumentId = lesson.course?.documentId;

        if (!courseDocumentId) {
          return ctx.forbidden(
            'This lesson is not linked to a valid course.'
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
            'You need to enroll in this course before you can view this lesson.'
          );
        }
      }

      // Strips the correct answer out of each quiz for a Student, so it can
      // never leak. The quiz.ts controller already had this protection, but
      // it was being bypassed here because this endpoint populates quizzes
      // directly through the lesson — so the same protection is applied here too.
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
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to create a lesson.');
      }

      const requestData = ctx.request.body?.data || {};
      const courseDocId = requestData.course;

      if (!courseDocId) {
        return ctx.badRequest('A course must be provided for the lesson.');
      }

      if (roleName === 'Instructor') {
        const course = await strapi
          .documents('api::course.course')
          .findOne({
            documentId: courseDocId,
            populate: ['instructor'],
          });

        if (!course) {
          return ctx.notFound('Course not found.');
        }

        if (course.instructor?.id !== user.id) {
          return ctx.forbidden('You can only add lessons to your own courses.');
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
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to edit lessons.');
      }

      const existingLesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: ctx.params.id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!existingLesson) {
        return ctx.notFound('Lesson not found.');
      }

      if (
        roleName === 'Instructor' &&
        existingLesson.course?.instructor?.id !== user.id
      ) {
        return ctx.forbidden('You can only edit lessons in your own courses.');
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
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have permission to delete lessons.');
      }

      const lesson: any = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: ctx.params.id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!lesson) {
        return ctx.notFound('Lesson not found.');
      }

      if (
        roleName === 'Instructor' &&
        lesson.course?.instructor?.id !== user.id
      ) {
        return ctx.forbidden('You can only delete lessons in your own courses.');
      }

      // super.delete() only removes theals, and documentId is
      // the one identifier that's stable across both.
      const quizzes = await strapi.documents('api::quiz.quiz').findMany({
        filters: { lesson: { documentId: { $eq: lesson.documentId } } },
        fields: ['id'],
      });
      for (const quiz of quizzes as any[]) {
        await strapi.documents('api::quiz.quiz').delete({ documentId: quiz.documentId });
      }

      const quizResults = await strapi.documents('api::quiz-result.quiz-result').findMany({
        filters: { lesson: { documentId: { $eq: lesson.documentId } } },
        fields: ['id'],
      });
      for (const result of quizResults as any[]) {
        await strapi.documents('api::quiz-result.quiz-result').delete({ documentId: result.documentId });
      }

      await strapi.documents('api::lesson.lesson').delete({ documentId: lesson.documentId });

      return { data: { id: lesson.id } };
    },

    async publish(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!lesson) {
        return ctx.notFound('Lesson not found.');
      }

      if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only publish lessons in your own courses.');
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
        return ctx.unauthorized('Login is required.');
      }

      const roleName = user.role?.name;

      if (!['Admin', 'Content Manager', 'Instructor'].includes(roleName)) {
        return ctx.forbidden('You do not have this permission.');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: { course: { populate: ['instructor'] } },
        });

      if (!lesson) {
        return ctx.notFound('Lesson not found.');
      }

      if (roleName === 'Instructor' && lesson.course?.instructor?.id !== user.id) {
        return ctx.forbidden('You can only unpublish lessons in your own courses.');
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
        return ctx.unauthorized('Login is required.');
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden('Only a Student can submit a quiz.');
      }

      if (!answers) {
        return ctx.badRequest('Answers are required.');
      }

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({
          documentId: id,
          populate: ['course'],
        });

      if (!lesson) {
        return ctx.notFound('Lesson not found.');
      }

      const courseDocumentId = lesson.course?.documentId;

      if (!courseDocumentId) {
        return ctx.forbidden('This lesson is not linked to a valid course.');
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
        return ctx.forbidden('You need to enroll in this course before you can take the quiz.');
      }

      // A quiz can only be attempted once — this check lives on the backend
      // (not just the frontend) so a direct API call can't bypass it either.
      // Filtered/linked by the lesson's documentId rather than its numeric
      // id — same reasoning as lesson.ts's delete() cascade above:
      // documentId is the one identifier that's stable regardless of which
      // row (draft or published) a "lesson" relation actually resolves
      // against internally.
      const existingResults = await strapi
        .documents('api::quiz-result.quiz-result')
        .findMany({
          filters: {
            student: { id: { $eq: user.id } },
            lesson: { documentId: { $eq: lesson.documentId } },
          },
        });

      if (existingResults && existingResults.length > 0) {
        return ctx.forbidden('You have already taken this quiz — it cannot be retaken.');
      }

      const quizzes = await strapi
        .documents('api::quiz.quiz')
        .findMany({
          filters: { lesson: { documentId: { $eq: lesson.documentId } } },
        });

      if (!quizzes || quizzes.length === 0) {
        return ctx.badRequest('This lesson does not have a quiz.');
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
            lesson: lesson.documentId,
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

    // If the Student has already taken the quiz, returns their score along
    // with each question's correct answer and their own submitted answer —
    // for the review screen. Including CorrectAnswer here is safe because it
    // is only ever shown once that student has already submitted the quiz
    // (and can no longer retake it).
    async myQuizResult(ctx) {
      const user = ctx.state.user;

      if (!user) {
        return ctx.unauthorized('Login is required.');
      }

      if (user.role?.name !== 'Student') {
        return ctx.forbidden('Only a Student can view their own quiz result this way.');
      }

      const { id } = ctx.params;

      const lesson = await strapi
        .documents('api::lesson.lesson')
        .findOne({ documentId: id });

      if (!lesson) {
        return ctx.notFound('Lesson not found.');
      }

      // Filtered by the lesson's documentId rather than its numeric id — same
      // reasoning as submitQuiz() above.
      const results = await strapi
        .documents('api::quiz-result.quiz-result')
        .findMany({
          filters: {
            student: { id: { $eq: user.id } },
            lesson: { documentId: { $eq: lesson.documentId } },
          },
        });

      if (!results || results.length === 0) {
        return { data: null };
      }

      const result: any = results[0];

      const quizzes = await strapi
        .documents('api::quiz.quiz')
        .findMany({
          filters: { lesson: { documentId: { $eq: lesson.documentId } } },
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