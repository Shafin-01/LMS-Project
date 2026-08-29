import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'POST',
    path: '/lessons/:id/submit-quiz',
    handler: 'lesson.submitQuiz',
    config: { policies: [] },
  },
  {
    method: 'GET',
    path: '/lessons/:id/my-quiz-result',
    handler: 'lesson.myQuizResult',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/lessons/:id/actions/publish',
    handler: 'lesson.publish',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/lessons/:id/actions/unpublish',
    handler: 'lesson.unpublish',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::lesson.lesson');

const customRouter = (innerRouter: any, extraRoutes: any[] = []) => {
  let routes: any[];
  return {
    get routes() {
      if (!routes) {
        routes = extraRoutes.concat(innerRouter.routes);
      }
      return routes;
    },
  };
};

export default customRouter(defaultRouter, customRoutes);