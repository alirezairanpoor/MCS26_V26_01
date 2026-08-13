import {
  computed,
  type Ref,
  type ComputedRef,
} from 'vue';

// ============================================================================
// PAYLOAD TELEMETRY MODEL
//
// Generic optical-imaging payload simulator.
// READ ONLY: this module does not change mission/procedure truth.
//
// IMPORTANT:
// Numerical values and thresholds are simulator-development placeholders.
// They are NOT flight-certified operational limits.
// ============================================================================

export type PayloadTelemetryStatus =
  | 'empty'
  | 'good'
  | 'warning'
  | 'bad';

export type PayloadTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: PayloadTelemetryStatus;
};

type ReactiveValue<T> =
  | Ref<T>
  | ComputedRef<T>;

type UsePayloadTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  spacecraftTelemetryAvailable: ReactiveValue<boolean>;
  scenario2TelemetryBlackout: ReactiveValue<boolean>;

  isScenario2: ReactiveValue<boolean>;
  scenario2NewProcedureImported: ReactiveValue<boolean>;

  payloadPowerLevel: ReactiveValue<number>;
  payloadPowerRaised: ReactiveValue<boolean>;
  powerIncreaseInProgress: ReactiveValue<boolean>;
  powerSavingModeActive: ReactiveValue<boolean>;
  thermalCoolingActive: ReactiveValue<boolean>;
  spacecraftStandbyActive: ReactiveValue<boolean>;

  cameraConfigured: ReactiveValue<boolean>;
  imageTaken: ReactiveValue<boolean>;
  imageValidity: ReactiveValue<string>;
  capturedImageName: ReactiveValue<string>;

  memoryUsed: ReactiveValue<number>;
  epsTemperature: ReactiveValue<number>;
};

