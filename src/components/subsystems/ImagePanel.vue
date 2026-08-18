<script setup lang="ts">
  import { computed } from 'vue';

  const props = defineProps<{
    capturedImageSrc: string;
    capturedImageName: string;
    imageTaken: boolean;
    imageValidity: string;
    capturedAt: string;
    captureLocation: string;
    captureCoordinates: string;
  }>();

  const downloadFileName = computed(() => {
    if (!props.capturedImageName) {
      return 'captured-image.jpg';
    }

    return `MCS_${props.capturedImageName}.jpg`;
  });

  const downloadLabeledImage = async () => {
    if (!props.capturedImageSrc) {
      return;
    }

    const image = new Image();

    image.onload = () => {
      const labelHeight = Math.max(220, Math.round(image.height * 0.12));

      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height + labelHeight;

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      // Original image.
      ctx.drawImage(image, 0, 0);

      // Metadata panel below the image.
      ctx.fillStyle = '#08111f';
      ctx.fillRect(0, image.height, canvas.width, labelHeight);

      const horizontalPadding = Math.max(30, Math.round(canvas.width * 0.02));

      const titleFontSize = Math.max(28, Math.round(canvas.width * 0.018));

      const metadataFontSize = Math.max(22, Math.round(canvas.width * 0.014));

      const locationText = props.captureLocation || 'NO LOCATION DATA';

      const coordinatesText = props.captureCoordinates || 'NO COORDINATE DATA';

      const capturedText = props.capturedAt || 'NO CAPTURE TIME';

      ctx.textBaseline = 'top';

      ctx.fillStyle = '#7dd3fc';
      ctx.font = `600 ${titleFontSize}px Consolas, "Courier New", monospace`;

      ctx.fillText(locationText, horizontalPadding, image.height + 28);

      ctx.fillStyle = '#e6edf3';
      ctx.font = `${metadataFontSize}px Consolas, "Courier New", monospace`;

      ctx.fillText(
        `CENTER: ${coordinatesText}`,
        horizontalPadding,
        image.height + 28 + titleFontSize + 24
      );

      ctx.fillText(
        `CAPTURED: ${capturedText}`,
        horizontalPadding,
        image.height + 28 + titleFontSize + metadataFontSize + 48
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return;
          }

          const objectUrl = URL.createObjectURL(blob);

          const link = document.createElement('a');
          link.href = objectUrl;
          link.download = downloadFileName.value;

          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(objectUrl);
        },
        'image/jpeg',
        0.95
      );
    };

    image.onerror = () => {
      console.error(`Failed to load captured image: ${props.capturedImageSrc}`);
    };

    image.src = props.capturedImageSrc;
  };
</script>

<template>
  <div>
    <h1>Captured Image</h1>

    <div v-if="!capturedImageSrc" class="tm-history-panel">
      <h2>Image Output</h2>
      <p>NO IMAGE CAPTURED</p>
    </div>

    <div v-else class="tm-history-panel">
      <h2>Image Data Product</h2>

      <table class="tm-log-table image-metadata-table">
        <tr>
          <th>Validity</th>
          <td>{{ imageValidity }}</td>
        </tr>

        <tr>
          <th>Capture Time</th>
          <td>{{ capturedAt || 'NO DATA' }}</td>
        </tr>

        <tr>
          <th>Location</th>
          <td>{{ captureLocation || 'NO DATA' }}</td>
        </tr>

        <tr>
          <th>Center Coordinate</th>
          <td>{{ captureCoordinates || 'NO DATA' }}</td>
        </tr>
      </table>

      <div class="image-download-area">
        <button
          type="button"
          class="image-download-button"
          title="Download labeled captured image"
          @click="downloadLabeledImage"
        >
          <svg class="image-download-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>

          <span>Download Captured Image</span>
        </button>

        <p class="image-download-hint">
          Image preview is disabled. Download the data product to view it.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .image-metadata-table {
    margin-bottom: 22px;
  }

  .image-metadata-table th {
    width: 180px;
  }

  .image-download-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 180px;
    padding: 24px;
    border: 1px solid #263244;
    border-radius: 6px;
    background: #0b111b;
  }

  .image-download-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 18px;
    background: #182233;
    color: #e6edf3;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    text-decoration: none;
    font-family: inherit;
    font-size: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .image-download-button:hover {
    background: #223047;
    border-color: #60a5fa;
  }

  .image-download-icon {
    width: 24px;
    height: 24px;
    color: #7dd3fc;
  }

  .image-download-hint {
    margin: 0;
    color: #9ca3af;
    font-size: 13px;
    text-align: center;
  }
</style>
