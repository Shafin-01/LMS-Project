import { factories } from '@strapi/strapi';

const customRoutes = [
  {
    method: 'POST',
    path: '/blog-posts/:id/actions/publish',
    handler: 'blog-post.publish',
    config: { policies: [] },
  },
  {
    method: 'POST',
    path: '/blog-posts/:id/actions/unpublish',
    handler: 'blog-post.unpublish',
    config: { policies: [] },
  },
];

const defaultRouter = factories.createCoreRouter('api::blog-post.blog-post');

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