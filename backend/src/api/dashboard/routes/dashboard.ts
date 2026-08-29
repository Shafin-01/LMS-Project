export default {
  routes: [
    { method: 'GET', path: '/dashboard/stats', handler: 'dashboard.stats', config: { policies: [] } },
    { method: 'GET', path: '/dashboard/users', handler: 'dashboard.listUsers', config: { policies: [] } },
    { method: 'GET', path: '/dashboard/roles', handler: 'dashboard.listRoles', config: { policies: [] } },
    { method: 'PUT', path: '/dashboard/users/role', handler: 'dashboard.updateUserRole', config: { policies: [] } },
  ],
};