import { computed, type Ref, type ComputedRef } from 'vue';

export type EpsTelemetryStatus = 'empty' | 'good' | 'warning' | 'bad';

export type EpsTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: EpsTelemetryStatus;
};

type TelemetryStatus = EpsTelemetryStatus;
type TelemetryRow = EpsTelemetryRow;

type ReactiveValue<T = any> = Ref<T> | ComputedRef<T>;

type UseEpsTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  spacecraftTelemetryAvailable: ReactiveValue<boolean>;
  scenario2TelemetryBlackout: ReactiveValue<boolean>;
  isScenario2: ReactiveValue<boolean>;

  epsTemperature: ReactiveValue<number>;
  epsTemperatureClass: ReactiveValue<string>;
  netPower: ReactiveValue<number>;

  batteryA: ReactiveValue<number>;
  batteryB: ReactiveValue<number>;
  batteryC: ReactiveValue<number>;
  batteryEqualizationInProgress: ReactiveValue<boolean>;

  payloadPowerLevel: ReactiveValue<number>;
  powerSavingModeActive: ReactiveValue<boolean>;
};

function noTelemetryRows(
  rows: { parameter: string; subsystem: string; unit: string }[]
): TelemetryRow[] {
  return rows.map((row) => ({
    ...row,
    measurement: 'NO TELEMETRY',
    status: 'empty' as TelemetryStatus,
  }));
}

function classifyTemperature(
  value: number,
  lowGood: number,
  highGood: number,
  lowWarn: number,
  highWarn: number
): TelemetryStatus {
  if (value < lowWarn || value > highWarn) return 'bad';
  if (value < lowGood || value > highGood) return 'warning';
  return 'good';
}

