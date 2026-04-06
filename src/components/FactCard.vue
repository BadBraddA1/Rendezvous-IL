<template>
  <div class="fact-card">
    <h3 class="fact-title">{{ title }}</h3>
    <div class="fact-content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FactCard',
  props: {
    title: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.fact-card {
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
}

.fact-card:hover {
  box-shadow: var(--shadow-md);
}

.fact-title {
  color: var(--color-secondary);
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-md);
  border-bottom: 2px solid var(--color-accent);
  padding-bottom: var(--space-sm);
}

.fact-content {
  color: var(--color-text);
  line-height: 1.7;
}

.fact-content p {
  margin-bottom: var(--space-sm);
}

.fact-content p:last-child {
  margin-bottom: 0;
}
</style>
