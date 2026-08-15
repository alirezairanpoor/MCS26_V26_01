import { computed, type Ref, type ComputedRef } from 'vue';

export type GroundStationTelemetryStatus = 'empty' | 'good' | 'warning' | 'bad';

export type GroundStationTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: GroundStationTelemetryStatus;
};

type TelemetryStatus = GroundStationTelemetryStatus;
type TelemetryRow = GroundStationTelemetryRow;

type ReactiveValue<T = any> = Ref<T> | ComputedRef<T>;

type UseGroundStationTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  simulationStatus: ReactiveValue<string>;
  isScenario2: ReactiveValue<boolean>;

  gs1ConnectionActive: ReactiveValue<boolean>;
  gs1DisplayedElevation: ReactiveValue<number | null>;
  gs1DisplayedElevationClass: ReactiveValue<string>;
  gs1DownlinkAvailable: ReactiveValue<boolean>;
  gs1GeometryElevation: ReactiveValue<number | null>;
  gs1GeometryProgress: ReactiveValue<number>;
  gs1MaxDopplerKHz: number;

  azimuth: ReactiveValue<number | null>;
  range: ReactiveValue<number | null>;
  passProgress: ReactiveValue<number>;

  signalFiltered: ReactiveValue<boolean>;
  signalQuality: ReactiveValue<string>;
  signalClass: ReactiveValue<string>;

  scenario2WeakSignalWarning: ReactiveValue<boolean>;
  scenario2TelemetryBlackout: ReactiveValue<boolean>;
  scenario2Gs2TelemetryLock: ReactiveValue<boolean>;
  scenario2Gs2TrackingStartSecond: ReactiveValue<number | null>;
  scenario2Gs2SignalFiltered: ReactiveValue<boolean>;

  gs2Elevation: ReactiveValue<number | null>;
  gs2ElevationClass: ReactiveValue<string>;
  gs2Azimuth: ReactiveValue<number | null>;
  gs2Range: ReactiveValue<number | null>;
  gs2GeometryProgress: ReactiveValue<number>;
  gs2SignalQuality: ReactiveValue<string>;
  gs2SignalClass: ReactiveValue<string>;
  gs2MaxDopplerKHz: number;
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

