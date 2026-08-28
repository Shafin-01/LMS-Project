import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'POST',
    path: '/lessons/:id/submit-quiz',
    handler: 'lesson.submitQuiz',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::lesson.lesson');

const customRouter = (innerRouter: any, extraRoutes: any[] = []) => {
  let routes: any[];
  return {
    get routes() {
      if (!routes) {
        routes = innerRouter.routes.concat(extraRoutes);
      }
      return routes;
    },
  };
};

export default customRouter(defaultRouter, customRoutes);