<template>
  <div class="spinner">
    <div class="spinner-inner"></div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-inner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>