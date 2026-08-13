<script setup lang="ts">
type TelemetryStatus = 'empty' | 'good' | 'warning' | 'bad';

type TelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: TelemetryStatus;
};

type TmLog = {
  time: string;
  message: string;
};

function valueClass(status: TelemetryStatus) {
  return 'value-' + status;
}

function statusClass(status: TelemetryStatus) {
  return 'status-' + status;
}

function statusLabel(status: TelemetryStatus) {
  if (status === 'good') return 'NOMINAL';
  if (status === 'warning') return 'WARNING';
  if (status === 'bad') return 'LIMIT';
  return 'NO DATA';
}

defineProps<{
  isScenario2: boolean;
  gs1ConnectionActive: boolean;
  telemetryGs1: TelemetryRow[];
  telemetryGs2: TelemetryRow[];
  tmHistory: TmLog[];
}>();
</script>

<template>
  <div>
    <h1>Ground Station (Ground Segment)</h1>
    <div :class="isScenario2 ? 'gs-two-column' : ''">
      <div>
        <h2>
          {{
            isScenario2
              ? gs1ConnectionActive
                ? 'Ground Station 1 / GS1'
                : 'Ground Station 1 / GS1 - LINK LOST'
              : 'Ground Station'
          }}
        </h2>
        <table class="telemetry-table">
          <tr>
            <th>Parameter</th>
            <th>Subsystem</th>
            <th>Measurement</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
          <tr v-for="row in telemetryGs1" :key="'gs1-' + row.parameter">
            <td>{{ row.parameter }}</td>
            <td>{{ row.subsystem }}</td>
            <td :class="valueClass(row.status)">{{ row.measurement }}</td>
            <td>{{ row.unit }}</td>
            <td :class="statusClass(row.status)">{{ statusLabel(row.status) }}</td>
          </tr>
        </table>
      </div>

      <div v-if="isScenario2">
        <h2>Ground Station 2 / GS2</h2>
        <table class="telemetry-table">
          <tr>
            <th>Parameter</th>
            <th>Subsystem</th>
            <th>Measurement</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
          <tr v-for="row in telemetryGs2" :key="'gs2-' + row.parameter">
            <td>{{ row.parameter }}</td>
            <td>{{ row.subsystem }}</td>
            <td :class="valueClass(row.status)">{{ row.measurement }}</td>
            <td>{{ row.unit }}</td>
            <td :class="statusClass(row.status)">{{ statusLabel(row.status) }}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="tm-history-panel">
      <h2>TM History</h2>
      <table class="tm-log-table">
        <tr>
          <th>Time</th>
          <th>Ground Station TM Log</th>
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
