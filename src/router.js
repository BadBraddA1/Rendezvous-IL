import { createRouter, createWebHistory } from "vue-router"
import HomeView from "./views/HomeView.vue"
import ScheduleView from "./views/ScheduleView.vue"
import AboutView from "./views/AboutView.vue"

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
  },
  {
    path: "/schedule",
    name: "schedule",
    component: ScheduleView,
  },
  {
    path: "/about",
    name: "about",
    component: AboutView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (to.hash) {
      const offset = 120
      const element = document.querySelector(to.hash)

      if (element) {
        const top = element.offsetTop - offset

        return {
          top,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        }
      }
    }

    if (savedPosition) {
      return savedPosition
    }

    return { top: 0 }
  },
})

export default router
