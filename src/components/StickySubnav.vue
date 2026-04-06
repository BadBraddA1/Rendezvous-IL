<template>
  <nav class="sticky-subnav" aria-label="Day navigation">
    <div class="subnav-container">
      <a
        v-for="day in days"
        :key="day.id"
        :href="`#${day.id}`"
        class="subnav-link"
        @click="handleClick"
      >
        {{ day.label }}
      </a>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'StickySubnav',
  data() {
    return {
      days: [
        { id: 'monday', label: 'Mon' },
        { id: 'tuesday', label: 'Tue' },
        { id: 'wednesday', label: 'Wed' },
        { id: 'thursday', label: 'Thu' },
        { id: 'friday', label: 'Fri' },
        { id: 'plan-b', label: 'Plan B' }
      ]
    }
  },
  methods: {
    handleClick(event) {
      event.preventDefault()
      const href = event.currentTarget.getAttribute('href')
      const targetId = href.substring(1)
      const element = document.getElementById(targetId)

      if (element) {
        const offset = 120
        const top = element.offsetTop - offset
        const prefersReducedMotion = window.matchMedia(
          '(prefers-reduced-motion: reduce)'
        ).matches

        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        })

        // Update URL without triggering navigation
        history.pushState(null, '', href)

        // Open the details element if it's closed
        if (element.tagName === 'DETAILS' && !element.open) {
          element.open = true
        }
      }
    }
  }
}
</script>

<style scoped>
.sticky-subnav {
  position: sticky;
  top: var(--header-height);
  z-index: 90;
  background-color: var(--color-bg);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-xl);
}

.subnav-container {
  display: flex;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.subnav-link {
  flex-shrink: 0;
  padding: var(--space-sm) var(--space-lg);
  background-color: var(--color-bg-alt);
  color: var(--color-text);
  font-weight: 500;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  transition: all 0.2s;
  text-decoration: none;
}

.subnav-link:hover {
  background-color: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  text-decoration: none;
}

.subnav-link:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .subnav-container {
    justify-content: flex-start;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
  }

  .subnav-link {
    padding: var(--space-xs) var(--space-md);
  }
}
</style>
