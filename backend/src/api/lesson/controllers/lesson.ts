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

    // ⬇️ নতুন — Quiz submit + auto grading
    async submitQuiz(ctx) {
        const user = ctx.state.user;
        const { id } = ctx.params; // lesson এর documentId
        const { answers } = ctx.request.body; // { "abc123docId": "A", "xyz456docId": "C" } -> { quizDocumentId: selectedOption }

        if (!user) return ctx.unauthorized('Login করা লাগবে।');
        if (!answers) return ctx.badRequest('answers পাঠাতে হবে।');

        const lesson = await strapi.documents('api::lesson.lesson').findOne({
            documentId: id,
        });
        if (!lesson) return ctx.notFound('Lesson পাওয়া যায়নি।');

        // এই lesson এর সব quiz question নিয়ে আসো
        const quizzes = await strapi.documents('api::quiz.quiz').findMany({
            filters: { lesson: { id: lesson.id } },
        });

        if (!quizzes || quizzes.length === 0) {
            return ctx.badRequest('এই lesson এ কোনো quiz নেই।');
        }

        let score = 0;

        for (const quiz of quizzes) {
            const studentAnswer = answers[quiz.documentId];
            if (studentAnswer && studentAnswer === quiz.CorrectAnswer) {
                score += 1;
            }
        }

        const result = await strapi.documents('api::quiz-result.quiz-result').create({
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

}));