<script setup lang="ts">
defineProps<{
  capturedImageSrc: string;
  capturedImageName: string;
  imageTaken: boolean;
  imageValidity: string;
}>();
</script>

<template>
  <div>
    <h1>Captured Image</h1>

    <div
      v-if="!imageTaken || !capturedImageSrc"
      class="tm-history-panel"
    >
      <h2>Image Output</h2>
      <p>NO IMAGE CAPTURED</p>
    </div>

    <div v-else class="tm-history-panel">
      <h2>Image Output</h2>

      <table class="tm-log-table" style="margin-bottom: 16px">
        <tr>
          <th>Image Name</th>
          <td>{{ capturedImageName }}</td>
        </tr>

        <tr>
          <th>Validity</th>
          <td>{{ imageValidity }}</td>
        </tr>
      </table>

      <div style="display: flex; justify-content: center">
        <img
          :src="capturedImageSrc"
          :alt="capturedImageName || 'Captured satellite image'"
          style="
            display: block;
            max-width: 100%;
            max-height: 70vh;
            object-fit: contain;
            border: 1px solid #263244;
            border-radius: 6px;
          "
        />
      </div>
    </div>
  </div>
</template>
