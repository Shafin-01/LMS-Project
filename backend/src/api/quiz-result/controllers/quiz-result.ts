/**
 * quiz-result controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-result.quiz-result', ({ strapi }) => ({

  async find(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const roleName = user.role?.name;

    // এখানে ইচ্ছা করেই super.find(ctx) ব্যবহার করছি না।
    // কারণ: Strapi-র REST filter validation "student" relation
    // (যেটা plugin::users-permissions.user কে target করে) filter করতে
    // দেয় না, যদি না ওই role-এর User model-এ "find" permission enable
    // করা থাকে। এই সমস্যা এড়াতে সরাসরি Document Service API ব্যবহার
    // করছি, যেটা REST layer bypass করে।
    if (roleName === 'Admin' || roleName === 'Content Manager') {
      const results = await strapi.documents('api::quiz-result.quiz-result').findMany({
        populate: {
          student: true,
          lesson: { populate: { course: true } },
        },
      });

      return { data: results };
    }

    if (roleName === 'Student') {
      const results = await strapi.documents('api::quiz-result.quiz-result').findMany({
        filters: {
          student: { id: { $eq: user.id } },
        },
        populate: {
          student: true,
          lesson: { populate: { course: true } },
        },
      });

      return { data: results };
    }

    if (roleName === 'Instructor') {
      const myCourses = await strapi.documents('api::course.course').findMany({
        filters: { instructor: { id: { $eq: user.id } } },
      });
      const myCourseDocIds = myCourses.map((c: any) => c.documentId);

      const results = await strapi.documents('api::quiz-result.quiz-result').findMany({
        filters: {
          lesson: { course: { documentId: { $in: myCourseDocIds } } },
        },
        populate: {
          student: true,
          lesson: { populate: { course: true } },
        },
      });

      return { data: results };
    }

    return ctx.forbidden('তোমার এই তথ্য দেখার permission নেই।');
  },

  async findOne(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login করা বাধ্যতামূলক।');
    }

    const result: any = await strapi.documents('api::quiz-result.quiz-result').findOne({
      documentId: ctx.params.id,
      populate: {
        student: true,
        lesson: { populate: { course: { populate: ['instructor'] } } },
      },
    });

    if (!result) {
      return ctx.notFound('Result পাওয়া যায়নি।');
    }

    const roleName = user.role?.name;

    if (roleName === 'Student' && result.student?.id !== user.id) {
      return ctx.forbidden('এটা তোমার result না।');
    }

    if (roleName === 'Instructor' && result.lesson?.course?.instructor?.id !== user.id) {
      return ctx.forbidden('এটা তোমার course-এর result না।');
    }

    return { data: result };
  },

  // Result শুধুমাত্র lesson.submitQuiz (auto-grading) থেকেই তৈরি হবে।
  // Direct create কাউকে করতে দেওয়া হবে না, তা না হলে student নিজের
  // ইচ্ছামতো score বসিয়ে দিতে পারবে।
  async create(ctx) {
    return ctx.forbidden('Quiz result সরাসরি তৈরি করা যাবে না। Quiz submit করলে backend automatic তৈরি করে দেয়।');
  },

  async update(ctx) {
    return ctx.forbidden('Quiz result পরিবর্তন করা যাবে না।');
  },

  async delete(ctx) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      return ctx.forbidden('শুধু Admin quiz result delete করতে পারবে।');
    }

    return super.delete(ctx);
  },

}));