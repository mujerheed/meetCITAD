import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { requiresAuth: false, title: 'Sign in' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: 'Dashboard', icon: 'mdi-view-dashboard-outline' },
      },
      {
        path: 'events',
        name: 'Events',
        component: () => import('@/views/events/EventsList.vue'),
        meta: { title: 'Events', icon: 'mdi-calendar-text-outline' },
      },
      {
        path: 'weekly',
        name: 'WeeklyPrograms',
        component: () => import('@/views/weekly/WeeklyPrograms.vue'),
        meta: { title: 'Weekly Programs', icon: 'mdi-calendar-week-outline' },
      },
      {
        path: 'events/new',
        name: 'EventCreate',
        component: () => import('@/views/events/EventForm.vue'),
        meta: { title: 'Create Event', parent: 'Events' },
      },
      {
        path: 'events/:id',
        name: 'EventDetail',
        component: () => import('@/views/events/EventDetail.vue'),
        meta: { title: 'Event Details', parent: 'Events' },
      },
      {
        path: 'events/:id/edit',
        name: 'EventEdit',
        component: () => import('@/views/events/EventForm.vue'),
        meta: { title: 'Edit Event', parent: 'Events' },
      },
      {
        path: 'attendance',
        name: 'Attendance',
        component: () => import('@/views/attendance/Attendance.vue'),
        meta: { title: 'Attendance', icon: 'mdi-account-check-outline' },
      },
      {
        path: 'scanner',
        name: 'Scanner',
        component: () => import('@/views/attendance/Scanner.vue'),
        meta: { title: 'QR Scanner', icon: 'mdi-qrcode-scan' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/UsersList.vue'),
        meta: {
          title: 'Users',
          icon: 'mdi-account-group-outline',
          permission: 'manage_users',
        },
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/users/UserDetail.vue'),
        meta: { title: 'User Details', parent: 'Users', permission: 'manage_users' },
      },
      {
        path: 'certificates',
        name: 'Certificates',
        component: () => import('@/views/certificates/CertificatesList.vue'),
        meta: {
          title: 'Certificates',
          icon: 'mdi-certificate-outline',
          permission: 'generate_certificates',
        },
      },
      {
        path: 'certificates/templates',
        name: 'CertificateTemplates',
        component: () => import('@/views/certificates/TemplatesList.vue'),
        meta: {
          title: 'Certificate Templates',
          parent: 'Certificates',
          permission: 'generate_certificates',
        },
      },
      {
        path: 'feedback',
        name: 'Feedback',
        component: () => import('@/views/feedback/FeedbackList.vue'),
        meta: {
          title: 'Feedback',
          icon: 'mdi-message-text-outline',
          permission: 'view_reports',
        },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/notifications/Notifications.vue'),
        meta: {
          title: 'Notifications',
          icon: 'mdi-bell-outline',
          permission: 'send_notifications',
        },
      },
      {
        path: 'admins',
        name: 'Admins',
        component: () => import('@/views/admins/AdminsList.vue'),
        meta: {
          title: 'Administrators',
          icon: 'mdi-shield-account-outline',
          permission: 'manage_admins',
        },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/Settings.vue'),
        meta: {
          title: 'Settings',
          icon: 'mdi-cog-outline',
          permission: 'manage_settings',
        },
      },
      {
        path: 'forbidden',
        name: 'Forbidden',
        component: () => import('@/views/Forbidden.vue'),
        meta: { title: 'Access Denied' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { requiresAuth: false, title: 'Page Not Found' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)

  if (requiresAuth && !auth.token) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'Login' && auth.token) {
    return { name: 'Dashboard' }
  }

  const denied = to.matched.find(
    (record) => record.meta.permission && !auth.can(record.meta.permission)
  )

  if (denied) {
    return { name: 'Forbidden', query: { from: to.fullPath } }
  }

  return true
})

export default router
