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


type TmLog = {
  time: string;
  message: string;
};

defineProps<{
  telemetry: TelemetryRow[];
  tmHistory: TmLog[];
}>();
</script>

<template>
  <div>
    <h1>Payload (Imaging Instrument)</h1>

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

    <div class="tm-history-panel">
      <h2>TM History</h2>

      <table class="tm-log-table">
        <tr>
          <th>Time</th>
          <th>Payload TM Log</th>
        </tr>

        <tr v-if="tmHistory.length === 0">
          <td colspan="2">Waiting for elevation ≥ 5° and TM lock</td>
        </tr>

        <tr v-for="(log, index) in tmHistory" :key="index">
          <td>{{ log.time }}</td>
          <td>{{ log.message }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>
