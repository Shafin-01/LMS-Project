import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'POST',
    path: '/enrollments/enroll',
    handler: 'enrollment.enroll',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/enrollments/my-enrollments',
    handler: 'enrollment.myEnrollments',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/enrollments/my-enrollment/:courseId',
    handler: 'enrollment.myEnrollmentForCourse',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/enrollments/:id/complete-lesson',
    handler: 'enrollment.completeLesson',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/enrollments/:id/progress',
    handler: 'enrollment.getProgress',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::enrollment.enrollment');

const customRouter = (innerRouter: any, extraRoutes: any[] = []) => {
  let routes: any[];
  return {
    get routes() {
      if (!routes) {
        // 🔧 আগে ছিল innerRouter.routes.concat(extraRoutes) — default route আগে match হতো,
        // যেটা /enrollments/my-enrollments কে /enrollments/:id ভেবে ধরে নিত। এখন custom route আগে।
        routes = extraRoutes.concat(innerRouter.routes);
      }
      return routes;
    },
  };
};

export default customRouter(defaultRouter, customRoutes);