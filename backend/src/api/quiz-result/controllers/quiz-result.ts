/**
 * quiz-result controller
 */

import { factories } from '@strapi/strapi';
import { sanitizeUser } from '../../../utils/sanitize-user';

export default factories.createCoreController('api::quiz-result.quiz-result', ({ strapi }) => ({

  async find(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login is required.');
    }

    const roleName = user.role?.name;

    const sanitize = (results: any[]) =>
      results.map((result: any) => ({
        ...result,
        student: sanitizeUser(result.student),
      }));

    if (roleName === 'Admin' || roleName === 'Content Manager') {
      const results = await strapi.documents('api::quiz-result.quiz-result').findMany({
        populate: {
          student: true,
          lesson: { populate: { course: true } },
        },
      });

      return { data: sanitize(results) };
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

      return { data: sanitize(results) };
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

      return { data: sanitize(results) };
    }

    return ctx.forbidden('You do not have permission to view this information.');
  },

  async findOne(ctx) {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Login is required.');
    }

    const result: any = await strapi.documents('api::quiz-result.quiz-result').findOne({
      documentId: ctx.params.id,
      populate: {
        student: true,
        lesson: { populate: { course: { populate: ['instructor'] } } },
      },
    });

    if (!result) {
      return ctx.notFound('Result not found.');
    }

    const roleName = user.role?.name;

    if (roleName === 'Student' && result.student?.id !== user.id) {
      return ctx.forbidden('This is not your result.');
    }

    if (roleName === 'Instructor' && result.lesson?.course?.instructor?.id !== user.id) {
      return ctx.forbidden('This is not a result from your course.');
    }

    return {
      data: {
        ...result,
        student: sanitizeUser(result.student),
      },
    };
  },

  async create(ctx) {
    return ctx.forbidden('A quiz result cannot be created directly. The backend creates one automatically when a quiz is submitted.');
  },

  async update(ctx) {
    return ctx.forbidden('A quiz result cannot be changed.');
  },

  async delete(ctx) {
    const user = ctx.state.user;

    if (!user || user.role?.name !== 'Admin') {
      return ctx.forbidden('Only an Admin can delete a quiz result.');
    }

    return super.delete(ctx);
  },

}));