type TelemetryDefinition = {
  parameter: string;
  subsystem: string;
  unit: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function clamp(
  value: number,
  minimum: number,
  maximum: number
) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function wave(
  time: number,
  center: number,
  amplitude: number,
  period: number,
  phase = 0
) {
  return (
    center +
    Math.sin(
      time / period + phase
    ) * amplitude
  );
}

function row(
  parameter: string,
  subsystem: string,
  measurement: string,
  unit: string,
  status: PayloadTelemetryStatus = 'good'
): PayloadTelemetryRow {
  return {
    parameter,
    subsystem,
    measurement,
    unit,
    status,
  };
}

function noTelemetryRows(
  definitions: TelemetryDefinition[]
): PayloadTelemetryRow[] {
  return definitions.map((item) => ({
    ...item,
    measurement: 'NO TELEMETRY',
    status: 'empty',
  }));
}

function temperatureStatus(
  value: number,
  nominalLow: number,
  nominalHigh: number,
  warningLow: number,
  warningHigh: number
): PayloadTelemetryStatus {
  if (
    value < warningLow ||
    value > warningHigh
  ) {
    return 'bad';
  }

  if (
    value < nominalLow ||
    value > nominalHigh
  ) {
    return 'warning';
  }

  return 'good';
}

// ============================================================================
// PAYLOAD INVENTORY
// ============================================================================

const payloadTelemetryDefinition: TelemetryDefinition[] = [
  // SYSTEM / MODES
  { parameter: 'PLD600', subsystem: 'Payload Overall Health', unit: 'state' },
  { parameter: 'PLD601', subsystem: 'Payload Electronics Unit', unit: 'state' },
  { parameter: 'PLD602', subsystem: 'Payload Computer', unit: 'state' },
  { parameter: 'PLD603', subsystem: 'Payload Data Processing Unit', unit: 'state' },
  { parameter: 'PLD604', subsystem: 'Payload Command Queue', unit: 'count' },
  { parameter: 'PLD605', subsystem: 'Payload Fault Counter', unit: 'count' },
  { parameter: 'PLD606', subsystem: 'Payload Watchdog', unit: 'state' },
  { parameter: 'PLD607', subsystem: 'Payload FDIR State', unit: 'state' },
  { parameter: 'PLD620', subsystem: 'Instrument Mode', unit: 'state' },
  { parameter: 'PLD621', subsystem: 'Payload Operational State', unit: 'state' },
  { parameter: 'PLD622', subsystem: 'Acquisition Readiness', unit: 'state' },
  { parameter: 'PLD623', subsystem: 'Payload Thermal Readiness', unit: 'state' },
  { parameter: 'PLD624', subsystem: 'Storage Readiness', unit: 'state' },

  // POWER / ELECTRICAL
  { parameter: 'PWR701', subsystem: 'Payload Bus Voltage', unit: 'V' },
  { parameter: 'PWR702', subsystem: 'Payload Bus Current', unit: 'A' },
  { parameter: 'PWR703', subsystem: 'Payload Electrical Power', unit: 'W' },
  { parameter: 'PWR704', subsystem: 'Payload Power Converter State', unit: 'state' },
  { parameter: 'PWR705', subsystem: 'Payload Power Converter Temperature', unit: '°C' },
  { parameter: 'PWR706', subsystem: 'Payload Power Converter Efficiency', unit: '%' },
  { parameter: 'PLD740', subsystem: 'Detector Electronics Supply', unit: 'V' },
  { parameter: 'PLD741', subsystem: 'Detector Bias', unit: 'V' },
  { parameter: 'PLD742', subsystem: 'Detector Bias Current', unit: 'mA' },
  { parameter: 'PLD743', subsystem: 'Analog Rail', unit: 'V' },
  { parameter: 'PLD744', subsystem: 'Digital Rail', unit: 'V' },

  // CONTROLLER / PROCESSING
  { parameter: 'PLD331', subsystem: 'Payload Controller Temperature', unit: '°C' },
  { parameter: 'PLD550', subsystem: 'Payload Controller Load', unit: '%' },
  { parameter: 'PLD551', subsystem: 'Payload FPGA Temperature', unit: '°C' },
  { parameter: 'PLD552', subsystem: 'Payload FPGA Load', unit: '%' },
  { parameter: 'PLD553', subsystem: 'Payload CPU Temperature', unit: '°C' },
  { parameter: 'PLD554', subsystem: 'Payload CPU Load', unit: '%' },
  { parameter: 'PLD555', subsystem: 'Payload Software State', unit: 'state' },
  { parameter: 'PLD556', subsystem: 'Payload Uptime', unit: 's' },

  // CAMERA HEAD / OPTICS
  { parameter: 'CAM201', subsystem: 'Camera Head Temperature', unit: '°C' },
  { parameter: 'CAM000', subsystem: 'Camera Configuration', unit: 'state' },
  { parameter: 'CAM202', subsystem: 'Camera Electronics', unit: 'state' },
  { parameter: 'CAM203', subsystem: 'Camera Clock', unit: 'MHz' },
  { parameter: 'CAM204', subsystem: 'Camera Readout State', unit: 'state' },

  { parameter: 'OBF044', subsystem: 'Optical Baffle Temperature', unit: '°C' },
  { parameter: 'OBF045', subsystem: 'Optical Baffle State', unit: 'state' },
  { parameter: 'LNS054', subsystem: 'Lens Barrel Temperature', unit: '°C' },
  { parameter: 'LNS055', subsystem: 'Lens Focus Position', unit: 'step' },
  { parameter: 'LNS056', subsystem: 'Optical Focus Error', unit: 'µm' },
  { parameter: 'OPT101', subsystem: 'Optical Bench Temperature', unit: '°C' },
  { parameter: 'OPT102', subsystem: 'Optical Alignment Error', unit: 'arcsec' },
  { parameter: 'OPT103', subsystem: 'Optical Throughput Estimate', unit: '%' },
  { parameter: 'OPT104', subsystem: 'Contamination Monitor', unit: '%' },
  { parameter: 'OPT105', subsystem: 'Aperture State', unit: 'state' },

  // DETECTOR / FOCAL PLANE
  { parameter: 'SEN331', subsystem: 'Image Sensor Temperature', unit: '°C' },
  { parameter: 'SEN332', subsystem: 'Image Sensor State', unit: 'state' },
  { parameter: 'SEN333', subsystem: 'Detector Read Noise', unit: 'e-' },
  { parameter: 'SEN334', subsystem: 'Detector Dark Current', unit: 'e-/px/s' },
  { parameter: 'SEN335', subsystem: 'Detector Saturation Fraction', unit: '%' },
  { parameter: 'SEN336', subsystem: 'Bad Pixel Fraction', unit: '%' },
  { parameter: 'SEN337', subsystem: 'Detector Gain', unit: 'e-/DN' },
  { parameter: 'SEN338', subsystem: 'Detector Bit Depth', unit: 'bit' },

  { parameter: 'FPA341', subsystem: 'Focal Plane Temperature', unit: '°C' },
  { parameter: 'FPA342', subsystem: 'Focal Plane Controller', unit: 'state' },
  { parameter: 'FPA343', subsystem: 'Focal Plane Clock', unit: 'MHz' },
  { parameter: 'FPA344', subsystem: 'ADC Reference Voltage', unit: 'V' },
  { parameter: 'FPA345', subsystem: 'ADC Temperature', unit: '°C' },

  // TIMING / GNSS
  { parameter: 'GPS112', subsystem: 'Payload GNSS Receiver Temperature', unit: '°C' },
  { parameter: 'GPS113', subsystem: 'PPS Lock', unit: 'state' },
  { parameter: 'GPS114', subsystem: 'Payload GNSS Fix', unit: 'state' },
  { parameter: 'GPS115', subsystem: 'GNSS Satellites Tracked', unit: 'count' },
  { parameter: 'GPS116', subsystem: 'Payload Timing Offset', unit: 'µs' },
  { parameter: 'GPS117', subsystem: 'Image Timestamp Validity', unit: 'state' },

  // CALIBRATION
  { parameter: 'CAL401', subsystem: 'Calibration Unit', unit: 'state' },
  { parameter: 'CAL402', subsystem: 'Dark Reference State', unit: 'state' },
  { parameter: 'CAL403', subsystem: 'Flat Field Calibration State', unit: 'state' },
  { parameter: 'CAL404', subsystem: 'Calibration Validity', unit: 'state' },
  { parameter: 'CAL405', subsystem: 'Calibration Age', unit: 's' },
  { parameter: 'CAL406', subsystem: 'Radiometric Calibration Residual', unit: '%' },

  // IMAGE ACQUISITION
  { parameter: 'IMG901', subsystem: 'Image Capture', unit: 'state' },
  { parameter: 'IMG902', subsystem: 'Imaging Window State', unit: 'state' },
  { parameter: 'IMG903', subsystem: 'Active Imaging Target', unit: 'state' },
  { parameter: 'IMG904', subsystem: 'Acquisition Type', unit: 'state' },
  { parameter: 'IMG905', subsystem: 'Exposure Time', unit: 'ms' },
  { parameter: 'IMG906', subsystem: 'Sensor Gain', unit: 'dB' },
  { parameter: 'IMG907', subsystem: 'Image Width', unit: 'px' },
  { parameter: 'IMG908', subsystem: 'Image Height', unit: 'px' },
  { parameter: 'IMG909', subsystem: 'Image Sequence Counter', unit: 'count' },
  { parameter: 'IMG910', subsystem: 'Last Image File', unit: 'state' },
  { parameter: 'IMG911', subsystem: 'Last Image Validity', unit: 'state' },
  { parameter: 'IMG912', subsystem: 'Image Signal-to-Noise Ratio', unit: 'dB' },
  { parameter: 'IMG913', subsystem: 'Image Mean Signal', unit: 'DN' },
  { parameter: 'IMG914', subsystem: 'Image Contrast Estimate', unit: '%' },
  { parameter: 'IMG915', subsystem: 'Image CRC', unit: 'state' },
  { parameter: 'IMG916', subsystem: 'Image Metadata', unit: 'state' },

  // COMPRESSION / DATA PROCESSING
  { parameter: 'CMP551', subsystem: 'Compression Processor Temperature', unit: '°C' },
  { parameter: 'CMP552', subsystem: 'Compression Queue', unit: '%' },
  { parameter: 'CMP553', subsystem: 'Compression Processor State', unit: 'state' },
  { parameter: 'CMP554', subsystem: 'Compression Mode', unit: 'state' },
  { parameter: 'CMP555', subsystem: 'Compression Ratio', unit: ':1' },
  { parameter: 'CMP556', subsystem: 'Compression Throughput', unit: 'Mbps' },
  { parameter: 'CMP557', subsystem: 'Compressed Image Size', unit: 'MB' },
  { parameter: 'CMP558', subsystem: 'Compression Error Counter', unit: 'count' },

  // PAYLOAD STORAGE INTERFACE
  { parameter: 'DAT601', subsystem: 'Payload Mass Memory Interface', unit: 'state' },
  { parameter: 'DAT602', subsystem: 'Payload Memory Used', unit: '%' },
  { parameter: 'DAT603', subsystem: 'Payload Memory Available', unit: '%' },
  { parameter: 'DAT604', subsystem: 'Payload Data Buffer', unit: '%' },
  { parameter: 'DAT605', subsystem: 'Payload Output Queue', unit: '%' },
  { parameter: 'DAT606', subsystem: 'Payload File System', unit: 'state' },
  { parameter: 'DAT607', subsystem: 'Payload Data Integrity', unit: 'state' },
  { parameter: 'DAT608', subsystem: 'Payload Recorder Interface Rate', unit: 'Mbps' },

  // THERMAL
  { parameter: 'RAD087', subsystem: 'Payload Radiator Temperature', unit: '°C' },
  { parameter: 'RAD088', subsystem: 'Payload Radiator State', unit: 'state' },
  { parameter: 'THM701', subsystem: 'Payload Electronics Thermal Margin', unit: '°C' },
  { parameter: 'THM702', subsystem: 'Detector Thermal Margin', unit: '°C' },
  { parameter: 'THM703', subsystem: 'Payload Thermal Trend', unit: 'state' },
  { parameter: 'THM704', subsystem: 'Payload Heater State', unit: 'state' },
  { parameter: 'THM705', subsystem: 'Payload Heater Duty Cycle', unit: '%' },

  // INTERFACES / PRECONDITIONS
  { parameter: 'IFC801', subsystem: 'AOCS Pointing Interface', unit: 'state' },
  { parameter: 'IFC802', subsystem: 'AOCS Rate Interface', unit: 'state' },
  { parameter: 'IFC803', subsystem: 'EPS Power Allocation', unit: 'state' },
  { parameter: 'IFC804', subsystem: 'TCS Thermal Interface', unit: 'state' },
  { parameter: 'IFC805', subsystem: 'Mass Memory Interface', unit: 'state' },
  { parameter: 'IFC806', subsystem: 'Spacecraft Time Interface', unit: 'state' },

  // OPTIONAL / NON-BASELINE HARDWARE
  { parameter: 'MEC901', subsystem: 'Payload Cover Mechanism', unit: 'state' },
  { parameter: 'MEC902', subsystem: 'Payload Door Mechanism', unit: 'state' },
  { parameter: 'MEC903', subsystem: 'Variable Focus Mechanism', unit: 'state' },
  { parameter: 'ANT910', subsystem: 'Payload Dedicated Antenna', unit: 'state' },
];

// ============================================================================
// COMPOSABLE
// ============================================================================

export function usePayloadTelemetry(
  options: UsePayloadTelemetryOptions
) {
  const {
    missionSeconds,
    spacecraftTelemetryAvailable,
    scenario2TelemetryBlackout,

    isScenario2,
    scenario2NewProcedureImported,

    payloadPowerLevel,
    payloadPowerRaised,
    powerIncreaseInProgress,
    powerSavingModeActive,
    thermalCoolingActive,
    spacecraftStandbyActive,

    cameraConfigured,
    imageTaken,
    imageValidity,
    capturedImageName,

    memoryUsed,
    epsTemperature,
  } = options;

  const payloadTelemetry =
    computed<PayloadTelemetryRow[]>(() => {
      if (
        !spacecraftTelemetryAvailable.value ||
        scenario2TelemetryBlackout.value
      ) {
        return noTelemetryRows(
          payloadTelemetryDefinition
        );
      }

      const t =
        missionSeconds.value;

      // ----------------------------------------------------------------------
      // MISSION / IMAGING CONTEXT
      // ----------------------------------------------------------------------

      const scenario1FrankfurtWindow =
        !isScenario2.value &&
        t >= 900 &&
        t <= 960;

      const scenario2CalibrationWindow =
        isScenario2.value &&
        !scenario2NewProcedureImported.value &&
        t >= 900 &&
        t <= 960;

      const scenario2FrankfurtWindow =
        isScenario2.value &&
        scenario2NewProcedureImported.value &&
        t >= 1800 &&
        t <= 1830;

      const imagingWindowActive =
        scenario1FrankfurtWindow ||
        scenario2CalibrationWindow ||
        scenario2FrankfurtWindow;

      const targetName =
        scenario2CalibrationWindow ||
        (
          isScenario2.value &&
          !scenario2NewProcedureImported.value
        )
          ? 'CALIBRATION TEST'
          : 'FRANKFURT AIRPORT';

      const acquisitionType =
        isScenario2.value &&
        !scenario2NewProcedureImported.value
          ? 'CALIBRATION IMAGE'
          : 'TARGET IMAGE';

      // ----------------------------------------------------------------------
      // EXISTING SIMULATOR STATE COUPLING
      // ----------------------------------------------------------------------

      const powerLevel =
        payloadPowerLevel.value;

      const payloadActive =
        payloadPowerRaised.value &&
        !spacecraftStandbyActive.value;

      const warming =
        powerIncreaseInProgress.value;

      const cooling =
        thermalCoolingActive.value;

      const powerSaving =
        powerSavingModeActive.value;

      const configured =
        cameraConfigured.value;

      const memoryUse =
        clamp(
          memoryUsed.value,
          0,
          100
        );

      const memoryAvailable =
        100 - memoryUse;

      const thermalStress =
        Math.max(
          0,
          epsTemperature.value - 75
        );

      // ----------------------------------------------------------------------
      // MODE / READINESS
      // ----------------------------------------------------------------------

      const instrumentMode =
        payloadActive
          ? 'ACTIVE'
          : 'STANDBY';

      let operationalState =
        'PAYLOAD_STANDBY';

      if (spacecraftStandbyActive.value) {
        operationalState =
          'PAYLOAD_STANDBY';
      } else if (cooling) {
        operationalState =
          'PAYLOAD_COOLDOWN';
      } else if (warming) {
        operationalState =
          'PAYLOAD_WARMUP';
      } else if (
        payloadActive &&
        configured &&
        scenario2CalibrationWindow
      ) {
        operationalState =
          'PAYLOAD_CALIBRATION';
      } else if (
        payloadActive &&
        configured &&
        imagingWindowActive
      ) {
        operationalState =
          'PAYLOAD_ACQUISITION';
      } else if (
        payloadActive &&
        configured
      ) {
        operationalState =
          'PAYLOAD_READY';
      } else if (payloadActive) {
        operationalState =
          'PAYLOAD_ACTIVE';
      }

      // Generic simulator-only thermal readiness.
      const thermalReady =
        epsTemperature.value < 90;

      const storageReady =
        memoryUse < 95;

      const acquisitionReady =
        payloadActive &&
        configured &&
        thermalReady &&
        storageReady &&
        !powerSaving &&
        !spacecraftStandbyActive.value;

      const payloadHealthStatus: PayloadTelemetryStatus =
        epsTemperature.value >= 95
          ? 'bad'
          : memoryUse >= 95 ||
              epsTemperature.value >= 90
            ? 'warning'
            : 'good';

      const payloadHealth =
        payloadHealthStatus === 'bad'
          ? 'DEGRADED'
          : payloadHealthStatus === 'warning'
            ? 'CAUTION'
            : 'NOMINAL';

      // ----------------------------------------------------------------------
      // POWER
      // ----------------------------------------------------------------------

      const busVoltage =
        28.0 +
        wave(
          t,
          0,
          0.10,
          21,
          0.4
        );

      const busCurrent =
        powerLevel /
        Math.max(
          busVoltage,
          1
        );

      const converterEfficiency =
        clamp(
          92.5 -
          Math.abs(
            powerLevel - 90
          ) * 0.008 +
          wave(
            t,
            0,
            0.25,
            27,
            0.8
          ),
          88,
          95
        );

      const converterTemp =
        30 +
        powerLevel * 0.075 +
        thermalStress * 0.35 -
        (cooling ? 2.0 : 0) +
        wave(
          t,
          0,
          0.8,
          33,
          0.5
        );

      const detectorSupply =
        configured
          ? wave(
              t,
              5.10,
              0.035,
              18,
              0.4
            )
          : wave(
              t,
              5.02,
              0.020,
              21,
              0.9
            );

      const detectorBias =
        configured
          ? wave(
              t,
              38.0,
              1.2,
              24,
              0.5
            )
          : 0;

      const detectorBiasCurrent =
        configured
          ? wave(
              t,
              18.0,
              1.5,
              22,
              0.7
            )
          : 0;

      const analogRail =
        wave(
          t,
          3.30,
          0.018,
          19,
          0.3
        );

      const digitalRail =
        wave(
          t,
          1.80,
          0.012,
          23,
          1.0
        );

      // ----------------------------------------------------------------------
      // CONTROLLER / PROCESSING
      // ----------------------------------------------------------------------

      const controllerLoad =
        clamp(
          24 +
          (payloadActive ? 16 : 0) +
          (configured ? 8 : 0) +
          (imagingWindowActive ? 10 : 0) +
          wave(
            t,
            0,
            3,
            16,
            0.4
          ),
          10,
          85
        );

      const fpgaLoad =
        clamp(
          18 +
          (configured ? 20 : 0) +
          (imagingWindowActive ? 18 : 0) +
          wave(
            t,
            0,
            3,
            17,
            0.9
          ),
          8,
          90
        );

      const cpuLoad =
        clamp(
          22 +
          (imageTaken.value ? 8 : 0) +
          (configured ? 8 : 0) +
          wave(
            t,
            0,
            4,
            20,
            1.1
          ),
          8,
          85
        );

      const controllerTemp =
        34 +
        powerLevel * 0.055 +
        thermalStress * 0.25 -
        (cooling ? 1.5 : 0) +
        wave(
          t,
          0,
          0.9,
          28,
          0.6
        );

      const fpgaTemp =
        controllerTemp +
        2.0 +
        fpgaLoad * 0.025;

      const cpuTemp =
        controllerTemp +
        1.0 +
        cpuLoad * 0.020;

      // ----------------------------------------------------------------------
      // OPTICS / DETECTOR
      // ----------------------------------------------------------------------

      const baffleTemp =
        wave(
          t,
          -12.0,
          5.0,
          70,
          0.8
        );

      const lensTemp =
        8.0 +
        powerLevel * 0.015 -
        (cooling ? 0.8 : 0) +
        wave(
          t,
          0,
          2.0,
          58,
          2.4
        );

      const opticalBenchTemp =
        19.0 +
        powerLevel * 0.018 +
        wave(
          t,
          0,
          0.45,
          61,
          0.6
        );

      const cameraHeadTemp =
        20.0 +
        powerLevel * 0.035 +
        thermalStress * 0.15 -
        (cooling ? 1.2 : 0) +
        wave(
          t,
          0,
          0.8,
          35,
          0.5
        );

      const sensorTemp =
        10.5 +
        powerLevel * 0.025 +
        thermalStress * 0.12 -
        (cooling ? 1.5 : 0) +
        wave(
          t,
          0,
          0.6,
          42,
          1.0
        );

      const focalPlaneTemp =
        sensorTemp -
        1.8 +
        wave(
          t,
          0,
          0.25,
          39,
          0.2
        );

      const adcTemp =
        28.0 +
        powerLevel * 0.030 +
        wave(
          t,
          0,
          0.7,
          37,
          1.1
        );

      const radiatorTemp =
        -18.0 +
        powerLevel * 0.025 +
        thermalStress * 0.15 -
        (cooling ? 2.0 : 0) +
        wave(
          t,
          0,
          3.0,
          75,
          0.3
        );

      const focusPosition =
        configured
          ? Math.round(
              wave(
                t,
                2048,
                2,
                80,
                0.4
              )
            )
          : 2048;

      const focusError =
        configured
          ? Math.abs(
              wave(
                t,
                0,
                1.2,
                30,
                0.7
              )
            )
          : 4.0;

      const alignmentError =
        Math.abs(
          wave(
            t,
            0,
            3.5,
            55,
            0.9
          )
        );

      const throughput =
        clamp(
          wave(
            t,
            91.5,
            0.7,
            63,
            0.5
          ),
          85,
          95
        );

      const contamination =
        clamp(
          wave(
            t,
            0.8,
            0.12,
            120,
            0.4
          ),
          0,
          2
        );

      const readNoise =
        wave(
          t,
          4.2,
          0.25,
          34,
          0.6
        );

      const darkCurrent =
        clamp(
          0.75 +
          Math.max(
            0,
            sensorTemp - 12
          ) * 0.055 +
          wave(
            t,
            0,
            0.05,
            48,
            0.8
          ),
          0.4,
          2.5
        );

      const saturationFraction =
        imagingWindowActive &&
        configured
          ? clamp(
              wave(
                t,
                0.8,
                0.25,
                19,
                0.4
              ),
              0,
              2
            )
          : 0;

      const badPixelFraction =
        clamp(
          wave(
            t,
            0.18,
            0.025,
            90,
            0.7
          ),
          0.1,
          0.3
        );

      // ----------------------------------------------------------------------
      // TIMING / GNSS
      // ----------------------------------------------------------------------

      const gpsTemp =
        wave(
          t,
          31.0,
          1.1,
          47,
          1.4
        );

      const gnssSatellites =
        Math.round(
          clamp(
            wave(
              t,
              10,
              2,
              31,
              0.5
            ),
            7,
            13
          )
        );

      const timingOffset =
        wave(
          t,
          0,
          0.20,
          18,
          0.7
        );

      // ----------------------------------------------------------------------
      // CALIBRATION
      // ----------------------------------------------------------------------

      const calibrationActive =
        scenario2CalibrationWindow &&
        configured &&
        payloadActive;

      const calibrationAge =
        Math.max(
          0,
          Math.round(
            7200 +
            t
          )
        );

      const calibrationResidual =
        wave(
          t,
          0.7,
          0.12,
          44,
          0.6
        );

      // ----------------------------------------------------------------------
      // IMAGE / QUALITY
      // ----------------------------------------------------------------------

      const exposureTime =
        acquisitionType ===
        'CALIBRATION IMAGE'
          ? 2.5
          : 3.8;

      const sensorGain =
        acquisitionType ===
        'CALIBRATION IMAGE'
          ? 5.0
          : 7.5;

      const imageSnr =
        configured
          ? clamp(
              38 +
              throughput * 0.15 -
              readNoise * 0.8 +
              wave(
                t,
                0,
                1.4,
                25,
                0.8
              ),
              25,
              60
            )
          : 0;

      const meanSignal =
        configured &&
        imagingWindowActive
          ? clamp(
              wave(
                t,
                2120,
                180,
                18,
                0.4
              ),
              500,
              3900
            )
          : 0;

      const contrast =
        configured &&
        imagingWindowActive
          ? clamp(
              wave(
                t,
                48,
                4,
                23,
                0.9
              ),
              30,
              65
            )
          : 0;

      // ----------------------------------------------------------------------
      // COMPRESSION / DATA
      // ----------------------------------------------------------------------

      const compressionQueue =
        clamp(
          memoryUse * 0.10 +
          (imageTaken.value ? 8 : 2) +
          wave(
            t,
            0,
            2,
            17,
            1.2
          ),
          0,
          90
        );

      const compressionRatio =
        3.2 +
        wave(
          t,
          0,
          0.15,
          29,
          0.5
        );

      const compressionThroughput =
        configured
          ? wave(
              t,
              92,
              6,
              26,
              0.8
            )
          : wave(
              t,
              15,
              2,
              31,
              0.4
            );

      const compressedImageSize =
        42 /
        Math.max(
          compressionRatio,
          1
        );

      const dataBuffer =
        clamp(
          memoryUse * 0.12 +
          (imageTaken.value ? 6 : 0) +
          wave(
            t,
            0,
            1.5,
            20,
            0.7
          ),
          0,
          95
        );

      const outputQueue =
        clamp(
          memoryUse * 0.08 +
          (imageTaken.value ? 5 : 1) +
          wave(
            t,
            0,
            1.3,
            22,
            1.1
          ),
          0,
          90
        );

      // ----------------------------------------------------------------------
      // THERMAL READINESS
      // ----------------------------------------------------------------------

      // Simulator-only margins, not flight limits.
      const electronicsThermalMargin =
        55 -
        controllerTemp;

      const detectorThermalMargin =
        35 -
        sensorTemp;

      const payloadThermalTrend =
        cooling
          ? 'COOLING'
          : warming ||
              powerLevel > 120
            ? 'HEATING'
            : 'STABLE';

      const heaterDuty =
        sensorTemp < 8
          ? 35
          : sensorTemp < 11
            ? 12
            : 0;

      // ----------------------------------------------------------------------
      // LIVE TELEMETRY
      // ----------------------------------------------------------------------

      return [
        // SYSTEM / MODES
        row(
          'PLD600',
          'Payload Overall Health',
          payloadHealth,
          'state',
          payloadHealthStatus
        ),

        row(
          'PLD601',
          'Payload Electronics Unit',
          spacecraftStandbyActive.value
            ? 'STANDBY'
            : 'ACTIVE',
          'state'
        ),

        row(
          'PLD602',
          'Payload Computer',
          spacecraftStandbyActive.value
            ? 'STANDBY'
            : 'ACTIVE',
          'state'
        ),

        row(
          'PLD603',
          'Payload Data Processing Unit',
          payloadActive
            ? 'ACTIVE'
            : 'STANDBY',
          'state'
        ),

        row(
          'PLD604',
          'Payload Command Queue',
          powerIncreaseInProgress.value
            ? '1'
            : '0',
          'count',
          powerIncreaseInProgress.value
            ? 'warning'
            : 'good'
        ),

        row(
          'PLD605',
          'Payload Fault Counter',
          '0',
          'count'
        ),

        row(
          'PLD606',
          'Payload Watchdog',
          'NOMINAL',
          'state'
        ),

        row(
          'PLD607',
          'Payload FDIR State',
          payloadHealthStatus === 'bad'
            ? 'MONITORING FAULT'
            : 'NOMINAL',
          'state',
          payloadHealthStatus
        ),

        // Preserve the simulator/procedure-facing PLD620 behavior.
        row(
          'PLD620',
          'Instrument Mode',
          instrumentMode,
          'state',
          'good'
        ),

        row(
          'PLD621',
          'Payload Operational State',
          operationalState,
          'state',
          operationalState === 'PAYLOAD_COOLDOWN'
            ? 'warning'
            : 'good'
        ),

        row(
          'PLD622',
          'Acquisition Readiness',
          acquisitionReady
            ? 'READY'
            : 'NOT READY',
          'state',
          acquisitionReady
            ? 'good'
            : 'warning'
        ),

        row(
          'PLD623',
          'Payload Thermal Readiness',
          thermalReady
            ? 'READY'
            : 'NOT READY',
          'state',
          thermalReady
            ? 'good'
            : 'bad'
        ),

        row(
          'PLD624',
          'Storage Readiness',
          storageReady
            ? 'READY'
            : 'NOT READY',
          'state',
          storageReady
            ? 'good'
            : 'bad'
        ),

        // POWER
        row(
          'PWR701',
          'Payload Bus Voltage',
          busVoltage.toFixed(2),
          'V',
          busVoltage >= 27.5 &&
          busVoltage <= 28.5
            ? 'good'
            : 'warning'
        ),

        row(
          'PWR702',
          'Payload Bus Current',
          busCurrent.toFixed(2),
          'A',
          busCurrent <= 7.5
            ? 'good'
            : busCurrent <= 9
              ? 'warning'
              : 'bad'
        ),

        row(
          'PWR703',
          'Payload Electrical Power',
          powerLevel.toFixed(1),
          'W',
          powerLevel <= 200
            ? 'good'
            : 'warning'
        ),

        row(
          'PWR704',
          'Payload Power Converter State',
          spacecraftStandbyActive.value
            ? 'STANDBY'
            : 'ACTIVE',
          'state'
        ),

        row(
          'PWR705',
          'Payload Power Converter Temperature',
          converterTemp.toFixed(1),
          '°C',
          temperatureStatus(
            converterTemp,
            10,
            50,
            0,
            62
          )
        ),

        row(
          'PWR706',
          'Payload Power Converter Efficiency',
          converterEfficiency.toFixed(1),
          '%',
          converterEfficiency >= 90
            ? 'good'
            : 'warning'
        ),

        row(
          'PLD740',
          'Detector Electronics Supply',
          detectorSupply.toFixed(2),
          'V',
          detectorSupply >= 4.9 &&
          detectorSupply <= 5.3
            ? 'good'
            : 'warning'
        ),

        row(
          'PLD741',
          'Detector Bias',
          detectorBias.toFixed(1),
          'V',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'PLD742',
          'Detector Bias Current',
          detectorBiasCurrent.toFixed(1),
          'mA',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'PLD743',
          'Analog Rail',
          analogRail.toFixed(3),
          'V',
          'good'
        ),

        row(
          'PLD744',
          'Digital Rail',
          digitalRail.toFixed(3),
          'V',
          'good'
        ),

        // CONTROLLER / PROCESSING
        row(
          'PLD331',
          'Payload Controller Temperature',
          controllerTemp.toFixed(1),
          '°C',
          temperatureStatus(
            controllerTemp,
            15,
            52,
            5,
            65
          )
        ),

        row(
          'PLD550',
          'Payload Controller Load',
          controllerLoad.toFixed(0),
          '%',
          controllerLoad <= 75
            ? 'good'
            : controllerLoad <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'PLD551',
          'Payload FPGA Temperature',
          fpgaTemp.toFixed(1),
          '°C',
          temperatureStatus(
            fpgaTemp,
            15,
            55,
            5,
            68
          )
        ),

        row(
          'PLD552',
          'Payload FPGA Load',
          fpgaLoad.toFixed(0),
          '%',
          fpgaLoad <= 75
            ? 'good'
            : fpgaLoad <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'PLD553',
          'Payload CPU Temperature',
          cpuTemp.toFixed(1),
          '°C',
          temperatureStatus(
            cpuTemp,
            15,
            55,
            5,
            68
          )
        ),

        row(
          'PLD554',
          'Payload CPU Load',
          cpuLoad.toFixed(0),
          '%',
          cpuLoad <= 75
            ? 'good'
            : cpuLoad <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'PLD555',
          'Payload Software State',
          'RUNNING',
          'state'
        ),

        row(
          'PLD556',
          'Payload Uptime',
          t.toFixed(0),
          's'
        ),

        // CAMERA / OPTICS
        row(
          'CAM201',
          'Camera Head Temperature',
          cameraHeadTemp.toFixed(1),
          '°C',
          temperatureStatus(
            cameraHeadTemp,
            10,
            35,
            -5,
            48
          )
        ),

        row(
          'CAM000',
          'Camera Configuration',
          configured
            ? 'READY'
            : 'STANDBY',
          'state',
          configured
            ? 'good'
            : 'warning'
        ),

        row(
          'CAM202',
          'Camera Electronics',
          payloadActive
            ? 'ACTIVE'
            : 'STANDBY',
          'state'
        ),

        row(
          'CAM203',
          'Camera Clock',
          configured
            ? wave(
                t,
                48.0,
                0.02,
                50,
                0.4
              ).toFixed(3)
            : '0.000',
          'MHz',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'CAM204',
          'Camera Readout State',
          configured
            ? 'READY'
            : 'STANDBY',
          'state',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'OBF044',
          'Optical Baffle Temperature',
          baffleTemp.toFixed(1),
          '°C',
          temperatureStatus(
            baffleTemp,
            -25,
            5,
            -45,
            25
          )
        ),

        row(
          'OBF045',
          'Optical Baffle State',
          'NOMINAL',
          'state'
        ),

        row(
          'LNS054',
          'Lens Barrel Temperature',
          lensTemp.toFixed(1),
          '°C',
          temperatureStatus(
            lensTemp,
            -5,
            25,
            -20,
            40
          )
        ),

        row(
          'LNS055',
          'Lens Focus Position',
          focusPosition.toString(),
          'step'
        ),

        row(
          'LNS056',
          'Optical Focus Error',
          focusError.toFixed(2),
          'µm',
          focusError <= 2
            ? 'good'
            : focusError <= 5
              ? 'warning'
              : 'bad'
        ),

        row(
          'OPT101',
          'Optical Bench Temperature',
          opticalBenchTemp.toFixed(1),
          '°C',
          temperatureStatus(
            opticalBenchTemp,
            12,
            28,
            5,
            35
          )
        ),

        row(
          'OPT102',
          'Optical Alignment Error',
          alignmentError.toFixed(2),
          'arcsec',
          alignmentError <= 8
            ? 'good'
            : 'warning'
        ),

        row(
          'OPT103',
          'Optical Throughput Estimate',
          throughput.toFixed(1),
          '%',
          throughput >= 85
            ? 'good'
            : 'warning'
        ),

        row(
          'OPT104',
          'Contamination Monitor',
          contamination.toFixed(2),
          '%',
          contamination <= 2
            ? 'good'
            : 'warning'
        ),

        row(
          'OPT105',
          'Aperture State',
          'OPEN / FIXED',
          'state'
        ),

        // DETECTOR / FPA
        row(
          'SEN331',
          'Image Sensor Temperature',
          sensorTemp.toFixed(1),
          '°C',
          temperatureStatus(
            sensorTemp,
            -2,
            22,
            -15,
            35
          )
        ),

        row(
          'SEN332',
          'Image Sensor State',
          configured
            ? 'READY'
            : 'STANDBY',
          'state',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'SEN333',
          'Detector Read Noise',
          readNoise.toFixed(2),
          'e-',
          readNoise <= 6
            ? 'good'
            : 'warning'
        ),

        row(
          'SEN334',
          'Detector Dark Current',
          darkCurrent.toFixed(3),
          'e-/px/s',
          darkCurrent <= 2
            ? 'good'
            : 'warning'
        ),

        row(
          'SEN335',
          'Detector Saturation Fraction',
          saturationFraction.toFixed(2),
          '%',
          saturationFraction <= 2
            ? 'good'
            : saturationFraction <= 5
              ? 'warning'
              : 'bad'
        ),

        row(
          'SEN336',
          'Bad Pixel Fraction',
          badPixelFraction.toFixed(3),
          '%',
          badPixelFraction <= 0.5
            ? 'good'
            : 'warning'
        ),

        row(
          'SEN337',
          'Detector Gain',
          configured
            ? '1.80'
            : '0.00',
          'e-/DN',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'SEN338',
          'Detector Bit Depth',
          '12',
          'bit'
        ),

        row(
          'FPA341',
          'Focal Plane Temperature',
          focalPlaneTemp.toFixed(1),
          '°C',
          temperatureStatus(
            focalPlaneTemp,
            -5,
            20,
            -15,
            30
          )
        ),

        row(
          'FPA342',
          'Focal Plane Controller',
          configured
            ? 'ACTIVE'
            : 'STANDBY',
          'state',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'FPA343',
          'Focal Plane Clock',
          configured
            ? '24.000'
            : '0.000',
          'MHz',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'FPA344',
          'ADC Reference Voltage',
          wave(
            t,
            2.500,
            0.004,
            37,
            0.6
          ).toFixed(3),
          'V'
        ),

        row(
          'FPA345',
          'ADC Temperature',
          adcTemp.toFixed(1),
          '°C',
          temperatureStatus(
            adcTemp,
            10,
            45,
            0,
            58
          )
        ),

        // TIMING / GNSS
        row(
          'GPS112',
          'Payload GNSS Receiver Temperature',
          gpsTemp.toFixed(1),
          '°C',
          temperatureStatus(
            gpsTemp,
            20,
            45,
            5,
            58
          )
        ),

        row(
          'GPS113',
          'PPS Lock',
          'LOCK',
          'state'
        ),

        row(
          'GPS114',
          'Payload GNSS Fix',
          '3D FIX',
          'state'
        ),

        row(
          'GPS115',
          'GNSS Satellites Tracked',
          gnssSatellites.toString(),
          'count',
          gnssSatellites >= 6
            ? 'good'
            : 'warning'
        ),

        row(
          'GPS116',
          'Payload Timing Offset',
          timingOffset.toFixed(3),
          'µs',
          Math.abs(
            timingOffset
          ) <= 1
            ? 'good'
            : 'warning'
        ),

        row(
          'GPS117',
          'Image Timestamp Validity',
          'VALID',
          'state'
        ),

        // CALIBRATION
        row(
          'CAL401',
          'Calibration Unit',
          calibrationActive
            ? 'ACTIVE'
            : 'STANDBY',
          'state',
          calibrationActive
            ? 'good'
            : 'empty'
        ),

        row(
          'CAL402',
          'Dark Reference State',
          calibrationActive
            ? 'VALID'
            : 'AVAILABLE',
          'state'
        ),

        row(
          'CAL403',
          'Flat Field Calibration State',
          calibrationActive
            ? 'RUNNING'
            : 'VALID',
          'state',
          calibrationActive
            ? 'warning'
            : 'good'
        ),

        row(
          'CAL404',
          'Calibration Validity',
          'VALID',
          'state'
        ),

        row(
          'CAL405',
          'Calibration Age',
          calibrationAge.toString(),
          's'
        ),

        row(
          'CAL406',
          'Radiometric Calibration Residual',
          calibrationResidual.toFixed(2),
          '%',
          calibrationResidual <= 2
            ? 'good'
            : 'warning'
        ),

        // IMAGE ACQUISITION
        row(
          'IMG901',
          'Image Capture',
          imageTaken.value
            ? imageValidity.value
            : 'NO IMAGE',
          'state',
          imageTaken.value
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG902',
          'Imaging Window State',
          imagingWindowActive
            ? 'IN WINDOW'
            : 'OUTSIDE WINDOW',
          'state',
          imagingWindowActive
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG903',
          'Active Imaging Target',
          targetName,
          'state'
        ),

        row(
          'IMG904',
          'Acquisition Type',
          acquisitionType,
          'state'
        ),

        row(
          'IMG905',
          'Exposure Time',
          configured
            ? exposureTime.toFixed(2)
            : '0.00',
          'ms',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG906',
          'Sensor Gain',
          configured
            ? sensorGain.toFixed(1)
            : '0.0',
          'dB',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG907',
          'Image Width',
          '4096',
          'px'
        ),

        row(
          'IMG908',
          'Image Height',
          '3072',
          'px'
        ),

        row(
          'IMG909',
          'Image Sequence Counter',
          imageTaken.value
            ? '1'
            : '0',
          'count'
        ),

        row(
          'IMG910',
          'Last Image File',
          imageTaken.value
            ? (
                capturedImageName.value ||
                'IMAGE_CAPTURED'
              )
            : 'NONE',
          'state',
          imageTaken.value
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG911',
          'Last Image Validity',
          imageTaken.value
            ? imageValidity.value
            : 'NO IMAGE',
          'state',
          imageTaken.value
            ? (
                imageValidity.value.includes(
                  'VALID'
                )
                  ? 'good'
                  : 'warning'
              )
            : 'empty'
        ),

        row(
          'IMG912',
          'Image Signal-to-Noise Ratio',
          configured
            ? imageSnr.toFixed(1)
            : 'NO DATA',
          'dB',
          configured
            ? (
                imageSnr >= 35
                  ? 'good'
                  : imageSnr >= 25
                    ? 'warning'
                    : 'bad'
              )
            : 'empty'
        ),

        row(
          'IMG913',
          'Image Mean Signal',
          configured &&
          imagingWindowActive
            ? meanSignal.toFixed(0)
            : 'NO DATA',
          'DN',
          configured &&
          imagingWindowActive
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG914',
          'Image Contrast Estimate',
          configured &&
          imagingWindowActive
            ? contrast.toFixed(1)
            : 'NO DATA',
          '%',
          configured &&
          imagingWindowActive
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG915',
          'Image CRC',
          imageTaken.value
            ? 'VALID'
            : 'NO DATA',
          'state',
          imageTaken.value
            ? 'good'
            : 'empty'
        ),

        row(
          'IMG916',
          'Image Metadata',
          imageTaken.value
            ? 'COMPLETE'
            : 'NO DATA',
          'state',
          imageTaken.value
            ? 'good'
            : 'empty'
        ),

        // COMPRESSION
        row(
          'CMP551',
          'Compression Processor Temperature',
          (
            controllerTemp + 3.0
          ).toFixed(1),
          '°C',
          temperatureStatus(
            controllerTemp + 3.0,
            20,
            55,
            10,
            68
          )
        ),

        row(
          'CMP552',
          'Compression Queue',
          compressionQueue.toFixed(0),
          '%',
          compressionQueue <= 70
            ? 'good'
            : compressionQueue <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'CMP553',
          'Compression Processor State',
          payloadActive
            ? 'ACTIVE'
            : 'STANDBY',
          'state'
        ),

        row(
          'CMP554',
          'Compression Mode',
          'LOSSLESS + PREDICTIVE',
          'state'
        ),

        row(
          'CMP555',
          'Compression Ratio',
          compressionRatio.toFixed(2),
          ':1'
        ),

        row(
          'CMP556',
          'Compression Throughput',
          compressionThroughput.toFixed(1),
          'Mbps'
        ),

        row(
          'CMP557',
          'Compressed Image Size',
          compressedImageSize.toFixed(1),
          'MB'
        ),

        row(
          'CMP558',
          'Compression Error Counter',
          '0',
          'count'
        ),

        // DATA / MEMORY INTERFACE
        row(
          'DAT601',
          'Payload Mass Memory Interface',
          'ONLINE',
          'state'
        ),

        row(
          'DAT602',
          'Payload Memory Used',
          memoryUse.toFixed(0),
          '%',
          memoryUse <= 70
            ? 'good'
            : memoryUse <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'DAT603',
          'Payload Memory Available',
          memoryAvailable.toFixed(0),
          '%',
          memoryAvailable >= 30
            ? 'good'
            : memoryAvailable >= 10
              ? 'warning'
              : 'bad'
        ),

        row(
          'DAT604',
          'Payload Data Buffer',
          dataBuffer.toFixed(0),
          '%',
          dataBuffer <= 70
            ? 'good'
            : dataBuffer <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'DAT605',
          'Payload Output Queue',
          outputQueue.toFixed(0),
          '%',
          outputQueue <= 70
            ? 'good'
            : outputQueue <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'DAT606',
          'Payload File System',
          'MOUNTED / RW',
          'state'
        ),

        row(
          'DAT607',
          'Payload Data Integrity',
          'VALID',
          'state'
        ),

        row(
          'DAT608',
          'Payload Recorder Interface Rate',
          payloadActive
            ? wave(
                t,
                145,
                8,
                25,
                0.4
              ).toFixed(1)
            : '0.0',
          'Mbps',
          payloadActive
            ? 'good'
            : 'empty'
        ),

        // THERMAL
        row(
          'RAD087',
          'Payload Radiator Temperature',
          radiatorTemp.toFixed(1),
          '°C',
          temperatureStatus(
            radiatorTemp,
            -35,
            0,
            -55,
            22
          )
        ),

        row(
          'RAD088',
          'Payload Radiator State',
          cooling
            ? 'COOLDOWN SUPPORT'
            : 'NOMINAL',
          'state',
          cooling
            ? 'warning'
            : 'good'
        ),

        row(
          'THM701',
          'Payload Electronics Thermal Margin',
          electronicsThermalMargin.toFixed(1),
          '°C',
          electronicsThermalMargin >= 5
            ? 'good'
            : electronicsThermalMargin >= 0
              ? 'warning'
              : 'bad'
        ),

        row(
          'THM702',
          'Detector Thermal Margin',
          detectorThermalMargin.toFixed(1),
          '°C',
          detectorThermalMargin >= 5
            ? 'good'
            : detectorThermalMargin >= 0
              ? 'warning'
              : 'bad'
        ),

        row(
          'THM703',
          'Payload Thermal Trend',
          payloadThermalTrend,
          'state',
          payloadThermalTrend === 'STABLE'
            ? 'good'
            : 'warning'
        ),

        row(
          'THM704',
          'Payload Heater State',
          heaterDuty > 0
            ? 'ON'
            : 'OFF',
          'state'
        ),

        row(
          'THM705',
          'Payload Heater Duty Cycle',
          heaterDuty.toFixed(0),
          '%'
        ),

        // INTERFACES / PRECONDITIONS
        // AOCS values are represented as interface readiness rather than
        // duplicating AOCS sensor telemetry inside the payload subsystem.
        row(
          'IFC801',
          'AOCS Pointing Interface',
          configured
            ? 'READY'
            : 'STANDBY',
          'state',
          configured
            ? 'good'
            : 'empty'
        ),

        row(
          'IFC802',
          'AOCS Rate Interface',
          'VALID',
          'state'
        ),

        row(
          'IFC803',
          'EPS Power Allocation',
          payloadActive
            ? 'CONFIRMED'
            : warming
              ? 'RAMPING'
              : 'STANDBY',
          'state',
          payloadActive
            ? 'good'
            : warming
              ? 'warning'
              : 'empty'
        ),

        row(
          'IFC804',
          'TCS Thermal Interface',
          thermalReady
            ? 'READY'
            : 'THERMAL INHIBIT',
          'state',
          thermalReady
            ? 'good'
            : 'bad'
        ),

        row(
          'IFC805',
          'Mass Memory Interface',
          storageReady
            ? 'READY'
            : 'CAPACITY INHIBIT',
          'state',
          storageReady
            ? 'good'
            : 'bad'
        ),

        row(
          'IFC806',
          'Spacecraft Time Interface',
          'VALID',
          'state'
        ),

        // OPTIONAL / NON-BASELINE HARDWARE
        row(
          'MEC901',
          'Payload Cover Mechanism',
          'NOT INSTALLED',
          'state',
          'empty'
        ),

        row(
          'MEC902',
          'Payload Door Mechanism',
          'NOT INSTALLED',
          'state',
          'empty'
        ),

        row(
          'MEC903',
          'Variable Focus Mechanism',
          'NOT INSTALLED / FIXED FOCUS',
          'state',
          'empty'
        ),

        row(
          'ANT910',
          'Payload Dedicated Antenna',
          'NOT INSTALLED',
          'state',
          'empty'
        ),
      ];
    });

  return {
    payloadTelemetry,
  };
}
