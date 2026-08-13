<script setup lang="ts">
type TelemetryStatus = 'empty' | 'good' | 'warning' | 'bad';

type TelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: TelemetryStatus;
};

function valueClass(status: TelemetryStatus) {
  if (status === 'good') return 'value-good';
  if (status === 'warning') return 'value-warning';
  if (status === 'bad') return 'value-bad';
  return 'value-empty';
}

function statusClass(status: TelemetryStatus) {
  if (status === 'good') return 'status-good';
  if (status === 'warning') return 'status-warning';
  if (status === 'bad') return 'status-bad';
  return 'status-empty';
}

function statusLabel(status: TelemetryStatus) {
  if (status === 'good') return 'NOMINAL';
  if (status === 'warning') return 'WARNING';
  if (status === 'bad') return 'LIMIT';
  return 'NO DATA';
}


defineProps<{
  telemetry: TelemetryRow[];
}>();
</script>

<template>
  <div>
    <h1>AOCS (Attitude and Orbit Control System)</h1>

    <table class="telemetry-table">
      <tr>
        <th>Parameter</th>
        <th>Subsystem</th>
        <th>Measurement</th>
        <th>Unit</th>
        <th>Status</th>
      </tr>

      <tr v-for="row in telemetry" :key="row.parameter">
        <td>{{ row.parameter }}</td>
        <td>{{ row.subsystem }}</td>
        <td :class="valueClass(row.status)">{{ row.measurement }}</td>
        <td>{{ row.unit }}</td>
        <td :class="statusClass(row.status)">{{ statusLabel(row.status) }}</td>
      </tr>
    </table>
  </div>
</template>
