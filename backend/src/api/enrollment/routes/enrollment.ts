import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'POST',
    path: '/enrollments/enroll',
    handler: 'enrollment.enroll',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::enrollment.enrollment');

// Strapi এর recommended pattern — .routes কে "lazy getter" হিসেবে রাখা,
// যাতে Strapi নিজে যখন দরকার তখনই এটা পড়ে, module load হওয়ার সাথে সাথেই না।
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