import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'GET',
    path: '/courses/my-courses',
    handler: 'course.myCourses',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::course.course');

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