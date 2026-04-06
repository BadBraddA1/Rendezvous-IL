<template>
  <details class="day-section" :id="id">
    <summary class="day-title">
      <span>{{ title }}</span>
      <span class="toggle-icon" aria-hidden="true">▼</span>
    </summary>
    <div class="day-content">
      <slot></slot>
    </div>
  </details>
</template>

<script>
export default {
  name: 'DaySection',
  props: {
    id: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.day-section {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
  overflow: hidden;
}

.day-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  background-color: var(--color-bg-alt);
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.day-title::-webkit-details-marker {
  display: none;
}

.day-title:hover {
  background-color: var(--color-border);
}

.day-title:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.toggle-icon {
  transition: transform 0.2s;
  font-size: var(--font-size-sm);
}

.day-section[open] .toggle-icon {
  transform: rotate(180deg);
}

.day-content {
  padding: var(--space-lg);
}

@media (max-width: 640px) {
  .day-title {
    font-size: var(--font-size-lg);
    padding: var(--space-md);
  }

  .day-content {
    padding: var(--space-md);
  }
}
</style>
