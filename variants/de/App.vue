<script setup lang="ts">
  import { ref, computed, nextTick, watch } from 'vue';

  import { io } from 'socket.io-client';
  import { useAocsTelemetry } from './composables/useAocsTelemetry';
  import { useTcsTelemetry } from './composables/useTcsTelemetry';
  import { usePayloadTelemetry } from './composables/usePayloadTelemetry';
  import { useCdhTelemetry } from './composables/useCdhTelemetry';
  import { useGroundStationTelemetry } from './composables/useGroundStationTelemetry';
  import { useEpsTelemetry } from './composables/useEpsTelemetry';
  import AocsPanel from './components/subsystems/AocsPanel.vue';
  import TcsPanel from './components/subsystems/TcsPanel.vue';
  import PayloadPanel from './components/subsystems/PayloadPanel.vue';
  import CdhPanel from './components/subsystems/CdhPanel.vue';
  import ImagePanel from './components/subsystems/ImagePanel.vue';
  import GroundStationPanel from './components/subsystems/GroundStationPanel.vue';
  import EpsPanel from './components/subsystems/EpsPanel.vue';

  console.log('APP VUE IS RUNNING');

  type OperatorRole = 'SOM' | 'SOE' | 'SPACON';

  const urlParams = new URLSearchParams(window.location.search);
  const roleFromUrl = urlParams.get('role')?.toUpperCase();

  const operatorRole: OperatorRole =
    roleFromUrl === 'SOM' || roleFromUrl === 'SOE' || roleFromUrl === 'SPACON'
      ? roleFromUrl
      : 'SOE';

  console.log('OPERATOR ROLE:', operatorRole);

  const isSom = computed(() => operatorRole === 'SOM');
  const isSoe = computed(() => operatorRole === 'SOE');
  const isSpacon = computed(() => operatorRole === 'SPACON');

  console.log('OPERATOR ROLE:', operatorRole);

  const socketHost = window.location.hostname;

  const socket = io(`http://${socketHost}:3001`, {
    transports: ['websocket'],
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket server:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
  });

  socket.on('state-sync', (state) => {
    console.log('State received from server:', state);

    if (state && typeof state === 'object') {
      applySyncedState(state);
    }
  });

  const selectedScenario = ref('');
  const activePanel = ref('SOM');
  const isScenario2 = computed(() => selectedScenario.value === 'Scenario 2');
  const isElementaryScenario = computed(() => selectedScenario.value === 'Scenario 1 Elementary');
  const isElementaryAScenario = computed(
    () => selectedScenario.value === 'Scenario 1 Elementary A'
  );

  const pendingScenario = ref('');
  const introPhase = ref<'menu' | 'fade' | 'video'>('menu');
  const introVideoRef = ref<HTMLVideoElement | null>(null);

  const endingPhase = ref<'none' | 'fade' | 'video'>('none');
  const endVideoRef = ref<HTMLVideoElement | null>(null);

  const introAudioRef = ref<HTMLAudioElement | null>(null);
  const fomAudioRef = ref<HTMLAudioElement | null>(null);
  const startAudioRef = ref<HTMLAudioElement | null>(null);

  const audioUnlocked = ref(false);

  let introFadeInterval: number | undefined;
  let fomFadeInterval: number | undefined;

  const emergencyStep = ref<'summary' | 'contacts' | 'compose' | 'waiting'>('summary');
  const typedEmergencyMessage = ref('');
  const typingEmergencyMessage = ref(false);
  let emergencyTypingTimer: number | null = null;

  // Thermal model tuning: change these two values only to adjust EPS temperature rise after payload power increase.
  // Units: °C per simulation second.
  const scenario1PayloadPowerThermalRiseRate = 0.03;
  const scenario2PayloadPowerThermalRiseRate = 0.005;
  const lastPayloadPowerThermalSecond = ref(-1);

  const currentLosSecond = computed(() => {
    if (isScenario2.value && scenario2NewProcedureImported.value) return 1860; // T+31:00 after GS2 imaging window
    return passDuration;
  });

  const isLos = computed(() => {
    return missionSeconds.value >= currentLosSecond.value;
  });

  const nextAosTime = computed(() => {
    const nextAosSeconds = currentLosSecond.value + nextOrbitDelay;
    const remaining = Math.max(0, nextAosSeconds - missionSeconds.value);

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    return `T-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  const missionTimeClass = computed(() => {
    const t = missionSeconds.value;

    if (simulationStatus.value !== 'RUNNING') return '';

    if (!isScenario2.value) {
      if (t < 840) return 'blink-green'; // T+00:00 → T+13:59
      if (t < 900) return 'blink-warning'; // T+14:00 → T+14:59
      if (t < 1080) return 'blink-red'; // T+15:00 → T+17:59
      return ''; // T+18:00 and later
    }

    if (t < 1500) return 'blink-green'; // T+00:00 → T+24:59
    if (t < 1740) return 'blink-warning'; // T+25:00 → T+28:59
    if (t < 1860) return 'blink-red'; // T+29:00 → T+30:59
    return ''; // T+31:00 and later
  });

  const imagingClass = computed(() => {
    const t = missionSeconds.value;

    if (isScenario2.value && scenario2NewProcedureImported.value) {
      if (t >= 1800 && t < 1830) return 'blink-green';
      if (t >= 1830 && t < 1860) return 'blink-red';
      return '';
    }

    if (t >= 900 && t < 930) return 'blink-green';
    if (t >= 930 && t < 960) return 'blink-red';

    return '';
  });

  const imagingWindowLabel = computed(() => {
    if (isScenario2.value) {
      if (scenario2NewProcedureImported.value) {
        if (missionSeconds.value >= 1860) {
          return `Next AOS: ${nextAosTime.value}`;
        }

        return 'Frankfurt Imaging Window: T+30:00 → T+30:30';
      }

      return 'Test Imaging Window: T+15:00 → T+16:00';
    }

    return 'Frankfurt Imaging Window: T+15:00 → T+16:00';
  });

  const simulationStatus = ref('IDLE');
  const missionSeconds = ref(0);
  let timerId: number | undefined;

  const selectedCommand = ref('');
  const isArmed = ref(false);
  const isGoReady = ref(false);
  const resultStatus = ref('NO RESULT');
  const failedSomAction = ref('');
  const backConfirmVisible = ref(false);
  const backConfirmArmed = ref(false);
  const gncSuggestionModalVisible = ref(false);

  const elevationAskedBySom = ref(false);
  const elevationConfirmedBySom = ref(false);

  const signalQualityReportedBySom = ref(false);
  const signalFilterRequestedBySom = ref(false);
  const signalFiltered = ref(false);
  const signalVerifiedBySom = ref(false);

  const memoryAskedBeforeDumpBySom = ref(false);
  const memoryDumpAuthorizedBySom = ref(false);
  const memoryDumpRequestedBySom = ref(false);
  const memoryDumpStarted = ref(false);
  const memoryDumpComplete = ref(false);
  const memoryAskedAfterDumpBySom = ref(false);
  const memoryVerifiedBySom = ref(false);
  const payloadInstrumentModeReportedBySom = ref(false);
  const memoryUsed = ref(87);

  const epsAskedBySom = ref(false);
  const batteryStatusEvaluatedBySom = ref(false);
  const batteryEqualizationRequestedBySom = ref(false);
  const batteryEqualizationInProgress = ref(false);
  const batteryEqualizationComplete = ref(false);
  const batteryRecheckedBySom = ref(false);
  const powerStatusAskedBySom = ref(false);
  const powerSavingRequestedBySom = ref(false);
  const powerSavingModeInProgress = ref(false);
  const powerSavingTransitionSeconds = ref(0);
  const powerSavingModeActive = ref(false);
  const powerStatusVerifiedBySom = ref(false);
  const batteryEmergencyDowngraded = ref(false);
  const scenario2BatteryA = ref(96);
  const scenario2BatteryB = ref(3);
  const scenario2BatteryC = ref(5);
  const thermalValuesAskedBySom = ref(false);
  const epsMitigationRequestedBySom = ref(false);
  const payloadReductionCommandRequestedBySom = ref(false);
  const powerReducedBySpacon = ref(false);
  const epsAskedAfterMitigationBySom = ref(false);
  const epsConfirmedBySom = ref(false);
  const scenario2WeakSignalWarning = ref(false);
  const gs1ConnectionActive = ref(true);

  // Step 17: GS1 link degradation begins
  const gs1DegradationStartSecond = ref<number | null>(null);
  const gs1ElevationAtDegradation = ref(0);

  // Step 18: complete GS1 link loss
  const gs1LossStartSecond = ref<number | null>(null);

  // Tunable degradation profile
  const gs1DegradationFloorElevation = 6.0;
  const gs1DegradationTimeConstant = 45;
  const scenario2Gs1SignalCheckedBySom = ref(false);
  const scenario2Gs2ElevationConfirmedBySom = ref(false);
  const scenario2Gs2SignalQualityCheckedBySom = ref(false);
  const scenario2Gs2SignalFiltered = ref(false);
  const scenario2Gs2SignalVerifiedBySoe = ref(false);
  const scenario2Gs2TrackingStartSecond = ref<number | null>(null);
  const scenario2Gs2SignalFilterRequestedBySom = ref(false);
  const payloadPowerIncreaseRequestedBySom = ref(false);
  const cameraConfigurationRequestedBySom = ref(false);
  const imageCaptureRequestedBySom = ref(false);
  const spacecraftStandbyRequestedBySom = ref(false);
  const normalPayloadPowerIncreaseRequestedBySom = ref(false);
  const normalCameraConfigurationRequestedBySom = ref(false);
  const normalImageCaptureRequestedBySom = ref(false);

  const payloadPowerRaised = ref(false);
  const cameraConfigured = ref(false);
  const cameraVerifiedBySom = ref(false);
  const postPowerThermalReportedBySoe = ref(false);
  const imageTaken = ref(false);
  const spacecraftStandbyActive = ref(false);

  const thermalCoolingActive = ref(false);
  const powerReductionInProgress = ref(false);
  const powerIncreaseInProgress = ref(false);
  const payloadPowerLevel = ref(20);
  const epsTemperature = ref(84.5);

  const capturedImageName = ref('');
  const imageValidity = ref('NO IMAGE');
  const capturedImageCapturedAt = ref('');
  const capturedImageLocation = ref('');
  const capturedImageCoordinates = ref('');

  const tcHistory = ref<{ time: string; command: string; result: string }[]>([]);

  type TmLog = { time: string; message: string };
  const tmHistoryGS = ref<TmLog[]>([]);
  const tmHistoryEPS = ref<TmLog[]>([]);
  const tmHistoryAOCS = ref<TmLog[]>([]);
  const tmHistoryTCS = ref<TmLog[]>([]);
  const tmHistoryPayload = ref<TmLog[]>([]);
  const tmHistoryMemory = ref<TmLog[]>([]);
  let lastTmLogSecond = -1;

  type SpaconCommand = {
    subsystem: string;
    code: string;
    command: string;
    purpose: string;
    kind?: 'action' | 'parameter';
  };

  const gsTmMessages = [
    'GS-TM-1001 CADU_LOCK=1 RX_AGC=42.8dB FRAME=VALID',
    'GS-TM-1002 ANT_TRK=AUTO AZ_ERR=0.03 EL_ERR=0.02',
    'GS-TM-1003 S_BAND_CARRIER=LOCK EbNo=8.7dB',
    'GS-TM-1004 VC0_HK=ACTIVE VC1_SCI=IDLE',
    'GS-TM-1005 RANGING=ON DOPPLER=-1.2kHz',
    'GS-TM-1006 TM_ROUTE=SOE_CONSOLES PKT_RATE=42pps',
    'GS-TM-1007 RX_CHAIN=A LNA_TEMP=34.1C',
    'GS-TM-1008 FRAME_CNT=+128 CRC_ERR=0',
  ];

  const epsTmMessages = [
    'EPS-TM-2001 BUS28V=28.2V I_MAIN=12.4A',
    'EPS-TM-2002 BAT_SOC=94% BAT_TEMP=27.6C',
    'EPS-TM-2003 PCU_MODE=SUN PPT=TRACK',
    'EPS-TM-2004 PDU_CH03=ON I=1.8A',
    'EPS-TM-2005 SAW_X_TEMP=-6.4C SAW_Y_TEMP=-8.1C',
    'EPS-TM-2006 DCDC_A=OK TEMP=44.2C',
    'EPS-TM-2007 REG_A=ACTIVE CHG_I=2.1A',
    'EPS-TM-2008 LOAD_SHED=0 LCL_TRIP=0',
  ];

  const payloadTmMessages = [
    'PLD-TM-3001 CAM_HEAD=STBY TEMP=24.2C',
    'PLD-TM-3002 FPA_BIAS=STABLE ADC=4092',
    'PLD-TM-3003 GPS_SYNC=1 PPS_LOCK=1',
    'PLD-TM-3004 RAD_TEMP=-17.8C BAF_TEMP=-12.4C',
    'PLD-TM-3005 PLC_LOAD=37% MODE=STANDBY',
    'PLD-TM-3006 CMP_QUEUE=12 IMG_BUF=READY',
    'PLD-TM-3007 LENS_HTR=OFF TEMP=8.3C',
    'PLD-TM-3008 SCI_VC=IDLE PKT=VALID',
  ];

  const memoryTmMessages = [
    'MEM-TM-4001 SSR_A=ON TEMP=42.1C',
    'MEM-TM-4002 MEM_USED=87% RAW_PART=93%',
    'MEM-TM-4003 DLQ=STBY BUF=91%',
    'MEM-TM-4004 ECC_CORR=2 ECC_UNC=0',
    'MEM-TM-4005 HK_PART=32% IDX=VALID',
    'MEM-TM-4006 DUMP_PTR=0x04AF RATE=0Mbps',
    'MEM-TM-4007 PKT_LOSS=0 CHECKSUM=OK',
    'MEM-TM-4008 MMU_STATE=NOM SYNC=1',
  ];

  const spaconActionCommands: SpaconCommand[] = [
    {
      subsystem: 'Ground Station',
      code: 'GSA002',
      command: 'Antenna Track Hold',
      purpose: 'Maintain antenna pointing',
    },
    {
      subsystem: 'Ground Station',
      code: 'GEL005',
      command: 'Elevation Track Confirm',
      purpose: 'Confirm current elevation tracking',
    },
    {
      subsystem: 'Ground Station',
      code: 'GSR104',
      command: 'Receiver Chain Reset',
      purpose: 'Reset receiver chain',
    },
    {
      subsystem: 'Ground Station',
      code: 'GMD416',
      command: 'Modem Re-sync',
      purpose: 'Re-synchronize ground modem',
    },
    {
      subsystem: 'Ground Station',
      code: 'GTR221',
      command: 'Telemetry Router Verify',
      purpose: 'Verify TM routing',
    },
    {
      subsystem: 'Ground Station',
      code: 'GRG330',
      command: 'Ranging Tone Enable',
      purpose: 'Enable ranging tone',
    },
    {
      subsystem: 'Ground Station',
      code: 'GBL092',
      command: 'Beacon Level Verify',
      purpose: 'Verify beacon level',
    },
    {
      subsystem: 'Ground Station',
      code: 'GSE001',
      command: 'Filter Signal',
      purpose: 'Apply uplink/downlink signal filter',
    },
    {
      subsystem: 'Ground Station',
      code: 'GPA510',
      command: 'Power Amplifier Standby',
      purpose: 'Place PA in standby',
    },
    {
      subsystem: 'Ground Station',
      code: 'GLN118',
      command: 'LNA Gain Trim',
      purpose: 'Adjust low-noise amplifier gain',
    },
    {
      subsystem: 'Ground Station',
      code: 'GWS308',
      command: 'Wind Sensor Check',
      purpose: 'Check outdoor wind sensor',
    },
    {
      subsystem: 'Ground Station',
      code: 'GDS740',
      command: 'Doppler Search',
      purpose: 'Start Doppler search window',
    },

    {
      subsystem: 'EPS',
      code: 'BAT105',
      command: 'Battery Thermal Check',
      purpose: 'Check battery pack temperature',
    },
    {
      subsystem: 'EPS',
      code: 'BCH096',
      command: 'Battery Charge Verify',
      purpose: 'Verify battery charge',
    },
    {
      subsystem: 'EPS',
      code: 'BAT330',
      command: 'Battery Equalization Transfer',
      purpose: 'Redistribute charge from Battery A to Battery B/C',
    },
    {
      subsystem: 'EPS',
      code: 'BUS281',
      command: 'Bus Voltage Verify',
      purpose: 'Verify main bus voltage',
    },
    {
      subsystem: 'EPS',
      code: 'PCU447',
      command: 'PCU Load Balance',
      purpose: 'Balance power control unit load',
    },
    {
      subsystem: 'EPS',
      code: 'EPT014',
      command: 'Reduce Payload Power',
      purpose: 'Reduce payload power for thermal mitigation',
    },
    {
      subsystem: 'EPS',
      code: 'PDU331',
      command: 'PDU Channel Check',
      purpose: 'Check power distribution channel',
    },
    {
      subsystem: 'EPS',
      code: 'PWR740',
      command: 'Increase Payload Power',
      purpose: 'Raise payload power for imaging',
    },
    {
      subsystem: 'EPS',
      code: 'DCC208',
      command: 'Converter Trim',
      purpose: 'Trim DC/DC converter output',
    },
    {
      subsystem: 'EPS',
      code: 'REG512',
      command: 'Charge Regulator Check',
      purpose: 'Check battery charge regulator',
    },
    {
      subsystem: 'EPS',
      code: 'PSM001',
      command: 'Enter Power Saving Mode',
      purpose: 'Place spacecraft into power saving mode',
    },
    {
      subsystem: 'EPS',
      code: 'STB901',
      command: 'Spacecraft Standby Mode',
      purpose: 'Place spacecraft in standby mode to save power',
    },
    {
      subsystem: 'EPS',
      code: 'SAW022',
      command: 'Solar Array Thermal Check',
      purpose: 'Check external solar array temperature',
    },
    {
      subsystem: 'EPS',
      code: 'EPS603',
      command: 'Load Switch Check',
      purpose: 'Check LCL load switch state',
    },
    {
      subsystem: 'EPS',
      code: 'EPS717',
      command: 'Solar Array Current Check',
      purpose: 'Check solar array current',
    },

    {
      subsystem: 'Payload',
      code: 'CAM201',
      command: 'Camera Head Check',
      purpose: 'Check camera head',
    },
    {
      subsystem: 'Payload',
      code: 'PLD331',
      command: 'Payload Controller Reset',
      purpose: 'Reset payload controller',
    },
    {
      subsystem: 'Payload',
      code: 'SEN331',
      command: 'Sensor Bias Check',
      purpose: 'Check image sensor bias',
    },
    {
      subsystem: 'Payload',
      code: 'GPS112',
      command: 'GPS Receiver Sync',
      purpose: 'Synchronize GPS receiver',
    },
    {
      subsystem: 'Payload',
      code: 'RAD087',
      command: 'Radiator Check',
      purpose: 'Check payload radiator',
    },
    {
      subsystem: 'Payload',
      code: 'CAM000',
      command: 'Configure Camera',
      purpose: 'Configure camera for Frankfurt imaging',
    },
    {
      subsystem: 'Payload',
      code: 'OBF044',
      command: 'Baffle Thermal Check',
      purpose: 'Check optical baffle temperature',
    },
    {
      subsystem: 'Payload',
      code: 'LNS054',
      command: 'Lens Thermal Check',
      purpose: 'Check lens barrel temperature',
    },
    {
      subsystem: 'Payload',
      code: 'IMG901',
      command: 'Take Image',
      purpose: 'Capture target image',
    },
    {
      subsystem: 'Payload',
      code: 'CMP551',
      command: 'Compression Processor Check',
      purpose: 'Check compression processor load',
    },
    {
      subsystem: 'Payload',
      code: 'PLD620',
      command: 'Instrument Mode Verify',
      purpose: 'Verify payload mode',
    },
    {
      subsystem: 'Payload',
      code: 'PLD774',
      command: 'Detector Bias Standby',
      purpose: 'Place detector bias in standby',
    },

    {
      subsystem: 'C&DH',
      code: 'MEM404',
      command: 'Memory Controller Check',
      purpose: 'Check memory controller temperature',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM315',
      command: 'SSR Health Check',
      purpose: 'Check solid state recorder',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM110',
      command: 'Buffer Flush Standby',
      purpose: 'Prepare packet buffer',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM611',
      command: 'External Bay Check',
      purpose: 'Check external memory bay',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM332',
      command: 'Raw Partition Check',
      purpose: 'Check raw image partition',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM073',
      command: 'HK Partition Check',
      purpose: 'Check housekeeping partition',
    },
    { subsystem: 'C&DH', code: 'MEM221', command: 'Dump Memory', purpose: 'Dump payload memory' },
    {
      subsystem: 'C&DH',
      code: 'MEM806',
      command: 'Downlink Queue Check',
      purpose: 'Check downlink queue',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM009',
      command: 'ECC Counter Reset',
      purpose: 'Reset corrected ECC counter',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM318',
      command: 'Packet Loss Verify',
      purpose: 'Verify packet loss counter',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM504',
      command: 'File Index Verify',
      purpose: 'Verify file table index',
    },
    {
      subsystem: 'C&DH',
      code: 'MEM662',
      command: 'Dump Pointer Verify',
      purpose: 'Verify dump pointer',
    },
  ];

  const passDuration = 1020;
  const nextOrbitDelay = 1800; // 30 minutes until next AOS

  const maxElevation = 38;
  const gs1AosDelay = 60;
  const gs2AosDelayAfterGs1Los = 120;

  // ---------------------------------------------------------------------------
  // GROUND-PASS GEOMETRY REFERENCE MODEL
  // Generic simulator geometry — not flight-certified orbital data.
  // ---------------------------------------------------------------------------

  const earthRadiusKm = 6378;
  const simulatedOrbitAltitudeKm = 500;

  // GS1 pass direction
  const gs1AosAzimuthDeg = 230;
  const gs1LosAzimuthDeg = 70;

  // S-band LEO-style bounded Doppler envelope
  const gs1MaxDopplerKHz = 45;

  function clamp01(value: number) {
    return Math.min(1, Math.max(0, value));
  }

  function smoothstep01(value: number) {
    const x = clamp01(value);
    return x * x * (3 - 2 * x);
  }

  function slantRangeFromElevation(elevationDeg: number) {
    const elevationRad = (elevationDeg * Math.PI) / 180;

    const orbitalRadiusKm = earthRadiusKm + simulatedOrbitAltitudeKm;

    const horizontalComponent = earthRadiusKm * Math.cos(elevationRad);

    const rangeKm =
      -earthRadiusKm * Math.sin(elevationRad) +
      Math.sqrt(orbitalRadiusKm * orbitalRadiusKm - horizontalComponent * horizontalComponent);

    return rangeKm;
  }

  const gs1AosReached = computed(() => {
    return simulationStatus.value === 'RUNNING' && missionSeconds.value >= gs1AosDelay;
  });

  const gs1AosCountdown = computed(() => {
    if (simulationStatus.value !== 'RUNNING') {
      return 'GS1: WAITING FOR SIMULATION START';
    }

    // Initial GS1 AOS countdown
    if (!gs1AosReached.value) {
      const remaining = Math.max(0, gs1AosDelay - missionSeconds.value);

      const minutes = Math.floor(remaining / 60);

      const seconds = remaining % 60;

      return `GS1 AOS IN: T-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Scenario 2: GS1 link is degrading after Step 17
    if (isScenario2.value && scenario2WeakSignalWarning.value && gs1ConnectionActive.value) {
      return 'GS1: LINK DEGRADING / LOS IMMINENT';
    }

    // Scenario 2: GS1 lost, waiting for GS2 AOS
    if (isScenario2.value && !gs1ConnectionActive.value) {
      if (scenario2Gs2TrackingStartSecond.value === null) {
        return 'GS1: LINK LOST / GS2 AOS PENDING';
      }

      const remaining = Math.max(0, scenario2Gs2TrackingStartSecond.value - missionSeconds.value);

      if (remaining > 0) {
        const minutes = Math.floor(remaining / 60);

        const seconds = remaining % 60;

        return `GS1: LINK LOST / GS2 AOS IN: T-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      }

      return 'GS2: PASS ACTIVE / AOS ACQUIRED';
    }

    return 'GS1: PASS ACTIVE / AOS ACQUIRED';
  });

  const gs1AosClass = computed(() => {
    if (simulationStatus.value !== 'RUNNING') {
      return 'status-empty';
    }

    if (!gs1AosReached.value) {
      return 'status-warning';
    }

    if (isScenario2.value && scenario2WeakSignalWarning.value && gs1ConnectionActive.value) {
      return 'status-bad';
    }

    if (
      isScenario2.value &&
      !gs1ConnectionActive.value &&
      scenario2Gs2TrackingStartSecond.value !== null &&
      missionSeconds.value < scenario2Gs2TrackingStartSecond.value
    ) {
      return 'status-warning';
    }

    return 'status-good';
  });

  const timeToLOSClass = computed(() => {
    const remaining = currentLosSecond.value - missionSeconds.value;

    if (remaining < 120) return 'status-bad'; // < 2 min
    if (remaining < 300) return 'status-warning'; // < 5 min
    return 'status-good';
  });

  const gs1PassSecond = computed(() => {
    if (simulationStatus.value !== 'RUNNING') return 0;
    return Math.max(0, missionSeconds.value - gs1AosDelay);
  });

  const passProgress = computed(() => {
    if (gs1PassSecond.value <= 0) return 0;
    if (gs1PassSecond.value >= passDuration) return 1;
    return gs1PassSecond.value / passDuration;
  });

  const nominalGs1Elevation = computed(() => {
    if (simulationStatus.value !== 'RUNNING') return null;
    if (missionSeconds.value < gs1AosDelay) return null;
    if (isLos.value) return 0;
    return Number((Math.sin(Math.PI * passProgress.value) * maxElevation).toFixed(1));
  });

  const elevation = computed(() => {
    if (simulationStatus.value !== 'RUNNING') return null;
    if (missionSeconds.value < gs1AosDelay) return null;

    return nominalGs1Elevation.value;
  });

  const gs1GeometryElevation = computed(() => {
    if (elevation.value === null) return null;

    if (!isScenario2.value || gs1DegradationStartSecond.value === null) {
      return elevation.value;
    }

    const elapsed = Math.max(0, missionSeconds.value - gs1DegradationStartSecond.value);

    const startElevation = Math.max(0, gs1ElevationAtDegradation.value);

    const floorElevation = Math.min(gs1DegradationFloorElevation, startElevation);

    const degradedElevation =
      floorElevation +
      (startElevation - floorElevation) * Math.exp(-elapsed / gs1DegradationTimeConstant);

    return Number(degradedElevation.toFixed(1));
  });

  const gs1GeometryProgress = computed(() => {
    if (gs1GeometryElevation.value === null) {
      return 0;
    }

    if (!isScenario2.value || gs1DegradationStartSecond.value === null) {
      return passProgress.value;
    }

    const degradationStartProgress = clamp01(
      (gs1DegradationStartSecond.value - gs1AosDelay) / passDuration
    );

    const startElevation = Math.max(0, gs1ElevationAtDegradation.value);

    const floorElevation = Math.min(gs1DegradationFloorElevation, startElevation);

    if (startElevation <= floorElevation + 0.001) {
      return degradationStartProgress;
    }

    const remainingFraction = clamp01(
      (gs1GeometryElevation.value - floorElevation) / (startElevation - floorElevation)
    );

    const degradationProgress = 1 - remainingFraction;

    return clamp01(degradationStartProgress + (1 - degradationStartProgress) * degradationProgress);
  });

  const azimuth = computed(() => {
    if (simulationStatus.value !== 'RUNNING') return null;
    if (
      isScenario2.value &&
      scenario2Gs2TrackingStartSecond.value !== null &&
      missionSeconds.value >= scenario2Gs2TrackingStartSecond.value
    ) {
      return null;
    }
    if (missionSeconds.value < gs1AosDelay) return null;
    if (isLos.value) return null;
    if (gs1GeometryElevation.value === null) return null;

    const geometryPhase = smoothstep01(gs1GeometryProgress.value);

    const azimuthDeg = gs1AosAzimuthDeg + (gs1LosAzimuthDeg - gs1AosAzimuthDeg) * geometryPhase;

    return Number(azimuthDeg.toFixed(1));
  });

  const range = computed(() => {
    if (simulationStatus.value !== 'RUNNING') return null;
    if (
      isScenario2.value &&
      scenario2Gs2TrackingStartSecond.value !== null &&
      missionSeconds.value >= scenario2Gs2TrackingStartSecond.value
    ) {
      return null;
    }
    if (missionSeconds.value < gs1AosDelay) return null;
    if (isLos.value) return null;
    if (gs1GeometryElevation.value === null) return null;

    return Number(slantRangeFromElevation(gs1GeometryElevation.value).toFixed(0));
  });

  const timeToLOS = computed(() => {
    const remaining = Math.max(0, currentLosSecond.value - missionSeconds.value);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `T-${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  const elevationClass = computed(() => {
    if (elevation.value === null) return 'status-empty';
    if (isLos.value) return 'status-bad';
    if (elevation.value < 3) return 'status-bad';
    if (elevation.value < 5) return 'status-warning';
    if (elevation.value <= 45) return 'status-good';
    return 'status-warning';
  });

  const signalQuality = computed(() => {
    if (isScenario2.value && (!gs1ConnectionActive.value || scenario2WeakSignalWarning.value)) {
      return 'BAD';
    }

    if (elevation.value === null) return 'NO SIGNAL';
    if (elevation.value < 3) return 'BAD';
    if (elevation.value < 5) return 'MEDIUM';
    if (!signalFiltered.value) return 'MEDIUM';

    return 'GOOD';
  });
  const signalClass = computed(() => {
    if (signalQuality.value === 'GOOD') return 'status-good';
    if (signalQuality.value === 'MEDIUM') return 'status-warning';
    return 'status-bad';
  });

  const gs2PassDuration = passDuration;

  const gs2MaxElevation = 85;

  const gs2SlowDescentStartElevation = 30;
  const gs2SlowDescentRate = 0.01;

  // GS2 pass direction
  const gs2AosAzimuthDeg = 188;
  const gs2LosAzimuthDeg = 42;

  const gs2MaxDopplerKHz = 48;

  const gs2PassProgress = computed(() => {
    if (!isScenario2.value || scenario2Gs2TrackingStartSecond.value === null) {
      return 0;
    }

    const elapsed = missionSeconds.value - scenario2Gs2TrackingStartSecond.value;

    if (elapsed <= 0) return 0;
    if (elapsed >= gs2PassDuration) return 1;

    return elapsed / gs2PassDuration;
  });

  const gs2Elevation = computed(() => {
    if (!isScenario2.value) return null;

    if (scenario2Gs2TrackingStartSecond.value === null) {
      return 0;
    }

    const elapsed = missionSeconds.value - scenario2Gs2TrackingStartSecond.value;

    if (elapsed <= 0) return 0;

    const sineElevation = Math.sin(Math.PI * gs2PassProgress.value) * gs2MaxElevation;

    if (gs2PassProgress.value <= 0.5 || sineElevation >= gs2SlowDescentStartElevation) {
      return Number(sineElevation.toFixed(1));
    }

    const slowDescentStartProgress =
      1 - Math.asin(gs2SlowDescentStartElevation / gs2MaxElevation) / Math.PI;

    const slowDescentStartElapsed = slowDescentStartProgress * gs2PassDuration;

    const slowDescentElapsed = Math.max(0, elapsed - slowDescentStartElapsed);

    return Number(
      Math.max(0, gs2SlowDescentStartElevation - slowDescentElapsed * gs2SlowDescentRate).toFixed(1)
    );
  });

  const gs2GeometryProgress = computed(() => {
    if (!isScenario2.value || scenario2Gs2TrackingStartSecond.value === null) {
      return 0;
    }

    if (gs2Elevation.value === null) {
      return 0;
    }

    // Ascending half: normal pass timing.
    if (gs2PassProgress.value <= 0.5) {
      return gs2PassProgress.value;
    }

    // Normal descending section above 30 degrees.
    if (gs2Elevation.value >= gs2SlowDescentStartElevation) {
      return gs2PassProgress.value;
    }

    // Artificial slow-descent section:
    // derive geometry phase directly from the actual displayed elevation.
    const normalizedElevation = clamp01(gs2Elevation.value / gs2MaxElevation);

    return clamp01(1 - Math.asin(normalizedElevation) / Math.PI);
  });

  const gs2Azimuth = computed(() => {
    if (!isScenario2.value) return null;

    if (
      scenario2Gs2TrackingStartSecond.value === null ||
      missionSeconds.value < scenario2Gs2TrackingStartSecond.value
    ) {
      return null;
    }

    const geometryPhase = smoothstep01(gs2GeometryProgress.value);

    const azimuthDeg = gs2AosAzimuthDeg + (gs2LosAzimuthDeg - gs2AosAzimuthDeg) * geometryPhase;

    return Number(azimuthDeg.toFixed(1));
  });

  const gs2Range = computed(() => {
    if (!isScenario2.value) return null;

    if (
      scenario2Gs2TrackingStartSecond.value === null ||
      missionSeconds.value < scenario2Gs2TrackingStartSecond.value
    ) {
      return null;
    }

    if (gs2Elevation.value === null) {
      return null;
    }

    return Number(slantRangeFromElevation(gs2Elevation.value).toFixed(0));
  });

  const scenario2TelemetryBlackout = computed(() => {
    return (
      isScenario2.value &&
      !gs1ConnectionActive.value &&
      (!gs2Elevation.value || gs2Elevation.value < 5)
    );
  });

  const scenario2Gs2TelemetryLock = computed(() => {
    return (
      isScenario2.value &&
      !gs1ConnectionActive.value &&
      gs2Elevation.value !== null &&
      gs2Elevation.value >= 5
    );
  });

  const gs1DownlinkAvailable = computed(() => {
    return (
      simulationStatus.value === 'RUNNING' &&
      elevation.value !== null &&
      !isLos.value &&
      (!isScenario2.value || gs1ConnectionActive.value)
    );
  });

  const spacecraftTelemetryAvailable = computed(() => {
    return gs1DownlinkAvailable.value || scenario2Gs2TelemetryLock.value;
  });

  const { cdhTelemetry } = useCdhTelemetry({
    missionSeconds,
    spacecraftTelemetryAvailable,
    scenario2TelemetryBlackout,

    memoryUsed,
    memoryDumpStarted,
    memoryDumpComplete,
    imageTaken,
    tcHistory,
  });

  const { tcsTelemetry } = useTcsTelemetry({
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
  });

  const gs2ElevationClass = computed(() => {
    if (gs2Elevation.value === null) return 'status-empty';
    if (gs2Elevation.value < 3) return 'status-bad';
    if (gs2Elevation.value < 5) return 'status-warning';
    return 'status-good';
  });

  const gs2SignalQuality = computed(() => {
    if (gs2Elevation.value === null) return 'NO SIGNAL';
    if (gs2Elevation.value < 3) return 'BAD';
    if (gs2Elevation.value < 5) return 'MEDIUM';
    if (!scenario2Gs2SignalFiltered.value) return 'MEDIUM';
    return 'GOOD';
  });

  const gs2SignalClass = computed(() => {
    if (gs2SignalQuality.value === 'GOOD') return 'status-good';
    if (gs2SignalQuality.value === 'MEDIUM') return 'status-warning';
    return 'status-bad';
  });

  function addTmLog(history: typeof tmHistoryGS, messages: string[], offset: number) {
    const index = (missionSeconds.value + offset) % messages.length;
    history.value.unshift({ time: missionTime.value, message: messages[index] });
    if (history.value.length > 12) history.value.pop();
  }

  function addTelemetryRowTmLog(
    history: typeof tmHistoryGS,
    telemetry: {
      parameter: string;
      subsystem: string;
      measurement: string;
      unit: string;
      status: string;
    }[],
    offset: number
  ) {
    const availableRows = telemetry.filter(
      (row) =>
        row.measurement !== 'NO TELEMETRY' &&
        row.measurement !== 'NO DATA' &&
        row.measurement !== 'NO SIGNAL'
    );

    if (availableRows.length === 0) return;

    const index = (missionSeconds.value + offset) % availableRows.length;

    const row = availableRows[index];

    const unitText = row.unit && row.unit !== 'state' && row.unit !== '-' ? ` ${row.unit}` : '';

    const message = `${row.parameter} ` + `${row.subsystem}=` + `${row.measurement}${unitText}`;

    history.value.unshift({
      time: missionTime.value,
      message,
    });

    if (history.value.length > 12) {
      history.value.pop();
    }
  }

  function updateSubsystemTmLogs() {
    if (simulationStatus.value !== 'RUNNING') return;
    if (missionSeconds.value === lastTmLogSecond) return;

    const gs1TmLock =
      gs1DisplayedElevation.value !== null &&
      gs1DisplayedElevation.value >= 5 &&
      !isLos.value &&
      gs1ConnectionActive.value;
    const gs2TmLock = scenario2Gs2TelemetryLock.value;

    if (!gs1TmLock && !gs2TmLock) return;

    lastTmLogSecond = missionSeconds.value;

    addTmLog(tmHistoryGS, gsTmMessages, gs2TmLock ? 1 : 0);
    addTmLog(tmHistoryEPS, epsTmMessages, 2);

    addTelemetryRowTmLog(tmHistoryAOCS, aocsTelemetry.value, 3);

    addTelemetryRowTmLog(tmHistoryTCS, tcsTelemetry.value, 5);

    addTmLog(tmHistoryPayload, payloadTmMessages, 4);
    addTmLog(tmHistoryMemory, memoryTmMessages, 6);
  }

  const epsTemperatureClass = computed(() => {
    if (epsTemperature.value > 90) return 'status-bad';
    if (epsTemperature.value >= 70 && epsTemperature.value <= 75) return 'status-good';
    return 'status-warning';
  });

  const netPower = computed(() => {
    if (isScenario2.value) {
      const scenario2BaselinePower = 1160;

      if (powerIncreaseInProgress.value || payloadPowerRaised.value) {
        const increaseProgress = Math.min(1, Math.max(0, (payloadPowerLevel.value - 10) / 170));
        return Number((1130 + increaseProgress * 40).toFixed(0));
      }

      if (
        powerReducedBySpacon.value ||
        powerReductionInProgress.value ||
        thermalCoolingActive.value
      ) {
        return 1130;
      }

      if (powerSavingModeActive.value) {
        return scenario2BaselinePower - 20;
      }

      return scenario2BaselinePower;
    }

    const scenario1BaselinePower = 1160;
    const scenario1MitigationPower = 1130;

    // Scenario 1 uses NET118 as an operational power-margin indicator.
    // Do not subtract the raw PWR740 bus value here; otherwise raising PWR740 to
    // imaging power incorrectly drives NET118 down to 1000 W.
    if (powerIncreaseInProgress.value || payloadPowerRaised.value) {
      const increaseProgress = Math.min(1, Math.max(0, (payloadPowerLevel.value - 10) / 170));
      return Number((scenario1MitigationPower + increaseProgress * 30).toFixed(0));
    }

    if (
      powerReducedBySpacon.value ||
      powerReductionInProgress.value ||
      thermalCoolingActive.value
    ) {
      return scenario1MitigationPower;
    }

    return scenario1BaselinePower;
  });

  const batteryLevel = computed(() => {
    const drain = Math.floor(missionSeconds.value / 140);
    const extra = payloadPowerRaised.value ? 2 : 0;
    return Math.max(70, 96 - drain - extra);
  });

  const batteryA = computed(() =>
    isScenario2.value ? scenario2BatteryA.value : batteryLevel.value
  );
  const batteryB = computed(() =>
    isScenario2.value ? scenario2BatteryB.value : batteryLevel.value
  );
  const batteryC = computed(() =>
    isScenario2.value ? scenario2BatteryC.value : batteryLevel.value
  );
  const scenario2BatteryNominal = computed(
    () => batteryA.value > 50 && batteryB.value > 50 && batteryC.value > 50
  );
  const scenario2BatteryNonNominal = computed(
    () => batteryA.value < 30 || batteryB.value < 30 || batteryC.value < 30
  );
  const scenario2BatteryDanger = computed(
    () => batteryA.value < 20 || batteryB.value < 20 || batteryC.value < 20
  );
  const scenario2BatteryCritical = computed(
    () => batteryA.value < 10 || batteryB.value < 10 || batteryC.value < 10
  );
  const emergencyActive = computed(
    () =>
      isScenario2.value &&
      batteryStatusEvaluatedBySom.value &&
      (scenario2BatteryDanger.value ||
        scenario2NewProcedureImported.value ||
        batteryEmergencyDowngraded.value)
  );
  const emergencyLevelClass = computed(() =>
    scenario2BatteryCritical.value
      ? 'blink-red'
      : batteryEmergencyDowngraded.value
        ? 'blink-warning'
        : 'blink-red'
  );
  const emergencyLevelText = computed(() =>
    scenario2BatteryCritical.value
      ? 'NOTFALLSITUATION'
      : batteryEmergencyDowngraded.value
        ? 'WARNUNG'
        : 'NOTFALLSITUATION'
  );

  const emergencyModalVisible = ref(false);
  const emergencyContactListOpen = ref(false);
  const selectedEmergencyContact = ref('');
  const emergencyMessageSent = ref(false);
  const gncWaitingForResponse = ref(false);
  const gncResponseNegative = ref(false);
  const gncProcedureSuggested = ref(false);
  const scenario2NewProcedureImported = ref(false);
  const { aocsTelemetry } = useAocsTelemetry({
    missionSeconds,
    spacecraftTelemetryAvailable,
    isScenario2,
    scenario2NewProcedureImported,
  });
  const { payloadTelemetry } = usePayloadTelemetry({
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
  });
  const procedureImporting = ref(false);
  const emergencyEventCode = 'OPS-EMG-EPS-01';
  const emergencyMessageText = computed(
    () =>
      `${emergencyEventCode}: Kritische Batterieentladung erkannt. GNC-Freigabe für eine Lageänderung anfordern, um die Ladeausrichtung der Solar Arrays zu verbessern.`
  );
  const emergencyContacts = [
    { role: 'GNC', name: 'GNC-Konsole / Attitude Dynamics', priority: true },
    { role: 'Flight Director', name: 'FD-Konsole / Mission Authority', priority: false },
    { role: 'EPS', name: 'EPS-Subsystem-Ingenieur', priority: false },
    { role: 'Thermal', name: 'Thermal-Control-Ingenieur', priority: false },
    { role: 'Ground Segment', name: 'Ground-Operations-Koordinator', priority: false },
  ];

  const syncedState = {
    endingPhase,

    emergencyStep,

    typedEmergencyMessage,
    typingEmergencyMessage,

    simulationStatus,
    missionSeconds,

    selectedCommand,
    isArmed,
    isGoReady,
    resultStatus,
    failedSomAction,
    backConfirmVisible,
    backConfirmArmed,
    gncSuggestionModalVisible,

    elevationAskedBySom,
    elevationConfirmedBySom,

    signalQualityReportedBySom,
    signalFilterRequestedBySom,
    signalFiltered,
    signalVerifiedBySom,

    memoryAskedBeforeDumpBySom,
    memoryDumpAuthorizedBySom,
    memoryDumpRequestedBySom,
    memoryDumpStarted,
    memoryDumpComplete,
    memoryAskedAfterDumpBySom,
    memoryVerifiedBySom,
    payloadInstrumentModeReportedBySom,
    memoryUsed,

    epsAskedBySom,
    batteryStatusEvaluatedBySom,
    batteryEqualizationRequestedBySom,
    batteryEqualizationInProgress,
    batteryEqualizationComplete,
    batteryRecheckedBySom,
    powerStatusAskedBySom,
    powerSavingRequestedBySom,
    powerSavingModeInProgress,
    powerSavingTransitionSeconds,
    powerSavingModeActive,
    powerStatusVerifiedBySom,
    batteryEmergencyDowngraded,

    scenario2BatteryA,
    scenario2BatteryB,
    scenario2BatteryC,

    thermalValuesAskedBySom,
    epsMitigationRequestedBySom,
    payloadReductionCommandRequestedBySom,
    powerReducedBySpacon,
    epsAskedAfterMitigationBySom,
    epsConfirmedBySom,

    scenario2WeakSignalWarning,
    gs1ConnectionActive,
    gs1DegradationStartSecond,
    gs1ElevationAtDegradation,
    gs1LossStartSecond,
    scenario2Gs1SignalCheckedBySom,
    scenario2Gs2ElevationConfirmedBySom,
    scenario2Gs2SignalQualityCheckedBySom,
    scenario2Gs2SignalFiltered,
    scenario2Gs2SignalVerifiedBySoe,
    scenario2Gs2TrackingStartSecond,
    scenario2Gs2SignalFilterRequestedBySom,

    payloadPowerIncreaseRequestedBySom,
    cameraConfigurationRequestedBySom,
    imageCaptureRequestedBySom,
    spacecraftStandbyRequestedBySom,
    normalPayloadPowerIncreaseRequestedBySom,
    normalCameraConfigurationRequestedBySom,
    normalImageCaptureRequestedBySom,

    payloadPowerRaised,
    cameraConfigured,
    cameraVerifiedBySom,
    postPowerThermalReportedBySoe,
    imageTaken,
    spacecraftStandbyActive,

    thermalCoolingActive,
    powerReductionInProgress,
    powerIncreaseInProgress,
    payloadPowerLevel,
    epsTemperature,

    capturedImageName,
    imageValidity,
    capturedImageCapturedAt,
    capturedImageLocation,
    capturedImageCoordinates,

    tmHistoryGS,
    tmHistoryEPS,
    tmHistoryAOCS,
    tmHistoryTCS,
    tmHistoryPayload,
    tmHistoryMemory,

    emergencyModalVisible,
    emergencyContactListOpen,
    selectedEmergencyContact,
    emergencyMessageSent,
    gncWaitingForResponse,
    gncResponseNegative,
    gncProcedureSuggested,
    scenario2NewProcedureImported,
    procedureImporting,
  };

  let isApplyingRemoteState = false;

  function exportSyncedState() {
    const state: Record<string, unknown> = {};

    for (const [key, stateRef] of Object.entries(syncedState)) {
      state[key] = stateRef.value;
    }

    return state;
  }

  function applySyncedState(remoteState: Record<string, unknown>) {
    isApplyingRemoteState = true;

    for (const [key, value] of Object.entries(remoteState)) {
      if (key in syncedState) {
        syncedState[key as keyof typeof syncedState].value = value as never;
      }
    }

    setTimeout(() => {
      isApplyingRemoteState = false;
    }, 0);
  }

  function syncNow() {
    if (isApplyingRemoteState) {
      return;
    }

    const state = exportSyncedState();

    console.log('SYNC NOW SENT:', {
      selectedScenario: state.selectedScenario,
      activePanel: state.activePanel,
      simulationStatus: state.simulationStatus,
      missionSeconds: state.missionSeconds,
    });

    socket.emit('update-state', state);
  }

  const epsNominal = computed(() => {
    return (
      epsTemperature.value >= 70 &&
      epsTemperature.value <= 75 &&
      netPower.value >= 900 &&
      batteryLevel.value >= 75
    );
  });

  const epsClass = computed(() => {
    if (epsTemperature.value > 90 || netPower.value < 850 || batteryLevel.value < 70)
      return 'status-bad';
    if (!epsNominal.value) return 'status-warning';
    return 'status-good';
  });

  const missionTime = computed(() => {
    const minutes = Math.floor(missionSeconds.value / 60);
    const seconds = missionSeconds.value % 60;
    return `T+${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  const capturedImageSrc = computed(() => {
    if (!capturedImageName.value) return '';
    return `${import.meta.env.BASE_URL}photo/${capturedImageName.value}.jpg`;
  });

  const currentProcedureStep = computed(() => {
    if (simulationStatus.value === 'IDLE') return 1;

    // Step 1 remains active until GS1 reaches AOS.
    if (!gs1AosReached.value) return 1;

    if (!elevationAskedBySom.value) return 2;
    if (!elevationConfirmedBySom.value) return 3;
    if (!signalQualityReportedBySom.value) return 4;
    if (!signalFiltered.value) return 5;
    if (!signalVerifiedBySom.value) return 6;
    if (!memoryAskedBeforeDumpBySom.value) return 7;
    if (!memoryDumpAuthorizedBySom.value) return 8;
    if (!memoryDumpComplete.value) return 9;
    if (!memoryAskedAfterDumpBySom.value) return 10;
    if (!payloadInstrumentModeReportedBySom.value) return 11;
    if (!epsAskedBySom.value) return 12;
    if (isScenario2.value && !batteryStatusEvaluatedBySom.value) return 12;
    if (
      isScenario2.value &&
      batteryStatusEvaluatedBySom.value &&
      scenario2BatteryDanger.value &&
      !scenario2NewProcedureImported.value
    )
      return 12;
    if (isScenario2.value) {
      if (!batteryEqualizationComplete.value) return 13;
      if (!batteryRecheckedBySom.value) return 14;
      if (!powerStatusAskedBySom.value) return 15;
      if (!powerSavingModeActive.value) return 16;
      if (!powerStatusVerifiedBySom.value) return 17;
      if (!thermalValuesAskedBySom.value) return 18;
      if (!scenario2Gs1SignalCheckedBySom.value) return 19;
      if (!scenario2Gs2ElevationConfirmedBySom.value) return 20;
      if (!scenario2Gs2SignalQualityCheckedBySom.value) return 21;
      if (!scenario2Gs2SignalFiltered.value) return 22;
      if (!epsMitigationRequestedBySom.value) return 23;
      if (!powerReducedBySpacon.value) return 24;
      if (!epsAskedAfterMitigationBySom.value) return 25;
      if (!epsConfirmedBySom.value) return 26;
      if (!payloadPowerRaised.value) return 27;
      if (!cameraConfigured.value) return 28;
      if (!cameraVerifiedBySom.value) return 29;
      if (!postPowerThermalReportedBySoe.value) return 30;
      if (!imageTaken.value) return 31;
      if (!spacecraftStandbyActive.value) return 32;
      return 32;
    }
    if (!epsMitigationRequestedBySom.value) return 13;
    if (!powerReducedBySpacon.value) return 14;
    if (!epsAskedAfterMitigationBySom.value) return 15;
    if (!epsConfirmedBySom.value) return 16;
    if (!payloadPowerRaised.value) return 17;
    if (!cameraConfigured.value) return 18;
    if (!cameraVerifiedBySom.value) return 19;
    if (!imageTaken.value) return 20;
    if (!spacecraftStandbyActive.value) return 21;
    return 22;
  });

  const missionPhase = computed(() => {
    if (isScenario2.value) {
      switch (currentProcedureStep.value) {
        case 1:
          return 'Start Scenario 2';
        case 2:
          return 'Ask SOE1 for GS1 Elevation';
        case 3:
          return 'Confirm GS1 Elevation';
        case 4:
          return 'Ask SOE2 / Check GS1 Signal Quality';
        case 5:
          return 'SPACON Filter Signal';
        case 6:
          return 'Ask SOE2 / Verify Signal';
        case 7:
          return 'Ask SOE1 for Memory Before Dump';
        case 8:
          return 'Authorize Memory Dump';
        case 9:
          return 'SPACON Dump Payload Memory';
        case 10:
          return 'Ask SOE2 / Verify Memory After Dump';
        case 11:
          return 'Verify Memory Dump';
        case 12:
          return 'Ask SOE1 / Evaluate Battery Status';
        case 13:
          return 'SPACON Battery Equalization Transfer';
        case 14:
          return 'Ask SOE2 / Re-check Batteries';
        case 15:
          return 'Ask SOE1 / Power Margin';
        case 16:
          return 'SPACON Enter Power Saving Mode';
        case 17:
          return 'Verify Power Saving / Battery Warning';
        case 18:
          return 'Ask SOE1 for Thermal Values';
        case 19:
          return 'Verify GS1 Signal Loss';
        case 20:
          return 'Wait for GS2 Elevation';
        case 21:
          return 'Ask SOE1 / Check GS2 Signal Quality';
        case 22:
          return 'SPACON Filter GS2 Signal';
        case 23:
          return 'Request Thermal Mitigation';
        case 24:
          return 'SPACON Reduce Payload Power';
        case 25:
          return 'Ask SOE2 for EPS After Mitigation';
        case 26:
          return 'Confirm EPS Nominal';
        case 27:
          return 'SPACON Increase Payload Power';
        case 28:
          return 'SPACON Configure Camera';
        case 29:
          return 'SOE1 Verify Camera Configuration';
        case 30:
          return 'SOE2 Report Thermal Values';
        case 31:
          return 'SPACON Take Image';
        case 32:
          return 'SPACON Spacecraft Standby';
        default:
          return 'Scenario 2 Complete / Review';
      }
    }
    switch (currentProcedureStep.value) {
      case 1:
        return 'Start Simulation';
      case 2:
        return 'Ask SOE1 for Elevation';
      case 3:
        return 'Confirm Elevation';
      case 4:
        return 'Ask SOE2 / Check Signal Quality';
      case 5:
        return 'SPACON Filter Signal';
      case 6:
        return 'Verify Signal';
      case 7:
        return 'Ask SOE2 for Memory Before Dump';
      case 8:
        return 'Authorize Memory Dump';
      case 9:
        return 'SPACON Dump Payload Memory';
      case 10:
        return 'Ask SOE1 for Memory After Dump';
      case 11:
        return 'Verify Memory Dump';
      case 12:
        return 'Ask SOE2 for EPS';
      case 13:
        return 'Request Thermal Mitigation';
      case 14:
        return 'SPACON Reduce Payload Power';
      case 15:
        return 'Ask SOE1 for EPS After Mitigation';
      case 16:
        return 'Confirm EPS Nominal';
      case 17:
        return 'SPACON Increase Payload Power';
      case 18:
        return 'SPACON Configure Camera';
      case 19:
        return 'Verify Camera Configuration';
      case 20:
        return 'SPACON Take Image';
      case 21:
        return 'SPACON Spacecraft Standby';
      default:
        return 'Mission Complete / Review';
    }
  });

  const gs1DisplayedElevation = computed(() => {
    // Once GS2 AOS/tracking begins, GS1 spacecraft geometry is no longer displayed.
    if (
      isScenario2.value &&
      scenario2Gs2TrackingStartSecond.value !== null &&
      missionSeconds.value >= scenario2Gs2TrackingStartSecond.value
    ) {
      return null;
    }

    return gs1GeometryElevation.value;
  });

  const gs1DisplayedElevationClass = computed(() => {
    if (gs1DisplayedElevation.value === null) return 'status-empty';
    if (!gs1ConnectionActive.value || gs1DisplayedElevation.value < 3) return 'status-bad';
    if (gs1DisplayedElevation.value < 5) return 'status-warning';
    return 'status-good';
  });

  const { groundStationTelemetry, groundStation2Telemetry } = useGroundStationTelemetry({
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
  });

  const { epsTelemetry } = useEpsTelemetry({
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
  });

  // ---------------------------------------------------------------------------
  // ELEMENTARY SCENARIO TELEMETRY VIEW
  // ---------------------------------------------------------------------------
  // Scenario 1 Elementary and Scenario 1 Elementary A use the exact same
  // mission/procedure/command logic as Scenario 1. Only telemetry presentation
  // is reduced.
  //
  // Elementary   = curated maximum of 20 telemetry rows per subsystem.
  // Elementary A = curated maximum of 10 telemetry rows per subsystem.
  //
  // IMPORTANT:
  // The reduced sets are procedure-aware. We never select rows alphabetically.
  // Every telemetry parameter that an SOE must read in Scenario 1 remains visible:
  //   GS      : GEL005, GSE001, GBL092
  //   C&DH    : MEM221
  //   Payload : PLD620, CAM000
  //   EPS     : EPT014, DCC208, NET118
  //
  // Command-correlated parameters that are useful to observe are also retained
  // where possible (for example PWR740 and IMG901). Source telemetry arrays are
  // untouched and SPACON continues to use the full telemetry catalog.

  const elementaryGroundStationParameters = [
    'GEL005',
    'GSE001',
    'GBL092',
    'GCL001',
    'GFR128',
    'GAZ230',
    'GRN420',
    'GDS740',
    'GSN612',
    'GSA002',
    'GSR104',
    'GMD416',
    'GTR221',
    'GPA510',
    'GLN118',
    'GAC103',
    'GPE106',
    'GLG119',
    'GSM134',
    'GNG137',
  ] as const;

  const elementaryEpsParameters = [
    'EPT014',
    'DCC208',
    'NET118',
    'PWR740',
    'BCH096',
    'BCH097',
    'BCH098',
    'BAT105',
    'BMS106',
    'BUS281',
    'EPS718',
    'BUS282',
    'PWR741',
    'PWR742',
    'EPS700',
    'EPS901',
    'PDU331',
    'LCL902',
    'SAW032',
    'MPP102',
  ] as const;

  const elementaryAocsParameters = [
    'AOC001',
    'AOC003',
    'AOC004',
    'AOC010',
    'ATT111',
    'ATT112',
    'ATT113',
    'ATT121',
    'ATT122',
    'ATT123',
    'ATT130',
    'ATT131',
    'ATT132',
    'ATT133',
    'ATT134',
    'STR201',
    'STR202',
    'RW701',
    'RW705',
    'CTL912',
  ] as const;

  const elementaryTcsParameters = [
    'TCS001',
    'TCS003',
    'TCS005',
    'TMP101',
    'TMP102',
    'TMP103',
    'TMP110',
    'TMP120',
    'TMP123',
    'TMP131',
    'TMP132',
    'TMP140',
    'TMP141',
    'TMP142',
    'RAD301',
    'RAD302',
    'THB606',
    'THB607',
    'THB609',
    'EST702',
  ] as const;

  const elementaryPayloadParameters = [
    'PLD600',
    'PLD620',
    'PLD621',
    'PLD622',
    'PLD623',
    'PLD624',
    'PWR701',
    'PWR702',
    'PWR703',
    'CAM000',
    'CAM201',
    'SEN331',
    'SEN332',
    'FPA341',
    'GPS113',
    'GPS117',
    'IMG901',
    'IMG902',
    'IMG903',
    'IMG911',
  ] as const;

  const elementaryCdhParameters = [
    'CDH001',
    'CDH002',
    'CPU111',
    'CPU112',
    'WDG140',
    'MEM001',
    'MEM221',
    'MEM222',
    'MEM223',
    'MEM224',
    'MEM806',
    'MEM807',
    'NET201',
    'CMD301',
    'CMD305',
    'CMD306',
    'TM401',
    'TM404',
    'DMP801',
    'DMP802',
  ] as const;

  // Elementary A: 10 operationally useful rows per subsystem.
  // These are deliberately selected from the already validated 20-row sets.
  const elementaryAGroundStationParameters = [
    'GEL005', // Procedure: antenna elevation
    'GSE001', // Procedure: signal quality
    'GBL092', // Procedure: beacon level
    'GCL001', // Carrier lock
    'GFR128', // Frame synchronization
    'GAZ230', // Antenna azimuth
    'GRN420', // Slant range
    'GDS740', // Doppler offset
    'GSN612', // Eb/N0
    'GSA002', // Antenna pedestal temperature
  ] as const;

  const elementaryAEpsParameters = [
    'EPT014', // Procedure: EPS main electronics temperature
    'DCC208', // Procedure: DC/DC converter temperature
    'NET118', // Procedure: net power margin
    'PWR740', // Payload power bus / command-correlated state
    'EPS700', // EPS operating mode
    'BUS281', // Main bus voltage
    'EPS718', // Main bus current
    'BUS282', // Main bus power
    'BAT105', // Battery pack temperature
    'SAW032', // Generated solar power
  ] as const;

  const elementaryAAocsParameters = [
    'AOC001', // AOCS operating mode
    'AOC010', // AOCS overall health
    'ATT130', // Attitude knowledge validity
    'ATT132', // Attitude control error
    'ATT133', // Payload pointing error
    'ATT134', // Settling status
    'STR201', // Star tracker state
    'STR202', // Star tracker quality
    'RW701',  // Reaction wheel speed
    'CTL912', // Guidance target
  ] as const;

  const elementaryATcsParameters = [
    'TCS001', // TCS operating mode
    'TCS005', // TCS overall health
    'TMP101', // EPS main electronics temperature
    'TMP103', // DC/DC converter assembly temperature
    'TMP110', // Battery pack average temperature
    'TMP120', // Onboard computer temperature
    'TMP131', // Reaction wheel assembly temperature
    'TMP132', // Star tracker assembly temperature
    'TMP140', // Payload electronics temperature
    'TMP141', // Payload detector temperature
  ] as const;

  const elementaryAPayloadParameters = [
    'PLD600', // Payload overall health
    'PLD620', // Procedure: instrument mode
    'PLD622', // Acquisition readiness
    'PLD623', // Thermal readiness
    'PLD624', // Storage readiness
    'PWR703', // Payload electrical power
    'CAM000', // Procedure: camera configuration
    'SEN331', // Image sensor temperature
    'IMG901', // Image capture state / command-correlated state
    'IMG902', // Imaging window state
  ] as const;

  const elementaryACdhParameters = [
    'CDH001', // C&DH overall health
    'CDH002', // C&DH operating mode
    'CPU111', // Processor load
    'CPU112', // Processor temperature
    'MEM001', // Memory subsystem health
    'MEM221', // Procedure: payload memory used
    'MEM222', // Mass memory available
    'MEM223', // Mass memory state
    'DMP801', // Memory dump state
    'DMP802', // Memory dump progress
  ] as const;

  function elementaryTelemetryRows<T extends { parameter: string }>(
    rows: readonly T[],
    elementaryParameters: readonly string[],
    elementaryAParameters: readonly string[]
  ): T[] {
    let parameters: readonly string[];
    let limit: number;

    if (isElementaryAScenario.value) {
      parameters = elementaryAParameters;
      limit = 10;
    } else if (isElementaryScenario.value) {
      parameters = elementaryParameters;
      limit = 20;
    } else {
      return [...rows];
    }

    const order = new Map(parameters.map((parameter, index) => [parameter, index]));

    return rows
      .filter((row) => order.has(row.parameter))
      .sort(
        (a, b) =>
          (order.get(a.parameter) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.parameter) ?? Number.MAX_SAFE_INTEGER)
      )
      .slice(0, limit);
  }

  const displayedGroundStationTelemetry = computed(() =>
    elementaryTelemetryRows(
      groundStationTelemetry.value,
      elementaryGroundStationParameters,
      elementaryAGroundStationParameters
    )
  );

  const displayedGroundStation2Telemetry = computed(() =>
    elementaryTelemetryRows(
      groundStation2Telemetry.value,
      elementaryGroundStationParameters,
      elementaryAGroundStationParameters
    )
  );

  const displayedEpsTelemetry = computed(() =>
    elementaryTelemetryRows(
      epsTelemetry.value,
      elementaryEpsParameters,
      elementaryAEpsParameters
    )
  );

  const displayedAocsTelemetry = computed(() =>
    elementaryTelemetryRows(
      aocsTelemetry.value,
      elementaryAocsParameters,
      elementaryAAocsParameters
    )
  );

  const displayedTcsTelemetry = computed(() =>
    elementaryTelemetryRows(
      tcsTelemetry.value,
      elementaryTcsParameters,
      elementaryATcsParameters
    )
  );

  const displayedPayloadTelemetry = computed(() =>
    elementaryTelemetryRows(
      payloadTelemetry.value,
      elementaryPayloadParameters,
      elementaryAPayloadParameters
    )
  );

  const displayedCdhTelemetry = computed(() =>
    elementaryTelemetryRows(
      cdhTelemetry.value,
      elementaryCdhParameters,
      elementaryACdhParameters
    )
  );

  // ---------------------------------------------------------------------------
  // SPACON PARAMETER / COMMAND CATALOG
  // ---------------------------------------------------------------------------
  // The SPACON matrix is built from the live telemetry definitions. This keeps
  // every parameter currently used by GS, EPS, AOCS, TCS, Payload and C&DH
  // available in one place without maintaining a second hard-coded parameter
  // database. Operational commands override telemetry-only entries with the
  // same subsystem/code.

  const spaconSubsystemOrder = ['Ground Station', 'EPS', 'AOCS', 'TCS', 'Payload', 'C&DH'];

  function telemetryParametersForSpacon(
    subsystem: string,
    rows: ReadonlyArray<{ parameter: string; subsystem: string }>
  ): SpaconCommand[] {
    return rows.map((telemetryRow) => ({
      subsystem,
      code: telemetryRow.parameter,
      command: `Monitor ${telemetryRow.parameter}`,
      purpose: telemetryRow.subsystem,
      kind: 'parameter',
    }));
  }

  const spaconCommands = computed<SpaconCommand[]>(() => {
    const telemetryParameters: SpaconCommand[] = [
      ...telemetryParametersForSpacon('Ground Station', groundStationTelemetry.value),
      ...telemetryParametersForSpacon('Ground Station', groundStation2Telemetry.value),
      ...telemetryParametersForSpacon('EPS', epsTelemetry.value),
      ...telemetryParametersForSpacon('AOCS', aocsTelemetry.value),
      ...telemetryParametersForSpacon('TCS', tcsTelemetry.value),
      ...telemetryParametersForSpacon('Payload', payloadTelemetry.value),
      ...telemetryParametersForSpacon('C&DH', cdhTelemetry.value),
    ];

    const merged = new Map<string, SpaconCommand>();

    for (const parameter of telemetryParameters) {
      const key = `${parameter.subsystem}::${parameter.code}`;
      if (!merged.has(key)) {
        merged.set(key, parameter);
      }
    }

    // Keep all existing operational SPACON commands. If a real command uses the
    // same code as a telemetry parameter, the command takes precedence.
    for (const command of spaconActionCommands) {
      const key = `${command.subsystem}::${command.code}`;
      merged.set(key, {
        ...command,
        kind: 'action',
      });
    }

    return Array.from(merged.values()).sort((a, b) => {
      const subsystemDifference =
        spaconSubsystemOrder.indexOf(a.subsystem) - spaconSubsystemOrder.indexOf(b.subsystem);

      if (subsystemDifference !== 0) {
        return subsystemDifference;
      }

      return a.code.localeCompare(b.code);
    });
  });

  const spaconSearchQuery = ref('');

  const filteredSpaconCommands = computed(() => {
    const query = spaconSearchQuery.value.trim().toLowerCase();

    if (!query) {
      return spaconCommands.value;
    }

    return spaconCommands.value.filter((item) => {
      const searchableText = [item.subsystem, item.code, item.command].join(' ').toLowerCase();

      return searchableText.includes(query);
    });
  });

  const spaconSubsystems = computed(() => {
    return spaconSubsystemOrder.filter((subsystem) =>
      filteredSpaconCommands.value.some((item) => item.subsystem === subsystem)
    );
  });

  function commandsForSubsystem(subsystem: string) {
    return filteredSpaconCommands.value.filter((item) => item.subsystem === subsystem);
  }

  const selectedSpaconCommand = computed(() => {
    return spaconCommands.value.find((cmd) => cmd.command === selectedCommand.value);
  });

  const selectedCommandDisplay = computed(() => {
    if (!selectedSpaconCommand.value) return 'NONE';
    return selectedSpaconCommand.value.code + ' - ' + selectedSpaconCommand.value.command;
  });

  function selectFirstSpaconSearchResult() {
    if (!isSpacon.value) {
      return;
    }

    const firstMatch = filteredSpaconCommands.value[0];

    if (!firstMatch) {
      resultStatus.value = 'FAILED - NO SPACON SEARCH MATCH';
      return;
    }

    selectCommand(firstMatch.command);
  }

  function clearSpaconSearch() {
    spaconSearchQuery.value = '';
  }

  function markSomFail(action: string, message: string) {
    failedSomAction.value = action;
    resultStatus.value = message;
  }

  function clearSomFail() {
    failedSomAction.value = '';
  }

  function updateMemoryDump() {
    if (!memoryDumpStarted.value || memoryDumpComplete.value) return;

    if (memoryUsed.value > 5) {
      memoryUsed.value = Number(Math.max(5, memoryUsed.value - 6).toFixed(0));
    }

    if (memoryUsed.value <= 5) {
      memoryDumpComplete.value = true;
      resultStatus.value = 'MEMORY DUMP COMPLETE - ASK SOE FOR MEMORY STATUS';
    }
  }

  function updateBatteryEqualization() {
    const equalizedTarget = 34.7;

    if (batteryEqualizationInProgress.value) {
      scenario2BatteryA.value = Number(
        Math.max(equalizedTarget, scenario2BatteryA.value - 1.8).toFixed(1)
      );
      scenario2BatteryB.value = Number(
        Math.min(equalizedTarget, scenario2BatteryB.value + 0.9).toFixed(1)
      );
      scenario2BatteryC.value = Number(
        Math.min(equalizedTarget, scenario2BatteryC.value + 0.9).toFixed(1)
      );

      if (
        scenario2BatteryA.value <= equalizedTarget &&
        scenario2BatteryB.value >= equalizedTarget &&
        scenario2BatteryC.value >= equalizedTarget
      ) {
        scenario2BatteryA.value = equalizedTarget;
        scenario2BatteryB.value = equalizedTarget;
        scenario2BatteryC.value = equalizedTarget;
        batteryEqualizationInProgress.value = false;
        batteryEqualizationComplete.value = true;
        resultStatus.value =
          'BAT330 COMPLETE - BATTERY CHARGE REDISTRIBUTED / SOE2 REPORT REQUIRED';
      }
      return;
    }

    if (batteryEqualizationComplete.value) {
      const slowDischarge = 0.01;
      scenario2BatteryA.value = Number(
        Math.max(0, scenario2BatteryA.value - slowDischarge).toFixed(2)
      );
      scenario2BatteryB.value = Number(
        Math.max(0, scenario2BatteryB.value - slowDischarge).toFixed(2)
      );
      scenario2BatteryC.value = Number(
        Math.max(0, scenario2BatteryC.value - slowDischarge).toFixed(2)
      );
      if (scenario2BatteryCritical.value) batteryEmergencyDowngraded.value = false;
    }
  }

  function updatePowerSavingTransition() {
    if (!powerSavingModeInProgress.value || powerSavingModeActive.value) return;

    powerSavingTransitionSeconds.value += 1;

    if (powerSavingTransitionSeconds.value >= 10) {
      powerSavingModeInProgress.value = false;
      powerSavingModeActive.value = true;
      payloadPowerLevel.value = 8;
      thermalCoolingActive.value = false;
      resultStatus.value = 'POWER SAVING MODE ACTIVE - SPACECRAFT ENTERED POWER SAVING MODE';
    }
  }

  function completePayloadReductionIfReady() {
    if (!powerReductionInProgress.value) return false;
    if (payloadPowerLevel.value > 10) return false;

    payloadPowerLevel.value = 10;
    powerReductionInProgress.value = false;
    payloadPowerRaised.value = false;
    powerReducedBySpacon.value = true;
    lastPayloadPowerThermalSecond.value = -1;
    resultStatus.value = 'POWER REDUCTION COMPLETE - PAYLOAD POWER AT SAFE LEVEL';
    return true;
  }

  function updatePayloadPowerTransitions() {
    if (powerIncreaseInProgress.value) {
      powerReductionInProgress.value = false;

      payloadPowerLevel.value = Number(Math.min(180, payloadPowerLevel.value + 17).toFixed(1));

      if (payloadPowerLevel.value >= 180) {
        payloadPowerLevel.value = 180;
        powerIncreaseInProgress.value = false;
        payloadPowerRaised.value = true;
        resultStatus.value = 'PAYLOAD POWER INCREASE COMPLETE - IMAGING POWER AVAILABLE';
      }

      return;
    }

    if (powerReductionInProgress.value) {
      const reductionRate = payloadPowerLevel.value > 50 ? 17 : 1.5;
      payloadPowerLevel.value = Number(
        Math.max(10, payloadPowerLevel.value - reductionRate).toFixed(1)
      );

      completePayloadReductionIfReady();
    }
  }

  function updateThermalModel() {
    const currentSecond = Math.floor(missionSeconds.value);

    // Payload power increase has priority over any remaining cooling flag.
    // This prevents the temperature from continuing to fall after SPACON raises payload power.
    if (payloadPowerRaised.value || powerIncreaseInProgress.value) {
      thermalCoolingActive.value = false;

      const riseRateDegPerSecond = isScenario2.value
        ? scenario2PayloadPowerThermalRiseRate
        : scenario1PayloadPowerThermalRiseRate;

      if (lastPayloadPowerThermalSecond.value < 0) {
        lastPayloadPowerThermalSecond.value = currentSecond;
      }

      const elapsedSeconds = Math.max(0, currentSecond - lastPayloadPowerThermalSecond.value);

      if (elapsedSeconds > 0) {
        epsTemperature.value += riseRateDegPerSecond * elapsedSeconds;
        lastPayloadPowerThermalSecond.value = currentSecond;
      }

      if (epsTemperature.value > 75 && epsConfirmedBySom.value) {
        thermalCoolingActive.value = false;
        powerReductionInProgress.value = false;
        powerIncreaseInProgress.value = false;
        epsMitigationRequestedBySom.value = false;
        payloadReductionCommandRequestedBySom.value = false;
        powerReducedBySpacon.value = false;
        epsAskedAfterMitigationBySom.value = false;
        epsConfirmedBySom.value = false;
        payloadPowerIncreaseRequestedBySom.value = false;
        normalPayloadPowerIncreaseRequestedBySom.value = false;
        payloadPowerRaised.value = false;
        cameraConfigurationRequestedBySom.value = false;
        normalCameraConfigurationRequestedBySom.value = false;
        cameraConfigured.value = false;
        cameraVerifiedBySom.value = false;
        postPowerThermalReportedBySoe.value = false;
        imageCaptureRequestedBySom.value = false;
        normalImageCaptureRequestedBySom.value = false;
        imageTaken.value = false;
        spacecraftStandbyRequestedBySom.value = false;
        spacecraftStandbyActive.value = false;
        resultStatus.value = 'WARNING - EPS TEMPERATURE HIGH / MITIGATION REQUIRED';
      }
      return;
    }

    // Reset the power-rise timer whenever payload power is not in the raised state.
    lastPayloadPowerThermalSecond.value = -1;

    if (thermalCoolingActive.value) {
      if (epsTemperature.value > 72.5) {
        epsTemperature.value = Number((epsTemperature.value - 0.28).toFixed(1));
      } else {
        epsTemperature.value = Number(Math.min(75.0, epsTemperature.value + 0.018).toFixed(1));
      }
      return;
    }

    if (isScenario2.value && scenario2NewProcedureImported.value && !powerReducedBySpacon.value) {
      const wave = Math.sin(missionSeconds.value / 10) * 0.08;
      epsTemperature.value = Number(
        Math.min(91.6, Math.max(88.0, epsTemperature.value + 0.018 + wave)).toFixed(1)
      );
      return;
    }

    if (epsTemperature.value < 90.2) {
      const wave = Math.sin(missionSeconds.value / 10) * 0.08;
      epsTemperature.value = Number(Math.min(90.2, epsTemperature.value + 0.018 + wave).toFixed(1));
    }
  }

  function statusForStep(step: number, done: boolean) {
    if (done) return 'DONE';
    if (currentProcedureStep.value === step) return 'CURRENT';
    return 'PENDING';
  }

  function classForStep(step: number, done: boolean) {
    if (done) return 'status-good';
    if (currentProcedureStep.value === step) return 'status-warning';
    return 'status-empty';
  }

  function canSomAskElevation() {
    return currentProcedureStep.value === 2;
  }
  function canSomConfirmElevation() {
    return currentProcedureStep.value === 3;
  }
  function canAskSignalQualityBeforeFilter() {
    return currentProcedureStep.value === 4 && !signalQualityReportedBySom.value;
  }
  function canVerifySignal() {
    return currentProcedureStep.value === 6;
  }
  function canAskMemoryBeforeDump() {
    return currentProcedureStep.value === 7;
  }
  function canAuthorizeMemoryDump() {
    return currentProcedureStep.value === 8;
  }
  function canAskMemoryAfterDump() {
    return currentProcedureStep.value === 10;
  }
  function canAskPayloadInstrumentMode() {
    return currentProcedureStep.value === 11 && !payloadInstrumentModeReportedBySom.value;
  }
  function canSomAskEps() {
    return currentProcedureStep.value === 12 && !epsAskedBySom.value;
  }
  function canScenario2EvaluateBattery() {
    return (
      isScenario2.value && currentProcedureStep.value === 12 && !batteryStatusEvaluatedBySom.value
    );
  }
  function canScenario2RequestBatteryEqualization() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 13 &&
      !batteryEqualizationRequestedBySom.value
    );
  }
  function canScenario2RecheckBatteries() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 14 &&
      !batteryRecheckedBySom.value
    );
  }
  function canScenario2AskPowerStatus() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 15 &&
      !powerStatusAskedBySom.value
    );
  }
  function canScenario2RequestPowerSaving() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 16 &&
      !powerSavingRequestedBySom.value
    );
  }
  function canSomRequestPayloadReductionCommand() {
    const reductionStep = isScenario2.value && scenario2NewProcedureImported.value ? 24 : 14;
    return (
      currentProcedureStep.value === reductionStep &&
      epsMitigationRequestedBySom.value &&
      !payloadReductionCommandRequestedBySom.value &&
      !powerReducedBySpacon.value
    );
  }
  function canScenario2VerifyPowerSaving() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 17 &&
      !powerStatusVerifiedBySom.value
    );
  }
  function canScenario2AskThermalValues() {
    return (
      isScenario2.value && scenario2NewProcedureImported.value && currentProcedureStep.value === 18
    );
  }
  function canSomRequestMitigation() {
    return currentProcedureStep.value === (isScenario2.value ? 23 : 13);
  }
  function canSomAskEpsAfterMitigation() {
    return currentProcedureStep.value === (isScenario2.value ? 25 : 15);
  }
  function canSomConfirmEps() {
    return currentProcedureStep.value === (isScenario2.value ? 26 : 16);
  }
  function canScenario2VerifyGs1Signal() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 19 &&
      !scenario2Gs1SignalCheckedBySom.value
    );
  }
  function canScenario2ConfirmGs2Elevation() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 20 &&
      !scenario2Gs2ElevationConfirmedBySom.value &&
      gs2Elevation.value !== null &&
      gs2Elevation.value >= 5
    );
  }
  function canScenario2AskGs2SignalQuality() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 21 &&
      scenario2Gs2ElevationConfirmedBySom.value &&
      !scenario2Gs2SignalQualityCheckedBySom.value
    );
  }
  function canScenario2RequestGs2SignalFilter() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 22 &&
      scenario2Gs2SignalQualityCheckedBySom.value &&
      !scenario2Gs2SignalFilterRequestedBySom.value
    );
  }
  function canScenario2RequestPayloadPowerIncrease() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 27 &&
      !payloadPowerIncreaseRequestedBySom.value
    );
  }
  function canScenario2RequestCameraConfiguration() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 28 &&
      !cameraConfigurationRequestedBySom.value
    );
  }
  function canScenario2RequestImageCapture() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 31 &&
      !imageCaptureRequestedBySom.value
    );
  }
  function canScenario2RequestSpacecraftStandby() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 32 &&
      !spacecraftStandbyRequestedBySom.value
    );
  }
  function canScenario2VerifyGs2Signal() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      false &&
      !scenario2Gs2SignalVerifiedBySoe.value
    );
  }
  function canVerifyCamera() {
    return currentProcedureStep.value === (isScenario2.value ? 29 : 19);
  }
  function canScenario2ReportPostPowerThermals() {
    return (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      currentProcedureStep.value === 30 &&
      cameraVerifiedBySom.value &&
      !postPowerThermalReportedBySoe.value
    );
  }
  function canSomRequestSignalFilter() {
    return (
      currentProcedureStep.value === 5 &&
      signalQualityReportedBySom.value &&
      !signalFilterRequestedBySom.value
    );
  }
  function canSomRequestMemoryDump() {
    return (
      currentProcedureStep.value === 9 &&
      memoryDumpAuthorizedBySom.value &&
      !memoryDumpRequestedBySom.value
    );
  }
  function canSomRequestNormalPayloadPowerIncrease() {
    return (
      (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
      currentProcedureStep.value === 17 &&
      epsConfirmedBySom.value &&
      !normalPayloadPowerIncreaseRequestedBySom.value
    );
  }
  function canSomRequestNormalCameraConfiguration() {
    return (
      (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
      currentProcedureStep.value === 18 &&
      payloadPowerRaised.value &&
      !normalCameraConfigurationRequestedBySom.value
    );
  }
  function canSomRequestNormalImageCapture() {
    return (
      (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
      currentProcedureStep.value === 20 &&
      cameraVerifiedBySom.value &&
      !normalImageCaptureRequestedBySom.value
    );
  }
  function canSomRequestNormalSpacecraftStandby() {
    return (
      !isScenario2.value &&
      currentProcedureStep.value === 21 &&
      imageTaken.value &&
      !spacecraftStandbyRequestedBySom.value
    );
  }

  function somAskElevation() {
    if (!isSom.value) {
      return;
    }

    if (!canSomAskElevation()) {
      markSomFail('askElevation', 'FAILED - WRONG PROCEDURE STEP');
      syncNow();
      return;
    }

    elevationAskedBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOE1 REPORT - ELEVATION ${elevation.value === null ? 'NO DATA' : elevation.value + '°'}`;

    syncNow();
  }

  function somConfirmElevation() {
    if (!isSom.value) {
      return;
    }

    if (!canSomConfirmElevation()) {
      markSomFail('confirmElevation', 'FAILED - WRONG PROCEDURE STEP');
      syncNow();
      return;
    }

    if (elevation.value === null || elevation.value < 5) {
      markSomFail('confirmElevation', 'FAILED - ELEVATION BELOW 5°');
      syncNow();
      return;
    }

    elevationConfirmedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM CONFIRMED - ELEVATION ACCEPTABLE';

    syncNow();
  }

  function somRequestSignalFilter() {
    if (!canSomRequestSignalFilter()) {
      markSomFail('requestSignalFilter', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    signalFilterRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE GS1 / GSE001 FILTER SIGNAL';
  }

  function somRequestMemoryDumpBySpacon() {
    if (!canSomRequestMemoryDump()) {
      markSomFail('requestMemoryDump', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    memoryDumpRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE MEM221 DUMP PAYLOAD MEMORY';
  }

  function somRequestNormalPayloadPowerIncrease() {
    if (!canSomRequestNormalPayloadPowerIncrease()) {
      markSomFail('requestNormalPowerIncrease', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    normalPayloadPowerIncreaseRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE PWR740 INCREASE PAYLOAD POWER';
  }

  function somRequestNormalCameraConfiguration() {
    if (!canSomRequestNormalCameraConfiguration()) {
      markSomFail('requestNormalCameraConfig', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    normalCameraConfigurationRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE CAM000 CONFIGURE CAMERA';
  }

  function somRequestNormalImageCapture() {
    if (!canSomRequestNormalImageCapture()) {
      markSomFail('requestNormalImageCapture', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    normalImageCaptureRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE IMG901 TAKE IMAGE';
  }

  function somAskSignalQualityBeforeFilter() {
    if (!canAskSignalQualityBeforeFilter()) {
      markSomFail('askSignalQuality', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    signalQualityReportedBySom.value = true;
    clearSomFail();

    if (signalQuality.value === 'GOOD') {
      signalFiltered.value = true;
      resultStatus.value = 'SOE2 REPORT - GS1 / GSE001 SIGNAL QUALITY GOOD / FILTER NOT REQUIRED';
      return;
    }

    resultStatus.value =
      'SOE2 REPORT - GS1 / GSE001 SIGNAL QUALITY ' +
      signalQuality.value +
      ' / FILTER REQUIRED BY SPACON';
  }

  function somVerifySignal() {
    if (!canVerifySignal()) {
      markSomFail('verifySignal', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (signalQuality.value !== 'GOOD') {
      markSomFail('verifySignal', 'FAILED - SIGNAL NOT GOOD');
      return;
    }

    signalVerifiedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM VERIFIED - SIGNAL GOOD';
  }

  function somAskMemoryBeforeDump() {
    if (!canAskMemoryBeforeDump()) {
      markSomFail('askMemoryBefore', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    memoryAskedBeforeDumpBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOE2 REPORT - MEMORY USED ${memoryUsed.value}%`;
  }

  function somAuthorizeMemoryDump() {
    if (!canAuthorizeMemoryDump()) {
      markSomFail('authorizeMemoryDump', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (memoryUsed.value <= 50) {
      markSomFail('authorizeMemoryDump', 'FAILED - MEM221 ≤ 50% / DUMP NOT REQUIRED');
      return;
    }

    memoryDumpAuthorizedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM AUTHORIZED - MEM221 > 50% / SPACON MAY DUMP MEMORY';
  }

  function somAskMemoryAfterDump() {
    if (!canAskMemoryAfterDump()) {
      markSomFail('askMemoryAfter', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (!memoryDumpComplete.value) {
      markSomFail('askMemoryAfter', 'FAILED - MEMORY DUMP NOT COMPLETE');
      return;
    }

    memoryAskedAfterDumpBySom.value = true;

    if (isScenario2.value) {
      if (memoryUsed.value > 10) {
        markSomFail('askMemoryAfter', 'FAILED - MEM221 > 10% / MEMORY NOT NOMINAL');
        return;
      }

      memoryVerifiedBySom.value = true;
      clearSomFail();
      resultStatus.value = `SOE2 REPORT - C&DH PANEL: MEM221 ${memoryUsed.value}% / SOM EVALUATION: NOMINAL`;
      return;
    }

    clearSomFail();
    resultStatus.value = `SOE1 REPORT - MEMORY USED ${memoryUsed.value}%`;
  }

  function somAskPayloadInstrumentMode() {
    if (!canAskPayloadInstrumentMode()) {
      markSomFail('askPayloadInstrumentMode', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    payloadInstrumentModeReportedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOE1 REPORT - PLD620 INSTRUMENT MODE REPORTED';
  }

  function somAskEps() {
    if (!canSomAskEps()) {
      markSomFail('askEps', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    epsAskedBySom.value = true;
    epsConfirmedBySom.value = false;
    clearSomFail();
    if (isScenario2.value) {
      batteryStatusEvaluatedBySom.value = true;

      if (scenario2BatteryNominal.value) {
        resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / SOM EVALUATION: NOMINAL`;
        return;
      }

      if (scenario2BatteryDanger.value) {
        emergencyModalVisible.value = true;
        emergencyStep.value = 'summary';
        typedEmergencyMessage.value = '';
        typingEmergencyMessage.value = false;

        if (emergencyTypingTimer) {
          clearInterval(emergencyTypingTimer);
          emergencyTypingTimer = null;
        }
        emergencyContactListOpen.value = false;
        selectedEmergencyContact.value = '';
        emergencyMessageSent.value = false;
        gncWaitingForResponse.value = false;
        gncResponseNegative.value = false;
        scenario2NewProcedureImported.value = false;
        resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / EMERGENCY SITUATION - PROCEDURE HOLD`;
        return;
      }

      if (scenario2BatteryNonNominal.value) {
        resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / SOM EVALUATION: NON-NOMINAL - PROCEDURE HOLD`;
        return;
      }

      resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / SOM EVALUATION: WARNING`;
      return;
    }

    resultStatus.value = `SOE2 REPORT - EPS TEMP ${epsTemperature.value} °C / MITIGATION REQUIRED`;
  }

  function scenario2EvaluateBatteryStatus() {
    if (!canScenario2EvaluateBattery()) {
      markSomFail('evaluateBattery', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    batteryStatusEvaluatedBySom.value = true;
    clearSomFail();

    if (scenario2BatteryNominal.value) {
      resultStatus.value = 'SOM EVALUATION - BATTERY STATUS NOMINAL';
      return;
    }

    if (scenario2BatteryDanger.value) {
      resultStatus.value = 'SOM EVALUATION - EMERGENCY SITUATION / PROCEDURE HOLD';
      emergencyModalVisible.value = true;
      emergencyStep.value = 'summary';
      typedEmergencyMessage.value = '';
      typingEmergencyMessage.value = false;

      if (emergencyTypingTimer) {
        clearInterval(emergencyTypingTimer);
        emergencyTypingTimer = null;
      }
      return;
    }

    if (scenario2BatteryNonNominal.value) {
      resultStatus.value = 'SOM EVALUATION - BATTERY STATUS NON-NOMINAL / PROCEDURE HOLD';
      return;
    }

    resultStatus.value = 'SOM EVALUATION - BATTERY STATUS WARNING';
  }

  function scenario2RequestBatteryEqualization() {
    if (!canScenario2RequestBatteryEqualization()) {
      markSomFail('requestBatteryEqualization', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    batteryEqualizationRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE BAT330 BATTERY EQUALIZATION TRANSFER';
  }

  function scenario2RecheckBatteries() {
    if (!canScenario2RecheckBatteries()) {
      markSomFail('recheckBatteries', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    batteryRecheckedBySom.value = true;
    clearSomFail();

    if (scenario2BatteryNominal.value) {
      resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / SOM EVALUATION: NOMINAL`;
      return;
    }

    if (scenario2BatteryDanger.value) {
      markSomFail('recheckBatteries', 'FAILED - BATTERY STILL IN EMERGENCY SITUATION');
      return;
    }

    resultStatus.value = `SOE1 REPORT - EPS PANEL: BCH096 ${batteryA.value}% / BCH097 ${batteryB.value}% / BCH098 ${batteryC.value}% / SOM EVALUATION: WARNING`;
  }

  function scenario2AskPowerStatus() {
    if (!canScenario2AskPowerStatus()) {
      markSomFail('askPowerStatus', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    powerStatusAskedBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOE1 REPORT - EPS PANEL: NET118 ${netPower.value} W / PWR740 ${payloadPowerLevel.value} W / SOM REQUEST: ENTER POWER SAVING MODE`;
  }

  function scenario2RequestPowerSaving() {
    if (!canScenario2RequestPowerSaving()) {
      markSomFail('requestPowerSaving', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    powerSavingRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE PSM001 ENTER POWER SAVING MODE';
  }

  function scenario2VerifyPowerSaving() {
    if (!canScenario2VerifyPowerSaving()) {
      markSomFail('verifyPowerSaving', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (!powerSavingModeActive.value) {
      markSomFail('verifyPowerSaving', 'FAILED - POWER SAVING MODE NOT ACTIVE');
      return;
    }

    if (scenario2BatteryDanger.value || netPower.value < 900) {
      markSomFail(
        'verifyPowerSaving',
        'FAILED - POWER NOT NOMINAL OR BATTERY STILL IN EMERGENCY SITUATION'
      );
      return;
    }

    powerStatusVerifiedBySom.value = true;
    batteryEmergencyDowngraded.value = true;

    // Action Step 17:
    // begin controlled GS1 link degradation from the current geometry.
    if (gs1DegradationStartSecond.value === null) {
      gs1ElevationAtDegradation.value = gs1GeometryElevation.value ?? elevation.value ?? 0;

      gs1DegradationStartSecond.value = missionSeconds.value;
    }

    scenario2WeakSignalWarning.value = true;

    clearSomFail();
    resultStatus.value = 'SOM VERIFIED - POWER NOMINAL / BATTERY RECOVERED TO WARNING STATUS';
  }

  function scenario2AskThermalValues() {
    if (!canScenario2AskThermalValues()) {
      markSomFail('askThermalValues', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (
      isScenario2.value &&
      scenario2NewProcedureImported.value &&
      !powerReducedBySpacon.value &&
      epsTemperature.value < 88
    ) {
      epsTemperature.value = 90.2;
    }

    thermalValuesAskedBySom.value = true;

    // Step 18: GS1 signal loss starts here.
    scenario2WeakSignalWarning.value = false;

    gs1LossStartSecond.value = missionSeconds.value;

    gs1ConnectionActive.value = false;
    scenario2Gs2TrackingStartSecond.value = missionSeconds.value + gs2AosDelayAfterGs1Los;

    clearSomFail();
    resultStatus.value = `SOE1 REPORT - EPS PANEL: EPT014 ${epsTemperature.value} °C / PCU447 HIGH / DCC208 HIGH / NET118 ${netPower.value} W / GS1 SIGNAL LOSS DETECTED`;
  }

  function somRequestMitigation() {
    if (!canSomRequestMitigation()) {
      markSomFail('requestMitigation', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    payloadReductionCommandRequestedBySom.value = false;
    powerReductionInProgress.value = false;
    powerReducedBySpacon.value = false;
    epsAskedAfterMitigationBySom.value = false;
    epsConfirmedBySom.value = false;
    payloadPowerIncreaseRequestedBySom.value = false;
    normalPayloadPowerIncreaseRequestedBySom.value = false;
    powerIncreaseInProgress.value = false;
    payloadPowerRaised.value = false;
    cameraConfigurationRequestedBySom.value = false;
    normalCameraConfigurationRequestedBySom.value = false;
    cameraConfigured.value = false;
    cameraVerifiedBySom.value = false;
    postPowerThermalReportedBySoe.value = false;
    imageCaptureRequestedBySom.value = false;
    normalImageCaptureRequestedBySom.value = false;
    imageTaken.value = false;
    spacecraftStandbyRequestedBySom.value = false;
    spacecraftStandbyActive.value = false;

    epsMitigationRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = epsNominal.value
      ? 'EPS ALREADY NOMINAL - MITIGATION NOT REQUIRED'
      : 'SOM REQUESTED - SPACON REDUCE PAYLOAD POWER';
  }

  function somRequestPayloadReductionCommand() {
    if (!canSomRequestPayloadReductionCommand()) {
      markSomFail('requestPayloadReduction', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    payloadReductionCommandRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON SELECT EPT014 / REDUCE PAYLOAD POWER';
  }

  function somAskEpsAfterMitigation() {
    if (!canSomAskEpsAfterMitigation()) {
      markSomFail('askEpsAfter', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (!powerReducedBySpacon.value) {
      markSomFail('askEpsAfter', 'FAILED - PAYLOAD POWER NOT REDUCED BY SPACON');
      return;
    }

    epsAskedAfterMitigationBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOE1 REPORT - EPS TEMP ${epsTemperature.value} °C`;
  }

  function somConfirmEpsNominal() {
    if (!canSomConfirmEps()) {
      markSomFail('confirmEps', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (!epsNominal.value) {
      markSomFail('confirmEps', 'FAILED - EPS NOT NOMINAL / WAIT OR MITIGATE');
      return;
    }

    epsConfirmedBySom.value = true;

    clearSomFail();
    resultStatus.value = 'SOM CONFIRMED - EPS NOMINAL';
  }

  function scenario2VerifyGs1Signal() {
    if (!canScenario2VerifyGs1Signal()) {
      markSomFail('verifyGs1Signal', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    scenario2Gs1SignalCheckedBySom.value = true;
    scenario2Gs2ElevationConfirmedBySom.value = false;
    scenario2Gs2SignalQualityCheckedBySom.value = false;
    scenario2Gs2SignalFiltered.value = false;
    scenario2Gs2SignalFilterRequestedBySom.value = false;
    payloadPowerIncreaseRequestedBySom.value = false;
    cameraConfigurationRequestedBySom.value = false;
    postPowerThermalReportedBySoe.value = false;
    spacecraftStandbyRequestedBySom.value = false;

    tmHistoryGS.value = [];
    tmHistoryEPS.value = [];
    tmHistoryAOCS.value = [];
    tmHistoryTCS.value = [];
    tmHistoryPayload.value = [];
    tmHistoryMemory.value = [];
    lastTmLogSecond = -1;

    clearSomFail();
    resultStatus.value =
      'SOM CONFIRMED - GS1 SIGNAL LOSS / GS2 ELEVATION TRACKING STARTS IN 60 SECONDS';
  }

  function scenario2ConfirmGs2Elevation() {
    if (!canScenario2ConfirmGs2Elevation()) {
      markSomFail('confirmGs2Elevation', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (gs2Elevation.value === null || gs2Elevation.value < 5) {
      markSomFail('confirmGs2Elevation', 'FAILED - GS2 ELEVATION BELOW 5°');
      return;
    }

    scenario2Gs2ElevationConfirmedBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOM CONFIRMED - GS2 ELEVATION ACCEPTABLE (${gs2Elevation.value}°)`;
  }

  function scenario2AskGs2SignalQuality() {
    if (!canScenario2AskGs2SignalQuality()) {
      markSomFail('askGs2SignalQuality', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }
    scenario2Gs2SignalQualityCheckedBySom.value = true;
    clearSomFail();
    resultStatus.value = `SOE1 REPORT - GS2 / GS2SIG SIGNAL QUALITY ${gs2SignalQuality.value} / FILTER REQUIRED BY SPACON`;
  }

  function scenario2RequestGs2SignalFilter() {
    if (!canScenario2RequestGs2SignalFilter()) {
      markSomFail('requestGs2Filter', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    scenario2Gs2SignalFilterRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE GS2 / GS2SIG FILTER SIGNAL';
  }

  function scenario2RequestPayloadPowerIncrease() {
    if (!canScenario2RequestPayloadPowerIncrease()) {
      markSomFail('requestPowerIncrease', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    payloadPowerIncreaseRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE PWR740 INCREASE PAYLOAD POWER';
  }

  function scenario2RequestCameraConfiguration() {
    if (!canScenario2RequestCameraConfiguration()) {
      markSomFail('requestCameraConfig', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    cameraConfigurationRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE CAM000 CONFIGURE CAMERA';
  }

  function scenario2ReportPostPowerThermals() {
    if (!canScenario2ReportPostPowerThermals()) {
      markSomFail('reportPostPowerThermals', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    postPowerThermalReportedBySoe.value = true;
    clearSomFail();
    resultStatus.value = `SOE2 REPORT - THERMAL PANEL: EPT014 ${epsTemperature.value} °C / PCU447 MONITOR / DCC208 MONITOR`;
  }

  function scenario2RequestImageCapture() {
    if (!canScenario2RequestImageCapture()) {
      markSomFail('requestImageCapture', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    imageCaptureRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE IMG901 TAKE IMAGE';
  }

  function scenario2RequestSpacecraftStandby() {
    if (!canScenario2RequestSpacecraftStandby()) {
      markSomFail('requestStandby', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    spacecraftStandbyRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE STB901 SPACECRAFT STANDBY MODE';
  }

  function somRequestNormalSpacecraftStandby() {
    if (!canSomRequestNormalSpacecraftStandby()) {
      markSomFail('requestNormalStandby', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    spacecraftStandbyRequestedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM REQUESTED - SPACON EXECUTE STB901 SPACECRAFT STANDBY MODE';
  }

  function scenario2VerifyGs2Signal() {
    if (!canScenario2VerifyGs2Signal()) {
      markSomFail('verifyGs2Signal', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (gs2SignalQuality.value !== 'GOOD') {
      markSomFail('verifyGs2Signal', 'FAILED - GS2 SIGNAL NOT GOOD');
      return;
    }

    scenario2Gs2SignalVerifiedBySoe.value = true;
    clearSomFail();
    resultStatus.value = 'SOE1 REPORT - GS2 SIGNAL QUALITY GOOD / LINK STABLE';
  }

  function somVerifyCamera() {
    if (!canVerifyCamera()) {
      markSomFail('verifyCamera', 'FAILED - WRONG PROCEDURE STEP');
      return;
    }

    if (!cameraConfigured.value) {
      markSomFail('verifyCamera', 'FAILED - CAMERA NOT CONFIGURED');
      return;
    }

    if (isScenario2.value && (!payloadPowerRaised.value || !epsNominal.value)) {
      markSomFail('verifyCamera', 'FAILED - POWER NOT NOMINAL FOR CAMERA OPERATION');
      return;
    }

    cameraVerifiedBySom.value = true;
    clearSomFail();
    resultStatus.value = 'SOM VERIFIED - CAMERA READY';
  }

  function playIntroAudio() {
    const introAudio = introAudioRef.value;
    const fomAudio = fomAudioRef.value;

    if (introFadeInterval) {
      window.clearInterval(introFadeInterval);
      introFadeInterval = undefined;
    }

    if (fomFadeInterval) {
      window.clearInterval(fomFadeInterval);
      fomFadeInterval = undefined;
    }

    if (introAudio) {
      introAudio.loop = true;
      introAudio.volume = 1;

      introAudio.play().catch(() => {
        // Browser blocked autoplay until first user interaction.
      });
    }

    if (fomAudio) {
      fomAudio.loop = true;
      fomAudio.volume = 0.55;

      fomAudio.play().catch(() => {
        // Browser blocked autoplay until first user interaction.
      });
    }
  }

  function fadeOutIntroAudio(durationMs = 1000) {
    const introAudio = introAudioRef.value;
    const fomAudio = fomAudioRef.value;

    if (introFadeInterval) {
      window.clearInterval(introFadeInterval);
      introFadeInterval = undefined;
    }

    if (fomFadeInterval) {
      window.clearInterval(fomFadeInterval);
      fomFadeInterval = undefined;
    }

    const steps = 20;
    const stepTime = durationMs / steps;

    if (introAudio) {
      const introStartVolume = introAudio.volume;
      let introStep = 0;

      introFadeInterval = window.setInterval(() => {
        introStep += 1;
        introAudio.volume = Math.max(0, introStartVolume * (1 - introStep / steps));

        if (introStep >= steps) {
          window.clearInterval(introFadeInterval);
          introFadeInterval = undefined;
          introAudio.pause();
          introAudio.currentTime = 0;
          introAudio.volume = 1;
        }
      }, stepTime);
    }

    if (fomAudio) {
      const fomStartVolume = fomAudio.volume;
      let fomStep = 0;

      fomFadeInterval = window.setInterval(() => {
        fomStep += 1;
        fomAudio.volume = Math.max(0, fomStartVolume * (1 - fomStep / steps));

        if (fomStep >= steps) {
          window.clearInterval(fomFadeInterval);
          fomFadeInterval = undefined;
          fomAudio.pause();
          fomAudio.currentTime = 0;
          fomAudio.volume = 0.55;
        }
      }, stepTime);
    }
  }

  function playStartAudio() {
    const audio = startAudioRef.value;
    if (!audio) return;

    audio.loop = false;
    audio.volume = 1;
    audio.currentTime = 0;

    audio.play().catch(() => {
      // Browser blocked audio playback.
    });
  }

  function unlockAudio() {
    audioUnlocked.value = true;

    if (!selectedScenario.value && introPhase.value === 'menu') {
      playIntroAudio();
    }
  }

  async function selectScenario(name: string) {
    unlockAudio();
    fadeOutIntroAudio(1000);
    playStartAudio();

    pendingScenario.value = name;
    introPhase.value = 'fade';

    window.setTimeout(async () => {
      introPhase.value = 'video';

      await nextTick();

      if (introVideoRef.value) {
        introVideoRef.value.currentTime = 0;
        introVideoRef.value.play();
      }
    }, 1000);
  }

  function finishWelcomeIntro() {
    selectedScenario.value = pendingScenario.value;
    activePanel.value = 'SOM';
    resetSimulation();

    pendingScenario.value = '';
    introPhase.value = 'menu';
  }

  function requestBackToScenarioSelection() {
    if (!isSom.value) {
      return;
    }

    backConfirmVisible.value = true;
    backConfirmArmed.value = false;

    syncNow();
  }

  function cancelBackToScenarioSelection() {
    if (!isSom.value) {
      return;
    }

    backConfirmVisible.value = false;
    backConfirmArmed.value = false;

    syncNow();
  }

  function armBackToScenarioSelection() {
    if (!isSom.value) {
      return;
    }

    backConfirmArmed.value = true;

    syncNow();
  }

  function confirmBackToScenarioSelection() {
    if (!isSom.value) {
      return;
    }

    if (!backConfirmArmed.value) {
      return;
    }

    backConfirmVisible.value = false;
    backConfirmArmed.value = false;
    selectedScenario.value = '';
    resetSimulation();
    playIntroAudio();

    syncNow();
  }

  function startSimulation() {
    if (simulationStatus.value === 'RUNNING') return;

    simulationStatus.value = 'RUNNING';
    clearSomFail();

    syncNow();

    timerId = window.setInterval(() => {
      missionSeconds.value += 1;
      updatePayloadPowerTransitions();
      updatePowerSavingTransition();
      updateBatteryEqualization();
      updateThermalModel();
      updateMemoryDump();
      updateSubsystemTmLogs();

      syncNow();
    }, 1000);
  }

  function toggleEmergencyContactList() {
    if (!isSom.value) {
      return;
    }
    emergencyStep.value = 'contacts';
    syncNow();
  }

  function startEmergencyMessageTyping() {
    if (emergencyTypingTimer) {
      clearInterval(emergencyTypingTimer);
      emergencyTypingTimer = null;
    }

    typedEmergencyMessage.value = '';
    typingEmergencyMessage.value = true;

    const fullText = emergencyMessageText.value;
    let i = 0;

    emergencyTypingTimer = window.setInterval(() => {
      typedEmergencyMessage.value += fullText[i];
      i++;

      if (i >= fullText.length) {
        if (emergencyTypingTimer) {
          clearInterval(emergencyTypingTimer);
          emergencyTypingTimer = null;
        }
        typingEmergencyMessage.value = false;
      }
    }, 60);
  }

  function selectEmergencyContact(role: string) {
    if (!isSom.value) {
      return;
    }

    selectedEmergencyContact.value = role;
    emergencyMessageSent.value = false;
    gncWaitingForResponse.value = false;
    gncResponseNegative.value = false;
    gncProcedureSuggested.value = false;
    gncSuggestionModalVisible.value = false;

    if (role === 'GNC') {
      emergencyStep.value = 'compose';
      typedEmergencyMessage.value = '';
      typingEmergencyMessage.value = false;

      syncNow();

      startEmergencyMessageTyping();
      return;
    }

    syncNow();
  }

  function sendEmergencyMessageToGnc() {
    if (!isSom.value) {
      return;
    }

    if (selectedEmergencyContact.value !== 'GNC') {
      return;
    }

    emergencyMessageSent.value = true;
    gncWaitingForResponse.value = true;
    emergencyStep.value = 'waiting';
    gncResponseNegative.value = false;
    gncProcedureSuggested.value = false;
    gncSuggestionModalVisible.value = false;
    resultStatus.value = 'GNC-KONTAKT GESENDET - WARTE AUF ANTWORT';

    syncNow();

    window.setTimeout(() => {
      gncWaitingForResponse.value = false;
      gncResponseNegative.value = true;
      gncProcedureSuggested.value = true;
      emergencyModalVisible.value = false;
      gncSuggestionModalVisible.value = true;
      resultStatus.value = 'GNC-ANTWORT - NEGATIV / IMPORT EINER NEUEN PROZEDUR EMPFOHLEN';

      syncNow();
    }, 10000);
  }

  function importScenario2EmergencyProcedure() {
    if (!isSom.value) {
      return;
    }

    if (!gncProcedureSuggested.value || procedureImporting.value) {
      return;
    }

    procedureImporting.value = true;
    resultStatus.value = 'NEUE PROZEDUR WIRD HERUNTERGELADEN / IMPORTIERT';

    syncNow();

    window.setTimeout(() => {
      scenario2NewProcedureImported.value = true;
      epsAskedBySom.value = true;
      batteryStatusEvaluatedBySom.value = true;
      batteryEqualizationRequestedBySom.value = false;
      batteryEqualizationInProgress.value = false;
      batteryEqualizationComplete.value = false;
      batteryRecheckedBySom.value = false;
      powerSavingRequestedBySom.value = false;
      powerSavingModeInProgress.value = false;
      powerSavingTransitionSeconds.value = 0;
      powerSavingModeActive.value = false;
      powerStatusVerifiedBySom.value = false;
      emergencyModalVisible.value = false;
      gncSuggestionModalVisible.value = false;
      procedureImporting.value = false;
      thermalCoolingActive.value = false;
      epsTemperature.value = 90.2;
      resultStatus.value = 'NEUE PROZEDUR IMPORTIERT - MIT BATTERY EQUALIZATION FORTFAHREN';

      syncNow();
    }, 1800);
  }

  function abortSimulation() {
    simulationStatus.value = 'ABORTED';
    if (timerId !== undefined) {
      clearInterval(timerId);
      timerId = undefined;
    }
  }

  function resetSimulation() {
    simulationStatus.value = 'IDLE';
    missionSeconds.value = 0;

    selectedCommand.value = '';
    isArmed.value = false;
    isGoReady.value = false;
    resultStatus.value = 'NO RESULT';
    failedSomAction.value = '';

    payloadInstrumentModeReportedBySom.value = false;

    elevationAskedBySom.value = false;
    elevationConfirmedBySom.value = false;

    signalQualityReportedBySom.value = false;
    signalFilterRequestedBySom.value = false;
    signalFiltered.value = false;
    signalVerifiedBySom.value = false;

    memoryAskedBeforeDumpBySom.value = false;
    memoryDumpAuthorizedBySom.value = false;
    memoryDumpRequestedBySom.value = false;
    memoryDumpStarted.value = false;
    memoryDumpComplete.value = false;
    memoryAskedAfterDumpBySom.value = false;
    memoryVerifiedBySom.value = false;
    memoryUsed.value = 87;

    epsAskedBySom.value = false;
    batteryStatusEvaluatedBySom.value = false;
    batteryEqualizationRequestedBySom.value = false;
    batteryEqualizationInProgress.value = false;
    batteryEqualizationComplete.value = false;
    batteryRecheckedBySom.value = false;
    powerStatusAskedBySom.value = false;
    powerSavingRequestedBySom.value = false;
    powerSavingModeInProgress.value = false;
    powerSavingTransitionSeconds.value = 0;
    powerSavingModeActive.value = false;
    powerStatusVerifiedBySom.value = false;
    batteryEmergencyDowngraded.value = false;
    scenario2BatteryA.value = 96;
    scenario2BatteryB.value = 3;
    scenario2BatteryC.value = 5;
    emergencyModalVisible.value = false;
    emergencyContactListOpen.value = false;
    selectedEmergencyContact.value = '';
    emergencyMessageSent.value = false;
    gncWaitingForResponse.value = false;
    gncResponseNegative.value = false;
    gncProcedureSuggested.value = false;
    gncSuggestionModalVisible.value = false;
    scenario2NewProcedureImported.value = false;
    thermalValuesAskedBySom.value = false;
    epsMitigationRequestedBySom.value = false;
    payloadReductionCommandRequestedBySom.value = false;
    powerReducedBySpacon.value = false;
    epsAskedAfterMitigationBySom.value = false;
    epsConfirmedBySom.value = false;
    scenario2WeakSignalWarning.value = false;
    gs1ConnectionActive.value = true;

    gs1DegradationStartSecond.value = null;
    gs1ElevationAtDegradation.value = 0;

    gs1LossStartSecond.value = null;
    scenario2Gs1SignalCheckedBySom.value = false;
    scenario2Gs2ElevationConfirmedBySom.value = false;
    scenario2Gs2SignalQualityCheckedBySom.value = false;
    scenario2Gs2SignalFiltered.value = false;
    scenario2Gs2SignalFilterRequestedBySom.value = false;
    scenario2Gs2SignalVerifiedBySoe.value = false;
    scenario2Gs2TrackingStartSecond.value = null;
    payloadPowerIncreaseRequestedBySom.value = false;
    cameraConfigurationRequestedBySom.value = false;
    imageCaptureRequestedBySom.value = false;
    spacecraftStandbyRequestedBySom.value = false;

    emergencyStep.value = 'summary';
    typedEmergencyMessage.value = '';
    typingEmergencyMessage.value = false;

    if (emergencyTypingTimer) {
      clearInterval(emergencyTypingTimer);
      emergencyTypingTimer = null;
    }

    normalPayloadPowerIncreaseRequestedBySom.value = false;
    normalCameraConfigurationRequestedBySom.value = false;
    normalImageCaptureRequestedBySom.value = false;
    payloadPowerRaised.value = false;
    cameraConfigured.value = false;
    cameraVerifiedBySom.value = false;
    postPowerThermalReportedBySoe.value = false;
    imageTaken.value = false;
    spacecraftStandbyActive.value = false;

    thermalCoolingActive.value = false;
    powerReductionInProgress.value = false;
    powerIncreaseInProgress.value = false;
    payloadPowerLevel.value = 20;
    epsTemperature.value = 84.5;

    capturedImageName.value = '';
    imageValidity.value = 'NO IMAGE';
    capturedImageCapturedAt.value = '';
    capturedImageLocation.value = '';
    capturedImageCoordinates.value = '';

    tcHistory.value = [];
    tmHistoryGS.value = [];
    tmHistoryEPS.value = [];
    tmHistoryPayload.value = [];
    tmHistoryMemory.value = [];
    lastTmLogSecond = -1;

    if (timerId !== undefined) {
      clearInterval(timerId);
      timerId = undefined;
    }
  }

  function selectCommand(command: string) {
    if (!isSpacon.value) {
      return;
    }

    selectedCommand.value = command;
    isArmed.value = false;
    isGoReady.value = false;
    const selected = spaconCommands.value.find((cmd) => cmd.command === command);
    resultStatus.value = selected ? 'COMMAND SELECTED - ' + selected.code : 'COMMAND SELECTED';

    syncNow();
  }

  function armCommand() {
    if (!isSpacon.value) {
      return;
    }

    if (!selectedCommand.value) {
      resultStatus.value = 'FAILED - NO COMMAND SELECTED';
      syncNow();
      return;
    }

    isArmed.value = true;
    isGoReady.value = true;
    resultStatus.value = 'COMMAND ARMED - READY FOR GO';

    syncNow();
  }

  function disarmCommand() {
    if (!isSpacon.value) {
      return;
    }

    if (!selectedCommand.value) {
      resultStatus.value = 'FAILED - NO COMMAND SELECTED';
      syncNow();
      return;
    }

    if (!isArmed.value) {
      resultStatus.value = 'COMMAND ALREADY DISARMED';
      syncNow();
      return;
    }

    isArmed.value = false;
    isGoReady.value = false;
    resultStatus.value = 'COMMAND DISARMED - SELECTED COMMAND KEPT';

    syncNow();
  }

  function goCommand() {
    if (!isSpacon.value) {
      return;
    }

    if (!selectedCommand.value) {
      resultStatus.value = 'FAILED - NO COMMAND SELECTED';
      syncNow();
      return;
    }

    if (!isArmed.value) {
      resultStatus.value = 'FAILED - COMMAND NOT ARMED';
      syncNow();
      return;
    }

    const command = selectedCommand.value;
    const result = executeCommand(command);

    resultStatus.value = result;

    tcHistory.value.unshift({
      time: missionTime.value,
      command,
      result,
    });

    selectedCommand.value = '';
    isArmed.value = false;
    isGoReady.value = false;

    syncNow();
  }

  function updateCapturedImageMetadata() {
    switch (capturedImageName.value) {
      case '0-4':
        capturedImageLocation.value = 'Mannheim – Feudenheim – Rheinau – Ladenburg – Ilvesheim';
        capturedImageCoordinates.value = '49.481404° N, 8.529502° E';
        break;

      case '4-8':
        capturedImageLocation.value = 'Laudenbach – Hemsbach – Lampertheim – Bürstadt – Einhausen';
        capturedImageCoordinates.value = '49.601288° N, 8.549813° E';
        break;

      case '8-11':
        capturedImageLocation.value =
          'Alsbach-Hähnlein – Zwingenberg – Jugenheim – Seeheim – Pfungstadt – Eberstadt';
        capturedImageCoordinates.value = '49.771704° N, 8.546100° E';
        break;

      case '11-13':
        capturedImageLocation.value =
          'Darmstadt – Griesheim – Weiterstadt – Riedstadt – Groß-Gerau – Wixhausen – Messel – Egelsbach';
        capturedImageCoordinates.value = '49.893374° N, 8.573235° E';
        break;

      case '13-14':
        capturedImageLocation.value =
          'Darmstadt – Griesheim – Weiterstadt – Riedstadt – Groß-Gerau – Wixhausen – Egelsbach – Langen';
        capturedImageCoordinates.value = '49.926225° N, 8.549311° E';
        break;

      case '14-15':
        capturedImageLocation.value =
          'Groß-Gerau – Braunshardt – Erzhausen – Darmstadt-Arheilgen – Mörfelden-Walldorf – Langen';
        capturedImageCoordinates.value = '49.967097° N, 8.552744° E';
        break;

      case '15-15.5':
        capturedImageLocation.value =
          'Frankfurt Airport – Walldorf – Raunheim – Langen – Kelsterbach';
        capturedImageCoordinates.value = '50.036830° N, 8.559610° E';
        break;

      case '15.5-16':
        capturedImageLocation.value =
          'Groß-Gerau – Braunshardt – Erzhausen – Darmstadt-Arheilgen – Mörfelden-Walldorf – Langen';
        capturedImageCoordinates.value = '49.967097° N, 8.552744° E';
        break;

      case '16-16.5':
        capturedImageLocation.value =
          'Frankfurt am Main – Gallus – Sossenheim – Sulzbach – Kelkheim – Eschborn';
        capturedImageCoordinates.value = '50.106462° N, 8.558924° E';
        break;

      case '16.5-17':
        capturedImageLocation.value =
          'Frankfurt am Main – Gallus – Sossenheim – Sulzbach – Kelkheim – Eschborn – Oberursel – Kronberg';
        capturedImageCoordinates.value = '50.106462° N, 8.558924° E';
        break;

      case '17-18':
        capturedImageLocation.value = 'Bad Homburg – Oberursel – Kronberg – Friedrichsdorf';
        capturedImageCoordinates.value = '50.232028° N, 8.619349° E';
        break;

      default:
        capturedImageLocation.value = '';
        capturedImageCoordinates.value = '';
        break;
    }
  }

  function selectImageForTime() {
    const t = missionSeconds.value / 60;

    if (isScenario2.value && scenario2NewProcedureImported.value) {
      if (t >= 0 && t < 5) {
        capturedImageName.value = '';
        imageValidity.value = 'NO IMAGE';
        return 'NO IMAGE';
      }

      if (t >= 5 && t < 10) {
        capturedImageName.value = '0-4';
        imageValidity.value = 'NO TARGET VISIBILITY';
        return 'NO TARGET VISIBILITY';
      }

      if (t >= 10 && t < 15) {
        capturedImageName.value = '4-8';
        imageValidity.value = 'WRONG TARGET AREA';
        return 'WRONG TARGET AREA';
      }

      if (t >= 15 && t < 20) {
        capturedImageName.value = '8-11';
        imageValidity.value = 'EARLY PASS GEOMETRY';
        return 'EARLY PASS GEOMETRY';
      }

      if (t >= 20 && t < 25) {
        capturedImageName.value = '11-13';
        imageValidity.value = 'TARGET APPROACHING';
        return 'TARGET APPROACHING';
      }

      if (t >= 25 && t < 29) {
        capturedImageName.value = '13-14';
        imageValidity.value = 'PRE-TARGET AREA';
        return 'PRE-TARGET AREA';
      }

      if (t >= 29 && t < 30) {
        capturedImageName.value = '14-15';
        imageValidity.value = 'FINAL APPROACH IMAGE';
        return 'FINAL APPROACH IMAGE';
      }

      if (t >= 30 && t < 30.5) {
        capturedImageName.value = '15-15.5';
        imageValidity.value = 'VALID TARGET IMAGE';
        return 'SUCCESS - TARGET CAPTURED';
      }

      if (t >= 30.5 && t < 31) {
        capturedImageName.value = '15.5-16';
        imageValidity.value = 'VALID TARGET IMAGE';
        return 'SUCCESS - TARGET CAPTURED';
      }

      if (t >= 31 && t < 32) {
        capturedImageName.value = '16-16.5';
        imageValidity.value = 'LATE TARGET IMAGE';
        return 'LATE TARGET IMAGE';
      }

      if (t >= 32 && t < 33) {
        capturedImageName.value = '17-18';
        imageValidity.value = 'VERY LATE IMAGE';
        return 'VERY LATE IMAGE';
      }

      capturedImageName.value = '';
      imageValidity.value = 'NO IMAGE';
      return 'NO IMAGE';
    }

    if (t >= 0 && t < 4) {
      capturedImageName.value = '0-4';
      imageValidity.value = 'NO TARGET VISIBILITY';
      return 'NO TARGET VISIBILITY';
    }

    if (t >= 4 && t < 8) {
      capturedImageName.value = '4-8';
      imageValidity.value = 'WRONG TARGET AREA';
      return 'WRONG TARGET AREA';
    }

    if (t >= 8 && t < 11) {
      capturedImageName.value = '8-11';
      imageValidity.value = 'EARLY PASS GEOMETRY';
      return 'EARLY PASS GEOMETRY';
    }

    if (t >= 11 && t < 13) {
      capturedImageName.value = '11-13';
      imageValidity.value = 'TARGET APPROACHING';
      return 'TARGET APPROACHING';
    }

    if (t >= 13 && t < 14) {
      capturedImageName.value = '13-14';
      imageValidity.value = 'PRE-TARGET AREA';
      return 'PRE-TARGET AREA';
    }

    if (t >= 14 && t < 15) {
      capturedImageName.value = '14-15';
      imageValidity.value = 'EARLY IMAGE';
      return 'EARLY IMAGE';
    }

    if (t >= 15 && t < 15.5) {
      capturedImageName.value = '15-15.5';
      imageValidity.value = 'VALID TARGET IMAGE';
      return 'SUCCESS - TARGET CAPTURED';
    }

    if (t >= 15.5 && t < 16) {
      capturedImageName.value = '15.5-16';
      imageValidity.value = 'VALID TARGET IMAGE';
      return 'SUCCESS - TARGET CAPTURED';
    }

    if (t >= 16 && t < 16.5) {
      capturedImageName.value = '16-16.5';
      imageValidity.value = 'LATE TARGET IMAGE';
      return 'LATE TARGET IMAGE';
    }

    if (t >= 16.5 && t < 17) {
      capturedImageName.value = '16.5-17';
      imageValidity.value = 'LATE IMAGE';
      return 'LATE IMAGE';
    }

    if (t >= 17 && t <= 18) {
      capturedImageName.value = '17-18';
      imageValidity.value = 'VERY LATE IMAGE';
      return 'VERY LATE IMAGE';
    }

    capturedImageName.value = '';
    imageValidity.value = 'NO IMAGE';
    return 'NO IMAGE';
  }

  function runSomSpaconCommand(command: string, action: string) {
    const result = executeCommand(command);
    resultStatus.value = result;

    if (result.startsWith('FAILED')) {
      markSomFail(action, result);
      return;
    }

    clearSomFail();
  }

  async function startEndSequence() {
    if (endingPhase.value !== 'none') return;

    fadeOutIntroAudio(500);
    playStartAudio();

    endingPhase.value = 'fade';
    syncNow();

    window.setTimeout(async () => {
      endingPhase.value = 'video';
      syncNow();

      await nextTick();

      if (endVideoRef.value) {
        endVideoRef.value.currentTime = 0;
        endVideoRef.value.play().catch((error) => {
          console.error('End video play failed:', error);
        });
      }
    }, 1000);
  }

  watch(endingPhase, async (phase) => {
    if (phase !== 'video') {
      return;
    }

    await nextTick();

    if (endVideoRef.value) {
      endVideoRef.value.currentTime = 0;

      endVideoRef.value.play().catch((error) => {
        console.error('End video play failed:', error);
      });
    }
  });

  function finishEndSequence() {
    endingPhase.value = 'none';
    selectedScenario.value = '';
    pendingScenario.value = '';
    introPhase.value = 'menu';
    simulationStatus.value = 'IDLE';

    resetSimulation();
    playIntroAudio();

    syncNow();
  }

  function executeCommand(command: string) {
    const selectedDefinition = spaconCommands.value.find((item) => item.command === command);

    if (selectedDefinition?.kind === 'parameter') {
      return `SUCCESS - ${selectedDefinition.code} PARAMETER SELECTED / MONITORING REFERENCE ONLY / NO STATE CHANGE`;
    }

    const commandsAllowedDuringWeakSignal = [
      'Battery Equalization Transfer',
      'Enter Power Saving Mode',
      'Reduce Payload Power',
      'Filter Signal',
    ];

    const scenario2UsesGs2Link =
      isScenario2.value && scenario2Gs2SignalFiltered.value && currentProcedureStep.value >= 22;
    const activeSignalQuality = scenario2UsesGs2Link ? gs2SignalQuality.value : signalQuality.value;

    if (
      command !== 'Filter Signal' &&
      activeSignalQuality !== 'GOOD' &&
      !commandsAllowedDuringWeakSignal.includes(command)
    ) {
      return scenario2UsesGs2Link ? 'FAILED - GS2 SIGNAL NOT GOOD' : 'FAILED - SIGNAL NOT GOOD';
    }

    if (command === 'Filter Signal') {
      if (isScenario2.value && currentProcedureStep.value === 22) {
        if (!scenario2Gs2SignalQualityCheckedBySom.value)
          return 'FAILED - GS2 SIGNAL QUALITY NOT CHECKED BY SOE';
        if (!scenario2Gs2SignalFilterRequestedBySom.value)
          return 'FAILED - GS2 FILTER SIGNAL NOT REQUESTED BY SOM';
        if (!scenario2Gs2ElevationConfirmedBySom.value)
          return 'FAILED - GS2 ELEVATION NOT CONFIRMED BY SOM';
        scenario2Gs2SignalFiltered.value = true;
        scenario2WeakSignalWarning.value = false;
        return 'SUCCESS - GS2 SIGNAL FILTERED';
      }

      if (currentProcedureStep.value !== 5) return 'FAILED - WRONG PROCEDURE STEP';
      if (!elevationConfirmedBySom.value) return 'FAILED - ELEVATION NOT CONFIRMED BY SOM';
      if (!signalQualityReportedBySom.value) return 'FAILED - SIGNAL QUALITY NOT CHECKED BY SOE';
      if (!signalFilterRequestedBySom.value) return 'FAILED - FILTER SIGNAL NOT REQUESTED BY SOM';
      signalFiltered.value = true;
      return 'SUCCESS - SIGNAL FILTERED / SOM VERIFICATION REQUIRED';
    }

    if (command === 'Dump Memory') {
      if (currentProcedureStep.value !== 9) return 'FAILED - WRONG PROCEDURE STEP';
      if (!memoryDumpAuthorizedBySom.value) return 'FAILED - MEMORY DUMP NOT AUTHORIZED BY SOM';
      if (!memoryDumpRequestedBySom.value) return 'FAILED - MEMORY DUMP NOT REQUESTED BY SOM';
      memoryDumpStarted.value = true;
      memoryDumpComplete.value = false;
      capturedImageName.value = '';
      imageValidity.value = 'NO IMAGE';
      capturedImageCapturedAt.value = '';
      capturedImageLocation.value = '';
      capturedImageCoordinates.value = '';
      return 'SUCCESS - MEMORY DUMP STARTED / STORED IMAGES REMOVED';
    }

    if (command === 'Battery Equalization Transfer') {
      if (!isScenario2.value || currentProcedureStep.value !== 13)
        return 'FAILED - WRONG PROCEDURE STEP';
      if (!batteryEqualizationRequestedBySom.value)
        return 'FAILED - BATTERY EQUALIZATION NOT REQUESTED BY SOM';
      batteryEqualizationInProgress.value = true;
      batteryEqualizationComplete.value = false;
      return 'IN PROGRESS - BATTERY EQUALIZATION TRANSFER STARTED';
    }

    if (command === 'Enter Power Saving Mode') {
      if (!isScenario2.value || currentProcedureStep.value !== 16)
        return 'FAILED - WRONG PROCEDURE STEP';
      if (!powerSavingRequestedBySom.value)
        return 'FAILED - POWER SAVING MODE NOT REQUESTED BY SOM';
      powerSavingModeInProgress.value = true;
      powerSavingTransitionSeconds.value = 0;
      powerSavingModeActive.value = false;
      return 'IN PROGRESS - ENTERING POWER SAVING MODE';
    }

    if (command === 'Reduce Payload Power') {
      if (currentProcedureStep.value !== (isScenario2.value ? 24 : 14))
        return 'FAILED - WRONG PROCEDURE STEP';
      if (!epsMitigationRequestedBySom.value) return 'FAILED - MITIGATION NOT REQUESTED BY SOM';
      if (!payloadReductionCommandRequestedBySom.value)
        return 'FAILED - EPT014 REDUCTION NOT REQUESTED BY SOM';
      thermalCoolingActive.value = true;
      powerReductionInProgress.value = true;
      powerIncreaseInProgress.value = false;
      powerReducedBySpacon.value = false;
      payloadPowerRaised.value = false;
      cameraConfigured.value = false;
      cameraVerifiedBySom.value = false;
      epsConfirmedBySom.value = false;

      if (completePayloadReductionIfReady()) {
        return 'SUCCESS - PAYLOAD POWER ALREADY AT SAFE LEVEL';
      }

      return 'IN PROGRESS - PAYLOAD POWER REDUCTION STARTED';
    }

    if (command === 'Increase Payload Power') {
      if (currentProcedureStep.value !== (isScenario2.value ? 27 : 17))
        return 'FAILED - WRONG PROCEDURE STEP';
      if (
        isScenario2.value &&
        scenario2NewProcedureImported.value &&
        !payloadPowerIncreaseRequestedBySom.value
      )
        return 'FAILED - PAYLOAD POWER INCREASE NOT REQUESTED BY SOM';
      if (
        (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
        !normalPayloadPowerIncreaseRequestedBySom.value
      )
        return 'FAILED - PAYLOAD POWER INCREASE NOT REQUESTED BY SOM';
      if (!epsConfirmedBySom.value) return 'FAILED - SOM EPS CONFIRMATION REQUIRED';
      thermalCoolingActive.value = false;
      powerIncreaseInProgress.value = true;
      powerReductionInProgress.value = false;
      payloadPowerRaised.value = false;
      lastPayloadPowerThermalSecond.value = -1;
      return 'IN PROGRESS - PAYLOAD POWER INCREASE STARTED';
    }

    if (command === 'Configure Camera') {
      if (currentProcedureStep.value !== (isScenario2.value ? 28 : 18))
        return 'FAILED - WRONG PROCEDURE STEP';
      if (
        isScenario2.value &&
        scenario2NewProcedureImported.value &&
        !cameraConfigurationRequestedBySom.value
      )
        return 'FAILED - CAMERA CONFIGURATION NOT REQUESTED BY SOM';
      if (
        (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
        !normalCameraConfigurationRequestedBySom.value
      )
        return 'FAILED - CAMERA CONFIGURATION NOT REQUESTED BY SOM';
      if (!payloadPowerRaised.value) return 'FAILED - PAYLOAD POWER NOT RAISED';
      if (!epsConfirmedBySom.value) return 'FAILED - SOM EPS CONFIRMATION REQUIRED';
      if (!epsNominal.value) return 'FAILED - EPS NOT NOMINAL';
      cameraConfigured.value = true;
      return 'SUCCESS - CAMERA CONFIGURED / SOM VERIFICATION REQUIRED';
    }

    if (command === 'Take Image') {
      if (
        isScenario2.value &&
        scenario2NewProcedureImported.value &&
        !imageCaptureRequestedBySom.value
      )
        return 'FAILED - IMAGE CAPTURE NOT REQUESTED BY SOM';
      if (
        (!isScenario2.value || (isScenario2.value && !scenario2NewProcedureImported.value)) &&
        !normalImageCaptureRequestedBySom.value
      )
        return 'FAILED - IMAGE CAPTURE NOT REQUESTED BY SOM';
      if (currentProcedureStep.value !== (isScenario2.value ? 31 : 20)) {
        return 'FAILED - WRONG PROCEDURE STEP';
      }

      if (!cameraVerifiedBySom.value) return 'FAILED - CAMERA NOT VERIFIED BY SOM';
      if (!epsNominal.value) return 'FAILED - EPS UNSAFE FOR IMAGING';

      const captureTime = new Date();

      imageTaken.value = true;

      const captureResult = selectImageForTime();

      if (capturedImageName.value) {
        capturedImageCapturedAt.value =
          `${captureTime.toLocaleDateString()} ` +
          `${captureTime.toLocaleTimeString()} ` +
          `(${Intl.DateTimeFormat().resolvedOptions().timeZone})`;

        updateCapturedImageMetadata();
      } else {
        capturedImageCapturedAt.value = '';
        capturedImageLocation.value = '';
        capturedImageCoordinates.value = '';
      }

      return captureResult;
    }

    if (command === 'Spacecraft Standby Mode') {
      const standbyStep = isScenario2.value ? 32 : 21;

      if (currentProcedureStep.value !== standbyStep) return 'FAILED - WRONG PROCEDURE STEP';
      if (!spacecraftStandbyRequestedBySom.value)
        return 'FAILED - SPACECRAFT STANDBY NOT REQUESTED BY SOM';
      if (!imageTaken.value) return 'FAILED - IMAGE CAPTURE NOT COMPLETE';

      spacecraftStandbyActive.value = true;
      payloadPowerLevel.value = 8;
      payloadPowerRaised.value = false;
      cameraConfigured.value = false;

      startEndSequence();

      return 'SUCCESS - SPACECRAFT ENTERED STANDBY MODE / END SEQUENCE STARTED';
    }

    return 'FAILED - UNKNOWN COMMAND';
  }
</script>

<template>
  <audio ref="introAudioRef" preload="auto">
    <source src="/audio/intro.mp3" type="audio/mpeg" />
  </audio>

  <audio ref="fomAudioRef" preload="auto">
    <source src="/audio/FOM.mp3" type="audio/mpeg" />
  </audio>

  <audio ref="startAudioRef" preload="auto">
    <source src="/audio/start.mp3" type="audio/mpeg" />
  </audio>

  <div v-if="!selectedScenario" class="scenario-screen" @pointerdown="unlockAudio">
    <video class="start-background-video" autoplay muted loop playsinline>
      <source src="/videos/start-background.mp4" type="video/mp4" />
    </video>

    <div class="scenario-screen-overlay"></div>

    <div
      v-if="introPhase !== 'video'"
      class="scenario-screen-content"
      :class="{ 'scenario-fade-out': introPhase === 'fade' }"
    >
      <h1>MCS</h1>
      <h1>Mission Control System Simulator</h1>

      <p>Developed for DLR School Lab / Control Center of ESOC</p>

      <p class="developer-credit">
        <span>Developed by Hoshyar Iranpour</span>

        <a
          class="linkedin-link"
          href="https://www.linkedin.com/in/alireza-iranpoor-mobarakeh-53080a307/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Hoshyar Iranpour LinkedIn profile"
          title="LinkedIn"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" class="linkedin-icon">
            <path
              fill="currentColor"
              d="M6.94 8.5H3.56V19h3.38V8.5ZM5.25 3A1.96 1.96 0 1 0 5.25 6.92 1.96 1.96 0 0 0 5.25 3ZM20.44 13.06c0-3.17-1.69-4.64-3.95-4.64-1.82 0-2.63 1-3.08 1.71V8.5h-3.38c.04 1.08 0 10.5 0 10.5h3.38v-5.86c0-.31.02-.63.12-.85.25-.63.82-1.27 1.78-1.27 1.26 0 1.76.96 1.76 2.36V19h3.37v-5.94Z"
            />
          </svg>
        </a>
      </p>

      <p style="margin-top: 20px">Select a training scenario</p>

      <button :disabled="introPhase !== 'menu'" @click="selectScenario('Scenario 1 Elementary A')">
        Nominal Ground Pass and Imaging I
      </button>

      <button :disabled="introPhase !== 'menu'" @click="selectScenario('Scenario 1 Elementary')">
        Nominal Ground Pass and Imaging II
      </button>

      <button :disabled="introPhase !== 'menu'" @click="selectScenario('Scenario 1')">
        Nominal Ground Pass and Imaging III
      </button>

      <button :disabled="introPhase !== 'menu'" @click="selectScenario('Scenario 2')">
        Communications & Thermal Contingency
      </button>

      <button disabled>Rendezvous & On-Orbit Servicing</button>
    </div>

    <div v-if="introPhase === 'fade'" class="scenario-black-fade"></div>

    <video
      v-if="introPhase === 'video'"
      ref="introVideoRef"
      class="welcome-intro-video"
      playsinline
      @ended="finishWelcomeIntro"
    >
      <source src="/videos/welcome-intro.mp4" type="video/mp4" />
    </video>
  </div>

  <div
    v-else
    class="app"
    :class="{
      'simulation-fade-out': endingPhase === 'fade',
      'elementary-a-mode': isElementaryAScenario,
    }"
  >
    <div class="sidebar">
      <h2>MCS</h2>
      <button @click="activePanel = 'SOM'">SOM</button>
      <button @click="activePanel = 'GS'">Ground Station</button>
      <button @click="activePanel = 'EPS'">EPS</button>
      <button @click="activePanel = 'AOCS'">AOCS</button>
      <button @click="activePanel = 'TCS'">TCS</button>
      <button @click="activePanel = 'Payload'">Payload</button>

      <button @click="activePanel = 'CDH'">C&DH</button>
      <button @click="activePanel = 'SPACON'">SPACON</button>
      <button @click="activePanel = 'IMAGE'">Captured Image</button>
      <button @click="requestBackToScenarioSelection">Back to Scenarios</button>
    </div>

    <div class="main">
      <div class="topbar">
        <div>Mission Control System</div>

        <div>Status: {{ simulationStatus }}</div>

        <div :class="missionTimeClass">Time: {{ missionTime }}</div>

        <div :class="gs1AosClass">
          {{ gs1AosCountdown }}
        </div>

        <div>Phase: {{ missionPhase }}</div>

        <div :class="imagingClass">
          {{ imagingWindowLabel }}
        </div>
      </div>

      <div v-if="emergencyActive" class="emergency-banner" :class="emergencyLevelClass">
        {{ emergencyEventCode }} — {{ emergencyLevelText }}: EPS BATTERY DISCHARGE
      </div>

      <div v-if="scenario2WeakSignalWarning" class="emergency-banner blink-warning">
        WARNING — WEAK SIGNAL: GS1 LINK LOST DUE TO POWER SAVING MODE
      </div>

      <div v-if="backConfirmVisible" class="confirm-modal-overlay">
        <div class="confirm-modal">
          <h2>LEAVE SIMULATION?</h2>
          <p>This will reset the current simulation and return to scenario selection.</p>
          <div class="confirm-actions">
            <button @click="armBackToScenarioSelection" :class="{ armed: backConfirmArmed }">
              {{ backConfirmArmed ? 'ARMED' : 'ARM' }}
            </button>
            <button
              @click="confirmBackToScenarioSelection"
              :disabled="!backConfirmArmed"
              :class="{ goReady: backConfirmArmed }"
            >
              GO
            </button>
            <button @click="cancelBackToScenarioSelection" class="disarmed">
              DISARM AND CLOSE
            </button>
          </div>
        </div>
      </div>

      <div v-if="gncSuggestionModalVisible" class="emergency-modal-overlay">
        <div class="emergency-modal gnc-response-modal">
          <div class="emergency-header">
            <div class="emergency-symbol">!</div>
            <div>
              <h2>GNC-ANTWORT: NEGATIV</h2>
              <p>LAGEÄNDERUNG NICHT FREIGEGEBEN</p>
            </div>
          </div>
          <table class="emergency-table">
            <tr>
              <th>Antwort</th>
              <td class="status-bad blink-red">NEGATIV</td>
            </tr>
            <tr>
              <th>Empfehlung</th>
              <td class="status-warning blink-warning">
                Die Contingency-Prozedur importieren und mit der Batterie-Recovery fortfahren.
              </td>
            </tr>
          </table>

          <button
            class="import-procedure-button"
            @click="importScenario2EmergencyProcedure"
            :disabled="!isSom || procedureImporting"
          >
            <span v-if="procedureImporting" class="button-spinner"></span>
            {{
              procedureImporting
                ? 'WIRD HERUNTERGELADEN / IMPORTIERT...'
                : 'NEUE PROZEDUR IMPORTIEREN'
            }}
          </button>
        </div>
      </div>

      <div class="panel">
        <div v-show="activePanel === 'SOM'">
          <h1>SOM Panel</h1>

          <div class="procedure-box full-width">
            <h2>
              {{
                isScenario2 && !scenario2NewProcedureImported
                  ? 'Prozedur - Payload-Kalibrierung / Testaufnahme'
                  : 'Prozedur - Aufnahme Flughafen Frankfurt [50.039414727790565, 8.559004749233628]'
              }}
            </h2>

            <table v-if="isElementaryAScenario" class="procedure-table elementary-a-procedure-table">
              <tr>
                <th class="col-step">Schritt</th>
                <th class="col-role">Wer?</th>
                <th class="col-action">Was tun?</th>
                <th class="col-criteria">Prüfen / Lernen</th>
                <th class="col-som">SOM-Aktion</th>
                <th class="col-status">Status</th>
              </tr>

              <tr>
                <td>1</td>
                <td>SOM</td>
                <td>
                  Starte die Simulation. Warte, bis GS1 das Raumfahrzeug empfängt.
                </td>
                <td>
                  <strong>AOS</strong> bedeutet: Die Bodenstation hat Funkkontakt mit dem Raumfahrzeug.
                </td>
                <td>
                  <button
                    @click="startSimulation"
                    :disabled="!isSom || simulationStatus === 'RUNNING'"
                  >
                    Simulation starten
                  </button>
                </td>
                <td :class="classForStep(1, gs1AosReached)">
                  {{ statusForStep(1, gs1AosReached) }}
                </td>
              </tr>

              <tr>
                <td>2</td>
                <td>SOM → SOE1</td>
                <td>
                  Bitte SOE1: Ground Station öffnen und <strong>GEL005</strong> ablesen.
                </td>
                <td>
                  <strong>GEL005</strong> ist die Elevation: der Winkel des Raumfahrzeugs über dem Horizont.
                </td>
                <td>
                  <button
                    @click="somAskElevation"
                    :disabled="!isSom || !canSomAskElevation()"
                    :class="{ actionFail: failedSomAction === 'askElevation' }"
                  >
                    GEL005 anfragen
                  </button>
                </td>
                <td :class="classForStep(2, elevationAskedBySom)">
                  {{ statusForStep(2, elevationAskedBySom) }}
                </td>
              </tr>

              <tr>
                <td>3</td>
                <td>SOM</td>
                <td>Prüfe den gemeldeten Wert von <strong>GEL005</strong>.</td>
                <td>
                  <strong>GEL005 ≥ 5°</strong>. Ab 5° ist das Raumfahrzeug hoch genug für diesen Kontakt.
                </td>
                <td>
                  <button
                    @click="somConfirmElevation"
                    :disabled="!isSom || !canSomConfirmElevation()"
                    :class="{ actionFail: failedSomAction === 'confirmElevation' }"
                  >
                    Elevation bestätigen
                  </button>
                </td>
                <td :class="classForStep(3, elevationConfirmedBySom)">
                  {{ statusForStep(3, elevationConfirmedBySom) }}
                </td>
              </tr>

              <tr>
                <td>4</td>
                <td>SOM → SOE2</td>
                <td>
                  Bitte SOE2: Ground Station öffnen und <strong>GSE001</strong> und <strong>GBL092</strong> melden.
                </td>
                <td>
                  Ziel: <strong>GSE001 = NOMINAL</strong> und <strong>GBL092 = GOOD</strong>.
                  Diese Werte zeigen, ob das empfangene Signal gut ist.
                </td>
                <td>
                  <button
                    @click="somAskSignalQualityBeforeFilter"
                    :disabled="!isSom || !canAskSignalQualityBeforeFilter()"
                    :class="{ actionFail: failedSomAction === 'askSignalQuality' }"
                  >
                    Signalwerte anfragen
                  </button>
                </td>
                <td :class="classForStep(4, signalQualityReportedBySom)">
                  {{ statusForStep(4, signalQualityReportedBySom) }}
                </td>
              </tr>

              <tr>
                <td>5</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>GSE001</strong> wählen und <strong>Filter Signal</strong> ausführen.
                </td>
                <td>
                  Dauer etwa <strong>10 s</strong>. Der Filter hilft, das empfangene Signal zu verbessern.
                </td>
                <td>
                  <button
                    @click="somRequestSignalFilter"
                    :disabled="!isSom || !canSomRequestSignalFilter()"
                    :class="{ actionFail: failedSomAction === 'requestSignalFilter' }"
                  >
                    Signalfilter anfordern
                  </button>
                </td>
                <td
                  :class="
                    signalFilterRequestedBySom && !signalFiltered
                      ? 'status-progress'
                      : classForStep(5, signalFiltered)
                  "
                >
                  {{
                    signalFiltered
                      ? 'DONE'
                      : signalFilterRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(5, signalFiltered)
                  }}
                </td>
              </tr>

              <tr>
                <td>6</td>
                <td>SOM → SOE1</td>
                <td>
                  Bitte SOE1: <strong>GSE001</strong> und <strong>GBL092</strong> noch einmal ablesen.
                </td>
                <td>
                  Jetzt sollen <strong>GSE001 = NOMINAL</strong> und <strong>GBL092 = GOOD</strong> sein.
                  Damit wird geprüft, ob der Filter geholfen hat.
                </td>
                <td>
                  <button
                    @click="somVerifySignal"
                    :disabled="!isSom || !canVerifySignal()"
                    :class="{ actionFail: failedSomAction === 'verifySignal' }"
                  >
                    Signal bestätigen
                  </button>
                </td>
                <td :class="classForStep(6, signalVerifiedBySom)">
                  {{ statusForStep(6, signalVerifiedBySom) }}
                </td>
              </tr>

              <tr>
                <td>7</td>
                <td>SOM → SOE2</td>
                <td>
                  Bitte SOE2: C&amp;DH öffnen und <strong>MEM221</strong> ablesen.
                </td>
                <td>
                  <strong>MEM221</strong> zeigt, wie viel Speicher belegt ist. Normal sind hier <strong>≤ 10%</strong>.
                </td>
                <td>
                  <button
                    @click="somAskMemoryBeforeDump"
                    :disabled="!isSom || !canAskMemoryBeforeDump()"
                    :class="{ actionFail: failedSomAction === 'askMemoryBefore' }"
                  >
                    MEM221 anfragen
                  </button>
                </td>
                <td :class="classForStep(7, memoryAskedBeforeDumpBySom)">
                  {{ statusForStep(7, memoryAskedBeforeDumpBySom) }}
                </td>
              </tr>

              <tr>
                <td>8</td>
                <td>SOM</td>
                <td>Entscheide, ob der Speicher geleert werden soll.</td>
                <td>
                  <strong>MEM221 ≤ 50%</strong>: genug Platz. <strong>MEM221 &gt; 50%</strong>: Memory Dump nötig.
                  Ein Dump schafft wieder freien Speicher.
                </td>
                <td>
                  <button
                    @click="somAuthorizeMemoryDump"
                    :disabled="!isSom || !canAuthorizeMemoryDump()"
                    :class="{ actionFail: failedSomAction === 'authorizeMemoryDump' }"
                  >
                    Dump erlauben
                  </button>
                </td>
                <td :class="classForStep(8, memoryDumpAuthorizedBySom)">
                  {{ statusForStep(8, memoryDumpAuthorizedBySom) }}
                </td>
              </tr>

              <tr>
                <td>9</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>MEM221</strong> wählen und <strong>Dump Payload Memory</strong> ausführen.
                </td>
                <td>Dauer etwa <strong>15 s</strong>.</td>
                <td>
                  <button
                    @click="somRequestMemoryDumpBySpacon"
                    :disabled="!isSom || !canSomRequestMemoryDump()"
                    :class="{ actionFail: failedSomAction === 'requestMemoryDump' }"
                  >
                    Memory Dump anfordern
                  </button>
                </td>
                <td
                  :class="
                    memoryDumpStarted && !memoryDumpComplete
                      ? 'status-progress'
                      : memoryDumpRequestedBySom && !memoryDumpComplete
                        ? 'status-progress'
                        : classForStep(9, memoryDumpComplete)
                  "
                >
                  {{
                    memoryDumpComplete
                      ? 'DONE'
                      : memoryDumpStarted
                        ? 'IN PROGRESS'
                        : memoryDumpRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(9, memoryDumpComplete)
                  }}
                </td>
              </tr>

              <tr>
                <td>10</td>
                <td>SOM → SOE1</td>
                <td>
                  Bitte SOE1: Nach dem Dump <strong>MEM221</strong> noch einmal ablesen.
                </td>
                <td>
                  Ziel: <strong>MEM221 ≤ 10%</strong>. Dann ist wieder viel Speicher frei.
                </td>
                <td>
                  <button
                    @click="somAskMemoryAfterDump"
                    :disabled="!isSom || !canAskMemoryAfterDump()"
                    :class="{ actionFail: failedSomAction === 'askMemoryAfter' }"
                  >
                    MEM221 nach Dump prüfen
                  </button>
                </td>
                <td :class="classForStep(10, memoryAskedAfterDumpBySom)">
                  {{ statusForStep(10, memoryAskedAfterDumpBySom) }}
                </td>
              </tr>

              <tr>
                <td>11</td>
                <td>SOM → SOE2</td>
                <td>
                  Bitte SOE2: Payload öffnen und <strong>PLD620</strong> ablesen.
                </td>
                <td>
                  Ziel: <strong>PLD620 = STANDBY</strong>. STANDBY bedeutet: Das Instrument wartet und ist noch nicht aktiv.
                </td>
                <td>
                  <button
                    @click="somAskPayloadInstrumentMode"
                    :disabled="!isSom || !canAskPayloadInstrumentMode()"
                    :class="{ actionFail: failedSomAction === 'askPayloadInstrumentMode' }"
                  >
                    PLD620 anfragen
                  </button>
                </td>
                <td :class="classForStep(11, payloadInstrumentModeReportedBySom)">
                  {{ statusForStep(11, payloadInstrumentModeReportedBySom) }}
                </td>
              </tr>

              <tr>
                <td>12</td>
                <td>SOM → SOE1</td>
                <td>
                  Bitte SOE1: EPS öffnen und <strong>EPT014</strong>, <strong>DCC208</strong> und <strong>NET118</strong> melden.
                </td>
                <td>
                  <div><strong>EPT014 &lt; 75°C</strong> — Temperatur der EPS-Elektronik.</div>
                  <div><strong>DCC208 = 40–60°C</strong> — Temperatur des DC/DC-Wandlers.</div>
                  <div><strong>NET118 ≈ 1160 W</strong> — verfügbare Leistungsreserve.</div>
                </td>
                <td>
                  <button
                    @click="somAskEps"
                    :disabled="!isSom || !canSomAskEps()"
                    :class="{ actionFail: failedSomAction === 'askEps' }"
                  >
                    EPS-Werte anfragen
                  </button>
                </td>
                <td :class="classForStep(12, epsAskedBySom)">
                  {{ statusForStep(12, epsAskedBySom) }}
                </td>
              </tr>

              <tr>
                <td>13</td>
                <td>SOM</td>
                <td>Prüfe besonders die Temperatur <strong>EPT014</strong>.</td>
                <td>
                  Wenn <strong>EPT014 &gt; 85°C</strong>, muss sofort reagiert werden.
                  Zu hohe Temperatur kann Elektronik gefährden.
                </td>
                <td>
                  <button
                    @click="somRequestMitigation"
                    :disabled="!isSom || !canSomRequestMitigation()"
                    :class="{ actionFail: failedSomAction === 'requestMitigation' }"
                  >
                    Mitigation anfordern
                  </button>
                </td>
                <td :class="classForStep(13, epsMitigationRequestedBySom)">
                  {{ statusForStep(13, epsMitigationRequestedBySom) }}
                </td>
              </tr>

              <tr>
                <td>14</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>EPT014</strong> wählen und <strong>Reduce Payload Power</strong> ausführen.
                </td>
                <td>
                  Dauer etwa <strong>15 s</strong>. Weniger elektrische Leistung erzeugt normalerweise weniger Wärme.
                </td>
                <td>
                  <button
                    @click="somRequestPayloadReductionCommand"
                    :disabled="!isSom || !canSomRequestPayloadReductionCommand()"
                    :class="{ actionFail: failedSomAction === 'requestPayloadReduction' }"
                  >
                    Payload-Leistung reduzieren
                  </button>
                </td>
                <td
                  :class="
                    powerReductionInProgress
                      ? 'status-progress'
                      : payloadReductionCommandRequestedBySom && !powerReducedBySpacon
                        ? 'status-progress'
                        : classForStep(14, powerReducedBySpacon)
                  "
                >
                  {{
                    powerReductionInProgress
                      ? 'IN PROGRESS'
                      : powerReducedBySpacon
                        ? 'DONE'
                        : payloadReductionCommandRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(14, powerReducedBySpacon)
                  }}
                </td>
              </tr>

              <tr>
                <td>15</td>
                <td>SOM → SOE2</td>
                <td>
                  Bitte SOE2: EPS erneut öffnen und <strong>EPT014</strong> und <strong>NET118</strong> melden.
                </td>
                <td>
                  Ziel nach der Mitigation: <strong>EPT014 &lt; 75°C</strong> und <strong>NET118 &lt; 1160 W</strong>.
                </td>
                <td>
                  <button
                    @click="somAskEpsAfterMitigation"
                    :disabled="!isSom || !canSomAskEpsAfterMitigation()"
                    :class="{ actionFail: failedSomAction === 'askEpsAfter' }"
                  >
                    EPS erneut prüfen
                  </button>
                </td>
                <td :class="classForStep(15, epsAskedAfterMitigationBySom)">
                  {{ statusForStep(15, epsAskedAfterMitigationBySom) }}
                </td>
              </tr>

              <tr>
                <td>16</td>
                <td>SOM</td>
                <td>Bestätige, dass EPS wieder im normalen Bereich ist.</td>
                <td>
                  <strong>EPT014 = 70–75°C</strong> und <strong>NET118 = 1100–1140 W</strong>.
                  Das zeigt: Die Abkühlung funktioniert.
                </td>
                <td>
                  <button
                    @click="somConfirmEpsNominal"
                    :disabled="!isSom || !canSomConfirmEps()"
                    :class="{ actionFail: failedSomAction === 'confirmEps' }"
                  >
                    EPS nominal bestätigen
                  </button>
                </td>
                <td :class="classForStep(16, epsConfirmedBySom)">
                  {{ statusForStep(16, epsConfirmedBySom) }}
                </td>
              </tr>

              <tr>
                <td>17</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>PWR740</strong> wählen und <strong>Increase Payload Power</strong> ausführen.
                </td>
                <td>
                  Dauer etwa <strong>15 s</strong>. Danach soll <strong>NET118 ≈ 1160 W</strong> sein.
                  Für die Aufnahme braucht das Payload wieder mehr Leistung.
                </td>
                <td>
                  <button
                    @click="somRequestNormalPayloadPowerIncrease"
                    :disabled="!isSom || !canSomRequestNormalPayloadPowerIncrease()"
                    :class="{ actionFail: failedSomAction === 'requestNormalPowerIncrease' }"
                  >
                    Payload-Leistung erhöhen
                  </button>
                </td>
                <td
                  :class="
                    powerIncreaseInProgress
                      ? 'status-progress'
                      : normalPayloadPowerIncreaseRequestedBySom && !payloadPowerRaised
                        ? 'status-progress'
                        : classForStep(17, payloadPowerRaised)
                  "
                >
                  {{
                    payloadPowerRaised
                      ? 'DONE'
                      : powerIncreaseInProgress
                        ? 'IN PROGRESS'
                        : normalPayloadPowerIncreaseRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(17, payloadPowerRaised)
                  }}
                </td>
              </tr>

              <tr>
                <td>18</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>CAM000</strong> wählen und <strong>Configure Camera</strong> ausführen.
                </td>
                <td>
                  Die Kamera wird für die Aufnahme vorbereitet. Achtung: Danach kann die EPS-Temperatur um etwa <strong>0,03°C/s</strong> steigen.
                </td>
                <td>
                  <button
                    @click="somRequestNormalCameraConfiguration"
                    :disabled="!isSom || !canSomRequestNormalCameraConfiguration()"
                    :class="{ actionFail: failedSomAction === 'requestNormalCameraConfig' }"
                  >
                    Kamera konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    normalCameraConfigurationRequestedBySom && !cameraConfigured
                      ? 'status-progress'
                      : classForStep(18, cameraConfigured)
                  "
                >
                  {{
                    cameraConfigured
                      ? 'DONE'
                      : normalCameraConfigurationRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(18, cameraConfigured)
                  }}
                </td>
              </tr>

              <tr>
                <td>19</td>
                <td>SOM → SOE1</td>
                <td>
                  Bitte SOE1: Payload öffnen und <strong>CAM000</strong> ablesen.
                </td>
                <td>
                  Ziel: <strong>CAM000 = READY</strong>. READY bedeutet: Die Kamera ist bereit für die Aufnahme.
                </td>
                <td>
                  <button
                    @click="somVerifyCamera"
                    :disabled="!isSom || !canVerifyCamera()"
                    :class="{ actionFail: failedSomAction === 'verifyCamera' }"
                  >
                    Kamera prüfen
                  </button>
                </td>
                <td :class="classForStep(19, cameraVerifiedBySom)">
                  {{ statusForStep(19, cameraVerifiedBySom) }}
                </td>
              </tr>

              <tr>
                <td>20</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>IMG901</strong> wählen und die Aufnahme von Frankfurt Airport ausführen.
                </td>
                <td>
                  Aufnahmefenster: <strong>T+15:00 bis T+16:00</strong>.
                  Das Zeitfenster ist wichtig, weil das Raumfahrzeug nur kurz über dem Ziel ist.
                </td>
                <td>
                  <button
                    @click="somRequestNormalImageCapture"
                    :disabled="!isSom || !canSomRequestNormalImageCapture()"
                    :class="{ actionFail: failedSomAction === 'requestNormalImageCapture' }"
                  >
                    Aufnahme anfordern
                  </button>
                </td>
                <td
                  :class="
                    imageTaken
                      ? 'status-good'
                      : normalImageCaptureRequestedBySom
                        ? 'status-progress'
                        : currentProcedureStep === 20
                          ? 'status-warning'
                          : 'status-empty'
                  "
                >
                  {{
                    imageTaken
                      ? 'DONE'
                      : normalImageCaptureRequestedBySom
                        ? 'SPACON REQUIRED'
                        : currentProcedureStep === 20
                          ? 'CURRENT'
                          : 'PENDING'
                  }}
                </td>
              </tr>

              <tr>
                <td>21</td>
                <td>SOM → SPACON</td>
                <td>
                  Bitte SPACON: <strong>STB901</strong> wählen und <strong>Spacecraft Standby Mode</strong> ausführen.
                </td>
                <td>
                  Ziel: <strong>S/C Standby aktiv</strong>. Im Standby spart das Raumfahrzeug Energie.
                </td>
                <td>
                  <button
                    @click="somRequestNormalSpacecraftStandby"
                    :disabled="!isSom || !canSomRequestNormalSpacecraftStandby()"
                    :class="{ actionFail: failedSomAction === 'requestNormalStandby' }"
                  >
                    Standby anfordern
                  </button>
                </td>
                <td
                  :class="
                    spacecraftStandbyRequestedBySom && !spacecraftStandbyActive
                      ? 'status-progress'
                      : classForStep(21, spacecraftStandbyActive)
                  "
                >
                  {{
                    spacecraftStandbyActive
                      ? 'DONE'
                      : spacecraftStandbyRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(21, spacecraftStandbyActive)
                  }}
                </td>
              </tr>
            </table>

            <table v-else class="procedure-table">
              <tr>
                <th class="col-step">Schritt</th>
                <th class="col-role">Rolle</th>
                <th class="col-action">Aktion</th>
                <th class="col-criteria">Kriterien</th>
                <th class="col-som">SOM-Aktion</th>
                <th class="col-status">Status</th>
              </tr>

              <tr>
                <td>1</td>
                <td>SOM</td>
                <td>Simulation starten und auf GS1 Acquisition of Signal (AOS) warten.</td>

                <td>GS1 AOS empfangen<br /></td>
                <td>
                  <button
                    @click="startSimulation"
                    :disabled="!isSom || simulationStatus === 'RUNNING'"
                  >
                    Simulation starten
                  </button>
                </td>
                <td :class="classForStep(1, gs1AosReached)">
                  {{ statusForStep(1, gs1AosReached) }}
                </td>
              </tr>

              <tr>
                <td>2</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, das Ground-Station-Panel zu öffnen und für GS1 die
                  <strong>GEL005</strong> aktuelle Elevation zu melden.
                </td>
                <td>Elevation/<strong>GEL005</strong> Wert gemeldet</td>
                <td>
                  <button
                    @click="somAskElevation"
                    :disabled="!isSom || !canSomAskElevation()"
                    :class="{ actionFail: failedSomAction === 'askElevation' }"
                  >
                    GS-Elevationsstatus anfordern
                  </button>
                </td>
                <td :class="classForStep(2, elevationAskedBySom)">
                  {{ statusForStep(2, elevationAskedBySom) }}
                </td>
              </tr>

              <tr>
                <td>3</td>
                <td>SOM</td>
                <td>
                  Bestätigen, dass die Elevation oberhalb der operativen Elevationsmaske liegt.
                </td>
                <td>Elevation/<strong>GEL005</strong> ≥ 5°</td>
                <td>
                  <button
                    @click="somConfirmElevation"
                    :disabled="!isSom || !canSomConfirmElevation()"
                    :class="{ actionFail: failedSomAction === 'confirmElevation' }"
                  >
                    Akquisitionsgeometrie bestätigen
                  </button>
                </td>
                <td :class="classForStep(3, elevationConfirmedBySom)">
                  {{ statusForStep(3, elevationConfirmedBySom) }}
                </td>
              </tr>

              <tr>
                <td>4</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das Ground-Station-Panel zu öffnen und die anfängliche D/L-Qualität
                  anhand von
                  <strong>GSE001</strong> und <strong>GBL092</strong>.
                </td>
                <td>
                  <div><strong>GSE001</strong> → NOMINAL & <strong>GBL092</strong> → Good</div>
                  <div>Andernfalls ist eine Filterung erforderlich</div>
                </td>
                <td>
                  <button
                    @click="somAskSignalQualityBeforeFilter"
                    :disabled="!isSom || !canAskSignalQualityBeforeFilter()"
                    :class="{ actionFail: failedSomAction === 'askSignalQuality' }"
                  >
                    Downlink-Signalqualität verifizieren
                  </button>
                </td>
                <td :class="classForStep(4, signalQualityReportedBySom)">
                  {{ statusForStep(4, signalQualityReportedBySom) }}
                </td>
              </tr>

              <tr>
                <td>5</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, für GS1 <strong>GSE001</strong> auszuwählen und Filter Signal
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 10 [s]</td>
                <td>
                  <button
                    @click="somRequestSignalFilter"
                    :disabled="!isSom || !canSomRequestSignalFilter()"
                    :class="{ actionFail: failedSomAction === 'requestSignalFilter' }"
                  >
                    Empfängerkette konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    signalFilterRequestedBySom && !signalFiltered
                      ? 'status-progress'
                      : classForStep(5, signalFiltered)
                  "
                >
                  {{
                    signalFiltered
                      ? 'DONE'
                      : signalFilterRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(5, signalFiltered)
                  }}
                </td>
              </tr>

              <tr>
                <td>6</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, das Ground-Station-Panel zu öffnen und
                  <strong>GSE001</strong> sowie <strong>GBL092</strong> das Ergebnis der
                  Signalfilterung zu verifizieren.
                </td>
                <td><strong>GBL092</strong> → GOOD & <strong>GSE001</strong> → NOMINAL</td>
                <td>
                  <button
                    @click="somVerifySignal"
                    :disabled="!isSom || !canVerifySignal()"
                    :class="{ actionFail: failedSomAction === 'verifySignal' }"
                  >
                    TM-Lock bestätigen
                  </button>
                </td>
                <td :class="classForStep(6, signalVerifiedBySom)">
                  {{ statusForStep(6, signalVerifiedBySom) }}
                </td>
              </tr>

              <tr>
                <td>7</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das Command-&-Data-Handling-Panel zu öffnen und
                  <strong>MEM221</strong> die Speicherauslastung vor dem Dump zu melden.
                </td>
                <td>Nominal → <strong>Speicherbelegung ≤ 10%</strong></td>
                <td>
                  <button
                    @click="somAskMemoryBeforeDump"
                    :disabled="!isSom || !canAskMemoryBeforeDump()"
                    :class="{ actionFail: failedSomAction === 'askMemoryBefore' }"
                  >
                    MMU-Status anfordern
                  </button>
                </td>
                <td :class="classForStep(7, memoryAskedBeforeDumpBySom)">
                  {{ statusForStep(7, memoryAskedBeforeDumpBySom) }}
                </td>
              </tr>

              <tr>
                <td>8</td>
                <td>SOM</td>
                <td>Speicherdump autorisieren, falls Speicher belegt ist.</td>
                <td>
                  <div><strong>MEM221</strong> ≤ 50% → Ausreichend Speicher verfügbar</div>
                  <div><strong>MEM221</strong> &gt; 50% → Speicherdump erforderlich</div>
                </td>
                <td>
                  <button
                    @click="somAuthorizeMemoryDump"
                    :disabled="!isSom || !canAuthorizeMemoryDump()"
                    :class="{ actionFail: failedSomAction === 'authorizeMemoryDump' }"
                  >
                    Payload-Speicherdump autorisieren
                  </button>
                </td>
                <td :class="classForStep(8, memoryDumpAuthorizedBySom)">
                  {{ statusForStep(8, memoryDumpAuthorizedBySom) }}
                </td>
              </tr>

              <tr>
                <td>9</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>MEM221</strong> auszuwählen und Dump Payload Memory
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 15 [s]</td>
                <td>
                  <button
                    @click="somRequestMemoryDumpBySpacon"
                    :disabled="!isSom || !canSomRequestMemoryDump()"
                    :class="{ actionFail: failedSomAction === 'requestMemoryDump' }"
                  >
                    MMU-Dump ausführen
                  </button>
                </td>
                <td
                  :class="
                    memoryDumpStarted && !memoryDumpComplete
                      ? 'status-progress'
                      : memoryDumpRequestedBySom && !memoryDumpComplete
                        ? 'status-progress'
                        : classForStep(9, memoryDumpComplete)
                  "
                >
                  {{
                    memoryDumpComplete
                      ? 'DONE'
                      : memoryDumpStarted
                        ? 'IN PROGRESS'
                        : memoryDumpRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(9, memoryDumpComplete)
                  }}
                </td>
              </tr>

              <tr>
                <td>10</td>
                <td>SOM → SOE1</td>

                <td>
                  <template v-if="isScenario2">
                    SOE1 anweisen, das Command-&-Data-Handling-Panel zu öffnen und
                    <strong>MEM221</strong> die Speicherauslastung nach dem Dump zu melden. SOM
                    vergleicht den gemeldeten Wert unmittelbar mit den Kriterien.
                  </template>

                  <template v-else>
                    SOE1 anweisen, das Command-&-Data-Handling-Panel zu öffnen und
                    <strong>MEM221</strong> die Speicherauslastung nach dem Dump zu melden.
                  </template>
                </td>

                <td>
                  <template v-if="isScenario2">
                    <div><strong>MEM221</strong> ≤ 10% → NOMINAL</div>
                    <div>
                      Falls <strong>MEM221</strong> höher ist, ist der Dump nicht abgeschlossen
                    </div>
                  </template>

                  <template v-else>
                    <div><strong>MEM221</strong> ≤ 10% → NOMINAL</div>
                    <div>
                      Falls <strong>MEM221</strong> höher ist, ist der Dump nicht abgeschlossen
                    </div>
                  </template>
                </td>

                <td>
                  <button
                    @click="somAskMemoryAfterDump"
                    :disabled="!isSom || !canAskMemoryAfterDump()"
                    :class="{ actionFail: failedSomAction === 'askMemoryAfter' }"
                  >
                    Speicher abfragen / verifizieren
                  </button>
                </td>

                <td
                  :class="
                    classForStep(10, isScenario2 ? memoryVerifiedBySom : memoryAskedAfterDumpBySom)
                  "
                >
                  {{
                    statusForStep(10, isScenario2 ? memoryVerifiedBySom : memoryAskedAfterDumpBySom)
                  }}
                </td>
              </tr>

              <tr>
                <td>11</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das Payload-Panel zu öffnen und den Instrument Mode
                  <strong>PLD620</strong> zu melden.
                </td>
                <td><strong>PLD620</strong> → STANDBY</td>
                <td>
                  <button
                    @click="somAskPayloadInstrumentMode"
                    :disabled="!isSom || !canAskPayloadInstrumentMode()"
                    :class="{ actionFail: failedSomAction === 'askPayloadInstrumentMode' }"
                  >
                    Payload-STANDBY-Modus verifizieren
                  </button>
                </td>
                <td :class="classForStep(11, payloadInstrumentModeReportedBySom)">
                  {{ statusForStep(11, payloadInstrumentModeReportedBySom) }}
                </td>
              </tr>

              <tr>
                <td>12</td>
                <td>{{ isScenario2 ? 'SOM → SOE1' : 'SOM → SOE1' }}</td>

                <td
                  v-html="
                    isScenario2
                      ? 'SOE1 anweisen, das EPS-Panel zu öffnen und die Batterieladewerte <strong>BCH096</strong>, <strong>BCH097</strong> und <strong>BCH098</strong> zu melden. SOM vergleicht die gemeldeten Werte mit den Kriterien.'
                      : 'SOE1 anweisen, das EPS-Panel zu öffnen und <strong>EPT014</strong>, <strong>DCC208</strong> sowie <strong>NET118</strong> zu melden.'
                  "
                ></td>

                <td
                  :class="
                    isScenario2 && emergencyActive
                      ? batteryEmergencyDowngraded
                        ? 'status-warning blink-warning'
                        : 'status-bad blink-red'
                      : ''
                  "
                  v-html="
                    isScenario2
                      ? '<div>Alle Batterieladewerte &gt; 50% → NOMINAL</div><div>Eine Batterie &lt; 30% → NON-NOMINAL</div><div>Eine Batterie &lt; 20% → <strong>EMERGENCY SITUATION</strong></div>'
                      : 'Nominal:<br><strong>EPT014</strong> &lt; 75.0°[C]<br><strong>NET118</strong> → 1160 [W]<br><strong>DCC208</strong> → 40 ~ 60 °[C]'
                  "
                ></td>

                <td>
                  <button
                    @click="somAskEps"
                    :disabled="!isSom || !canSomAskEps()"
                    :class="{ actionFail: failedSomAction === 'askEps' }"
                  >
                    {{
                      isScenario2
                        ? 'Batterieladezustand bewerten'
                        : 'EPS-Telemetriestatus anfordern'
                    }}
                  </button>
                </td>

                <td
                  :class="
                    isScenario2 && emergencyActive
                      ? batteryEmergencyDowngraded
                        ? 'status-warning blink-warning'
                        : 'status-bad blink-red'
                      : classForStep(12, epsAskedBySom)
                  "
                >
                  {{
                    isScenario2 && emergencyActive
                      ? emergencyLevelText
                      : statusForStep(12, epsAskedBySom)
                  }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>13</td>
                <td>SOM</td>
                <td>EPS-Status anhand der nominalen Kriterien bewerten.</td>
                <td><strong>EPT014</strong> &gt; 85.0°[C] → Sofortige Mitigation</td>
                <td>
                  <button
                    @click="somRequestMitigation"
                    :disabled="!isSom || !canSomRequestMitigation()"
                    :class="{ actionFail: failedSomAction === 'requestMitigation' }"
                  >
                    Thermal Mitigation anfordern
                  </button>
                </td>
                <td :class="classForStep(13, epsMitigationRequestedBySom)">
                  {{ statusForStep(13, epsMitigationRequestedBySom) }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>14</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>EPT014</strong> auszuwählen und Reduce Payload Power
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 15 [s]</td>
                <td>
                  <button
                    @click="somRequestPayloadReductionCommand"
                    :disabled="!isSom || !canSomRequestPayloadReductionCommand()"
                    :class="{ actionFail: failedSomAction === 'requestPayloadReduction' }"
                  >
                    Load Shedding ausführen
                  </button>
                </td>
                <td
                  :class="
                    powerReductionInProgress
                      ? 'status-progress'
                      : payloadReductionCommandRequestedBySom && !powerReducedBySpacon
                        ? 'status-progress'
                        : classForStep(14, powerReducedBySpacon)
                  "
                >
                  {{
                    powerReductionInProgress
                      ? 'IN PROGRESS'
                      : powerReducedBySpacon
                        ? 'DONE'
                        : payloadReductionCommandRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(14, powerReducedBySpacon)
                  }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>15</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das EPS-Panel zu öffnen und <strong>EPT014</strong> nach der
                  Mitigation zu melden.
                </td>
                <td>
                  <div><strong>EPT014</strong> &lt; 75.0°[C]</div>
                  <div><strong>NET118</strong> &lt 1160 [W]</div>
                </td>
                <td>
                  <button
                    @click="somAskEpsAfterMitigation"
                    :disabled="!isSom || !canSomAskEpsAfterMitigation()"
                    :class="{ actionFail: failedSomAction === 'askEpsAfter' }"
                  >
                    EPS-Telemetrie nach Mitigation anfordern
                  </button>
                </td>
                <td :class="classForStep(15, epsAskedAfterMitigationBySom)">
                  {{ statusForStep(15, epsAskedAfterMitigationBySom) }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>16</td>
                <td>SOM</td>
                <td>Bestätigen, dass EPS nominal ist.</td>
                <td>
                  <div><strong>EPT014</strong> → 70-75.0°[C]</div>
                  <div><strong>NET118</strong> → 1100-1140[W]</div>
                </td>
                <td>
                  <button
                    @click="somConfirmEpsNominal"
                    :disabled="!isSom || !canSomConfirmEps()"
                    :class="{ actionFail: failedSomAction === 'confirmEps' }"
                  >
                    Nominale EPS-Parameter bestätigen
                  </button>
                </td>
                <td :class="classForStep(16, epsConfirmedBySom)">
                  {{ statusForStep(16, epsConfirmedBySom) }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>17</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>PWR740</strong> auszuwählen und Increase Payload Power
                  auszuführen.
                </td>
                <td>
                  <div>Ausführungszeit ~ 15 [s]</div>
                  <div><strong>NET118</strong> ~ 1160 [W]</div>
                </td>
                <td>
                  <button
                    @click="somRequestNormalPayloadPowerIncrease"
                    :disabled="!isSom || !canSomRequestNormalPayloadPowerIncrease()"
                    :class="{ actionFail: failedSomAction === 'requestNormalPowerIncrease' }"
                  >
                    Payload-Leistung für die Aufnahme wiederherstellen
                  </button>
                </td>
                <td
                  :class="
                    powerIncreaseInProgress
                      ? 'status-progress'
                      : normalPayloadPowerIncreaseRequestedBySom && !payloadPowerRaised
                        ? 'status-progress'
                        : classForStep(17, payloadPowerRaised)
                  "
                >
                  {{
                    payloadPowerRaised
                      ? 'DONE'
                      : powerIncreaseInProgress
                        ? 'IN PROGRESS'
                        : normalPayloadPowerIncreaseRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(17, payloadPowerRaised)
                  }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>18</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>CAM000</strong> auszuwählen und Configure Camera
                  auszuführen.
                </td>
                <td>
                  <strong>ACHTUNG:</strong> Die EPS-Temperatur kann nach Erhöhung der
                  Payload-Leistung um 0.03 °/s ansteigen.
                </td>
                <td>
                  <button
                    @click="somRequestNormalCameraConfiguration"
                    :disabled="!isSom || !canSomRequestNormalCameraConfiguration()"
                    :class="{ actionFail: failedSomAction === 'requestNormalCameraConfig' }"
                  >
                    Payload-Aufnahmemodus konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    normalCameraConfigurationRequestedBySom && !cameraConfigured
                      ? 'status-progress'
                      : classForStep(18, cameraConfigured)
                  "
                >
                  {{
                    cameraConfigured
                      ? 'DONE'
                      : normalCameraConfigurationRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(18, cameraConfigured)
                  }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>19</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, das Payload-Panel zu öffnen und die Kamerakonfiguration
                  <strong>CAM000</strong> zu verifizieren.
                </td>
                <td><strong>CAM000</strong> → READY</td>
                <td>
                  <button
                    @click="somVerifyCamera"
                    :disabled="!isSom || !canVerifyCamera()"
                    :class="{ actionFail: failedSomAction === 'verifyCamera' }"
                  >
                    Kamera verifizieren
                  </button>
                </td>
                <td :class="classForStep(19, cameraVerifiedBySom)">
                  {{ statusForStep(19, cameraVerifiedBySom) }}
                </td>
              </tr>

              <tr v-if="!isScenario2 || (isScenario2 && !scenario2NewProcedureImported)">
                <td>20</td>
                <td>SOM → SPACON</td>

                <td>
                  <template v-if="isScenario2">
                    SPACON anweisen, <strong>IMG901</strong> auszuwählen und die
                    Payload-Kalibrierungs-Testaufnahme auszuführen.
                  </template>

                  <template v-else>
                    SPACON anweisen, <strong>IMG901</strong> auszuwählen und die Aufnahme des
                    Flughafens Frankfurt auszuführen.
                  </template>
                </td>

                <td>
                  {{
                    isScenario2
                      ? 'Testaufnahmefenster: T+15:00 → T+16:00'
                      : 'Frankfurt-Aufnahmefenster: T+15:00 → T+16:00'
                  }}
                </td>

                <td>
                  <button
                    @click="somRequestNormalImageCapture"
                    :disabled="!isSom || !canSomRequestNormalImageCapture()"
                    :class="{ actionFail: failedSomAction === 'requestNormalImageCapture' }"
                  >
                    {{ isScenario2 ? 'Testaufnahme ausführen' : 'Frankfurt-Aufnahme ausführen' }}
                  </button>
                </td>
                <td
                  :class="
                    imageTaken
                      ? 'status-good'
                      : normalImageCaptureRequestedBySom
                        ? 'status-progress'
                        : currentProcedureStep === 20
                          ? 'status-warning'
                          : 'status-empty'
                  "
                >
                  {{
                    imageTaken
                      ? 'DONE'
                      : normalImageCaptureRequestedBySom
                        ? 'SPACON REQUIRED'
                        : currentProcedureStep === 20
                          ? 'CURRENT'
                          : 'PENDING'
                  }}
                </td>
              </tr>

              <tr v-if="!isScenario2">
                <td>21</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>STB901</strong> auszuwählen und Spacecraft Standby Mode
                  zur Energieeinsparung auszuführen.
                </td>
                <td>S/C-Standby aktiv</td>
                <td>
                  <button
                    @click="somRequestNormalSpacecraftStandby"
                    :disabled="!isSom || !canSomRequestNormalSpacecraftStandby()"
                    :class="{ actionFail: failedSomAction === 'requestNormalStandby' }"
                  >
                    Spacecraft in Standby versetzen
                  </button>
                </td>
                <td
                  :class="
                    spacecraftStandbyRequestedBySom && !spacecraftStandbyActive
                      ? 'status-progress'
                      : classForStep(21, spacecraftStandbyActive)
                  "
                >
                  {{
                    spacecraftStandbyActive
                      ? 'DONE'
                      : spacecraftStandbyRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(21, spacecraftStandbyActive)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>13</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>BAT330</strong> auszuwählen und Battery Equalization
                  Transfer auszuführen. Die Ladung von Batterie A wird auf Batterie B/C umverteilt.
                </td>
                <td>
                  <div>
                    Batterieladewerte ausgleichen, um die Leistungsreserve wiederherzustellen.
                    Emergency-Status aktiv lassen, bis die Verifikation die Erholung bestätigt
                  </div>
                  <div>Ausführungszeit ~ 20 [s]</div>
                </td>
                <td>
                  <button
                    @click="scenario2RequestBatteryEqualization"
                    :disabled="!isSom || !canScenario2RequestBatteryEqualization()"
                    :class="{ actionFail: failedSomAction === 'requestBatteryEqualization' }"
                  >
                    Batterielast umverteilen
                  </button>
                </td>
                <td
                  :class="
                    batteryEqualizationInProgress ||
                    (batteryEqualizationRequestedBySom && !batteryEqualizationComplete)
                      ? 'status-progress'
                      : classForStep(13, batteryEqualizationComplete)
                  "
                >
                  {{
                    batteryEqualizationComplete
                      ? 'DONE'
                      : batteryEqualizationInProgress
                        ? 'IN PROGRESS'
                        : batteryEqualizationRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(13, batteryEqualizationComplete)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>14</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das EPS-Panel zu öffnen und <strong>BCH096</strong>,
                  <strong>BCH097</strong> sowie <strong>BCH098</strong> nach BAT330 erneut zu
                  melden.
                </td>
                <td>
                  <div><strong>BCH096</strong> ~ 34.7%</div>
                  <div><strong>BCH097</strong> ~ 34.7%</div>
                  <div><strong>BCH098</strong> ~ 34.7%</div>
                </td>
                <td>
                  <button
                    @click="scenario2RecheckBatteries"
                    :disabled="!isSom || !canScenario2RecheckBatteries()"
                    :class="{ actionFail: failedSomAction === 'recheckBatteries' }"
                  >
                    Batterie-Erholungsstatus verifizieren
                  </button>
                </td>
                <td :class="classForStep(14, batteryRecheckedBySom)">
                  {{ statusForStep(14, batteryRecheckedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>15</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, das EPS-Panel zu öffnen und die Spacecraft-Leistungsreserve
                  <strong>NET118</strong> zu melden.
                </td>
                <td>
                  <div>Falls <strong>NET118</strong> ≥ 900 [W] →</div>
                  <div>S/C kann in den Power Saving Mode versetzt werden</div>
                </td>
                <td>
                  <button
                    @click="scenario2AskPowerStatus"
                    :disabled="!isSom || !canScenario2AskPowerStatus()"
                    :class="{ actionFail: failedSomAction === 'askPowerStatus' }"
                  >
                    Leistungsstatus abfragen
                  </button>
                </td>
                <td :class="classForStep(15, powerStatusAskedBySom)">
                  {{ statusForStep(15, powerStatusAskedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>16</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>PSM001</strong> auszuwählen und Enter Power Saving Mode
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 15 [s]</td>
                <td>
                  <button
                    @click="scenario2RequestPowerSaving"
                    :disabled="!isSom || !canScenario2RequestPowerSaving()"
                    :class="{ actionFail: failedSomAction === 'requestPowerSaving' }"
                  >
                    Energiesparkonfiguration aktivieren
                  </button>
                </td>
                <td
                  :class="
                    powerSavingModeInProgress
                      ? 'status-progress'
                      : powerSavingRequestedBySom && !powerSavingModeActive
                        ? 'status-progress'
                        : classForStep(16, powerSavingModeActive)
                  "
                >
                  {{
                    powerSavingModeActive
                      ? 'DONE'
                      : powerSavingModeInProgress
                        ? 'IN PROGRESS'
                        : powerSavingRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(16, powerSavingModeActive)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>17</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das EPS-Panel zu öffnen und <strong>NET118</strong>,
                  <strong>BCH096</strong>, <strong>BCH097</strong> und
                  <strong>BCH098</strong> erneut zu melden.
                </td>
                <td>
                  <div>
                    Wenn die Leistung → <strong>NOMINAL</strong> & Batteriewerte >
                    <strong>20%</strong>
                  </div>
                  <div>
                    Erholung verifizieren. Der Batteriealarm wird herabgestuft von
                    <strong>EMERGENCY SITUATION</strong> auf <strong>WARNING</strong>
                  </div>
                </td>
                <td>
                  <button
                    @click="scenario2VerifyPowerSaving"
                    :disabled="!isSom || !canScenario2VerifyPowerSaving()"
                    :class="{ actionFail: failedSomAction === 'verifyPowerSaving' }"
                  >
                    Aktive Low-Power-Konfiguration bestätigen
                  </button>
                </td>
                <td :class="classForStep(17, powerStatusVerifiedBySom)">
                  {{ statusForStep(17, powerStatusVerifiedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>18</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, das EPS-Panel zu öffnen und die Temperatur-/Leistungsparameter
                  <strong>EPT014</strong> und <strong>NET118</strong> zu melden.
                </td>
                <td>
                  <div>NOMINAL → <strong>EPT014</strong> = 70.0–75.0 °[C]</div>
                  <div><strong>NET118</strong> ≥ 1000 [W]</div>
                  <div>Falls nicht nominal, Mitigation anfordern</div>
                </td>
                <td>
                  <button
                    @click="scenario2AskThermalValues"
                    :disabled="!isSom || !canScenario2AskThermalValues()"
                    :class="{ actionFail: failedSomAction === 'askThermalValues' }"
                  >
                    Thermal-Telemetrie anfordern
                  </button>
                </td>
                <td :class="classForStep(18, thermalValuesAskedBySom)">
                  {{ statusForStep(18, thermalValuesAskedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>19</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, die Signalqualität mit GS1 <strong>GSE001</strong> zu verifizieren.
                </td>
                <td>
                  Wenn die Signalqualität BAD ist oder die GS1-Verbindung verloren geht → U/L mit
                  GS2 herstellen
                </td>
                <td>
                  <button
                    @click="scenario2VerifyGs1Signal"
                    :disabled="!isSom || !canScenario2VerifyGs1Signal()"
                    :class="{ actionFail: failedSomAction === 'verifyGs1Signal' }"
                  >
                    GS1 Loss of Signal bestätigen
                  </button>
                </td>
                <td :class="classForStep(19, scenario2Gs1SignalCheckedBySom)">
                  {{ statusForStep(19, scenario2Gs1SignalCheckedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>20</td>
                <td>SOM → SOE1</td>
                <td>Auf eine akzeptable Elevation mit GS2 <strong>GEL005</strong> warten.</td>
                <td>GS2-Elevation ≥ 5.0°</td>
                <td>
                  <button
                    @click="scenario2ConfirmGs2Elevation"
                    :disabled="!isSom || !canScenario2ConfirmGs2Elevation()"
                    :class="{ actionFail: failedSomAction === 'confirmGs2Elevation' }"
                  >
                    Auf GS2-Akquisitionsfenster warten
                  </button>
                </td>
                <td :class="classForStep(20, scenario2Gs2ElevationConfirmedBySom)">
                  {{ statusForStep(20, scenario2Gs2ElevationConfirmedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>21</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, für GS2 <strong>GS2SIG</strong> und <strong>GBL092</strong> zu
                  melden.
                </td>
                <td>
                  <div><strong>GS2SIG</strong> → NOMINAL & <strong>GBL092</strong> → Good</div>
                  <div>Andernfalls ist eine Filterung erforderlich</div>
                </td>
                <td>
                  <button
                    @click="scenario2AskGs2SignalQuality"
                    :disabled="!isSom || !canScenario2AskGs2SignalQuality()"
                    :class="{ actionFail: failedSomAction === 'askGs2SignalQuality' }"
                  >
                    GS2-Downlink-Akquisition verifizieren
                  </button>
                </td>
                <td :class="classForStep(21, scenario2Gs2SignalQualityCheckedBySom)">
                  {{ statusForStep(21, scenario2Gs2SignalQualityCheckedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>22</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>GSE001</strong> auszuwählen und Filter Signal für GS2
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 10 [s]</td>
                <td>
                  <button
                    @click="scenario2RequestGs2SignalFilter"
                    :disabled="!isSom || !canScenario2RequestGs2SignalFilter()"
                    :class="{ actionFail: failedSomAction === 'requestGs2Filter' }"
                  >
                    GS2-Empfängerkette konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    scenario2Gs2SignalFilterRequestedBySom && !scenario2Gs2SignalFiltered
                      ? 'status-progress'
                      : classForStep(22, scenario2Gs2SignalFiltered)
                  "
                >
                  {{
                    scenario2Gs2SignalFiltered
                      ? 'DONE'
                      : scenario2Gs2SignalFilterRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(22, scenario2Gs2SignalFiltered)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>23</td>
                <td>SOM</td>
                <td>
                  Den SOE1-Thermalbericht mit den Kriterien vergleichen. Bei hoher Temperatur SPACON
                  Thermal Mitigation anfordern.
                </td>
                <td><strong>EPT014</strong> → 70.0–75.0 °[C] → Nominal</td>
                <td>
                  <button
                    @click="somRequestMitigation"
                    :disabled="!isSom || !canSomRequestMitigation()"
                    :class="{ actionFail: failedSomAction === 'requestMitigation' }"
                  >
                    Thermal Mitigation anfordern
                  </button>
                </td>
                <td :class="classForStep(23, epsMitigationRequestedBySom)">
                  {{ statusForStep(23, epsMitigationRequestedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>24</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>EPT014</strong> auszuwählen und Reduce Payload Power
                  auszuführen.
                </td>
                <td>Ausführungszeit ~ 15 [s]</td>
                <td>
                  <button
                    @click="somRequestPayloadReductionCommand"
                    :disabled="!isSom || !canSomRequestPayloadReductionCommand()"
                    :class="{ actionFail: failedSomAction === 'requestPayloadReduction' }"
                  >
                    Payload Load Shedding ausführen
                  </button>
                </td>
                <td
                  :class="
                    powerReductionInProgress
                      ? 'status-progress'
                      : payloadReductionCommandRequestedBySom && !powerReducedBySpacon
                        ? 'status-progress'
                        : classForStep(24, powerReducedBySpacon)
                  "
                >
                  {{
                    powerReductionInProgress
                      ? 'IN PROGRESS'
                      : powerReducedBySpacon
                        ? 'DONE'
                        : payloadReductionCommandRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(24, powerReducedBySpacon)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>25</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, das EPS-Panel zu öffnen und die Temperatur
                  <strong>EPT014</strong> nach der Mitigation zu melden.
                </td>
                <td>Temperatur sollte im Minimum liegen</td>
                <td>
                  <button
                    @click="somAskEpsAfterMitigation"
                    :disabled="!isSom || !canSomAskEpsAfterMitigation()"
                    :class="{ actionFail: failedSomAction === 'askEpsAfter' }"
                  >
                    Thermal-Telemetrie nach Mitigation anfordern
                  </button>
                </td>
                <td :class="classForStep(25, epsAskedAfterMitigationBySom)">
                  {{ statusForStep(25, epsAskedAfterMitigationBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>26</td>
                <td>SOM</td>
                <td>Bestätigen, dass EPS nominal ist.</td>
                <td>
                  <div>
                    <strong>ACHTUNG:</strong> Die EPS-Temperatur kann nach Erhöhung der
                    Payload-Leistung ansteigen
                  </div>
                  <div>
                    Sicherstellen, dass sich <strong>EPT014</strong> innerhalb einer Minute nicht
                    ändert
                  </div>
                </td>
                <td>
                  <button
                    @click="somConfirmEpsNominal"
                    :disabled="!isSom || !canSomConfirmEps()"
                    :class="{ actionFail: failedSomAction === 'confirmEps' }"
                  >
                    EPS- und Thermalparameter innerhalb der Grenzwerte bestätigen
                  </button>
                </td>
                <td :class="classForStep(26, epsConfirmedBySom)">
                  {{ statusForStep(26, epsConfirmedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>27</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>PWR740</strong> auszuwählen und Increase Payload Power
                  für die Aufnahme auszuführen.
                </td>
                <td>
                  <div>Thermaler Anstieg beginnt langsam</div>
                  <div>~+0.01 °[C]/[s]</div>
                  <div>Ausführungszeit ~ 15 [s]</div>
                </td>
                <td>
                  <button
                    @click="scenario2RequestPayloadPowerIncrease"
                    :disabled="!isSom || !canScenario2RequestPayloadPowerIncrease()"
                    :class="{ actionFail: failedSomAction === 'requestPowerIncrease' }"
                  >
                    Payload-Leistung für das Aufnahmefenster wiederherstellen
                  </button>
                </td>
                <td
                  :class="
                    powerIncreaseInProgress ||
                    (payloadPowerIncreaseRequestedBySom && !payloadPowerRaised)
                      ? 'status-progress'
                      : classForStep(27, payloadPowerRaised)
                  "
                >
                  {{
                    powerIncreaseInProgress
                      ? 'IN PROGRESS'
                      : payloadPowerRaised
                        ? 'DONE'
                        : payloadPowerIncreaseRequestedBySom
                          ? 'SPACON REQUIRED'
                          : statusForStep(27, payloadPowerRaised)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>28</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>CAM000</strong> auszuwählen und Configure Camera
                  auszuführen.
                </td>
                <td>
                  <div>Kamera konfiguriert</div>
                  <div>Ausführungszeit ~ 5 [s]</div>
                </td>
                <td>
                  <button
                    @click="scenario2RequestCameraConfiguration"
                    :disabled="!isSom || !canScenario2RequestCameraConfiguration()"
                    :class="{ actionFail: failedSomAction === 'requestCameraConfig' }"
                  >
                    Imaging-Payload konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    cameraConfigurationRequestedBySom && !cameraConfigured
                      ? 'status-progress'
                      : classForStep(28, cameraConfigured)
                  "
                >
                  {{
                    cameraConfigured
                      ? 'DONE'
                      : cameraConfigurationRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(28, cameraConfigured)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>29</td>
                <td>SOM → SOE1</td>
                <td>
                  SOE1 anweisen, die Kamerakonfiguration anhand von Payload/<strong>CAM201</strong>
                  und <strong>PLD620</strong> zu verifizieren.
                </td>
                <td>
                  <div><strong>PLD620</strong> → ACTIVE</div>
                  <div><strong>CAM201</strong> → Nominale Temperatur</div>
                </td>
                <td>
                  <button
                    @click="somVerifyCamera"
                    :disabled="!isSom || !canVerifyCamera()"
                    :class="{ actionFail: failedSomAction === 'verifyCamera' }"
                  >
                    Kamera verifizieren
                  </button>
                </td>
                <td :class="classForStep(29, cameraVerifiedBySom)">
                  {{ statusForStep(29, cameraVerifiedBySom) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>30</td>
                <td>SOM → SOE2</td>
                <td>
                  SOE2 anweisen, die Thermalwerte <strong>EPT014</strong> und
                  <strong>DCC208</strong> nach Erhöhung der Payload-Leistung zu melden.
                </td>
                <td>Temperaturtrend gemeldet; nach PWR740 wird ein langsamer Anstieg erwartet.</td>
                <td>
                  <button
                    @click="scenario2ReportPostPowerThermals"
                    :disabled="!isSom || !canScenario2ReportPostPowerThermals()"
                    :class="{ actionFail: failedSomAction === 'reportPostPowerThermals' }"
                  >
                    Thermaltrend nach Wiederherstellung melden
                  </button>
                </td>
                <td :class="classForStep(30, postPowerThermalReportedBySoe)">
                  {{ statusForStep(30, postPowerThermalReportedBySoe) }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>31</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>IMG901</strong> auszuwählen und Take Image auszuführen.
                </td>
                <td>Aufnahmefenster: T+30:00 → T+30:30</td>
                <td>
                  <button
                    @click="scenario2RequestImageCapture"
                    :disabled="!isSom || !canScenario2RequestImageCapture()"
                    :class="{ actionFail: failedSomAction === 'requestImageCapture' }"
                  >
                    Bildaufnahme während des Aufnahmefensters ausführen
                  </button>
                </td>
                <td
                  :class="
                    imageCaptureRequestedBySom && !imageTaken
                      ? 'status-progress'
                      : classForStep(31, imageTaken)
                  "
                >
                  {{
                    imageTaken
                      ? 'DONE'
                      : imageCaptureRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(31, imageTaken)
                  }}
                </td>
              </tr>

              <tr v-if="isScenario2 && scenario2NewProcedureImported">
                <td>32</td>
                <td>SOM → SPACON</td>
                <td>
                  SPACON anweisen, <strong>STB901</strong> auszuwählen und Spacecraft Standby Mode
                  zur Energieeinsparung auszuführen.
                </td>
                <td>S/C-Standby aktiv</td>
                <td>
                  <button
                    @click="scenario2RequestSpacecraftStandby"
                    :disabled="!isSom || !canScenario2RequestSpacecraftStandby()"
                    :class="{ actionFail: failedSomAction === 'requestStandby' }"
                  >
                    Spacecraft-Standby konfigurieren
                  </button>
                </td>
                <td
                  :class="
                    spacecraftStandbyRequestedBySom && !spacecraftStandbyActive
                      ? 'status-progress'
                      : classForStep(32, spacecraftStandbyActive)
                  "
                >
                  {{
                    spacecraftStandbyActive
                      ? 'DONE'
                      : spacecraftStandbyRequestedBySom
                        ? 'SPACON REQUIRED'
                        : statusForStep(32, spacecraftStandbyActive)
                  }}
                </td>
              </tr>
            </table>
          </div>

          <div class="som-status-box">
            <h3>Mission Status</h3>
            <p>Status: {{ simulationStatus }}</p>
            <p>Mission Time: {{ missionTime }}</p>
            <p>Mission Phase: {{ missionPhase }}</p>
            <p>Last Result: {{ resultStatus }}</p>
            <button @click="abortSimulation" :disabled="simulationStatus !== 'RUNNING'">
              Abort Operation
            </button>
            <button @click="resetSimulation">Reset</button>
          </div>
        </div>

        <GroundStationPanel
          v-if="activePanel === 'GS'"
          :is-scenario2="isScenario2"
          :gs1-connection-active="gs1ConnectionActive"
          :telemetry-gs1="displayedGroundStationTelemetry"
          :telemetry-gs2="displayedGroundStation2Telemetry"
          :tm-history="tmHistoryGS"
        />

        <EpsPanel
          v-if="activePanel === 'EPS'"
          :telemetry="displayedEpsTelemetry"
          :tm-history="tmHistoryEPS"
        />

        <AocsPanel
          v-if="activePanel === 'AOCS'"
          :telemetry="displayedAocsTelemetry"
          :tm-history="tmHistoryAOCS"
        />

        <TcsPanel
          v-if="activePanel === 'TCS'"
          :telemetry="displayedTcsTelemetry"
          :tm-history="tmHistoryTCS"
        />

        <PayloadPanel
          v-if="activePanel === 'Payload'"
          :telemetry="displayedPayloadTelemetry"
          :tm-history="tmHistoryPayload"
        />

        <ImagePanel
          v-if="activePanel === 'IMAGE'"
          :captured-image-src="capturedImageSrc"
          :captured-image-name="capturedImageName"
          :image-taken="imageTaken"
          :image-validity="imageValidity"
          :captured-at="capturedImageCapturedAt"
          :capture-location="capturedImageLocation"
          :capture-coordinates="capturedImageCoordinates"
        />

        <CdhPanel
          v-if="activePanel === 'CDH'"
          :telemetry="displayedCdhTelemetry"
          :tm-history="tmHistoryMemory"
        />

        <div v-if="activePanel === 'SPACON'">
          <h1>SPACON (Spacecraft Controller)</h1>

          <div class="spacon-command-panel spacon-ops-panel">
            <div class="spacon-ops-header">
              <h3>Command / Parameter Selection</h3>

              <div class="spacon-search-toolbar spacon-search-toolbar-compact">
                <input
                  v-model="spaconSearchQuery"
                  class="spacon-search-input"
                  type="text"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="TYPE CODE / COMMAND / SUBSYSTEM"
                  @keydown.enter.prevent="selectFirstSpaconSearchResult"
                />

                <button
                  class="spacon-search-clear"
                  @click="clearSpaconSearch"
                  :disabled="!spaconSearchQuery"
                >
                  CLEAR
                </button>
              </div>
            </div>

            <div class="spacon-subsystem-grid">
              <section
                v-for="subsystem in spaconSubsystems"
                :key="subsystem"
                class="spacon-subsystem-column spacon-subsystem-column-compact"
              >
                <div class="spacon-column-header spacon-column-header-compact">
                  {{ subsystem }}
                </div>

                <div class="spacon-column-command-list spacon-column-command-list-compact">
                  <button
                    v-for="cmd in commandsForSubsystem(subsystem)"
                    :key="subsystem + '-' + cmd.code"
                    @click="selectCommand(cmd.command)"
                    :disabled="!isSpacon"
                    :class="{
                      selected: selectedCommand === cmd.command,
                      armed: selectedCommand === cmd.command && isArmed,
                      goReady: selectedCommand === cmd.command && isGoReady,
                    }"
                    class="spacon-code-button"
                  >
                    {{ cmd.code }}
                  </button>
                </div>
              </section>

              <div v-if="spaconSubsystems.length === 0" class="spacon-no-search-result">
                NO MATCH
              </div>
            </div>
          </div>

          <div class="spacon-action-panel">
            <h3>Command Execution</h3>
            <p>
              Selected Command:
              <span :class="selectedCommand ? 'status-warning' : 'status-empty'">{{
                selectedCommandDisplay
              }}</span>
            </p>
            <p>
              ARM Status:
              <span :class="isArmed ? 'status-good' : 'status-empty'">{{
                isArmed ? 'ARMED' : 'NOT ARMED'
              }}</span>
            </p>
            <p>
              GO Status:
              <span :class="isGoReady ? 'status-warning' : 'status-empty'">{{
                isGoReady ? 'READY' : 'NOT READY'
              }}</span>
            </p>

            <div class="spacon-execution-buttons">
              <button @click="armCommand" :disabled="!isSpacon" :class="{ armed: isArmed }">
                ARM
              </button>
              <button
                @click="disarmCommand"
                :disabled="!isSpacon"
                :class="{ disarmed: selectedCommand && !isArmed }"
              >
                DISARM
              </button>
              <button @click="goCommand" :disabled="!isSpacon" :class="{ goReady: isGoReady }">
                GO
              </button>
            </div>
          </div>

          <div class="tc-history">
            <h2>TC History</h2>
            <table>
              <tr>
                <th>Time</th>
                <th>Command</th>
                <th>Result</th>
              </tr>
              <tr v-if="tcHistory.length === 0">
                <td colspan="3">No TC commands executed</td>
              </tr>
              <tr v-for="(tc, index) in tcHistory" :key="index">
                <td>{{ tc.time }}</td>
                <td>{{ tc.command }}</td>
                <td>{{ tc.result }}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="endingPhase === 'fade'" class="end-black-fade"></div>

  <video
    v-if="endingPhase === 'video'"
    ref="endVideoRef"
    class="end-video"
    autoplay
    muted
    playsinline
    @ended="finishEndSequence"
  >
    <source src="/videos/end.mp4" type="video/mp4" />
  </video>

  <Transition name="emergency-cinematic" mode="out-in">
    <div v-if="emergencyModalVisible" class="emergency-modal-overlay">
      <div class="emergency-modal emergency-step-modal">
        <div class="emergency-header">
          <div class="emergency-symbol">⚠</div>
          <div>
            <h2>NOTFALLSITUATION</h2>
            <p>{{ emergencyEventCode }} / EPS-BATTERIEENTLADUNG – NOTFALLVERFAHREN</p>
          </div>
        </div>

        <div v-if="emergencyStep === 'summary'" key="summary" class="emergency-step-panel">
          <table class="emergency-table">
            <tr>
              <th>Code</th>
              <td>{{ emergencyEventCode }}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td class="status-bad blink-red">NOTFALLSITUATION</td>
            </tr>
            <tr>
              <th>Auslöser</th>
              <td>BCH097 = {{ batteryB }}% / BCH098 = {{ batteryC }}%</td>
            </tr>
            <tr>
              <th>Erforderliche Aktion</th>
              <td>
                Externe Subsystem-Autorität kontaktieren, bevor die Contingency-Prozedur importiert
                wird.
              </td>
            </tr>
          </table>

          <div class="emergency-actions">
            <button @click="toggleEmergencyContactList" :disabled="!isSom">
              KONTAKTLISTE ÖFFNEN
            </button>
          </div>
        </div>

        <div v-else-if="emergencyStep === 'contacts'" key="contacts" class="emergency-step-panel">
          <h3>EXTERNE SUBSYSTEM-AUTORITÄT AUSWÄHLEN</h3>

          <div class="contact-list emergency-contact-list">
            <button
              v-for="contact in emergencyContacts"
              :key="contact.role"
              @click="selectEmergencyContact(contact.role)"
              :disabled="!isSom"
              :class="{
                'blink-red contact-priority': contact.priority,
                selected: selectedEmergencyContact === contact.role,
              }"
            >
              {{ contact.role }} — {{ contact.name }}
            </button>
          </div>
        </div>

        <div v-else-if="emergencyStep === 'compose'" key="compose" class="emergency-step-panel">
          <div class="ticket-box emergency-compose-box">
            <h3>Vorbereitete Nachricht an GNC</h3>

            <p class="typewriter-message">
              {{ typedEmergencyMessage
              }}<span v-if="typingEmergencyMessage" class="typing-cursor">█</span>
            </p>

            <button
              @click="sendEmergencyMessageToGnc"
              :disabled="!isSom || typingEmergencyMessage || emergencyMessageSent"
            >
              NACHRICHT SENDEN
            </button>
          </div>
        </div>

        <div v-else-if="emergencyStep === 'waiting'" key="waiting" class="emergency-step-panel">
          <div class="gnc-waiting-response emergency-waiting-only">
            <div class="gnc-orbit-loader">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <div class="gnc-waiting-title">WARTE AUF ANTWORT</div>

            <div class="gnc-waiting-subtitle">GNC-ANALYSE LÄUFT</div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style>
/* Elementary A: larger, more readable 10-row telemetry presentation.
   Kept in App.vue intentionally so subsystem components and style.css are unchanged. */
.app.elementary-a-mode .telemetry-table {
  font-size: 16px;
}

.app.elementary-a-mode .telemetry-table th {
  padding: 10px 12px;
  line-height: 1.35;
}

.app.elementary-a-mode .telemetry-table td {
  padding: 12px 12px;
  line-height: 1.5;
}


/* Elementary A: simplified procedure is intentionally isolated from every
   other scenario. Only this dedicated table receives the larger typography. */
.app.elementary-a-mode .elementary-a-procedure-table {
  font-size: 15px;
}

.app.elementary-a-mode .elementary-a-procedure-table th {
  padding: 10px 9px;
  line-height: 1.35;
  font-size: 14px;
}

.app.elementary-a-mode .elementary-a-procedure-table td {
  padding: 12px 9px;
  line-height: 1.5;
  vertical-align: middle;
}

.app.elementary-a-mode .elementary-a-procedure-table strong {
  font-size: 1.03em;
}

.app.elementary-a-mode .elementary-a-procedure-table button {
  font-size: 14px;
  line-height: 1.3;
  padding: 9px 7px;
}
</style>

