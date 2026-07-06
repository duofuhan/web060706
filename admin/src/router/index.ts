import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['auction_admin', 'system_admin'] },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
      { path: 'users', name: 'users', component: () => import('@/views/Users.vue') },
      { path: 'all-items', name: 'all-items', component: () => import('@/views/AllItems.vue') },
      { path: 'auctions', name: 'auctions', component: () => import('@/views/Auctions.vue') },
      { path: 'items', name: 'items', component: () => import('@/views/Items.vue') },
      { path: 'disputes', name: 'disputes', component: () => import('@/views/Disputes.vue') },
      { path: 'logs', name: 'logs', component: () => import('@/views/Logs.vue') },
      { path: 'config', name: 'config', component: () => import('@/views/Config.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.token) return '/login';
  const roles = to.meta.roles as string[] | undefined;
  if (roles && auth.role && !roles.includes(auth.role)) return '/dashboard';
  return true;
});

export default router;