export function useEpsTelemetry(options: UseEpsTelemetryOptions) {
  const {
    missionSeconds,
    spacecraftTelemetryAvailable,
    scenario2TelemetryBlackout,
    isScenario2,

    epsTemperature,
    epsTemperatureClass,
    netPower,

    batteryA,
    batteryB,
    batteryC,
    batteryEqualizationInProgress,

    payloadPowerLevel,
    powerSavingModeActive,
  } = options;

  const epsTelemetryDefinition = [
    // POWER GENERATION
    { parameter: 'SAW022', subsystem: 'Solar Array Wing X Temperature', unit: '°C' },
    { parameter: 'SAW023', subsystem: 'Solar Array Wing Y Temperature', unit: '°C' },
    { parameter: 'SAW030', subsystem: 'Solar Array Voltage', unit: 'V' },
    { parameter: 'EPS717', subsystem: 'Solar Array Current', unit: 'A' },
    { parameter: 'SAW032', subsystem: 'Generated Solar Power', unit: 'W' },
    { parameter: 'SAW033', subsystem: 'Solar Array Harness Temperature', unit: '°C' },
    { parameter: 'SAW034', subsystem: 'Bypass Diode Temperature', unit: '°C' },
    { parameter: 'SAW035', subsystem: 'Blocking Diode Temperature', unit: '°C' },
    { parameter: 'SAD010', subsystem: 'Solar Array Drive Mechanism', unit: 'state' },
    { parameter: 'SAD011', subsystem: 'Solar Array Drive Electronics', unit: '°C' },
    { parameter: 'STC012', subsystem: 'Sun Tracking Controller', unit: 'state' },
    { parameter: 'MPP101', subsystem: 'Maximum Power Point Tracker', unit: 'state' },
    { parameter: 'MPP102', subsystem: 'MPPT Efficiency', unit: '%' },

    // ENERGY STORAGE
    { parameter: 'BAT105', subsystem: 'Battery Pack Temperature', unit: '°C' },
    { parameter: 'BMS106', subsystem: 'Battery Management System', unit: '°C' },

    { parameter: 'BCH096', subsystem: 'Battery A State of Charge', unit: '%' },
    { parameter: 'BCH097', subsystem: 'Battery B State of Charge', unit: '%' },
    { parameter: 'BCH098', subsystem: 'Battery C State of Charge', unit: '%' },

    { parameter: 'BAT201', subsystem: 'Battery A Voltage', unit: 'V' },
    { parameter: 'BAT202', subsystem: 'Battery B Voltage', unit: 'V' },
    { parameter: 'BAT203', subsystem: 'Battery C Voltage', unit: 'V' },

    { parameter: 'BAT211', subsystem: 'Battery A Current', unit: 'A' },
    { parameter: 'BAT212', subsystem: 'Battery B Current', unit: 'A' },
    { parameter: 'BAT213', subsystem: 'Battery C Current', unit: 'A' },

    { parameter: 'BAT221', subsystem: 'Battery A State of Health', unit: '%' },
    { parameter: 'BAT222', subsystem: 'Battery B State of Health', unit: '%' },
    { parameter: 'BAT223', subsystem: 'Battery C State of Health', unit: '%' },

    { parameter: 'BAT231', subsystem: 'Battery A Cell Minimum Voltage', unit: 'V' },
    { parameter: 'BAT232', subsystem: 'Battery A Cell Maximum Voltage', unit: 'V' },
    { parameter: 'BAT233', subsystem: 'Battery A Cell Voltage Delta', unit: 'mV' },

    { parameter: 'BAT234', subsystem: 'Battery B Cell Minimum Voltage', unit: 'V' },
    { parameter: 'BAT235', subsystem: 'Battery B Cell Maximum Voltage', unit: 'V' },
    { parameter: 'BAT236', subsystem: 'Battery B Cell Voltage Delta', unit: 'mV' },

    { parameter: 'BAT237', subsystem: 'Battery C Cell Minimum Voltage', unit: 'V' },
    { parameter: 'BAT238', subsystem: 'Battery C Cell Maximum Voltage', unit: 'V' },
    { parameter: 'BAT239', subsystem: 'Battery C Cell Voltage Delta', unit: 'mV' },

    { parameter: 'BAT241', subsystem: 'Battery A Cell Minimum Temperature', unit: '°C' },
    { parameter: 'BAT242', subsystem: 'Battery A Cell Maximum Temperature', unit: '°C' },
    { parameter: 'BAT243', subsystem: 'Battery B Cell Minimum Temperature', unit: '°C' },
    { parameter: 'BAT244', subsystem: 'Battery B Cell Maximum Temperature', unit: '°C' },
    { parameter: 'BAT245', subsystem: 'Battery C Cell Minimum Temperature', unit: '°C' },
    { parameter: 'BAT246', subsystem: 'Battery C Cell Maximum Temperature', unit: '°C' },

    { parameter: 'BCR300', subsystem: 'Battery Operating Mode', unit: 'state' },
    { parameter: 'BCR301', subsystem: 'Charge Current Limit', unit: 'A' },
    { parameter: 'BDR302', subsystem: 'Discharge Current Limit', unit: 'A' },
    { parameter: 'BAL303', subsystem: 'Cell Balancing Circuit', unit: 'state' },
    { parameter: 'HTR304', subsystem: 'Battery Heater', unit: 'state' },
    { parameter: 'ISO305', subsystem: 'Battery Isolation Switch', unit: 'state' },
    { parameter: 'FUS306', subsystem: 'Battery Fuse', unit: 'state' },
    { parameter: 'BTR331', subsystem: 'Battery Transfer Controller', unit: 'state' },

    // POWER CONDITIONING
    { parameter: 'PCU447', subsystem: 'Power Control Unit Temperature', unit: '°C' },
    { parameter: 'PCU448', subsystem: 'Power Control Unit Output', unit: 'W' },
    { parameter: 'PCU449', subsystem: 'Power Control Unit Efficiency', unit: '%' },

    { parameter: 'DCC208', subsystem: 'DC/DC Converter Temperature', unit: '°C' },
    { parameter: 'DCC209', subsystem: 'DC/DC Converter Efficiency', unit: '%' },

    { parameter: 'REG512', subsystem: 'Battery Charge Regulator Temperature', unit: '°C' },
    { parameter: 'BDR513', subsystem: 'Battery Discharge Regulator Temperature', unit: '°C' },
    { parameter: 'VRG514', subsystem: 'Voltage Regulator Output', unit: 'V' },

    { parameter: 'SHU515', subsystem: 'Shunt Regulator', unit: 'state' },
    { parameter: 'CAP516', subsystem: 'Main Bus Capacitor Voltage', unit: 'V' },
    { parameter: 'FLT517', subsystem: 'Power Filter', unit: 'state' },

    // POWER DISTRIBUTION
    { parameter: 'PDU331', subsystem: 'Power Distribution Unit Temperature', unit: '°C' },

    { parameter: 'BUS281', subsystem: 'Main Bus Voltage', unit: 'V' },
    { parameter: 'EPS718', subsystem: 'Main Bus Current', unit: 'A' },
    { parameter: 'BUS282', subsystem: 'Main Bus Power', unit: 'W' },

    { parameter: 'BUS283', subsystem: 'Essential Bus Voltage', unit: 'V' },
    { parameter: 'BUS284', subsystem: 'Essential Bus Current', unit: 'A' },

    { parameter: 'BUS285', subsystem: 'Nonessential Bus Voltage', unit: 'V' },
    { parameter: 'BUS286', subsystem: 'Nonessential Bus Current', unit: 'A' },

    { parameter: 'PWR740', subsystem: 'Payload Power Bus', unit: 'W' },
    { parameter: 'PWR741', subsystem: 'Payload Bus Voltage', unit: 'V' },
    { parameter: 'PWR742', subsystem: 'Payload Bus Current', unit: 'A' },

    { parameter: 'PDU411', subsystem: 'PDU CH-4 Load', unit: '%' },

    { parameter: 'EPS603', subsystem: 'LCL Switch Bank Temperature', unit: '°C' },
    { parameter: 'LCL902', subsystem: 'Load Current Limiter', unit: 'state' },
    { parameter: 'LCL903', subsystem: 'Payload LCL Current', unit: 'A' },

    { parameter: 'EPS901', subsystem: 'Load Shed Flag', unit: 'state' },
    { parameter: 'PDU912', subsystem: 'PDU Trip Status', unit: 'state' },
    { parameter: 'RPC913', subsystem: 'Remote Power Controller', unit: 'state' },
    { parameter: 'SSW914', subsystem: 'Solid State Power Switch', unit: 'state' },
    { parameter: 'RLY915', subsystem: 'Power Relay', unit: 'state' },
    { parameter: 'FUS916', subsystem: 'Distribution Fuse', unit: 'state' },
    { parameter: 'CBR917', subsystem: 'Circuit Breaker', unit: 'state' },
    { parameter: 'LDS918', subsystem: 'Payload Load Switch', unit: 'state' },
    { parameter: 'PYR919', subsystem: 'Pyrotechnic Bus', unit: 'state' },

    // SYSTEM LEVEL
    { parameter: 'EPT014', subsystem: 'EPS Main Electronics', unit: '°C' },
    { parameter: 'NET118', subsystem: 'Net Power Margin', unit: 'W' },
    { parameter: 'EPS700', subsystem: 'EPS Operating Mode', unit: 'state' },
    { parameter: 'EPS750', subsystem: 'Orbit-Average Power', unit: 'W' },
    { parameter: 'EPS751', subsystem: 'Peak Power Demand', unit: 'W' },
    { parameter: 'EPS752', subsystem: 'Energy Balance', unit: 'state' },
    { parameter: 'EPS753', subsystem: 'Predicted Eclipse Energy Consumption', unit: 'Wh' },
  ];

  const epsTelemetry = computed<TelemetryRow[]>(() => {
    if (!spacecraftTelemetryAvailable.value || scenario2TelemetryBlackout.value) {
      return noTelemetryRows(epsTelemetryDefinition);
    }

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const classifyRange = (
      value: number,
      goodLow: number,
      goodHigh: number,
      warnLow: number,
      warnHigh: number
    ): TelemetryStatus => {
      if (value < warnLow || value > warnHigh) return 'bad';
      if (value < goodLow || value > goodHigh) return 'warning';
      return 'good';
    };

    const classifyMinimum = (
      value: number,
      goodMinimum: number,
      warningMinimum: number
    ): TelemetryStatus => {
      if (value < warningMinimum) return 'bad';
      if (value < goodMinimum) return 'warning';
      return 'good';
    };

    // ---------------------------------------------------------------------------
    // READ-ONLY COUPLING TO EXISTING SIMULATION STATE
    // ---------------------------------------------------------------------------

    const payloadLoadFactor = clamp((payloadPowerLevel.value - 8) / 172, 0, 1);

    const powerSavingFactor = powerSavingModeActive.value ? 1 : 0;

    const thermalStress = Math.max(0, epsTemperature.value - 75);

    const batteryTransferActive = isScenario2.value && batteryEqualizationInProgress.value;

    // ---------------------------------------------------------------------------
    // MAIN POWER BUS
    // ---------------------------------------------------------------------------

    const mainBusVoltage = clamp(
      28.22 -
        payloadLoadFactor * 0.1 +
        powerSavingFactor * 0.03 +
        Math.sin(missionSeconds.value / 8) * 0.03,
      27.6,
      28.8
    );

    const payloadBusVoltage = clamp(
      mainBusVoltage -
        0.08 -
        payloadLoadFactor * 0.03 +
        Math.sin(missionSeconds.value / 10) * 0.015,
      27.4,
      28.7
    );

    const payloadBusCurrent = payloadPowerLevel.value / Math.max(payloadBusVoltage, 1);

    const essentialBusCurrent = 7.2 + Math.sin(missionSeconds.value / 12) * 0.12;

    const nonessentialBusCurrent = clamp(
      3.6 - powerSavingFactor * 2.3 + Math.sin(missionSeconds.value / 14 + 0.6) * 0.15,
      1.0,
      4.0
    );

    const mainBusCurrent = essentialBusCurrent + nonessentialBusCurrent + payloadBusCurrent + 0.7;

    const mainBusPower = mainBusVoltage * mainBusCurrent;

    const essentialBusVoltage = clamp(
      mainBusVoltage - 0.04 + Math.sin(missionSeconds.value / 11) * 0.015,
      27.5,
      28.8
    );

    const nonessentialBusVoltage = clamp(
      mainBusVoltage - 0.09 - payloadLoadFactor * 0.02 + Math.sin(missionSeconds.value / 13) * 0.02,
      27.2,
      28.7
    );

    // ---------------------------------------------------------------------------
    // SOLAR ARRAY / POWER GENERATION
    //
    // High-voltage array side feeding a regulated ~28 V spacecraft bus.
    // ---------------------------------------------------------------------------

    const generatedSolarPower = mainBusPower + netPower.value;

    const solarArrayVoltage = clamp(
      196 + Math.sin(missionSeconds.value / 17 + 0.4) * 2.6,
      188,
      204
    );

    const solarArrayCurrent = generatedSolarPower / solarArrayVoltage;

    const solarArrayTempX = -7.0 + Math.sin(missionSeconds.value / 20 + 2.2) * 4.8;

    const solarArrayTempY = -8.2 + Math.sin(missionSeconds.value / 22 + 1.1) * 4.5;

    const solarHarnessTemp =
      11.5 + payloadLoadFactor * 1.2 + Math.sin(missionSeconds.value / 18) * 1.1;

    const bypassDiodeTemp =
      31.0 + solarArrayCurrent * 0.65 + Math.sin(missionSeconds.value / 15) * 0.7;

    const blockingDiodeTemp =
      32.0 + solarArrayCurrent * 0.7 + Math.sin(missionSeconds.value / 16 + 0.8) * 0.7;

    const sadeTemp =
      35.5 + solarArrayCurrent * 0.25 + Math.sin(missionSeconds.value / 15 + 1.2) * 0.6;

    const mpptEfficiency = clamp(
      96.8 - payloadLoadFactor * 0.2 + Math.sin(missionSeconds.value / 24) * 0.15,
      95.5,
      97.3
    );

    // ---------------------------------------------------------------------------
    // BATTERY
    // ---------------------------------------------------------------------------

    const socA = clamp(batteryA.value, 0, 100);
    const socB = clamp(batteryB.value, 0, 100);
    const socC = clamp(batteryC.value, 0, 100);

    const averageSoc = (socA + socB + socC) / 3;

    const cellVoltageFromSoc = (soc: number) => clamp(3.05 + (soc / 100) * 1.15, 3.05, 4.2);

    const cellVoltageA = cellVoltageFromSoc(socA);
    const cellVoltageB = cellVoltageFromSoc(socB);
    const cellVoltageC = cellVoltageFromSoc(socC);

    const batteryAVoltage = cellVoltageA * 8;

    const batteryBVoltage = cellVoltageB * 8;

    const batteryCVoltage = cellVoltageC * 8;

    let batteryACurrent = 0;
    let batteryBCurrent = 0;
    let batteryCCurrent = 0;

    if (batteryTransferActive) {
      // BAT330:
      // Battery A is donor.
      // Battery B/C receive energy.
      batteryACurrent = -4.0 + Math.sin(missionSeconds.value / 6) * 0.08;

      batteryBCurrent = 2.0 + Math.sin(missionSeconds.value / 7 + 0.5) * 0.06;

      batteryCCurrent = 2.0 + Math.sin(missionSeconds.value / 7 + 1.1) * 0.06;
    } else {
      const normalDischargeCurrent = -0.6 - payloadLoadFactor * 0.8;

      batteryACurrent = normalDischargeCurrent + Math.sin(missionSeconds.value / 13) * 0.06;

      batteryBCurrent = normalDischargeCurrent + Math.sin(missionSeconds.value / 14 + 0.7) * 0.06;

      batteryCCurrent = normalDischargeCurrent + Math.sin(missionSeconds.value / 15 + 1.4) * 0.06;
    }

    const averageBatteryCurrent =
      (Math.abs(batteryACurrent) + Math.abs(batteryBCurrent) + Math.abs(batteryCCurrent)) / 3;

    const batteryTemp =
      27.0 +
      payloadLoadFactor * 0.8 +
      averageBatteryCurrent * 0.12 +
      (batteryTransferActive ? 0.6 : 0) +
      Math.sin(missionSeconds.value / 18 + 0.4) * 0.4;

    const bmsTemp =
      31.5 +
      payloadLoadFactor * 0.6 +
      averageBatteryCurrent * 0.2 +
      (batteryTransferActive ? 0.8 : 0) +
      Math.sin(missionSeconds.value / 16) * 0.5;

    // SOH changes over long mission lifetime, not during a short pass.
    const batterySohA = 98.4;
    const batterySohB = 98.1;
    const batterySohC = 98.2;

    const cellSpread = (soc: number, phase: number) =>
      clamp(
        0.018 + (100 - soc) * 0.00015 + Math.sin(missionSeconds.value / 30 + phase) * 0.0015,
        0.012,
        0.045
      );

    const spreadA = cellSpread(socA, 0.2);
    const spreadB = cellSpread(socB, 1.0);
    const spreadC = cellSpread(socC, 1.8);

    const cellAMin = cellVoltageA - spreadA / 2;

    const cellAMax = cellVoltageA + spreadA / 2;

    const cellBMin = cellVoltageB - spreadB / 2;

    const cellBMax = cellVoltageB + spreadB / 2;

    const cellCMin = cellVoltageC - spreadC / 2;

    const cellCMax = cellVoltageC + spreadC / 2;

    const cellTempSpread = 0.45 + averageBatteryCurrent * 0.04;

    const batteryACellMinTemp = batteryTemp - cellTempSpread;

    const batteryACellMaxTemp = batteryTemp + cellTempSpread;

    const batteryBCellMinTemp = batteryTemp - cellTempSpread + 0.2;

    const batteryBCellMaxTemp = batteryTemp + cellTempSpread + 0.2;

    const batteryCCellMinTemp = batteryTemp - cellTempSpread - 0.1;

    const batteryCCellMaxTemp = batteryTemp + cellTempSpread - 0.1;

    const batteryOperatingMode = batteryTransferActive
      ? 'TRANSFER'
      : averageSoc < 20
        ? 'RECOVERY REQUIRED'
        : 'DISCHARGE';

    // ---------------------------------------------------------------------------
    // POWER CONDITIONING
    // ---------------------------------------------------------------------------

    const pcuTemp =
      39.5 +
      payloadLoadFactor * 3.0 +
      thermalStress * 0.45 +
      Math.sin(missionSeconds.value / 10 + 0.5) * 0.7;

    const converterTemp =
      44.0 +
      payloadLoadFactor * 4.0 +
      thermalStress * 0.55 +
      Math.sin(missionSeconds.value / 12 + 1.3) * 0.7;

    const chargeRegulatorTemp =
      40.5 +
      averageBatteryCurrent * 0.2 +
      thermalStress * 0.35 +
      Math.sin(missionSeconds.value / 16 + 2.5) * 0.6;

    const dischargeRegulatorTemp =
      39.0 +
      averageBatteryCurrent * 0.35 +
      payloadLoadFactor * 0.8 +
      thermalStress * 0.3 +
      Math.sin(missionSeconds.value / 15 + 0.9) * 0.6;

    const pcuEfficiency = clamp(
      95.6 - payloadLoadFactor * 0.25 + Math.sin(missionSeconds.value / 25) * 0.12,
      94.5,
      96.5
    );

    const converterEfficiency = clamp(
      94.4 - payloadLoadFactor * 0.35 + Math.sin(missionSeconds.value / 22 + 0.4) * 0.15,
      93.0,
      95.2
    );

    const voltageRegulatorOutput = clamp(
      mainBusVoltage + Math.sin(missionSeconds.value / 20) * 0.01,
      27.6,
      28.8
    );

    // ---------------------------------------------------------------------------
    // POWER DISTRIBUTION
    // ---------------------------------------------------------------------------

    const pduTemp =
      40.0 +
      payloadLoadFactor * 3.0 +
      thermalStress * 0.4 +
      Math.sin(missionSeconds.value / 13 + 0.9) * 0.6;

    const lclTemp =
      37.0 + payloadLoadFactor * 3.2 + Math.sin(missionSeconds.value / 17 + 1.7) * 0.5;

    const pduChannel4Load = clamp(
      15 + payloadLoadFactor * 69 + Math.sin(missionSeconds.value / 15) * 1.5,
      10,
      88
    );

    // ---------------------------------------------------------------------------
    // SYSTEM LEVEL
    // ---------------------------------------------------------------------------

    const orbitAveragePower =
      365 +
      payloadLoadFactor * 65 -
      powerSavingFactor * 40 +
      Math.sin(missionSeconds.value / 40) * 4;

    const peakPowerDemand = mainBusPower + 75 + payloadLoadFactor * 15;

    const predictedEclipseEnergy =
      265 +
      payloadLoadFactor * 35 -
      powerSavingFactor * 25 +
      Math.sin(missionSeconds.value / 45) * 3;

    const epsMode =
      epsTemperature.value > 90
        ? 'EPS_DEGRADED'
        : powerSavingModeActive.value
          ? 'EPS_LOAD_SHEDDING'
          : 'EPS_SUNLIGHT_GENERATION';

    // ---------------------------------------------------------------------------
    // TELEMETRY ROWS
    // ---------------------------------------------------------------------------

    return [
      // POWER GENERATION

      {
        parameter: 'SAW022',
        subsystem: 'Solar Array Wing X Temperature',
        measurement: solarArrayTempX.toFixed(1),
        unit: '°C',
        status: classifyTemperature(solarArrayTempX, -20, 20, -40, 50),
      },
      {
        parameter: 'SAW023',
        subsystem: 'Solar Array Wing Y Temperature',
        measurement: solarArrayTempY.toFixed(1),
        unit: '°C',
        status: classifyTemperature(solarArrayTempY, -20, 20, -40, 50),
      },
      {
        parameter: 'SAW030',
        subsystem: 'Solar Array Voltage',
        measurement: solarArrayVoltage.toFixed(1),
        unit: 'V',
        status: classifyRange(solarArrayVoltage, 185, 210, 170, 220),
      },
      {
        parameter: 'EPS717',
        subsystem: 'Solar Array Current',
        measurement: solarArrayCurrent.toFixed(1),
        unit: 'A',
        status: classifyRange(solarArrayCurrent, 6.0, 10.0, 4.0, 12.0),
      },
      {
        parameter: 'SAW032',
        subsystem: 'Generated Solar Power',
        measurement: generatedSolarPower.toFixed(0),
        unit: 'W',
        status: classifyRange(generatedSolarPower, 1350, 1800, 1150, 1950),
      },
      {
        parameter: 'SAW033',
        subsystem: 'Solar Array Harness Temperature',
        measurement: solarHarnessTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(solarHarnessTemp, -10, 35, -30, 55),
      },
      {
        parameter: 'SAW034',
        subsystem: 'Bypass Diode Temperature',
        measurement: bypassDiodeTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(bypassDiodeTemp, 10, 55, -10, 75),
      },
      {
        parameter: 'SAW035',
        subsystem: 'Blocking Diode Temperature',
        measurement: blockingDiodeTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(blockingDiodeTemp, 10, 55, -10, 75),
      },
      {
        parameter: 'SAD010',
        subsystem: 'Solar Array Drive Mechanism',
        measurement: 'TRACKING',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'SAD011',
        subsystem: 'Solar Array Drive Electronics',
        measurement: sadeTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(sadeTemp, 15, 50, 0, 65),
      },
      {
        parameter: 'STC012',
        subsystem: 'Sun Tracking Controller',
        measurement: 'TRACKING',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'MPP101',
        subsystem: 'Maximum Power Point Tracker',
        measurement: 'TRACK',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'MPP102',
        subsystem: 'MPPT Efficiency',
        measurement: mpptEfficiency.toFixed(1),
        unit: '%',
        status: classifyMinimum(mpptEfficiency, 95, 92),
      },

      // ENERGY STORAGE

      {
        parameter: 'BAT105',
        subsystem: 'Battery Pack Temperature',
        measurement: batteryTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryTemp, 18, 32, 5, 45),
      },
      {
        parameter: 'BMS106',
        subsystem: 'Battery Management System',
        measurement: bmsTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(bmsTemp, 20, 45, 5, 60),
      },

      {
        parameter: 'BCH096',
        subsystem: 'Battery A State of Charge',
        measurement: socA.toFixed(1),
        unit: '%',
        status: socA >= 80 ? 'good' : socA >= 50 ? 'warning' : 'bad',
      },
      {
        parameter: 'BCH097',
        subsystem: 'Battery B State of Charge',
        measurement: socB.toFixed(1),
        unit: '%',
        status: socB > 50 ? 'good' : socB >= 20 ? 'warning' : 'bad',
      },
      {
        parameter: 'BCH098',
        subsystem: 'Battery C State of Charge',
        measurement: socC.toFixed(1),
        unit: '%',
        status: socC > 50 ? 'good' : socC >= 20 ? 'warning' : 'bad',
      },

      {
        parameter: 'BAT201',
        subsystem: 'Battery A Voltage',
        measurement: batteryAVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(batteryAVoltage, 27.6, 33.4, 25.2, 33.8),
      },
      {
        parameter: 'BAT202',
        subsystem: 'Battery B Voltage',
        measurement: batteryBVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(batteryBVoltage, 27.6, 33.4, 25.2, 33.8),
      },
      {
        parameter: 'BAT203',
        subsystem: 'Battery C Voltage',
        measurement: batteryCVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(batteryCVoltage, 27.6, 33.4, 25.2, 33.8),
      },

      {
        parameter: 'BAT211',
        subsystem: 'Battery A Current',
        measurement: batteryACurrent.toFixed(2),
        unit: 'A',
        status:
          Math.abs(batteryACurrent) <= 10
            ? 'good'
            : Math.abs(batteryACurrent) <= 18
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'BAT212',
        subsystem: 'Battery B Current',
        measurement: batteryBCurrent.toFixed(2),
        unit: 'A',
        status:
          Math.abs(batteryBCurrent) <= 10
            ? 'good'
            : Math.abs(batteryBCurrent) <= 18
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'BAT213',
        subsystem: 'Battery C Current',
        measurement: batteryCCurrent.toFixed(2),
        unit: 'A',
        status:
          Math.abs(batteryCCurrent) <= 10
            ? 'good'
            : Math.abs(batteryCCurrent) <= 18
              ? 'warning'
              : 'bad',
      },

      {
        parameter: 'BAT221',
        subsystem: 'Battery A State of Health',
        measurement: batterySohA.toFixed(1),
        unit: '%',
        status: classifyMinimum(batterySohA, 85, 70),
      },
      {
        parameter: 'BAT222',
        subsystem: 'Battery B State of Health',
        measurement: batterySohB.toFixed(1),
        unit: '%',
        status: classifyMinimum(batterySohB, 85, 70),
      },
      {
        parameter: 'BAT223',
        subsystem: 'Battery C State of Health',
        measurement: batterySohC.toFixed(1),
        unit: '%',
        status: classifyMinimum(batterySohC, 85, 70),
      },

      {
        parameter: 'BAT231',
        subsystem: 'Battery A Cell Minimum Voltage',
        measurement: cellAMin.toFixed(3),
        unit: 'V',
        status: classifyRange(cellAMin, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT232',
        subsystem: 'Battery A Cell Maximum Voltage',
        measurement: cellAMax.toFixed(3),
        unit: 'V',
        status: classifyRange(cellAMax, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT233',
        subsystem: 'Battery A Cell Voltage Delta',
        measurement: (spreadA * 1000).toFixed(0),
        unit: 'mV',
        status: spreadA * 1000 <= 30 ? 'good' : spreadA * 1000 <= 50 ? 'warning' : 'bad',
      },

      {
        parameter: 'BAT234',
        subsystem: 'Battery B Cell Minimum Voltage',
        measurement: cellBMin.toFixed(3),
        unit: 'V',
        status: classifyRange(cellBMin, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT235',
        subsystem: 'Battery B Cell Maximum Voltage',
        measurement: cellBMax.toFixed(3),
        unit: 'V',
        status: classifyRange(cellBMax, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT236',
        subsystem: 'Battery B Cell Voltage Delta',
        measurement: (spreadB * 1000).toFixed(0),
        unit: 'mV',
        status: spreadB * 1000 <= 30 ? 'good' : spreadB * 1000 <= 50 ? 'warning' : 'bad',
      },

      {
        parameter: 'BAT237',
        subsystem: 'Battery C Cell Minimum Voltage',
        measurement: cellCMin.toFixed(3),
        unit: 'V',
        status: classifyRange(cellCMin, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT238',
        subsystem: 'Battery C Cell Maximum Voltage',
        measurement: cellCMax.toFixed(3),
        unit: 'V',
        status: classifyRange(cellCMax, 3.45, 4.2, 3.15, 4.25),
      },
      {
        parameter: 'BAT239',
        subsystem: 'Battery C Cell Voltage Delta',
        measurement: (spreadC * 1000).toFixed(0),
        unit: 'mV',
        status: spreadC * 1000 <= 30 ? 'good' : spreadC * 1000 <= 50 ? 'warning' : 'bad',
      },

      {
        parameter: 'BAT241',
        subsystem: 'Battery A Cell Minimum Temperature',
        measurement: batteryACellMinTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryACellMinTemp, 15, 35, 5, 45),
      },
      {
        parameter: 'BAT242',
        subsystem: 'Battery A Cell Maximum Temperature',
        measurement: batteryACellMaxTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryACellMaxTemp, 15, 35, 5, 45),
      },
      {
        parameter: 'BAT243',
        subsystem: 'Battery B Cell Minimum Temperature',
        measurement: batteryBCellMinTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryBCellMinTemp, 15, 35, 5, 45),
      },
      {
        parameter: 'BAT244',
        subsystem: 'Battery B Cell Maximum Temperature',
        measurement: batteryBCellMaxTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryBCellMaxTemp, 15, 35, 5, 45),
      },
      {
        parameter: 'BAT245',
        subsystem: 'Battery C Cell Minimum Temperature',
        measurement: batteryCCellMinTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryCCellMinTemp, 15, 35, 5, 45),
      },
      {
        parameter: 'BAT246',
        subsystem: 'Battery C Cell Maximum Temperature',
        measurement: batteryCCellMaxTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(batteryCCellMaxTemp, 15, 35, 5, 45),
      },

      {
        parameter: 'BCR300',
        subsystem: 'Battery Operating Mode',
        measurement: batteryOperatingMode,
        unit: 'state',
        status: averageSoc < 20 ? 'bad' : averageSoc < 50 ? 'warning' : 'good',
      },
      {
        parameter: 'BCR301',
        subsystem: 'Charge Current Limit',
        measurement: '10.0',
        unit: 'A',
        status: 'good',
      },
      {
        parameter: 'BDR302',
        subsystem: 'Discharge Current Limit',
        measurement: '20.0',
        unit: 'A',
        status: 'good',
      },
      {
        parameter: 'BAL303',
        subsystem: 'Cell Balancing Circuit',
        measurement: 'STANDBY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'HTR304',
        subsystem: 'Battery Heater',
        measurement: batteryTemp < 10 ? 'ON' : 'OFF',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'ISO305',
        subsystem: 'Battery Isolation Switch',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'FUS306',
        subsystem: 'Battery Fuse',
        measurement: 'HEALTHY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'BTR331',
        subsystem: 'Battery Transfer Controller',
        measurement: batteryTransferActive ? 'ACTIVE' : 'STANDBY',
        unit: 'state',
        status: 'good',
      },

      // POWER CONDITIONING

      {
        parameter: 'PCU447',
        subsystem: 'Power Control Unit Temperature',
        measurement: pcuTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(pcuTemp, 28, 48, 15, 60),
      },
      {
        parameter: 'PCU448',
        subsystem: 'Power Control Unit Output',
        measurement: mainBusPower.toFixed(0),
        unit: 'W',
        status: classifyRange(mainBusPower, 250, 550, 180, 650),
      },
      {
        parameter: 'PCU449',
        subsystem: 'Power Control Unit Efficiency',
        measurement: pcuEfficiency.toFixed(1),
        unit: '%',
        status: classifyMinimum(pcuEfficiency, 94, 90),
      },

      {
        parameter: 'DCC208',
        subsystem: 'DC/DC Converter Temperature',
        measurement: converterTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(converterTemp, 30, 52, 18, 65),
      },
      {
        parameter: 'DCC209',
        subsystem: 'DC/DC Converter Efficiency',
        measurement: converterEfficiency.toFixed(1),
        unit: '%',
        status: classifyMinimum(converterEfficiency, 92, 88),
      },

      {
        parameter: 'REG512',
        subsystem: 'Battery Charge Regulator Temperature',
        measurement: chargeRegulatorTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(chargeRegulatorTemp, 28, 50, 15, 62),
      },
      {
        parameter: 'BDR513',
        subsystem: 'Battery Discharge Regulator Temperature',
        measurement: dischargeRegulatorTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(dischargeRegulatorTemp, 25, 50, 12, 62),
      },
      {
        parameter: 'VRG514',
        subsystem: 'Voltage Regulator Output',
        measurement: voltageRegulatorOutput.toFixed(2),
        unit: 'V',
        status: classifyRange(voltageRegulatorOutput, 27.6, 28.8, 26.5, 30.0),
      },
      {
        parameter: 'SHU515',
        subsystem: 'Shunt Regulator',
        measurement: netPower.value > 1000 ? 'ACTIVE' : 'STANDBY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'CAP516',
        subsystem: 'Main Bus Capacitor Voltage',
        measurement: mainBusVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(mainBusVoltage, 27.6, 28.8, 26.5, 30.0),
      },
      {
        parameter: 'FLT517',
        subsystem: 'Power Filter',
        measurement: 'NOMINAL',
        unit: 'state',
        status: 'good',
      },

      // POWER DISTRIBUTION

      {
        parameter: 'PDU331',
        subsystem: 'Power Distribution Unit Temperature',
        measurement: pduTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(pduTemp, 28, 48, 15, 60),
      },

      {
        parameter: 'BUS281',
        subsystem: 'Main Bus Voltage',
        measurement: mainBusVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(mainBusVoltage, 27.6, 28.8, 26.5, 30.0),
      },
      {
        parameter: 'EPS718',
        subsystem: 'Main Bus Current',
        measurement: mainBusCurrent.toFixed(2),
        unit: 'A',
        status: mainBusCurrent < 18 ? 'good' : mainBusCurrent < 22 ? 'warning' : 'bad',
      },
      {
        parameter: 'BUS282',
        subsystem: 'Main Bus Power',
        measurement: mainBusPower.toFixed(0),
        unit: 'W',
        status: classifyRange(mainBusPower, 250, 550, 180, 650),
      },

      {
        parameter: 'BUS283',
        subsystem: 'Essential Bus Voltage',
        measurement: essentialBusVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(essentialBusVoltage, 27.5, 28.8, 26.5, 30.0),
      },
      {
        parameter: 'BUS284',
        subsystem: 'Essential Bus Current',
        measurement: essentialBusCurrent.toFixed(2),
        unit: 'A',
        status: classifyRange(essentialBusCurrent, 6.0, 9.0, 4.0, 11.0),
      },

      {
        parameter: 'BUS285',
        subsystem: 'Nonessential Bus Voltage',
        measurement: nonessentialBusVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(nonessentialBusVoltage, 27.2, 28.8, 26.0, 30.0),
      },
      {
        parameter: 'BUS286',
        subsystem: 'Nonessential Bus Current',
        measurement: nonessentialBusCurrent.toFixed(2),
        unit: 'A',
        status: classifyRange(nonessentialBusCurrent, 1.0, 4.5, 0.2, 6.0),
      },

      {
        parameter: 'PWR740',
        subsystem: 'Payload Power Bus',
        measurement: payloadPowerLevel.value.toFixed(0),
        unit: 'W',
        status: payloadPowerLevel.value > 220 ? 'warning' : 'good',
      },
      {
        parameter: 'PWR741',
        subsystem: 'Payload Bus Voltage',
        measurement: payloadBusVoltage.toFixed(2),
        unit: 'V',
        status: classifyRange(payloadBusVoltage, 27.2, 28.8, 26.0, 30.0),
      },
      {
        parameter: 'PWR742',
        subsystem: 'Payload Bus Current',
        measurement: payloadBusCurrent.toFixed(2),
        unit: 'A',
        status: payloadBusCurrent <= 7.5 ? 'good' : payloadBusCurrent <= 9 ? 'warning' : 'bad',
      },

      {
        parameter: 'PDU411',
        subsystem: 'PDU CH-4 Load',
        measurement: pduChannel4Load.toFixed(0),
        unit: '%',
        status: pduChannel4Load <= 85 ? 'good' : pduChannel4Load <= 95 ? 'warning' : 'bad',
      },

      {
        parameter: 'EPS603',
        subsystem: 'LCL Switch Bank Temperature',
        measurement: lclTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(lclTemp, 26, 48, 12, 60),
      },
      {
        parameter: 'LCL902',
        subsystem: 'Load Current Limiter',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'LCL903',
        subsystem: 'Payload LCL Current',
        measurement: payloadBusCurrent.toFixed(2),
        unit: 'A',
        status: payloadBusCurrent <= 7.5 ? 'good' : payloadBusCurrent <= 9 ? 'warning' : 'bad',
      },

      {
        parameter: 'EPS901',
        subsystem: 'Load Shed Flag',
        measurement: powerSavingModeActive.value ? '1' : '0',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'PDU912',
        subsystem: 'PDU Trip Status',
        measurement: 'NO TRIP',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'RPC913',
        subsystem: 'Remote Power Controller',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'SSW914',
        subsystem: 'Solid State Power Switch',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'RLY915',
        subsystem: 'Power Relay',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'FUS916',
        subsystem: 'Distribution Fuse',
        measurement: 'HEALTHY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'CBR917',
        subsystem: 'Circuit Breaker',
        measurement: 'CLOSED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'LDS918',
        subsystem: 'Payload Load Switch',
        measurement: 'ON',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'PYR919',
        subsystem: 'Pyrotechnic Bus',
        measurement: 'INHIBITED',
        unit: 'state',
        status: 'good',
      },

      // SYSTEM LEVEL

      {
        parameter: 'EPT014',
        subsystem: 'EPS Main Electronics',
        measurement: epsTemperature.value.toFixed(1),
        unit: '°C',
        status: epsTemperatureClass.value.replace('status-', '') as TelemetryStatus,
      },

      {
        parameter: 'NET118',
        subsystem: 'Net Power Margin',
        measurement: netPower.value.toFixed(0),
        unit: 'W',
        status: netPower.value >= 900 ? 'good' : netPower.value >= 850 ? 'warning' : 'bad',
      },

      {
        parameter: 'EPS700',
        subsystem: 'EPS Operating Mode',
        measurement: epsMode,
        unit: 'state',
        status:
          epsMode === 'EPS_DEGRADED' ? 'bad' : epsMode === 'EPS_LOAD_SHEDDING' ? 'warning' : 'good',
      },

      {
        parameter: 'EPS750',
        subsystem: 'Orbit-Average Power',
        measurement: orbitAveragePower.toFixed(0),
        unit: 'W',
        status: classifyRange(orbitAveragePower, 280, 480, 220, 550),
      },

      {
        parameter: 'EPS751',
        subsystem: 'Peak Power Demand',
        measurement: peakPowerDemand.toFixed(0),
        unit: 'W',
        status: classifyRange(peakPowerDemand, 350, 600, 280, 700),
      },

      {
        parameter: 'EPS752',
        subsystem: 'Energy Balance',
        measurement: netPower.value > 0 ? 'POSITIVE' : 'NEGATIVE',
        unit: 'state',
        status: netPower.value > 0 ? 'good' : 'bad',
      },

      {
        parameter: 'EPS753',
        subsystem: 'Predicted Eclipse Energy Consumption',
        measurement: predictedEclipseEnergy.toFixed(0),
        unit: 'Wh',
        status: classifyRange(predictedEclipseEnergy, 220, 340, 180, 400),
      },
    ];
  });

  return {
    epsTelemetry,
  };
}
