import {
  computed,
  type Ref,
  type ComputedRef,
} from 'vue';

// ============================================================================
// TCS / THERMAL CONTROL SUBSYSTEM TELEMETRY MODEL
//
// Generic simulator telemetry only.
// READ ONLY: this module never changes mission/procedure state.
//
// IMPORTANT:
// Numerical values and limits below are simulator-development placeholders.
// They are NOT flight-certified limits.
// ============================================================================

export type TcsTelemetryStatus =
  | 'empty'
  | 'good'
  | 'warning'
  | 'bad';

export type TcsTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: TcsTelemetryStatus;
};

type ReactiveValue<T> =
  | Ref<T>
  | ComputedRef<T>;

type UseTcsTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  spacecraftTelemetryAvailable: ReactiveValue<boolean>;

  // Existing simulator truth/state inputs.
  epsTemperature: ReactiveValue<number>;
  payloadPowerLevel: ReactiveValue<number>;
  thermalCoolingActive: ReactiveValue<boolean>;
  powerSavingModeActive: ReactiveValue<boolean>;
  batteryEqualizationInProgress: ReactiveValue<boolean>;
  payloadPowerRaised: ReactiveValue<boolean>;
  powerIncreaseInProgress: ReactiveValue<boolean>;
  cameraConfigured: ReactiveValue<boolean>;
  spacecraftStandbyActive: ReactiveValue<boolean>;
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
    Math.sin(time / period + phase) *
      amplitude
  );
}