export function useGroundStationTelemetry(options: UseGroundStationTelemetryOptions) {
  const {
    missionSeconds,
    simulationStatus,
    isScenario2,

    gs1ConnectionActive,
    gs1DisplayedElevation,
    gs1DisplayedElevationClass,
    gs1DownlinkAvailable,
    gs1GeometryElevation,
    gs1GeometryProgress,
    gs1MaxDopplerKHz,

    azimuth,
    range,
    passProgress,

    signalFiltered,
    signalQuality,
    signalClass,

    scenario2WeakSignalWarning,
    scenario2TelemetryBlackout,
    scenario2Gs2TelemetryLock,
    scenario2Gs2TrackingStartSecond,
    scenario2Gs2SignalFiltered,

    gs2Elevation,
    gs2ElevationClass,
    gs2Azimuth,
    gs2Range,
    gs2GeometryProgress,
    gs2SignalQuality,
    gs2SignalClass,
    gs2MaxDopplerKHz,
  } = options;

  function oscillation(base: number, amplitude: number, speed: number, phase = 0) {
    const t = missionSeconds.value;
    return Number((base + Math.sin(t / speed + phase) * amplitude).toFixed(1));
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

  function classifySignal(value: number): TelemetryStatus {
    if (value >= 80) return 'good';
    if (value >= 55) return 'warning';
    return 'bad';
  }

  const groundStationSupplementalDefinition = [
    // ANTENNA / TRACKING
    { parameter: 'GAD101', subsystem: 'Azimuth Drive Motor', unit: '°C' },
    { parameter: 'GED102', subsystem: 'Elevation Drive Motor', unit: '°C' },
    { parameter: 'GAC103', subsystem: 'Antenna Control Unit', unit: 'state' },
    { parameter: 'GAE104', subsystem: 'Azimuth Position Encoder', unit: 'deg' },
    { parameter: 'GEE105', subsystem: 'Elevation Position Encoder', unit: 'deg' },
    { parameter: 'GPE106', subsystem: 'Antenna Pointing Error', unit: 'deg' },

    // RF FRONT END
    { parameter: 'GRF107', subsystem: 'RF Feed Assembly', unit: '°C' },
    { parameter: 'GPN108', subsystem: 'Polarization Network', unit: 'state' },
    { parameter: 'GDP109', subsystem: 'Diplexer', unit: '°C' },
    { parameter: 'GDX110', subsystem: 'Duplexer', unit: '°C' },
    { parameter: 'GWG111', subsystem: 'Waveguide Network', unit: '°C' },
    { parameter: 'GLG119', subsystem: 'LNA Gain', unit: 'dB' },

    // RECEIVER / BASEBAND
    { parameter: 'GRX120', subsystem: 'Receiver State', unit: 'state' },
    { parameter: 'GRS121', subsystem: 'Received Signal Strength', unit: 'dBm' },
    { parameter: 'GDM122', subsystem: 'Demodulator Lock', unit: 'state' },
    { parameter: 'GBS123', subsystem: 'Bit Synchronization', unit: 'state' },
    { parameter: 'GCN124', subsystem: 'Carrier-to-Noise Density', unit: 'dB-Hz' },
    { parameter: 'GBE125', subsystem: 'Bit Error Rate', unit: 'BER' },
    { parameter: 'GFE126', subsystem: 'Frame Error Rate', unit: '%' },
    { parameter: 'GLM127', subsystem: 'Downlink Margin', unit: 'dB' },
    { parameter: 'GDR129', subsystem: 'Received TM Data Rate', unit: 'kbps' },

    // RF CONFIGURATION
    { parameter: 'GMO150', subsystem: 'Downlink Modulation', unit: 'state' },
    { parameter: 'GCD151', subsystem: 'Channel Coding', unit: 'state' },
    { parameter: 'GCF152', subsystem: 'Configured Downlink Frequency', unit: 'MHz' },
    { parameter: 'GCR153', subsystem: 'Received Carrier Frequency', unit: 'MHz' },
    { parameter: 'GRS149', subsystem: 'RF Switch Position', unit: 'state' },

    // RANGING / DOPPLER / TIME
    { parameter: 'GRA130', subsystem: 'Ranging Equipment', unit: 'state' },
    { parameter: 'GDP131', subsystem: 'Doppler Processor', unit: 'state' },
    { parameter: 'GFR132', subsystem: 'Frequency Reference Error', unit: 'ppb' },
    { parameter: 'GTR133', subsystem: 'Time Reference Offset', unit: 'µs' },

    // MONITORING / DATA PROCESSING
    { parameter: 'GSM134', subsystem: 'Spectrum Monitor Noise Floor', unit: 'dBm' },
    { parameter: 'GRR135', subsystem: 'RF Recorder', unit: 'state' },
    { parameter: 'GMC136', subsystem: 'Ground Station M&C', unit: 'state' },
    { parameter: 'GNG137', subsystem: 'Network Gateway Latency', unit: 'ms' },
    { parameter: 'GBP138', subsystem: 'Baseband Processor Load', unit: '%' },
    { parameter: 'GDE139', subsystem: 'Data Decryption Equipment', unit: 'state' },

    // TRANSMIT CHAIN
    { parameter: 'GTX145', subsystem: 'Ground Transmitter', unit: 'state' },
    { parameter: 'GTP146', subsystem: 'Transmitter RF Output Power', unit: 'W' },
    { parameter: 'GPA147', subsystem: 'Power Amplifier Current', unit: 'A' },

    // GROUND ENVIRONMENT / SUPPORT
    { parameter: 'GEU140', subsystem: 'Emergency Power Supply', unit: '%' },
    { parameter: 'GAT141', subsystem: 'Ambient Air Temperature', unit: '°C' },
    { parameter: 'GHU142', subsystem: 'Relative Humidity', unit: '%' },
    { parameter: 'GBP143', subsystem: 'Atmospheric Pressure', unit: 'hPa' },
    { parameter: 'GPR144', subsystem: 'Precipitation Rate', unit: 'mm/h' },
  ];

  const groundStationTelemetry = computed<TelemetryRow[]>(() => {
    const elevationValue = gs1DisplayedElevation.value === null ? 0 : gs1DisplayedElevation.value;
    const rxTemp = oscillation(34.5, 1.2, 11, 0.2);
    const antennaTemp = oscillation(6.5, 4.5, 15, 1.8);
    const paTemp = oscillation(46.0, 1.8, 13, 0.9);
    const modemTemp = oscillation(38.0, 1.1, 16, 2.1);
    const routerTemp = oscillation(36.5, 1.0, 19, 1.4);

    const gs1Online = !isScenario2.value || gs1ConnectionActive.value;

    // Local GS1 housekeeping remains available while the simulator is running.
    // gs1ConnectionActive represents the spacecraft RF link, not GS1 hardware health.
    const gs1GroundTelemetryAvailable = simulationStatus.value === 'RUNNING';

    // Spacecraft-to-GS1 RF link availability
    const tmVisible = gs1DownlinkAvailable.value && !scenario2TelemetryBlackout.value;

    const gs1Degrading =
      isScenario2.value &&
      scenario2WeakSignalWarning.value &&
      gs1ConnectionActive.value &&
      tmVisible;

    const beacon = !tmVisible
      ? 12
      : gs1Degrading
        ? oscillation(22, 3.0, 7, 0.5)
        : signalFiltered.value
          ? oscillation(86, 3.0, 9, 0.6)
          : oscillation(61, 6.0, 8, 0.4);

    const ebno = !tmVisible
      ? 1.8
      : gs1Degrading
        ? oscillation(1.5, 0.35, 8, 1.0)
        : signalFiltered.value
          ? oscillation(8.7, 0.4, 10, 0.1)
          : oscillation(5.2, 0.8, 12, 0.3);

    // -------------------------------------------------------------------------
    // GS1 SUPPLEMENTAL ENGINEERING TELEMETRY
    // READ-ONLY: does not modify simulation or procedure state.
    // -------------------------------------------------------------------------

    const gs1CarrierLocked =
      gs1Online && gs1DisplayedElevation.value !== null && gs1DisplayedElevation.value >= 5;

    const gs1AzEncoder =
      azimuth.value === null ? null : azimuth.value + Math.sin(missionSeconds.value / 7) * 0.012;

    const gs1ElEncoder =
      gs1DisplayedElevation.value === null
        ? null
        : gs1DisplayedElevation.value + Math.sin(missionSeconds.value / 8 + 0.8) * 0.01;

    const gs1AzError =
      gs1AzEncoder === null || azimuth.value === null ? 0 : gs1AzEncoder - azimuth.value;

    const gs1ElError =
      gs1ElEncoder === null || gs1DisplayedElevation.value === null
        ? 0
        : gs1ElEncoder - gs1DisplayedElevation.value;

    const gs1PointingError = Math.sqrt(gs1AzError * gs1AzError + gs1ElError * gs1ElError);

    const gs1AzDriveTemp = oscillation(31.5, 1.2, 18, 0.4) + passProgress.value * 1.3;

    const gs1ElDriveTemp = oscillation(32.8, 1.3, 17, 1.1) + passProgress.value * 1.5;

    const gs1RfFeedTemp = oscillation(24.5, 1.0, 20, 1.7);

    const gs1DiplexerTemp = oscillation(30.5, 0.8, 22, 0.6);

    const gs1DuplexerTemp = oscillation(31.2, 0.8, 23, 1.4);

    const gs1WaveguideTemp = oscillation(22.8, 1.2, 24, 2.0);

    const gs1LnaGain = 38.2 + Math.sin(missionSeconds.value / 20) * 0.15;

    // Received power improves as existing GSE001/beacon quality improves.
    const gs1Rssi = -116 + beacon * 0.31;

    // 64 kbps simulator TM channel:
    // C/N0 = Eb/N0 + 10 log10(bit rate)
    const gs1TmDataRateKbps = 64;

    const gs1Cn0 = ebno + 10 * Math.log10(gs1TmDataRateKbps * 1000);

    const gs1LinkMargin = ebno - 4.0;

    // Deliberately degraded before receiver filtering; clean after filtering.
    const gs1Ber = gs1Degrading
      ? 2.5e-3 + Math.abs(Math.sin(missionSeconds.value / 5)) * 1.5e-3
      : signalFiltered.value
        ? 1e-7 * Math.pow(10, -(ebno - 8.0) / 2)
        : 2e-4 * Math.pow(10, -(ebno - 5.0) / 1.5);

    const gs1FerPercent = Math.min(15, gs1Ber * 20000);

    const gs1DopplerOffset =
      gs1GeometryElevation.value === null
        ? 0
        : gs1MaxDopplerKHz * Math.cos(Math.PI * gs1GeometryProgress.value);

    const gs1ConfiguredFrequencyMHz = 2250.0;

    const gs1ReceivedFrequencyMHz = gs1ConfiguredFrequencyMHz + gs1DopplerOffset / 1000;

    const gs1FrequencyReferenceError = Math.sin(missionSeconds.value / 29) * 0.035;

    const gs1TimeReferenceOffset = Math.sin(missionSeconds.value / 27 + 0.6) * 0.18;

    const gs1SpectrumNoiseFloor = -128.5 + Math.sin(missionSeconds.value / 18 + 1.3) * 0.7;

    const gs1BasebandLoad = signalFiltered.value
      ? oscillation(43, 3, 17, 0.4)
      : oscillation(57, 4, 16, 0.9);

    const gs1NetworkLatency = oscillation(11.5, 1.8, 19, 1.2);

    const gs1AmbientTemperature = oscillation(16.5, 1.2, 45, 0.8);

    const gs1Humidity = oscillation(44, 3, 50, 1.5);

    const gs1Pressure = oscillation(1013, 2.0, 60, 0.4);

    const gs1Precipitation = 0;

    const gs1EmergencyPowerSoc = oscillation(98.0, 0.3, 80, 0.7);

    if (!gs1GroundTelemetryAvailable) {
      const noTelemetry = 'NO TELEMETRY';
      return [
        {
          parameter: 'GSA002',
          subsystem: 'Antenna Pedestal',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GSR104',
          subsystem: 'Receiver Chain',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GMD416',
          subsystem: 'Ground Modem',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GTR221',
          subsystem: 'TM Router',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GPA510',
          subsystem: 'Power Amplifier',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GLN118',
          subsystem: 'LNA Electronics',
          measurement: noTelemetry,
          unit: '°C',
          status: 'empty',
        },
        {
          parameter: 'GEL005',
          subsystem: 'Antenna Elevation',
          measurement: noTelemetry,
          unit: 'deg',
          status: 'empty',
        },
        {
          parameter: 'GAZ230',
          subsystem: 'Antenna Azimuth',
          measurement: noTelemetry,
          unit: 'deg',
          status: 'empty',
        },
        {
          parameter: 'GRN420',
          subsystem: 'Slant Range',
          measurement: noTelemetry,
          unit: 'km',
          status: 'empty',
        },
        {
          parameter: 'GWS308',
          subsystem: 'Outdoor Wind Sensor',
          measurement: noTelemetry,
          unit: 'm/s',
          status: 'empty',
        },
        {
          parameter: 'GDS740',
          subsystem: 'Doppler Offset',
          measurement: tmVisible ? gs1DopplerOffset.toFixed(1) : 'NO SIGNAL',
          unit: 'kHz',
          status: tmVisible ? 'good' : 'empty',
        },
        {
          parameter: 'GSN612',
          subsystem: 'Eb/N0',
          measurement: noTelemetry,
          unit: 'dB',
          status: 'empty',
        },
        {
          parameter: 'GSE001',
          subsystem: 'Signal Quality',
          measurement: noTelemetry,
          unit: '%',
          status: 'empty',
        },
        {
          parameter: 'GBL092',
          subsystem: 'Beacon Level',
          measurement: 'NO SIGNAL',
          unit: 'state',
          status: 'empty',
        },
        {
          parameter: 'GCL001',
          subsystem: 'Carrier Lock',
          measurement: noTelemetry,
          unit: 'state',
          status: 'empty',
        },
        {
          parameter: 'GFR128',
          subsystem: 'Frame Sync',
          measurement: !tmVisible
            ? 'NO LOCK'
            : !gs1CarrierLocked
              ? 'SEARCH'
              : gs1Degrading
                ? 'DEGRADED'
                : signalFiltered.value
                  ? 'VALID'
                  : 'DEGRADED',
          unit: 'state',
          status: !tmVisible
            ? 'empty'
            : !gs1CarrierLocked
              ? 'warning'
              : gs1Degrading
                ? 'bad'
                : signalFiltered.value
                  ? 'good'
                  : 'warning',
        },

        ...noTelemetryRows(groundStationSupplementalDefinition),
      ];
    }

    return [
      {
        parameter: 'GSA002',
        subsystem: 'Antenna Pedestal',
        measurement: antennaTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(antennaTemp, -8, 18, -20, 35),
      },
      {
        parameter: 'GSR104',
        subsystem: 'Receiver Chain',
        measurement: rxTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(rxTemp, 24, 45, 12, 56),
      },
      {
        parameter: 'GMD416',
        subsystem: 'Ground Modem',
        measurement: modemTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(modemTemp, 25, 45, 15, 55),
      },
      {
        parameter: 'GTR221',
        subsystem: 'TM Router',
        measurement: routerTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(routerTemp, 24, 46, 12, 58),
      },
      {
        parameter: 'GPA510',
        subsystem: 'Power Amplifier',
        measurement: paTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(paTemp, 32, 55, 18, 68),
      },
      {
        parameter: 'GLN118',
        subsystem: 'LNA Electronics',
        measurement: rxTemp.toFixed(1),
        unit: '°C',
        status: classifyTemperature(rxTemp, 22, 44, 10, 55),
      },
      {
        parameter: 'GEL005',
        subsystem: 'Antenna Elevation',
        measurement: gs1DisplayedElevation.value === null ? 'NO DATA' : elevationValue.toFixed(1),
        unit: 'deg',
        status: gs1DisplayedElevationClass.value.replace('status-', '') as TelemetryStatus,
      },
      {
        parameter: 'GAZ230',
        subsystem: 'Antenna Azimuth',
        measurement: azimuth.value === null ? 'NO DATA' : azimuth.value.toFixed(1),
        unit: 'deg',
        status: azimuth.value === null ? 'empty' : 'good',
      },
      {
        parameter: 'GRN420',
        subsystem: 'Slant Range',
        measurement: range.value === null ? 'NO DATA' : range.value.toFixed(0),
        unit: 'km',
        status: range.value === null ? 'empty' : 'good',
      },
      {
        parameter: 'GWS308',
        subsystem: 'Outdoor Wind Sensor',
        measurement: oscillation(3.8, 1.8, 14, 0.7).toFixed(1),
        unit: 'm/s',
        status: 'good',
      },
      {
        parameter: 'GDS740',
        subsystem: 'Doppler Offset',
        measurement: tmVisible ? oscillation(-1.2, 0.4, 15, 1.2).toFixed(1) : 'NO SIGNAL',
        unit: 'kHz',
        status: tmVisible ? 'good' : 'empty',
      },
      {
        parameter: 'GSN612',
        subsystem: 'Eb/N0',
        measurement: tmVisible ? ebno.toFixed(1) : 'NO SIGNAL',
        unit: 'dB',
        status: !tmVisible ? 'empty' : ebno >= 7 ? 'good' : ebno >= 5 ? 'warning' : 'bad',
      },
      {
        parameter: 'GSE001',
        subsystem: 'Signal Quality',
        measurement: tmVisible ? beacon.toFixed(0) : 'NO SIGNAL',
        unit: '%',
        status: tmVisible ? classifySignal(beacon) : 'empty',
      },
      {
        parameter: 'GBL092',
        subsystem: 'Beacon Level',
        measurement: tmVisible ? signalQuality.value : 'NO SIGNAL',
        unit: 'state',
        status: tmVisible ? (signalClass.value.replace('status-', '') as TelemetryStatus) : 'empty',
      },
      {
        parameter: 'GCL001',
        subsystem: 'Carrier Lock',
        measurement: tmVisible && gs1CarrierLocked ? 'LOCK' : 'NO LOCK',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GFR128',
        subsystem: 'Frame Sync',
        measurement: !tmVisible
          ? 'NO LOCK'
          : !gs1CarrierLocked
            ? 'SEARCH'
            : signalFiltered.value
              ? 'VALID'
              : 'DEGRADED',
        unit: 'state',
        status: !tmVisible
          ? 'empty'
          : !gs1CarrierLocked
            ? 'warning'
            : signalFiltered.value
              ? 'good'
              : 'warning',
      },

      // -----------------------------------------------------------------------
      // GS1 SUPPLEMENTAL LIVE TELEMETRY
      // -----------------------------------------------------------------------

      // ANTENNA / TRACKING

      {
        parameter: 'GAD101',
        subsystem: 'Azimuth Drive Motor',
        measurement: gs1AzDriveTemp.toFixed(1),
        unit: '°C',
        status: gs1AzDriveTemp <= 50 ? 'good' : gs1AzDriveTemp <= 60 ? 'warning' : 'bad',
      },
      {
        parameter: 'GED102',
        subsystem: 'Elevation Drive Motor',
        measurement: gs1ElDriveTemp.toFixed(1),
        unit: '°C',
        status: gs1ElDriveTemp <= 50 ? 'good' : gs1ElDriveTemp <= 60 ? 'warning' : 'bad',
      },
      {
        parameter: 'GAC103',
        subsystem: 'Antenna Control Unit',
        measurement: !tmVisible ? 'STANDBY' : gs1CarrierLocked ? 'TRACK' : 'ACQUIRE',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GAE104',
        subsystem: 'Azimuth Position Encoder',
        measurement: gs1AzEncoder === null ? 'NO DATA' : gs1AzEncoder.toFixed(2),
        unit: 'deg',
        status: gs1AzEncoder === null ? 'empty' : 'good',
      },
      {
        parameter: 'GEE105',
        subsystem: 'Elevation Position Encoder',
        measurement: gs1ElEncoder === null ? 'NO DATA' : gs1ElEncoder.toFixed(2),
        unit: 'deg',
        status: gs1ElEncoder === null ? 'empty' : 'good',
      },
      {
        parameter: 'GPE106',
        subsystem: 'Antenna Pointing Error',
        measurement:
          !tmVisible || gs1AzEncoder === null || gs1ElEncoder === null
            ? 'NO DATA'
            : gs1PointingError.toFixed(3),
        unit: 'deg',
        status:
          !tmVisible || gs1AzEncoder === null || gs1ElEncoder === null
            ? 'empty'
            : gs1PointingError <= 0.05
              ? 'good'
              : gs1PointingError <= 0.1
                ? 'warning'
                : 'bad',
      },

      // RF FRONT END

      {
        parameter: 'GRF107',
        subsystem: 'RF Feed Assembly',
        measurement: gs1RfFeedTemp.toFixed(1),
        unit: '°C',
        status: gs1RfFeedTemp >= -10 && gs1RfFeedTemp <= 50 ? 'good' : 'warning',
      },
      {
        parameter: 'GPN108',
        subsystem: 'Polarization Network',
        measurement: 'CONFIGURED',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GDP109',
        subsystem: 'Diplexer',
        measurement: gs1DiplexerTemp.toFixed(1),
        unit: '°C',
        status: gs1DiplexerTemp <= 55 ? 'good' : 'warning',
      },
      {
        parameter: 'GDX110',
        subsystem: 'Duplexer',
        measurement: gs1DuplexerTemp.toFixed(1),
        unit: '°C',
        status: gs1DuplexerTemp <= 55 ? 'good' : 'warning',
      },
      {
        parameter: 'GWG111',
        subsystem: 'Waveguide Network',
        measurement: gs1WaveguideTemp.toFixed(1),
        unit: '°C',
        status: gs1WaveguideTemp >= -15 && gs1WaveguideTemp <= 50 ? 'good' : 'warning',
      },
      {
        parameter: 'GLG119',
        subsystem: 'LNA Gain',
        measurement: gs1LnaGain.toFixed(1),
        unit: 'dB',
        status: gs1LnaGain >= 35 && gs1LnaGain <= 42 ? 'good' : 'warning',
      },

      // RECEIVER / BASEBAND

      {
        parameter: 'GRX120',
        subsystem: 'Receiver State',
        measurement: !tmVisible ? 'STANDBY' : gs1CarrierLocked ? 'TRACKING' : 'ACQUIRING',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GRS121',
        subsystem: 'Received Signal Strength',
        measurement: tmVisible ? gs1Rssi.toFixed(1) : 'NO SIGNAL',
        unit: 'dBm',
        status: !tmVisible
          ? 'empty'
          : gs1Rssi >= -95
            ? 'good'
            : gs1Rssi >= -105
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GDM122',
        subsystem: 'Demodulator Lock',
        measurement: !tmVisible ? 'NO LOCK' : gs1CarrierLocked ? 'LOCK' : 'SEARCH',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GBS123',
        subsystem: 'Bit Synchronization',
        measurement: !tmVisible ? 'NO LOCK' : gs1CarrierLocked ? 'LOCK' : 'SEARCH',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GCN124',
        subsystem: 'Carrier-to-Noise Density',
        measurement: tmVisible ? gs1Cn0.toFixed(1) : 'NO SIGNAL',
        unit: 'dB-Hz',
        status: !tmVisible ? 'empty' : gs1Cn0 >= 55 ? 'good' : gs1Cn0 >= 50 ? 'warning' : 'bad',
      },
      {
        parameter: 'GBE125',
        subsystem: 'Bit Error Rate',
        measurement: !tmVisible
          ? 'NO SIGNAL'
          : !gs1CarrierLocked
            ? 'NO DATA'
            : gs1Ber.toExponential(2),
        unit: 'BER',
        status:
          !tmVisible || !gs1CarrierLocked
            ? 'empty'
            : gs1Ber <= 1e-5
              ? 'good'
              : gs1Ber <= 1e-3
                ? 'warning'
                : 'bad',
      },
      {
        parameter: 'GFE126',
        subsystem: 'Frame Error Rate',
        measurement: !tmVisible
          ? 'NO SIGNAL'
          : !gs1CarrierLocked
            ? 'NO DATA'
            : gs1FerPercent.toFixed(3),
        unit: '%',
        status:
          !tmVisible || !gs1CarrierLocked
            ? 'empty'
            : gs1FerPercent <= 1
              ? 'good'
              : gs1FerPercent <= 5
                ? 'warning'
                : 'bad',
      },
      {
        parameter: 'GLM127',
        subsystem: 'Downlink Margin',
        measurement: tmVisible ? gs1LinkMargin.toFixed(1) : 'NO SIGNAL',
        unit: 'dB',
        status: !tmVisible
          ? 'empty'
          : gs1LinkMargin >= 3
            ? 'good'
            : gs1LinkMargin >= 0
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GDR129',
        subsystem: 'Received TM Data Rate',
        measurement: tmVisible && gs1CarrierLocked ? gs1TmDataRateKbps.toFixed(0) : '0',
        unit: 'kbps',
        status: tmVisible && gs1CarrierLocked ? 'good' : 'empty',
      },

      // RF CONFIGURATION

      {
        parameter: 'GMO150',
        subsystem: 'Downlink Modulation',
        measurement: 'BPSK',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GCD151',
        subsystem: 'Channel Coding',
        measurement: 'CCSDS RS+CONV',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GCF152',
        subsystem: 'Configured Downlink Frequency',
        measurement: gs1ConfiguredFrequencyMHz.toFixed(3),
        unit: 'MHz',
        status: 'good',
      },
      {
        parameter: 'GCR153',
        subsystem: 'Received Carrier Frequency',
        measurement: tmVisible ? gs1ReceivedFrequencyMHz.toFixed(6) : 'NO SIGNAL',
        unit: 'MHz',
        status: tmVisible ? 'good' : 'empty',
      },
      {
        parameter: 'GRS149',
        subsystem: 'RF Switch Position',
        measurement: 'RX',
        unit: 'state',
        status: 'good',
      },

      // RANGING / DOPPLER / TIME

      {
        parameter: 'GRA130',
        subsystem: 'Ranging Equipment',
        measurement: gs1CarrierLocked ? 'AVAILABLE' : 'STANDBY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GDP131',
        subsystem: 'Doppler Processor',
        measurement: !tmVisible ? 'STANDBY' : gs1CarrierLocked ? 'TRACKING' : 'SEARCH',
        unit: 'state',
        status: !tmVisible ? 'empty' : gs1CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GFR132',
        subsystem: 'Frequency Reference Error',
        measurement: gs1FrequencyReferenceError.toFixed(3),
        unit: 'ppb',
        status: Math.abs(gs1FrequencyReferenceError) <= 0.1 ? 'good' : 'warning',
      },
      {
        parameter: 'GTR133',
        subsystem: 'Time Reference Offset',
        measurement: gs1TimeReferenceOffset.toFixed(3),
        unit: 'µs',
        status: Math.abs(gs1TimeReferenceOffset) <= 1 ? 'good' : 'warning',
      },

      // MONITORING / DATA PROCESSING

      {
        parameter: 'GSM134',
        subsystem: 'Spectrum Monitor Noise Floor',
        measurement: gs1SpectrumNoiseFloor.toFixed(1),
        unit: 'dBm',
        status:
          gs1SpectrumNoiseFloor <= -120
            ? 'good'
            : gs1SpectrumNoiseFloor <= -115
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GRR135',
        subsystem: 'RF Recorder',
        measurement: tmVisible ? 'RECORDING' : 'STANDBY',
        unit: 'state',
        status: tmVisible ? 'good' : 'empty',
      },
      {
        parameter: 'GMC136',
        subsystem: 'Ground Station M&C',
        measurement: 'NOMINAL',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GNG137',
        subsystem: 'Network Gateway Latency',
        measurement: gs1NetworkLatency.toFixed(1),
        unit: 'ms',
        status: gs1NetworkLatency <= 30 ? 'good' : gs1NetworkLatency <= 60 ? 'warning' : 'bad',
      },
      {
        parameter: 'GBP138',
        subsystem: 'Baseband Processor Load',
        measurement: gs1BasebandLoad.toFixed(0),
        unit: '%',
        status: gs1BasebandLoad <= 75 ? 'good' : gs1BasebandLoad <= 90 ? 'warning' : 'bad',
      },
      {
        parameter: 'GDE139',
        subsystem: 'Data Decryption Equipment',
        measurement: 'READY',
        unit: 'state',
        status: 'good',
      },

      // TRANSMIT CHAIN
      // فقط وضعیت تجهیزات را نشان می‌دهد.
      // هیچ Uplink جدیدی ایجاد نمی‌کند.

      {
        parameter: 'GTX145',
        subsystem: 'Ground Transmitter',
        measurement: 'STANDBY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GTP146',
        subsystem: 'Transmitter RF Output Power',
        measurement: '0.0',
        unit: 'W',
        status: 'good',
      },
      {
        parameter: 'GPA147',
        subsystem: 'Power Amplifier Current',
        measurement: '0.8',
        unit: 'A',
        status: 'good',
      },

      // WEATHER / GROUND SUPPORT

      {
        parameter: 'GEU140',
        subsystem: 'Emergency Power Supply',
        measurement: gs1EmergencyPowerSoc.toFixed(1),
        unit: '%',
        status:
          gs1EmergencyPowerSoc >= 80 ? 'good' : gs1EmergencyPowerSoc >= 50 ? 'warning' : 'bad',
      },
      {
        parameter: 'GAT141',
        subsystem: 'Ambient Air Temperature',
        measurement: gs1AmbientTemperature.toFixed(1),
        unit: '°C',
        status: gs1AmbientTemperature >= -10 && gs1AmbientTemperature <= 40 ? 'good' : 'warning',
      },
      {
        parameter: 'GHU142',
        subsystem: 'Relative Humidity',
        measurement: gs1Humidity.toFixed(0),
        unit: '%',
        status: gs1Humidity >= 10 && gs1Humidity <= 90 ? 'good' : 'warning',
      },
      {
        parameter: 'GBP143',
        subsystem: 'Atmospheric Pressure',
        measurement: gs1Pressure.toFixed(0),
        unit: 'hPa',
        status: gs1Pressure >= 950 && gs1Pressure <= 1050 ? 'good' : 'warning',
      },
      {
        parameter: 'GPR144',
        subsystem: 'Precipitation Rate',
        measurement: gs1Precipitation.toFixed(1),
        unit: 'mm/h',
        status: gs1Precipitation <= 0.5 ? 'good' : gs1Precipitation <= 5 ? 'warning' : 'bad',
      },
    ];
  });

  const groundStation2Telemetry = computed<TelemetryRow[]>(() => {
    const elevationValue = gs2Elevation.value === null ? 0 : gs2Elevation.value;
    const linkReady = scenario2Gs2TelemetryLock.value;
    const gs2Online = isScenario2.value && simulationStatus.value === 'RUNNING';
    const trackingStarted =
      isScenario2.value &&
      scenario2Gs2TrackingStartSecond.value !== null &&
      missionSeconds.value >= scenario2Gs2TrackingStartSecond.value;
    const rxTemp = oscillation(33.2, 1.0, 12, 1.1);
    const antennaTemp = oscillation(4.8, 4.0, 16, 2.3);
    const paTemp = oscillation(44.6, 1.5, 14, 1.7);
    const modemTemp = oscillation(37.1, 1.0, 17, 2.8);
    const routerTemp = oscillation(35.8, 0.9, 20, 1.9);
    const beacon =
      scenario2Gs2SignalFiltered.value && linkReady
        ? oscillation(82, 3.5, 10, 1.2)
        : trackingStarted
          ? oscillation(54, 5.5, 9, 1.0)
          : 0;
    const ebno =
      scenario2Gs2SignalFiltered.value && linkReady
        ? oscillation(8.1, 0.4, 11, 0.8)
        : trackingStarted
          ? oscillation(4.9, 0.7, 13, 0.9)
          : 0;

    // -------------------------------------------------------------------------
    // GS2 SUPPLEMENTAL ENGINEERING TELEMETRY
    // READ-ONLY: uses existing Scenario 2 GS2 states only.
    // -------------------------------------------------------------------------

    const gs2CarrierLocked = trackingStarted && linkReady;

    const gs2AzEncoder =
      gs2Azimuth.value === null
        ? null
        : gs2Azimuth.value + Math.sin(missionSeconds.value / 7 + 0.9) * 0.014;

    const gs2ElEncoder =
      gs2Elevation.value === null
        ? null
        : gs2Elevation.value + Math.sin(missionSeconds.value / 8 + 1.5) * 0.011;

    const gs2AzError =
      gs2AzEncoder === null || gs2Azimuth.value === null ? 0 : gs2AzEncoder - gs2Azimuth.value;

    const gs2ElError =
      gs2ElEncoder === null || gs2Elevation.value === null ? 0 : gs2ElEncoder - gs2Elevation.value;

    const gs2PointingError = Math.sqrt(gs2AzError * gs2AzError + gs2ElError * gs2ElError);

    const gs2AzDriveTemp = oscillation(30.2, 1.1, 19, 1.0);

    const gs2ElDriveTemp = oscillation(31.4, 1.2, 18, 1.7);

    const gs2RfFeedTemp = oscillation(22.8, 1.0, 21, 2.0);

    const gs2DiplexerTemp = oscillation(29.3, 0.8, 23, 1.0);

    const gs2DuplexerTemp = oscillation(30.0, 0.8, 24, 1.7);

    const gs2WaveguideTemp = oscillation(21.0, 1.0, 25, 2.4);

    const gs2LnaGain = 39.0 + Math.sin(missionSeconds.value / 21 + 0.5) * 0.15;

    const gs2Rssi = trackingStarted ? -116 + beacon * 0.31 : -120;

    const gs2TmDataRateKbps = 64;

    const gs2Cn0 = trackingStarted ? ebno + 10 * Math.log10(gs2TmDataRateKbps * 1000) : 0;

    const gs2LinkMargin = trackingStarted ? ebno - 4.0 : -4;

    const gs2Ber = !trackingStarted
      ? 1
      : scenario2Gs2SignalFiltered.value && linkReady
        ? 1e-7 * Math.pow(10, -(ebno - 8.0) / 2)
        : 2e-4 * Math.pow(10, -(ebno - 5.0) / 1.5);

    const gs2FerPercent = !trackingStarted ? 100 : Math.min(15, gs2Ber * 20000);

    const gs2DopplerOffset =
      trackingStarted && gs2Elevation.value !== null
        ? gs2MaxDopplerKHz * Math.cos(Math.PI * gs2GeometryProgress.value)
        : 0;

    const gs2ConfiguredFrequencyMHz = 2250.0;

    const gs2ReceivedFrequencyMHz = gs2ConfiguredFrequencyMHz + gs2DopplerOffset / 1000;

    const gs2FrequencyReferenceError = Math.sin(missionSeconds.value / 31 + 0.6) * 0.03;

    const gs2TimeReferenceOffset = Math.sin(missionSeconds.value / 29 + 1.0) * 0.15;

    const gs2SpectrumNoiseFloor = -129.0 + Math.sin(missionSeconds.value / 20 + 1.8) * 0.6;

    const gs2BasebandLoad = !trackingStarted
      ? oscillation(22, 2, 20, 0.5)
      : scenario2Gs2SignalFiltered.value
        ? oscillation(42, 3, 18, 0.7)
        : oscillation(59, 4, 17, 1.1);

    const gs2NetworkLatency = oscillation(13.0, 2.0, 21, 1.5);

    const gs2AmbientTemperature = oscillation(13.8, 1.3, 48, 1.2);

    const gs2Humidity = oscillation(48, 3, 53, 2.0);

    const gs2Pressure = oscillation(1009, 2.2, 64, 0.8);

    const gs2Precipitation = 0;

    const gs2EmergencyPowerSoc = oscillation(97.5, 0.3, 85, 1.0);

    const rows: TelemetryRow[] = [
      {
        parameter: 'GSA002',
        subsystem: 'Antenna Pedestal',
        measurement: gs2Online ? antennaTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(antennaTemp, -8, 18, -20, 35) : 'empty',
      },
      {
        parameter: 'GSR104',
        subsystem: 'Receiver Chain',
        measurement: gs2Online ? rxTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(rxTemp, 24, 45, 12, 56) : 'empty',
      },
      {
        parameter: 'GMD416',
        subsystem: 'Ground Modem',
        measurement: gs2Online ? modemTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(modemTemp, 25, 45, 15, 55) : 'empty',
      },
      {
        parameter: 'GTR221',
        subsystem: 'TM Router',
        measurement: gs2Online ? routerTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(routerTemp, 24, 46, 12, 58) : 'empty',
      },
      {
        parameter: 'GPA510',
        subsystem: 'Power Amplifier',
        measurement: gs2Online ? paTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(paTemp, 32, 55, 18, 68) : 'empty',
      },
      {
        parameter: 'GLN118',
        subsystem: 'LNA Electronics',
        measurement: gs2Online ? rxTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? classifyTemperature(rxTemp, 22, 44, 10, 55) : 'empty',
      },
      {
        parameter: 'GEL005',
        subsystem: 'Antenna Elevation',
        measurement:
          trackingStarted && gs2Elevation.value !== null ? elevationValue.toFixed(1) : 'NO DATA',
        unit: 'deg',
        status:
          trackingStarted && gs2Elevation.value !== null
            ? (gs2ElevationClass.value.replace('status-', '') as TelemetryStatus)
            : 'empty',
      },
      {
        parameter: 'GAZ230',
        subsystem: 'Antenna Azimuth',
        measurement:
          trackingStarted && gs2Azimuth.value !== null ? gs2Azimuth.value.toFixed(1) : 'NO DATA',
        unit: 'deg',
        status: trackingStarted && gs2Azimuth.value !== null ? 'good' : 'empty',
      },
      {
        parameter: 'GRN420',
        subsystem: 'Slant Range',
        measurement:
          trackingStarted && gs2Range.value !== null ? gs2Range.value.toFixed(0) : 'NO DATA',
        unit: 'km',
        status: trackingStarted && gs2Range.value !== null ? 'good' : 'empty',
      },
      {
        parameter: 'GWS308',
        subsystem: 'Outdoor Wind Sensor',
        measurement: gs2Online ? oscillation(4.4, 1.5, 15, 1.4).toFixed(1) : 'NO DATA',
        unit: 'm/s',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GDS740',
        subsystem: 'Doppler Offset',
        measurement: !trackingStarted
          ? 'NO SIGNAL'
          : linkReady
            ? gs2DopplerOffset.toFixed(1)
            : 'SEARCH',
        unit: 'kHz',
        status: !trackingStarted ? 'empty' : linkReady ? 'good' : 'warning',
      },
      {
        parameter: 'GSN612',
        subsystem: 'Eb/N0',
        measurement: trackingStarted ? ebno.toFixed(1) : 'NO SIGNAL',
        unit: 'dB',
        status: trackingStarted ? (ebno >= 7 ? 'good' : ebno >= 5 ? 'warning' : 'bad') : 'empty',
      },
      {
        parameter: 'GS2SIG',
        subsystem: 'GS2 Signal Quality',
        measurement: trackingStarted ? beacon.toFixed(0) : 'NO SIGNAL',
        unit: '%',
        status: trackingStarted ? classifySignal(beacon) : 'empty',
      },
      {
        parameter: 'GBL092',
        subsystem: 'Beacon Level',
        measurement: trackingStarted ? gs2SignalQuality.value : 'NO SIGNAL',
        unit: 'state',
        status: trackingStarted
          ? (gs2SignalClass.value.replace('status-', '') as TelemetryStatus)
          : 'empty',
      },
      {
        parameter: 'GCL001',
        subsystem: 'Carrier Lock',
        measurement: linkReady ? 'LOCK' : 'NO LOCK',
        unit: 'state',
        status: !trackingStarted ? 'empty' : linkReady ? 'good' : 'warning',
      },
      {
        parameter: 'GFR128',
        subsystem: 'Frame Sync',
        measurement: !trackingStarted
          ? 'NO LOCK'
          : scenario2Gs2SignalFiltered.value && linkReady
            ? 'VALID'
            : 'SEARCH',
        unit: 'state',
        status: !trackingStarted
          ? 'empty'
          : scenario2Gs2SignalFiltered.value && linkReady
            ? 'good'
            : 'warning',
      },

      // -----------------------------------------------------------------------
      // GS2 SUPPLEMENTAL LIVE TELEMETRY
      // -----------------------------------------------------------------------

      // ANTENNA / TRACKING

      {
        parameter: 'GAD101',
        subsystem: 'Azimuth Drive Motor',
        measurement: gs2Online ? gs2AzDriveTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: !gs2Online
          ? 'empty'
          : gs2AzDriveTemp <= 50
            ? 'good'
            : gs2AzDriveTemp <= 60
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GED102',
        subsystem: 'Elevation Drive Motor',
        measurement: gs2Online ? gs2ElDriveTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: !gs2Online
          ? 'empty'
          : gs2ElDriveTemp <= 50
            ? 'good'
            : gs2ElDriveTemp <= 60
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GAC103',
        subsystem: 'Antenna Control Unit',
        measurement: !gs2Online
          ? 'NO DATA'
          : !trackingStarted
            ? 'STANDBY'
            : gs2CarrierLocked
              ? 'TRACK'
              : 'ACQUIRE',
        unit: 'state',
        status: !gs2Online ? 'empty' : 'good',
      },
      {
        parameter: 'GAE104',
        subsystem: 'Azimuth Position Encoder',
        measurement:
          !trackingStarted || gs2AzEncoder === null ? 'NO DATA' : gs2AzEncoder.toFixed(2),
        unit: 'deg',
        status: !trackingStarted || gs2AzEncoder === null ? 'empty' : 'good',
      },
      {
        parameter: 'GEE105',
        subsystem: 'Elevation Position Encoder',
        measurement:
          !trackingStarted || gs2ElEncoder === null ? 'NO DATA' : gs2ElEncoder.toFixed(2),
        unit: 'deg',
        status: !trackingStarted || gs2ElEncoder === null ? 'empty' : 'good',
      },
      {
        parameter: 'GPE106',
        subsystem: 'Antenna Pointing Error',
        measurement:
          !trackingStarted || gs2AzEncoder === null || gs2ElEncoder === null
            ? 'NO DATA'
            : gs2PointingError.toFixed(3),
        unit: 'deg',
        status:
          !trackingStarted || gs2AzEncoder === null || gs2ElEncoder === null
            ? 'empty'
            : gs2PointingError <= 0.05
              ? 'good'
              : gs2PointingError <= 0.1
                ? 'warning'
                : 'bad',
      },

      // RF FRONT END

      {
        parameter: 'GRF107',
        subsystem: 'RF Feed Assembly',
        measurement: gs2Online ? gs2RfFeedTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GPN108',
        subsystem: 'Polarization Network',
        measurement: gs2Online ? 'CONFIGURED' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GDP109',
        subsystem: 'Diplexer',
        measurement: gs2Online ? gs2DiplexerTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GDX110',
        subsystem: 'Duplexer',
        measurement: gs2Online ? gs2DuplexerTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GWG111',
        subsystem: 'Waveguide Network',
        measurement: gs2Online ? gs2WaveguideTemp.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GLG119',
        subsystem: 'LNA Gain',
        measurement: gs2Online ? gs2LnaGain.toFixed(1) : 'NO DATA',
        unit: 'dB',
        status: gs2Online ? 'good' : 'empty',
      },

      // RECEIVER / BASEBAND

      {
        parameter: 'GRX120',
        subsystem: 'Receiver State',
        measurement: !trackingStarted ? 'STANDBY' : gs2CarrierLocked ? 'TRACKING' : 'ACQUIRING',
        unit: 'state',
        status: !trackingStarted ? 'empty' : gs2CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GRS121',
        subsystem: 'Received Signal Strength',
        measurement: trackingStarted ? gs2Rssi.toFixed(1) : 'NO SIGNAL',
        unit: 'dBm',
        status: !trackingStarted
          ? 'empty'
          : gs2Rssi >= -95
            ? 'good'
            : gs2Rssi >= -105
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GDM122',
        subsystem: 'Demodulator Lock',
        measurement: !trackingStarted ? 'NO LOCK' : gs2CarrierLocked ? 'LOCK' : 'SEARCH',
        unit: 'state',
        status: !trackingStarted ? 'empty' : gs2CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GBS123',
        subsystem: 'Bit Synchronization',
        measurement: !trackingStarted ? 'NO LOCK' : gs2CarrierLocked ? 'LOCK' : 'SEARCH',
        unit: 'state',
        status: !trackingStarted ? 'empty' : gs2CarrierLocked ? 'good' : 'warning',
      },
      {
        parameter: 'GCN124',
        subsystem: 'Carrier-to-Noise Density',
        measurement: trackingStarted ? gs2Cn0.toFixed(1) : 'NO SIGNAL',
        unit: 'dB-Hz',
        status: !trackingStarted
          ? 'empty'
          : gs2Cn0 >= 55
            ? 'good'
            : gs2Cn0 >= 50
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GBE125',
        subsystem: 'Bit Error Rate',
        measurement: !trackingStarted
          ? 'NO SIGNAL'
          : !gs2CarrierLocked
            ? 'NO DATA'
            : gs2Ber.toExponential(2),
        unit: 'BER',
        status: !gs2CarrierLocked
          ? 'empty'
          : gs2Ber <= 1e-5
            ? 'good'
            : gs2Ber <= 1e-3
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GFE126',
        subsystem: 'Frame Error Rate',
        measurement: !trackingStarted
          ? 'NO SIGNAL'
          : !gs2CarrierLocked
            ? 'NO DATA'
            : gs2FerPercent.toFixed(3),
        unit: '%',
        status: !gs2CarrierLocked
          ? 'empty'
          : gs2FerPercent <= 1
            ? 'good'
            : gs2FerPercent <= 5
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GLM127',
        subsystem: 'Downlink Margin',
        measurement: trackingStarted ? gs2LinkMargin.toFixed(1) : 'NO SIGNAL',
        unit: 'dB',
        status: !trackingStarted
          ? 'empty'
          : gs2LinkMargin >= 3
            ? 'good'
            : gs2LinkMargin >= 0
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GDR129',
        subsystem: 'Received TM Data Rate',
        measurement: linkReady ? gs2TmDataRateKbps.toFixed(0) : '0',
        unit: 'kbps',
        status: linkReady ? 'good' : 'empty',
      },

      // RF CONFIGURATION

      {
        parameter: 'GMO150',
        subsystem: 'Downlink Modulation',
        measurement: gs2Online ? 'BPSK' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GCD151',
        subsystem: 'Channel Coding',
        measurement: gs2Online ? 'CCSDS RS+CONV' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GCF152',
        subsystem: 'Configured Downlink Frequency',
        measurement: gs2Online ? gs2ConfiguredFrequencyMHz.toFixed(3) : 'NO DATA',
        unit: 'MHz',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GCR153',
        subsystem: 'Received Carrier Frequency',
        measurement: linkReady ? gs2ReceivedFrequencyMHz.toFixed(6) : 'NO SIGNAL',
        unit: 'MHz',
        status: linkReady ? 'good' : 'empty',
      },
      {
        parameter: 'GRS149',
        subsystem: 'RF Switch Position',
        measurement: gs2Online ? 'RX' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },

      // RANGING / DOPPLER / TIME

      {
        parameter: 'GRA130',
        subsystem: 'Ranging Equipment',
        measurement: gs2CarrierLocked ? 'AVAILABLE' : 'STANDBY',
        unit: 'state',
        status: 'good',
      },
      {
        parameter: 'GDP131',
        subsystem: 'Doppler Processor',
        measurement: !trackingStarted ? 'STANDBY' : linkReady ? 'TRACKING' : 'SEARCH',
        unit: 'state',
        status: !trackingStarted ? 'empty' : linkReady ? 'good' : 'warning',
      },
      {
        parameter: 'GFR132',
        subsystem: 'Frequency Reference Error',
        measurement: gs2Online ? gs2FrequencyReferenceError.toFixed(3) : 'NO DATA',
        unit: 'ppb',
        status: !gs2Online
          ? 'empty'
          : Math.abs(gs2FrequencyReferenceError) <= 0.1
            ? 'good'
            : 'warning',
      },
      {
        parameter: 'GTR133',
        subsystem: 'Time Reference Offset',
        measurement: gs2Online ? gs2TimeReferenceOffset.toFixed(3) : 'NO DATA',
        unit: 'µs',
        status: !gs2Online ? 'empty' : Math.abs(gs2TimeReferenceOffset) <= 1 ? 'good' : 'warning',
      },

      // DATA PROCESSING

      {
        parameter: 'GSM134',
        subsystem: 'Spectrum Monitor Noise Floor',
        measurement: gs2Online ? gs2SpectrumNoiseFloor.toFixed(1) : 'NO DATA',
        unit: 'dBm',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GRR135',
        subsystem: 'RF Recorder',
        measurement: !trackingStarted ? 'STANDBY' : 'RECORDING',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GMC136',
        subsystem: 'Ground Station M&C',
        measurement: gs2Online ? 'NOMINAL' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GNG137',
        subsystem: 'Network Gateway Latency',
        measurement: gs2Online ? gs2NetworkLatency.toFixed(1) : 'NO DATA',
        unit: 'ms',
        status: !gs2Online
          ? 'empty'
          : gs2NetworkLatency <= 30
            ? 'good'
            : gs2NetworkLatency <= 60
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GBP138',
        subsystem: 'Baseband Processor Load',
        measurement: gs2Online ? gs2BasebandLoad.toFixed(0) : 'NO DATA',
        unit: '%',
        status: !gs2Online
          ? 'empty'
          : gs2BasebandLoad <= 75
            ? 'good'
            : gs2BasebandLoad <= 90
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GDE139',
        subsystem: 'Data Decryption Equipment',
        measurement: gs2Online ? 'READY' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },

      // TRANSMIT CHAIN

      {
        parameter: 'GTX145',
        subsystem: 'Ground Transmitter',
        measurement: gs2Online ? 'STANDBY' : 'NO DATA',
        unit: 'state',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GTP146',
        subsystem: 'Transmitter RF Output Power',
        measurement: gs2Online ? '0.0' : 'NO DATA',
        unit: 'W',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GPA147',
        subsystem: 'Power Amplifier Current',
        measurement: gs2Online ? '0.8' : 'NO DATA',
        unit: 'A',
        status: gs2Online ? 'good' : 'empty',
      },

      // WEATHER / SUPPORT

      {
        parameter: 'GEU140',
        subsystem: 'Emergency Power Supply',
        measurement: gs2Online ? gs2EmergencyPowerSoc.toFixed(1) : 'NO DATA',
        unit: '%',
        status: !gs2Online
          ? 'empty'
          : gs2EmergencyPowerSoc >= 80
            ? 'good'
            : gs2EmergencyPowerSoc >= 50
              ? 'warning'
              : 'bad',
      },
      {
        parameter: 'GAT141',
        subsystem: 'Ambient Air Temperature',
        measurement: gs2Online ? gs2AmbientTemperature.toFixed(1) : 'NO DATA',
        unit: '°C',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GHU142',
        subsystem: 'Relative Humidity',
        measurement: gs2Online ? gs2Humidity.toFixed(0) : 'NO DATA',
        unit: '%',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GBP143',
        subsystem: 'Atmospheric Pressure',
        measurement: gs2Online ? gs2Pressure.toFixed(0) : 'NO DATA',
        unit: 'hPa',
        status: gs2Online ? 'good' : 'empty',
      },
      {
        parameter: 'GPR144',
        subsystem: 'Precipitation Rate',
        measurement: gs2Online ? gs2Precipitation.toFixed(1) : 'NO DATA',
        unit: 'mm/h',
        status: gs2Online ? 'good' : 'empty',
      },
    ];

    return gs2Online ? rows : noTelemetryRows(rows);
  });

  return {
    groundStationTelemetry,
    groundStation2Telemetry,
  };
}