function row(
  parameter: string,
  subsystem: string,
  measurement: string,
  unit: string,
  status: TcsTelemetryStatus = 'good'
): TcsTelemetryRow {
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
): TcsTelemetryRow[] {
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
): TcsTelemetryStatus {
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
// TCS TELEMETRY INVENTORY
// ============================================================================

const tcsTelemetryDefinition: TelemetryDefinition[] = [
  // SYSTEM / CONTROLLER
  { parameter: 'TCS001', subsystem: 'TCS Operating Mode', unit: 'state' },
  { parameter: 'TCS002', subsystem: 'TCS Controller', unit: 'state' },
  { parameter: 'TCS003', subsystem: 'TCS Controller Temperature', unit: '°C' },
  { parameter: 'TCS004', subsystem: 'TCS Controller Load', unit: '%' },
  { parameter: 'TCS005', subsystem: 'TCS Overall Health', unit: 'state' },

  // MAJOR SPACECRAFT EQUIPMENT TEMPERATURES
  { parameter: 'TMP101', subsystem: 'EPS Main Electronics', unit: '°C' },
  { parameter: 'TMP102', subsystem: 'Power Conditioning Unit', unit: '°C' },
  { parameter: 'TMP103', subsystem: 'DC-DC Converter Assembly', unit: '°C' },
  { parameter: 'TMP104', subsystem: 'Power Distribution Unit', unit: '°C' },

  { parameter: 'TMP110', subsystem: 'Battery Pack Average', unit: '°C' },
  { parameter: 'TMP111', subsystem: 'Battery A', unit: '°C' },
  { parameter: 'TMP112', subsystem: 'Battery B', unit: '°C' },
  { parameter: 'TMP113', subsystem: 'Battery C', unit: '°C' },
  { parameter: 'TMP114', subsystem: 'Battery BMS', unit: '°C' },

  { parameter: 'TMP120', subsystem: 'Onboard Computer', unit: '°C' },
  { parameter: 'TMP121', subsystem: 'Mass Memory Unit', unit: '°C' },
  { parameter: 'TMP122', subsystem: 'COMMS Electronics', unit: '°C' },
  { parameter: 'TMP123', subsystem: 'Downlink Transmitter', unit: '°C' },

  { parameter: 'TMP130', subsystem: 'AOCS Computer', unit: '°C' },
  { parameter: 'TMP131', subsystem: 'Reaction Wheel Assembly', unit: '°C' },
  { parameter: 'TMP132', subsystem: 'Star Tracker Assembly', unit: '°C' },

  { parameter: 'TMP140', subsystem: 'Payload Electronics', unit: '°C' },
  { parameter: 'TMP141', subsystem: 'Payload Detector', unit: '°C' },
  { parameter: 'TMP142', subsystem: 'Payload Optics', unit: '°C' },
  { parameter: 'TMP143', subsystem: 'Camera Focal Plane', unit: '°C' },
  { parameter: 'TMP144', subsystem: 'Payload Power Converter', unit: '°C' },

  // STRUCTURE / PANELS
  { parameter: 'STR201', subsystem: 'Structure +X Panel', unit: '°C' },
  { parameter: 'STR202', subsystem: 'Structure -X Panel', unit: '°C' },
  { parameter: 'STR203', subsystem: 'Structure +Y Panel', unit: '°C' },
  { parameter: 'STR204', subsystem: 'Structure -Y Panel', unit: '°C' },
  { parameter: 'STR205', subsystem: 'Structure +Z Panel', unit: '°C' },
  { parameter: 'STR206', subsystem: 'Structure -Z Panel', unit: '°C' },
  { parameter: 'STR207', subsystem: 'Payload Optical Bench', unit: '°C' },
  { parameter: 'STR208', subsystem: 'Central Avionics Deck', unit: '°C' },

  // RADIATORS / PASSIVE HEAT TRANSPORT
  { parameter: 'RAD301', subsystem: 'Avionics Radiator Temperature', unit: '°C' },
  { parameter: 'RAD302', subsystem: 'Payload Radiator Temperature', unit: '°C' },
  { parameter: 'RAD303', subsystem: 'Avionics Radiator Heat Rejection', unit: 'W' },
  { parameter: 'RAD304', subsystem: 'Payload Radiator Heat Rejection', unit: 'W' },

  { parameter: 'HP310', subsystem: 'Heat Pipe A Evaporator', unit: '°C' },
  { parameter: 'HP311', subsystem: 'Heat Pipe A Condenser', unit: '°C' },
  { parameter: 'HP312', subsystem: 'Heat Pipe A Temperature Drop', unit: '°C' },
  { parameter: 'HP313', subsystem: 'Heat Pipe A State', unit: 'state' },

  { parameter: 'HP320', subsystem: 'Heat Pipe B Evaporator', unit: '°C' },
  { parameter: 'HP321', subsystem: 'Heat Pipe B Condenser', unit: '°C' },
  { parameter: 'HP322', subsystem: 'Heat Pipe B Temperature Drop', unit: '°C' },
  { parameter: 'HP323', subsystem: 'Heat Pipe B State', unit: 'state' },

  { parameter: 'PAS330', subsystem: 'Multi-Layer Insulation', unit: 'state' },
  { parameter: 'PAS331', subsystem: 'Optical Solar Reflector', unit: 'state' },
  { parameter: 'PAS332', subsystem: 'External Thermal Coating', unit: 'state' },
  { parameter: 'PAS333', subsystem: 'Payload Thermal Strap', unit: 'state' },
  { parameter: 'PAS334', subsystem: 'Battery Thermal Strap', unit: 'state' },

  // HEATERS / THERMOSTATS
  { parameter: 'HTR401', subsystem: 'Heater Controller', unit: 'state' },

  { parameter: 'HTR410', subsystem: 'Avionics Operational Heater Command', unit: 'state' },
  { parameter: 'HTR411', subsystem: 'Avionics Operational Heater Duty Cycle', unit: '%' },
  { parameter: 'HTR412', subsystem: 'Avionics Operational Heater Current', unit: 'A' },

  { parameter: 'HTR420', subsystem: 'Payload Heater Command', unit: 'state' },
  { parameter: 'HTR421', subsystem: 'Payload Heater Duty Cycle', unit: '%' },
  { parameter: 'HTR422', subsystem: 'Payload Heater Current', unit: 'A' },

  { parameter: 'HTR430', subsystem: 'Battery Heater Command', unit: 'state' },
  { parameter: 'HTR431', subsystem: 'Battery Heater Duty Cycle', unit: '%' },
  { parameter: 'HTR432', subsystem: 'Battery Heater Current', unit: 'A' },

  { parameter: 'HTR440', subsystem: 'Survival Heater Bus', unit: 'state' },
  { parameter: 'HTR441', subsystem: 'Survival Heater Duty Cycle', unit: '%' },
  { parameter: 'HTR442', subsystem: 'Survival Heater Current', unit: 'A' },

  { parameter: 'HTR450', subsystem: 'Decontamination Heater', unit: 'state' },
  { parameter: 'HTR451', subsystem: 'Propellant Tank Heater', unit: 'state' },
  { parameter: 'HTR452', subsystem: 'Thruster Catalyst Heater', unit: 'state' },

  { parameter: 'THM460', subsystem: 'Avionics Thermostat', unit: 'state' },
  { parameter: 'THM461', subsystem: 'Payload Thermostat', unit: 'state' },
  { parameter: 'THM462', subsystem: 'Battery Thermostat', unit: 'state' },

  // SENSOR NETWORK
  { parameter: 'SNS501', subsystem: 'Temperature Sensor Network', unit: 'state' },
  { parameter: 'SNS502', subsystem: 'Valid Temperature Sensors', unit: 'count' },
  { parameter: 'SNS503', subsystem: 'Invalid Temperature Sensors', unit: 'count' },
  { parameter: 'SNS504', subsystem: 'Temperature Sensor Sample Rate', unit: 'Hz' },
  { parameter: 'SNS505', subsystem: 'Thermistor Reference Error', unit: '°C' },
  { parameter: 'SNS506', subsystem: 'RTD Reference Error', unit: '°C' },
  { parameter: 'SNS507', subsystem: 'Thermocouple Reference Error', unit: '°C' },

  // THERMAL BALANCE / DERIVED
  { parameter: 'THB601', subsystem: 'Estimated Spacecraft Dissipation', unit: 'W' },
  { parameter: 'THB602', subsystem: 'Estimated External Heat Input', unit: 'W' },
  { parameter: 'THB603', subsystem: 'Estimated Total Heat Rejection', unit: 'W' },
  { parameter: 'THB604', subsystem: 'Thermal Energy Balance', unit: 'W' },
  { parameter: 'THB605', subsystem: 'Maximum Internal Thermal Gradient', unit: '°C' },
  { parameter: 'THB606', subsystem: 'Simulator Thermal Margin', unit: '°C' },
  { parameter: 'THB607', subsystem: 'Hottest Monitored Node', unit: 'state' },
  { parameter: 'THB608', subsystem: 'Coldest Monitored Node', unit: 'state' },
  { parameter: 'THB609', subsystem: 'Thermal Trend', unit: 'state' },

  // PREDICTION / CONTROL
  { parameter: 'EST701', subsystem: 'Thermal State Estimator', unit: 'state' },
  { parameter: 'EST702', subsystem: 'Predicted EPS Temperature +60s', unit: '°C' },
  { parameter: 'EST703', subsystem: 'Predicted Payload Temperature +60s', unit: '°C' },
  { parameter: 'EST704', subsystem: 'Predicted Thermal Margin +60s', unit: '°C' },
  { parameter: 'EST705', subsystem: 'Thermal Model Residual', unit: '°C' },

  // OPTIONAL ACTIVE FLUID LOOP HARDWARE
  { parameter: 'FLD801', subsystem: 'Cold Plate', unit: 'state' },
  { parameter: 'FLD802', subsystem: 'Coolant Pump', unit: 'state' },
  { parameter: 'FLD803', subsystem: 'Coolant Pump Speed', unit: 'rpm' },
  { parameter: 'FLD804', subsystem: 'Fluid Inlet Temperature', unit: '°C' },
  { parameter: 'FLD805', subsystem: 'Fluid Outlet Temperature', unit: '°C' },
  { parameter: 'FLD806', subsystem: 'Fluid Pressure', unit: 'kPa' },
  { parameter: 'FLD807', subsystem: 'Fluid Flow Rate', unit: 'L/min' },
  { parameter: 'FLD808', subsystem: 'Fluid Accumulator', unit: 'state' },
  { parameter: 'FLD809', subsystem: 'Fluid Reservoir', unit: 'state' },
  { parameter: 'FLD810', subsystem: 'Heat Exchanger', unit: 'state' },
  { parameter: 'FLD811', subsystem: 'Condenser', unit: 'state' },
  { parameter: 'FLD812', subsystem: 'Evaporator', unit: 'state' },
  { parameter: 'FLD813', subsystem: 'Control Valve', unit: 'state' },
  { parameter: 'FLD814', subsystem: 'Isolation Valve', unit: 'state' },
  { parameter: 'FLD815', subsystem: 'Bypass Valve', unit: 'state' },
  { parameter: 'FLD816', subsystem: 'Cryocooler', unit: 'state' },

  // OPTIONAL PASSIVE HARDWARE
  { parameter: 'OPT901', subsystem: 'Loop Heat Pipe', unit: 'state' },
  { parameter: 'OPT902', subsystem: 'Phase Change Material', unit: 'state' },
  { parameter: 'OPT903', subsystem: 'Thermal Louver', unit: 'state' },
  { parameter: 'OPT904', subsystem: 'Sunshield', unit: 'state' },
  { parameter: 'OPT905', subsystem: 'Heat Shield', unit: 'state' },

  // PROPULSION THERMAL INTERFACE
  { parameter: 'PRP950', subsystem: 'Propellant Tank Temperature', unit: '°C' },
  { parameter: 'PRP951', subsystem: 'Thruster Valve Temperature', unit: '°C' },
  { parameter: 'PRP952', subsystem: 'Thruster Catalyst Bed Temperature', unit: '°C' },
];

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useTcsTelemetry(
  options: UseTcsTelemetryOptions
) {
  const {
    missionSeconds,
    spacecraftTelemetryAvailable,
    epsTemperature,
    payloadPowerLevel,
    thermalCoolingActive,
    powerSavingModeActive,
    batteryEqualizationInProgress,
    payloadPowerRaised,
    powerIncreaseInProgress,
    cameraConfigured,
    spacecraftStandbyActive,
  } = options;

  const tcsTelemetry =
    computed<TcsTelemetryRow[]>(() => {
      // No spacecraft telemetry path = no TCS telemetry visible on ground.
      if (!spacecraftTelemetryAvailable.value) {
        return noTelemetryRows(
          tcsTelemetryDefinition
        );
      }

      const t =
        missionSeconds.value;

      const epsTemp =
        epsTemperature.value;

      const payloadLoadFactor =
        clamp(
          (
            payloadPowerLevel.value -
            10
          ) /
          170,
          0,
          1
        );

      const thermalStress =
        Math.max(
          0,
          epsTemp - 75
        );

      const coolingActive =
        thermalCoolingActive.value;

      const batteryTransfer =
        batteryEqualizationInProgress.value;

      const payloadHighPower =
        payloadPowerRaised.value ||
        powerIncreaseInProgress.value;

      const cameraConfiguredFactor =
        cameraConfigured.value
          ? 1
          : 0;

      const standby =
        spacecraftStandbyActive.value;

      // ----------------------------------------------------------------------
      // TCS MODE
      // ----------------------------------------------------------------------

      const tcsMode =
        coolingActive
          ? 'TCS_PAYLOAD_COOLDOWN'
          : epsTemp >= 80
            ? 'TCS_HOT_CASE'
            : 'TCS_NOMINAL';

      const overallHealthStatus: TcsTelemetryStatus =
        epsTemp > 95
          ? 'bad'
          : epsTemp > 80
            ? 'warning'
            : 'good';

      const overallHealth =
        overallHealthStatus === 'bad'
          ? 'CRITICAL'
          : overallHealthStatus === 'warning'
            ? 'THERMAL WARNING'
            : 'NOMINAL';

      // ----------------------------------------------------------------------
      // CONTROLLER
      // ----------------------------------------------------------------------

      const controllerTemp =
        34.5 +
        thermalStress * 0.18 +
        wave(t, 0, 0.8, 31, 0.4);

      const controllerLoad =
        clamp(
          36 +
          thermalStress * 0.8 +
          (coolingActive ? 8 : 0) +
          wave(t, 0, 3, 22, 0.8),
          20,
          85
        );

      // ----------------------------------------------------------------------
      // MAJOR EQUIPMENT TEMPERATURES
      //
      // Values are tied to existing EPS/payload state to avoid contradictory
      // thermal telemetry during the training scenario.
      // ----------------------------------------------------------------------

      const pcuTemp =
        40.5 +
        thermalStress * 1.75 +
        payloadLoadFactor * 2.0 +
        wave(t, 0, 0.7, 19, 0.4);

      const dcDcTemp =
        43.0 +
        thermalStress * 1.55 +
        payloadLoadFactor * 3.2 +
        wave(t, 0, 0.8, 21, 0.9);

      const pduTemp =
        37.5 +
        thermalStress * 0.75 +
        payloadLoadFactor * 1.8 +
        wave(t, 0, 0.7, 23, 1.1);

      const batteryBaseTemp =
        26.5 +
        payloadLoadFactor * 0.8 +
        (batteryTransfer ? 1.4 : 0) +
        (powerSavingModeActive.value ? -0.5 : 0);

      const batteryA =
        batteryBaseTemp +
        wave(t, 0, 0.35, 28, 0.2);

      const batteryB =
        batteryBaseTemp +
        0.25 +
        wave(t, 0, 0.35, 30, 0.8);

      const batteryC =
        batteryBaseTemp -
        0.15 +
        wave(t, 0, 0.35, 32, 1.4);

      const batteryAverage =
        (
          batteryA +
          batteryB +
          batteryC
        ) /
        3;

      const bmsTemp =
        30.5 +
        (batteryTransfer ? 1.8 : 0) +
        payloadLoadFactor * 0.5 +
        wave(t, 0, 0.45, 26, 0.5);

      const obcTemp =
        36.5 +
        thermalStress * 0.20 +
        wave(t, 0, 0.9, 37, 0.4);

      const memoryTemp =
        33.0 +
        payloadLoadFactor * 1.2 +
        wave(t, 0, 0.8, 41, 0.8);

      const commsTemp =
        35.0 +
        thermalStress * 0.25 +
        wave(t, 0, 1.0, 34, 1.0);

      const transmitterTemp =
        41.0 +
        thermalStress * 0.35 +
        wave(t, 0, 1.2, 29, 0.7);

      const aocsComputerTemp =
        35.5 +
        thermalStress * 0.15 +
        wave(t, 0, 0.8, 43, 1.1);

      const reactionWheelTemp =
        33.0 +
        wave(t, 0, 1.7, 46, 0.7);

      const starTrackerTemp =
        22.5 +
        wave(t, 0, 1.3, 52, 1.2);

      const payloadElectronicsTemp =
        27.0 +
        payloadLoadFactor * 17.0 +
        thermalStress * 0.55 -
        (coolingActive ? 3.0 : 0) -
        (standby ? 2.0 : 0) +
        wave(t, 0, 0.8, 25, 0.4);

      const payloadDetectorTemp =
        17.5 +
        payloadLoadFactor * 7.0 +
        cameraConfiguredFactor * 0.6 +
        thermalStress * 0.18 -
        (coolingActive ? 1.8 : 0) +
        wave(t, 0, 0.45, 32, 0.8);

      const payloadOpticsTemp =
        20.5 +
        payloadLoadFactor * 4.0 +
        cameraConfiguredFactor * 0.4 +
        thermalStress * 0.12 -
        (coolingActive ? 1.2 : 0) +
        wave(t, 0, 0.35, 44, 1.3);

      const focalPlaneTemp =
        16.0 +
        payloadLoadFactor * 5.5 +
        thermalStress * 0.15 -
        (coolingActive ? 1.5 : 0) +
        wave(t, 0, 0.30, 39, 0.6);

      const payloadConverterTemp =
        31.0 +
        payloadLoadFactor * 14.0 +
        thermalStress * 0.45 -
        (coolingActive ? 2.0 : 0) +
        wave(t, 0, 0.8, 28, 1.0);

      // ----------------------------------------------------------------------
      // STRUCTURE
      // ----------------------------------------------------------------------

      const orbitalThermalWave =
        Math.sin(t / 95);

      const panelPlusX =
        13 +
        orbitalThermalWave * 8 +
        wave(t, 0, 0.8, 27);

      const panelMinusX =
        7 -
        orbitalThermalWave * 7 +
        wave(t, 0, 0.7, 31, 0.5);

      const panelPlusY =
        11 +
        Math.sin(t / 105 + 0.8) * 7;

      const panelMinusY =
        8 +
        Math.sin(t / 110 + 1.6) * 6;

      const panelPlusZ =
        15 +
        Math.sin(t / 100 + 2.0) * 8;

      const panelMinusZ =
        5 +
        Math.sin(t / 115 + 2.7) * 6;

      const opticalBenchTemp =
        21.5 +
        payloadLoadFactor * 2.0 +
        wave(t, 0, 0.35, 60, 0.8);

      const avionicsDeckTemp =
        29.0 +
        thermalStress * 0.22 +
        wave(t, 0, 0.6, 49, 0.5);

      // ----------------------------------------------------------------------
      // RADIATORS / HEAT PIPES
      // ----------------------------------------------------------------------

      const avionicsRadiatorTemp =
        12.0 +
        thermalStress * 0.30 +
        wave(t, 0, 1.0, 53, 0.4);

      const payloadRadiatorTemp =
        10.0 +
        payloadLoadFactor * 5.0 +
        thermalStress * 0.20 -
        (coolingActive ? 1.5 : 0) +
        wave(t, 0, 0.9, 57, 1.0);

      const avionicsRadiatorRejection =
        72 +
        thermalStress * 2.3 +
        wave(t, 0, 4, 29, 0.4);

      const payloadRadiatorRejection =
        35 +
        payloadLoadFactor * 90 +
        thermalStress * 1.2 +
        (coolingActive ? 18 : 0) +
        wave(t, 0, 3, 31, 0.9);

      const heatPipeAEvaporator =
        34.0 +
        thermalStress * 0.55 +
        wave(t, 0, 0.6, 33, 0.5);

      const heatPipeACondenser =
        heatPipeAEvaporator -
        (
          2.2 +
          wave(t, 0, 0.25, 27, 0.8)
        );

      const heatPipeBEvaporator =
        29.0 +
        payloadLoadFactor * 6 +
        thermalStress * 0.25 +
        wave(t, 0, 0.5, 36, 1.0);

      const heatPipeBCondenser =
        heatPipeBEvaporator -
        (
          1.8 +
          wave(t, 0, 0.20, 30, 1.2)
        );

      // ----------------------------------------------------------------------
      // HEATERS / THERMOSTATS
      // ----------------------------------------------------------------------

      const avionicsHeaterDuty =
        clamp(
          8 -
          avionicsDeckTemp * 0.15 +
          (powerSavingModeActive.value ? 3 : 0),
          0,
          20
        );

      const payloadHeaterDuty =
        clamp(
          payloadOpticsTemp < 19
            ? 35
            : payloadOpticsTemp < 21
              ? 15
              : 0,
          0,
          100
        );

      const batteryHeaterDuty =
        clamp(
          batteryAverage < 15
            ? 50
            : batteryAverage < 20
              ? 20
              : 0,
          0,
          100
        );

      const survivalHeaterDuty =
        powerSavingModeActive.value
          ? 5
          : 0;

      const avionicsHeaterCurrent =
        avionicsHeaterDuty / 100 * 1.2;

      const payloadHeaterCurrent =
        payloadHeaterDuty / 100 * 1.5;

      const batteryHeaterCurrent =
        batteryHeaterDuty / 100 * 2.0;

      const survivalHeaterCurrent =
        survivalHeaterDuty / 100 * 1.8;

      // ----------------------------------------------------------------------
      // THERMAL BALANCE / DERIVED VALUES
      // ----------------------------------------------------------------------

      const estimatedDissipation =
        145 +
        payloadLoadFactor * 120 +
        (payloadHighPower ? 12 : 0) -
        (standby ? 28 : 0) -
        (powerSavingModeActive.value ? 18 : 0);

      const externalHeatInput =
        58 +
        Math.sin(t / 100) * 18;

      const totalHeatRejection =
        avionicsRadiatorRejection +
        payloadRadiatorRejection;

      const thermalBalance =
        estimatedDissipation +
        externalHeatInput -
        totalHeatRejection;

      const monitoredTemps = [
        { name: 'EPS MAIN ELECTRONICS', value: epsTemp },
        { name: 'PCU', value: pcuTemp },
        { name: 'DC-DC CONVERTER', value: dcDcTemp },
        { name: 'BATTERY', value: batteryAverage },
        { name: 'OBC', value: obcTemp },
        { name: 'TRANSMITTER', value: transmitterTemp },
        { name: 'PAYLOAD ELECTRONICS', value: payloadElectronicsTemp },
        { name: 'PAYLOAD DETECTOR', value: payloadDetectorTemp },
        { name: 'PAYLOAD OPTICS', value: payloadOpticsTemp },
        { name: 'AVIONICS DECK', value: avionicsDeckTemp },
      ];

      const hottest =
        monitoredTemps.reduce(
          (a, b) =>
            b.value > a.value ? b : a
        );

      const coldest =
        monitoredTemps.reduce(
          (a, b) =>
            b.value < a.value ? b : a
        );

      const maximumGradient =
        hottest.value -
        coldest.value;

      // Simulator-only margins, not flight limits.
      const epsMargin =
        75 - epsTemp;

      const payloadMargin =
        55 - payloadElectronicsTemp;

      const batteryMargin =
        45 - batteryAverage;

      const transmitterMargin =
        65 - transmitterTemp;

      const simulatorThermalMargin =
        Math.min(
          epsMargin,
          payloadMargin,
          batteryMargin,
          transmitterMargin
        );

      const thermalTrend =
        coolingActive
          ? 'COOLING'
          : thermalBalance > 20
            ? 'HEATING'
            : thermalBalance < -20
              ? 'COOLING'
              : 'STABLE';

      const predictedEpsTemp =
        epsTemp +
        (
          coolingActive
            ? -2.0
            : thermalStress > 0
              ? 0.8
              : 0.15
        );

      const predictedPayloadTemp =
        payloadElectronicsTemp +
        (
          coolingActive
            ? -1.5
            : payloadHighPower
              ? 1.2
              : 0.2
        );

      const predictedMargin =
        Math.min(
          75 - predictedEpsTemp,
          55 - predictedPayloadTemp,
          batteryMargin,
          transmitterMargin
        );

      const thermalModelResidual =
        wave(
          t,
          0.05,
          0.08,
          24,
          0.7
        );

      // ----------------------------------------------------------------------
      // LIVE TCS TELEMETRY
      // ----------------------------------------------------------------------

      return [
        // SYSTEM
        row(
          'TCS001',
          'TCS Operating Mode',
          tcsMode,
          'state',
          overallHealthStatus === 'bad'
            ? 'bad'
            : overallHealthStatus === 'warning'
              ? 'warning'
              : 'good'
        ),

        row(
          'TCS002',
          'TCS Controller',
          'ACTIVE',
          'state'
        ),

        row(
          'TCS003',
          'TCS Controller Temperature',
          controllerTemp.toFixed(1),
          '°C',
          temperatureStatus(
            controllerTemp,
            15,
            50,
            0,
            65
          )
        ),

        row(
          'TCS004',
          'TCS Controller Load',
          controllerLoad.toFixed(0),
          '%',
          controllerLoad <= 75
            ? 'good'
            : controllerLoad <= 90
              ? 'warning'
              : 'bad'
        ),

        row(
          'TCS005',
          'TCS Overall Health',
          overallHealth,
          'state',
          overallHealthStatus
        ),

        // EPS / POWER
        row(
          'TMP101',
          'EPS Main Electronics',
          epsTemp.toFixed(1),
          '°C',
          epsTemp <= 75
            ? 'good'
            : epsTemp <= 85
              ? 'warning'
              : 'bad'
        ),

        row(
          'TMP102',
          'Power Conditioning Unit',
          pcuTemp.toFixed(1),
          '°C',
          temperatureStatus(
            pcuTemp,
            15,
            55,
            0,
            68
          )
        ),

        row(
          'TMP103',
          'DC-DC Converter Assembly',
          dcDcTemp.toFixed(1),
          '°C',
          temperatureStatus(
            dcDcTemp,
            15,
            58,
            0,
            70
          )
        ),

        row(
          'TMP104',
          'Power Distribution Unit',
          pduTemp.toFixed(1),
          '°C',
          temperatureStatus(
            pduTemp,
            10,
            55,
            -5,
            68
          )
        ),

        // BATTERY
        row(
          'TMP110',
          'Battery Pack Average',
          batteryAverage.toFixed(1),
          '°C',
          temperatureStatus(
            batteryAverage,
            15,
            35,
            5,
            45
          )
        ),

        row(
          'TMP111',
          'Battery A',
          batteryA.toFixed(1),
          '°C',
          temperatureStatus(
            batteryA,
            15,
            35,
            5,
            45
          )
        ),

        row(
          'TMP112',
          'Battery B',
          batteryB.toFixed(1),
          '°C',
          temperatureStatus(
            batteryB,
            15,
            35,
            5,
            45
          )
        ),

        row(
          'TMP113',
          'Battery C',
          batteryC.toFixed(1),
          '°C',
          temperatureStatus(
            batteryC,
            15,
            35,
            5,
            45
          )
        ),

        row(
          'TMP114',
          'Battery BMS',
          bmsTemp.toFixed(1),
          '°C',
          temperatureStatus(
            bmsTemp,
            15,
            42,
            5,
            52
          )
        ),

        // AVIONICS / COMMS / AOCS
        row(
          'TMP120',
          'Onboard Computer',
          obcTemp.toFixed(1),
          '°C',
          temperatureStatus(
            obcTemp,
            10,
            50,
            -5,
            65
          )
        ),

        row(
          'TMP121',
          'Mass Memory Unit',
          memoryTemp.toFixed(1),
          '°C',
          temperatureStatus(
            memoryTemp,
            10,
            48,
            -5,
            62
          )
        ),

        row(
          'TMP122',
          'COMMS Electronics',
          commsTemp.toFixed(1),
          '°C',
          temperatureStatus(
            commsTemp,
            10,
            50,
            -5,
            65
          )
        ),

        row(
          'TMP123',
          'Downlink Transmitter',
          transmitterTemp.toFixed(1),
          '°C',
          temperatureStatus(
            transmitterTemp,
            15,
            55,
            0,
            65
          )
        ),

        row(
          'TMP130',
          'AOCS Computer',
          aocsComputerTemp.toFixed(1),
          '°C',
          temperatureStatus(
            aocsComputerTemp,
            10,
            50,
            -5,
            65
          )
        ),

        row(
          'TMP131',
          'Reaction Wheel Assembly',
          reactionWheelTemp.toFixed(1),
          '°C',
          temperatureStatus(
            reactionWheelTemp,
            5,
            50,
            -10,
            65
          )
        ),

        row(
          'TMP132',
          'Star Tracker Assembly',
          starTrackerTemp.toFixed(1),
          '°C',
          temperatureStatus(
            starTrackerTemp,
            -5,
            40,
            -15,
            50
          )
        ),

        // PAYLOAD
        row(
          'TMP140',
          'Payload Electronics',
          payloadElectronicsTemp.toFixed(1),
          '°C',
          temperatureStatus(
            payloadElectronicsTemp,
            10,
            45,
            0,
            55
          )
        ),

        row(
          'TMP141',
          'Payload Detector',
          payloadDetectorTemp.toFixed(1),
          '°C',
          temperatureStatus(
            payloadDetectorTemp,
            5,
            30,
            -5,
            40
          )
        ),

        row(
          'TMP142',
          'Payload Optics',
          payloadOpticsTemp.toFixed(1),
          '°C',
          temperatureStatus(
            payloadOpticsTemp,
            10,
            30,
            0,
            40
          )
        ),

        row(
          'TMP143',
          'Camera Focal Plane',
          focalPlaneTemp.toFixed(1),
          '°C',
          temperatureStatus(
            focalPlaneTemp,
            5,
            28,
            -5,
            38
          )
        ),

        row(
          'TMP144',
          'Payload Power Converter',
          payloadConverterTemp.toFixed(1),
          '°C',
          temperatureStatus(
            payloadConverterTemp,
            10,
            50,
            0,
            62
          )
        ),

        // STRUCTURE
        row('STR201', 'Structure +X Panel', panelPlusX.toFixed(1), '°C'),
        row('STR202', 'Structure -X Panel', panelMinusX.toFixed(1), '°C'),
        row('STR203', 'Structure +Y Panel', panelPlusY.toFixed(1), '°C'),
        row('STR204', 'Structure -Y Panel', panelMinusY.toFixed(1), '°C'),
        row('STR205', 'Structure +Z Panel', panelPlusZ.toFixed(1), '°C'),
        row('STR206', 'Structure -Z Panel', panelMinusZ.toFixed(1), '°C'),

        row(
          'STR207',
          'Payload Optical Bench',
          opticalBenchTemp.toFixed(1),
          '°C',
          temperatureStatus(
            opticalBenchTemp,
            15,
            28,
            5,
            35
          )
        ),

        row(
          'STR208',
          'Central Avionics Deck',
          avionicsDeckTemp.toFixed(1),
          '°C',
          temperatureStatus(
            avionicsDeckTemp,
            10,
            45,
            0,
            55
          )
        ),

        // RADIATORS / HEAT PIPES
        row(
          'RAD301',
          'Avionics Radiator Temperature',
          avionicsRadiatorTemp.toFixed(1),
          '°C'
        ),

        row(
          'RAD302',
          'Payload Radiator Temperature',
          payloadRadiatorTemp.toFixed(1),
          '°C'
        ),

        row(
          'RAD303',
          'Avionics Radiator Heat Rejection',
          avionicsRadiatorRejection.toFixed(1),
          'W'
        ),

        row(
          'RAD304',
          'Payload Radiator Heat Rejection',
          payloadRadiatorRejection.toFixed(1),
          'W'
        ),

        row(
          'HP310',
          'Heat Pipe A Evaporator',
          heatPipeAEvaporator.toFixed(1),
          '°C'
        ),

        row(
          'HP311',
          'Heat Pipe A Condenser',
          heatPipeACondenser.toFixed(1),
          '°C'
        ),

        row(
          'HP312',
          'Heat Pipe A Temperature Drop',
          (
            heatPipeAEvaporator -
            heatPipeACondenser
          ).toFixed(2),
          '°C'
        ),

        row(
          'HP313',
          'Heat Pipe A State',
          'OPERATING',
          'state'
        ),

        row(
          'HP320',
          'Heat Pipe B Evaporator',
          heatPipeBEvaporator.toFixed(1),
          '°C'
        ),

        row(
          'HP321',
          'Heat Pipe B Condenser',
          heatPipeBCondenser.toFixed(1),
          '°C'
        ),

        row(
          'HP322',
          'Heat Pipe B Temperature Drop',
          (
            heatPipeBEvaporator -
            heatPipeBCondenser
          ).toFixed(2),
          '°C'
        ),

        row(
          'HP323',
          'Heat Pipe B State',
          'OPERATING',
          'state'
        ),

        row('PAS330', 'Multi-Layer Insulation', 'NOMINAL', 'state'),
        row('PAS331', 'Optical Solar Reflector', 'NOMINAL', 'state'),
        row('PAS332', 'External Thermal Coating', 'NOMINAL', 'state'),
        row('PAS333', 'Payload Thermal Strap', 'NOMINAL', 'state'),
        row('PAS334', 'Battery Thermal Strap', 'NOMINAL', 'state'),

        // HEATERS
        row(
          'HTR401',
          'Heater Controller',
          'ACTIVE',
          'state'
        ),

        row(
          'HTR410',
          'Avionics Operational Heater Command',
          avionicsHeaterDuty > 0
            ? 'ON'
            : 'OFF',
          'state'
        ),

        row(
          'HTR411',
          'Avionics Operational Heater Duty Cycle',
          avionicsHeaterDuty.toFixed(1),
          '%'
        ),

        row(
          'HTR412',
          'Avionics Operational Heater Current',
          avionicsHeaterCurrent.toFixed(3),
          'A'
        ),

        row(
          'HTR420',
          'Payload Heater Command',
          payloadHeaterDuty > 0
            ? 'ON'
            : 'OFF',
          'state'
        ),

        row(
          'HTR421',
          'Payload Heater Duty Cycle',
          payloadHeaterDuty.toFixed(1),
          '%'
        ),

        row(
          'HTR422',
          'Payload Heater Current',
          payloadHeaterCurrent.toFixed(3),
          'A'
        ),

        row(
          'HTR430',
          'Battery Heater Command',
          batteryHeaterDuty > 0
            ? 'ON'
            : 'OFF',
          'state'
        ),

        row(
          'HTR431',
          'Battery Heater Duty Cycle',
          batteryHeaterDuty.toFixed(1),
          '%'
        ),

        row(
          'HTR432',
          'Battery Heater Current',
          batteryHeaterCurrent.toFixed(3),
          'A'
        ),

        row(
          'HTR440',
          'Survival Heater Bus',
          powerSavingModeActive.value
            ? 'ARMED'
            : 'STANDBY',
          'state'
        ),

        row(
          'HTR441',
          'Survival Heater Duty Cycle',
          survivalHeaterDuty.toFixed(1),
          '%'
        ),

        row(
          'HTR442',
          'Survival Heater Current',
          survivalHeaterCurrent.toFixed(3),
          'A'
        ),

        row(
          'HTR450',
          'Decontamination Heater',
          'NOT CONFIGURED',
          'state',
          'empty'
        ),

        row(
          'HTR451',
          'Propellant Tank Heater',
          'NOT CONFIGURED',
          'state',
          'empty'
        ),

        row(
          'HTR452',
          'Thruster Catalyst Heater',
          'NOT CONFIGURED',
          'state',
          'empty'
        ),

        // THERMOSTATS
        row(
          'THM460',
          'Avionics Thermostat',
          avionicsHeaterDuty > 0
            ? 'CALL FOR HEAT'
            : 'SATISFIED',
          'state'
        ),

        row(
          'THM461',
          'Payload Thermostat',
          payloadHeaterDuty > 0
            ? 'CALL FOR HEAT'
            : 'SATISFIED',
          'state'
        ),

        row(
          'THM462',
          'Battery Thermostat',
          batteryHeaterDuty > 0
            ? 'CALL FOR HEAT'
            : 'SATISFIED',
          'state'
        ),

        // SENSOR NETWORK
        row('SNS501', 'Temperature Sensor Network', 'VALID', 'state'),
        row('SNS502', 'Valid Temperature Sensors', '42', 'count'),
        row('SNS503', 'Invalid Temperature Sensors', '0', 'count'),
        row('SNS504', 'Temperature Sensor Sample Rate', '1.00', 'Hz'),

        row(
          'SNS505',
          'Thermistor Reference Error',
          wave(t, 0.03, 0.02, 43, 0.3).toFixed(3),
          '°C'
        ),

        row(
          'SNS506',
          'RTD Reference Error',
          wave(t, 0.02, 0.015, 47, 0.8).toFixed(3),
          '°C'
        ),

        row(
          'SNS507',
          'Thermocouple Reference Error',
          wave(t, 0.08, 0.04, 51, 1.1).toFixed(3),
          '°C'
        ),

        // THERMAL BALANCE
        row(
          'THB601',
          'Estimated Spacecraft Dissipation',
          estimatedDissipation.toFixed(1),
          'W'
        ),

        row(
          'THB602',
          'Estimated External Heat Input',
          externalHeatInput.toFixed(1),
          'W'
        ),

        row(
          'THB603',
          'Estimated Total Heat Rejection',
          totalHeatRejection.toFixed(1),
          'W'
        ),

        row(
          'THB604',
          'Thermal Energy Balance',
          thermalBalance.toFixed(1),
          'W',
          Math.abs(thermalBalance) <= 35
            ? 'good'
            : Math.abs(thermalBalance) <= 70
              ? 'warning'
              : 'bad'
        ),

        row(
          'THB605',
          'Maximum Internal Thermal Gradient',
          maximumGradient.toFixed(1),
          '°C',
          maximumGradient <= 45
            ? 'good'
            : maximumGradient <= 60
              ? 'warning'
              : 'bad'
        ),

        row(
          'THB606',
          'Simulator Thermal Margin',
          simulatorThermalMargin.toFixed(1),
          '°C',
          simulatorThermalMargin >= 5
            ? 'good'
            : simulatorThermalMargin >= 0
              ? 'warning'
              : 'bad'
        ),

        row(
          'THB607',
          'Hottest Monitored Node',
          `${hottest.name} / ${hottest.value.toFixed(1)} °C`,
          'state',
          simulatorThermalMargin >= 0
            ? 'good'
            : 'bad'
        ),

        row(
          'THB608',
          'Coldest Monitored Node',
          `${coldest.name} / ${coldest.value.toFixed(1)} °C`,
          'state'
        ),

        row(
          'THB609',
          'Thermal Trend',
          thermalTrend,
          'state',
          thermalTrend === 'STABLE'
            ? 'good'
            : 'warning'
        ),

        // PREDICTION
        row(
          'EST701',
          'Thermal State Estimator',
          'VALID',
          'state'
        ),

        row(
          'EST702',
          'Predicted EPS Temperature +60s',
          predictedEpsTemp.toFixed(1),
          '°C',
          predictedEpsTemp <= 75
            ? 'good'
            : predictedEpsTemp <= 85
              ? 'warning'
              : 'bad'
        ),

        row(
          'EST703',
          'Predicted Payload Temperature +60s',
          predictedPayloadTemp.toFixed(1),
          '°C',
          temperatureStatus(
            predictedPayloadTemp,
            10,
            45,
            0,
            55
          )
        ),

        row(
          'EST704',
          'Predicted Thermal Margin +60s',
          predictedMargin.toFixed(1),
          '°C',
          predictedMargin >= 5
            ? 'good'
            : predictedMargin >= 0
              ? 'warning'
              : 'bad'
        ),

        row(
          'EST705',
          'Thermal Model Residual',
          thermalModelResidual.toFixed(3),
          '°C',
          Math.abs(thermalModelResidual) <= 0.5
            ? 'good'
            : 'warning'
        ),

        // OPTIONAL ACTIVE FLUID LOOP
        row('FLD801', 'Cold Plate', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD802', 'Coolant Pump', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD803', 'Coolant Pump Speed', 'NOT INSTALLED', 'rpm', 'empty'),
        row('FLD804', 'Fluid Inlet Temperature', 'NOT INSTALLED', '°C', 'empty'),
        row('FLD805', 'Fluid Outlet Temperature', 'NOT INSTALLED', '°C', 'empty'),
        row('FLD806', 'Fluid Pressure', 'NOT INSTALLED', 'kPa', 'empty'),
        row('FLD807', 'Fluid Flow Rate', 'NOT INSTALLED', 'L/min', 'empty'),
        row('FLD808', 'Fluid Accumulator', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD809', 'Fluid Reservoir', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD810', 'Heat Exchanger', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD811', 'Condenser', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD812', 'Evaporator', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD813', 'Control Valve', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD814', 'Isolation Valve', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD815', 'Bypass Valve', 'NOT INSTALLED', 'state', 'empty'),
        row('FLD816', 'Cryocooler', 'NOT INSTALLED', 'state', 'empty'),

        // OPTIONAL PASSIVE HARDWARE
        row('OPT901', 'Loop Heat Pipe', 'NOT INSTALLED', 'state', 'empty'),
        row('OPT902', 'Phase Change Material', 'NOT INSTALLED', 'state', 'empty'),
        row('OPT903', 'Thermal Louver', 'NOT INSTALLED', 'state', 'empty'),
        row('OPT904', 'Sunshield', 'NOT INSTALLED', 'state', 'empty'),
        row('OPT905', 'Heat Shield', 'NOT INSTALLED', 'state', 'empty'),

        // PROPULSION THERMAL INTERFACE
        row('PRP950', 'Propellant Tank Temperature', 'NOT CONFIGURED', '°C', 'empty'),
        row('PRP951', 'Thruster Valve Temperature', 'NOT CONFIGURED', '°C', 'empty'),
        row('PRP952', 'Thruster Catalyst Bed Temperature', 'NOT CONFIGURED', '°C', 'empty'),
      ];
    });

  return {
    tcsTelemetry,
  };
}
