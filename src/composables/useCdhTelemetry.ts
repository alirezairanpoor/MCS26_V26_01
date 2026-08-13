import {
  computed,
  type Ref,
  type ComputedRef,
} from 'vue';

// ============================================================================
// COMMAND & DATA HANDLING (C&DH) TELEMETRY MODEL
//
// Generic spacecraft C&DH simulator.
// READ ONLY: this module does not modify mission/procedure truth.
//
// IMPORTANT:
// Numerical values and thresholds are simulator-development placeholders.
// They are NOT flight-certified operational limits.
// ============================================================================

export type CdhTelemetryStatus =
  | 'empty'
  | 'good'
  | 'warning'
  | 'bad';

export type CdhTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: CdhTelemetryStatus;
};

type ReactiveValue<T> =
  | Ref<T>
  | ComputedRef<T>;

type TcHistoryEntry = {
  time: string;
  command: string;
  result: string;
};

type UseCdhTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  spacecraftTelemetryAvailable: ReactiveValue<boolean>;
  scenario2TelemetryBlackout: ReactiveValue<boolean>;

  // Existing simulator truth/state.
  memoryUsed: ReactiveValue<number>;
  memoryDumpStarted: ReactiveValue<boolean>;
  memoryDumpComplete: ReactiveValue<boolean>;
  imageTaken: ReactiveValue<boolean>;
  tcHistory: ReactiveValue<TcHistoryEntry[]>;
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
  status: CdhTelemetryStatus = 'good'
): CdhTelemetryRow {
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
): CdhTelemetryRow[] {
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
): CdhTelemetryStatus {
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

function percentStatus(
  value: number,
  warningAt: number,
  badAt: number
): CdhTelemetryStatus {
  if (value >= badAt) {
    return 'bad';
  }

  if (value >= warningAt) {
    return 'warning';
  }

  return 'good';
}

function formatOnboardTime(
  totalSeconds: number
) {
  const seconds =
    Math.max(
      0,
      Math.floor(totalSeconds)
    );

  const hours =
    Math.floor(
      seconds / 3600
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60
    );

  const secs =
    seconds % 60;

  return (
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}:` +
    `${String(secs).padStart(2, '0')}`
  );
}

// ============================================================================
// C&DH TELEMETRY INVENTORY
// ============================================================================

const cdhTelemetryDefinition: TelemetryDefinition[] = [
  // --------------------------------------------------------------------------
  // PROCESSING
  // --------------------------------------------------------------------------

  { parameter: 'CDH001', subsystem: 'C&DH Overall Health', unit: 'state' },
  { parameter: 'CDH002', subsystem: 'C&DH Operating Mode', unit: 'state' },

  { parameter: 'OBC101', subsystem: 'Onboard Computer A', unit: 'state' },
  { parameter: 'OBC102', subsystem: 'Onboard Computer B', unit: 'state' },
  { parameter: 'OBC103', subsystem: 'Active Onboard Computer', unit: 'state' },

  { parameter: 'CPU110', subsystem: 'Central Processor State', unit: 'state' },
  { parameter: 'CPU111', subsystem: 'Processor Load', unit: '%' },
  { parameter: 'CPU112', subsystem: 'Processor Temperature', unit: '°C' },
  { parameter: 'CPU113', subsystem: 'Processor Clock', unit: 'MHz' },
  { parameter: 'CPU114', subsystem: 'Processor Idle Time', unit: '%' },

  { parameter: 'FPGA120', subsystem: 'C&DH FPGA State', unit: 'state' },
  { parameter: 'FPGA121', subsystem: 'C&DH FPGA Load', unit: '%' },
  { parameter: 'FPGA122', subsystem: 'C&DH FPGA Temperature', unit: '°C' },

  { parameter: 'RTU130', subsystem: 'Remote Terminal Unit', unit: 'state' },
  { parameter: 'IO131', subsystem: 'Input/Output Module', unit: 'state' },
  { parameter: 'IO132', subsystem: 'Discrete I/O Channels Active', unit: 'count' },
  { parameter: 'IO133', subsystem: 'Analog Acquisition Channels Active', unit: 'count' },

  { parameter: 'WDG140', subsystem: 'Watchdog Status', unit: 'state' },
  { parameter: 'WDG141', subsystem: 'Watchdog Kick Age', unit: 'ms' },
  { parameter: 'RST150', subsystem: 'Reset Controller', unit: 'state' },
  { parameter: 'RST151', subsystem: 'Reset Cause', unit: 'state' },
  { parameter: 'RST152', subsystem: 'Boot Count', unit: 'count' },

  // --------------------------------------------------------------------------
  // MEMORY
  // --------------------------------------------------------------------------

  { parameter: 'MEM001', subsystem: 'Memory Subsystem Health', unit: 'state' },
  { parameter: 'MEM010', subsystem: 'Boot ROM', unit: 'state' },
  { parameter: 'MEM020', subsystem: 'EEPROM', unit: 'state' },
  { parameter: 'MEM030', subsystem: 'MRAM', unit: 'state' },
  { parameter: 'MEM040', subsystem: 'NAND Flash', unit: 'state' },
  { parameter: 'MEM050', subsystem: 'SDRAM', unit: 'state' },

  { parameter: 'MEM051', subsystem: 'SDRAM Utilization', unit: '%' },
  { parameter: 'MEM052', subsystem: 'SDRAM ECC Status', unit: 'state' },

  // Existing procedure-facing memory parameter is preserved exactly.
  { parameter: 'MEM221', subsystem: 'Payload Memory Used', unit: '%' },

  { parameter: 'MEM222', subsystem: 'Mass Memory Available', unit: '%' },
  { parameter: 'MEM223', subsystem: 'Mass Memory State', unit: 'state' },
  { parameter: 'MEM224', subsystem: 'Payload Data Recorder', unit: 'state' },

  // Existing legacy memory telemetry IDs are retained.
  { parameter: 'MEM404', subsystem: 'Memory Controller', unit: '°C' },
  { parameter: 'MEM315', subsystem: 'Solid State Recorder', unit: '°C' },
  { parameter: 'MEM611', subsystem: 'External Memory Bay', unit: '°C' },
  { parameter: 'MEM622', subsystem: 'Memory I/O FPGA', unit: '°C' },

  { parameter: 'MEM110', subsystem: 'Packet Buffer', unit: '%' },
  { parameter: 'MEM332', subsystem: 'Raw Image Partition', unit: '%' },
  { parameter: 'MEM073', subsystem: 'Housekeeping Partition', unit: '%' },
  { parameter: 'MEM504', subsystem: 'File Index Table', unit: '%' },
  { parameter: 'MEM662', subsystem: 'Dump Pointer', unit: '%' },

  { parameter: 'MEM009', subsystem: 'ECC Corrected Counter', unit: 'count' },
  { parameter: 'MEM008', subsystem: 'ECC Uncorrected Counter', unit: 'count' },
  { parameter: 'MEM007', subsystem: 'NAND Bad Block Count', unit: 'count' },

  { parameter: 'MEM806', subsystem: 'Downlink Queue', unit: 'state' },
  { parameter: 'MEM807', subsystem: 'Downlink Queue Depth', unit: '%' },
  { parameter: 'MEM901', subsystem: 'MMU Sync', unit: 'state' },
  { parameter: 'MEM902', subsystem: 'Checksum', unit: 'state' },

  // --------------------------------------------------------------------------
  // ONBOARD NETWORK
  // --------------------------------------------------------------------------

  { parameter: 'NET201', subsystem: 'Onboard Network Health', unit: 'state' },

  { parameter: 'SPW210', subsystem: 'SpaceWire Router', unit: 'state' },
  { parameter: 'SPW211', subsystem: 'SpaceWire Active Links', unit: 'count' },
  { parameter: 'SPW212', subsystem: 'SpaceWire Link Utilization', unit: '%' },
  { parameter: 'SPW213', subsystem: 'SpaceWire Error Count', unit: 'count' },

  { parameter: 'CAN220', subsystem: 'CAN Controller', unit: 'state' },
  { parameter: 'CAN221', subsystem: 'CAN Bus Utilization', unit: '%' },
  { parameter: 'CAN222', subsystem: 'CAN Bus Error Count', unit: 'count' },

  { parameter: 'MIL230', subsystem: 'MIL-STD-1553 Controller', unit: 'state' },
  { parameter: 'ETH240', subsystem: 'Ethernet Switch', unit: 'state' },

  { parameter: 'UART250', subsystem: 'UART Interface', unit: 'state' },
  { parameter: 'RS422251', subsystem: 'RS-422 Interface', unit: 'state' },

  { parameter: 'DIO260', subsystem: 'Discrete Input/Output Interface', unit: 'state' },
  { parameter: 'AAU270', subsystem: 'Analog Acquisition Unit', unit: 'state' },

  { parameter: 'NET280', subsystem: 'Bus Error Count', unit: 'count' },

  // --------------------------------------------------------------------------
  // COMMAND HANDLING
  // --------------------------------------------------------------------------

  { parameter: 'CMD301', subsystem: 'Command Dispatcher', unit: 'state' },
  { parameter: 'CMD302', subsystem: 'Command Queue Depth', unit: 'count' },
  { parameter: 'CMD303', subsystem: 'Command Acceptance Count', unit: 'count' },
  { parameter: 'CMD304', subsystem: 'Command Rejection Count', unit: 'count' },
  { parameter: 'CMD305', subsystem: 'Last Executed Command', unit: 'state' },
  { parameter: 'CMD306', subsystem: 'Last Command Result', unit: 'state' },
  { parameter: 'CMD307', subsystem: 'Command Decoder', unit: 'state' },
  { parameter: 'CMD308', subsystem: 'Command Authentication', unit: 'state' },

  // --------------------------------------------------------------------------
  // TELEMETRY / PACKET HANDLING
  // --------------------------------------------------------------------------

  { parameter: 'TM401', subsystem: 'Telemetry Manager', unit: 'state' },
  { parameter: 'TM402', subsystem: 'Packet Router', unit: 'state' },
  { parameter: 'TM403', subsystem: 'Telemetry Packet Count', unit: 'count' },
  { parameter: 'TM404', subsystem: 'Packet Error Count', unit: 'count' },
  { parameter: 'TM405', subsystem: 'Telemetry Generation Rate', unit: 'pkt/s' },
  { parameter: 'TM406', subsystem: 'Telemetry Output Buffer', unit: '%' },
  { parameter: 'TM407', subsystem: 'Housekeeping Packet Service', unit: 'state' },
  { parameter: 'TM408', subsystem: 'Event Packet Service', unit: 'state' },

  // --------------------------------------------------------------------------
  // SOFTWARE SERVICES
  // --------------------------------------------------------------------------

  { parameter: 'SW501', subsystem: 'Bootloader', unit: 'state' },
  { parameter: 'SW502', subsystem: 'Real-Time Operating System', unit: 'state' },
  { parameter: 'SW503', subsystem: 'Software Version', unit: 'state' },
  { parameter: 'SW504', subsystem: 'Active Software Bank', unit: 'state' },
  { parameter: 'SW505', subsystem: 'Task Status', unit: 'state' },
  { parameter: 'SW506', subsystem: 'Task Restart Count', unit: 'count' },

  { parameter: 'SW510', subsystem: 'Onboard Scheduler', unit: 'state' },
  { parameter: 'SW511', subsystem: 'Time Manager', unit: 'state' },
  { parameter: 'SW512', subsystem: 'Mode Manager', unit: 'state' },
  { parameter: 'SW513', subsystem: 'FDIR Manager', unit: 'state' },
  { parameter: 'SW514', subsystem: 'Event Manager', unit: 'state' },

  { parameter: 'SW520', subsystem: 'File System', unit: 'state' },
  { parameter: 'SW521', subsystem: 'Memory Scrubber', unit: 'state' },
  { parameter: 'SW522', subsystem: 'Memory Scrubber Progress', unit: '%' },

  { parameter: 'SW530', subsystem: 'Software Image Manager', unit: 'state' },
  { parameter: 'SW531', subsystem: 'Onboard Procedure Engine', unit: 'state' },
  { parameter: 'SW532', subsystem: 'Security Manager', unit: 'state' },

  // --------------------------------------------------------------------------
  // TIME
  // --------------------------------------------------------------------------

  { parameter: 'TIM601', subsystem: 'Onboard Time', unit: 'hh:mm:ss' },
  { parameter: 'TIM602', subsystem: 'Time Synchronization', unit: 'state' },
  { parameter: 'TIM603', subsystem: 'Time Synchronization Error', unit: 'ms' },
  { parameter: 'TIM604', subsystem: '1 PPS Validity', unit: 'state' },
  { parameter: 'TIM605', subsystem: 'Clock Drift Estimate', unit: 'ppm' },

  // --------------------------------------------------------------------------
  // FILE SYSTEM / DATA PRODUCTS
  // --------------------------------------------------------------------------

  { parameter: 'FIL701', subsystem: 'File-System Status', unit: 'state' },
  { parameter: 'FIL702', subsystem: 'Open File Count', unit: 'count' },
  { parameter: 'FIL703', subsystem: 'Directory Utilization', unit: '%' },
  { parameter: 'FIL704', subsystem: 'File-System Error Count', unit: 'count' },
  { parameter: 'FIL705', subsystem: 'Payload Image File State', unit: 'state' },

  // --------------------------------------------------------------------------
  // DATA RECORDER / DUMP
  // --------------------------------------------------------------------------

  { parameter: 'DMP801', subsystem: 'Memory Dump State', unit: 'state' },
  { parameter: 'DMP802', subsystem: 'Memory Dump Progress', unit: '%' },
  { parameter: 'DMP803', subsystem: 'Memory Dump Read Rate', unit: 'MB/s' },
  { parameter: 'DMP804', subsystem: 'Memory Dump Data Integrity', unit: 'state' },
];

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useCdhTelemetry(
  options: UseCdhTelemetryOptions
) {
  const {
    missionSeconds,
    spacecraftTelemetryAvailable,
    scenario2TelemetryBlackout,

    memoryUsed,
    memoryDumpStarted,
    memoryDumpComplete,
    imageTaken,
    tcHistory,
  } = options;

  const cdhTelemetry =
    computed<CdhTelemetryRow[]>(() => {
      // C&DH continues operating onboard during LOS, but ground cannot observe
      // it without a valid spacecraft telemetry path.
      if (
        !spacecraftTelemetryAvailable.value ||
        scenario2TelemetryBlackout.value
      ) {
        return noTelemetryRows(
          cdhTelemetryDefinition
        );
      }

      const t =
        missionSeconds.value;

      const massMemoryUsed =
        clamp(
          memoryUsed.value,
          0,
          100
        );

      const massMemoryAvailable =
        100 - massMemoryUsed;

      const dumpActive =
        memoryDumpStarted.value &&
        !memoryDumpComplete.value;

      const dumpFinished =
        memoryDumpComplete.value;

      // ----------------------------------------------------------------------
      // COMMAND HISTORY - derived from actual SPACON GO history.
      // ----------------------------------------------------------------------

      const commandHistory =
        tcHistory.value;

      const commandAcceptedCount =
        commandHistory.filter(
          (entry) =>
            !entry.result.startsWith(
              'FAILED'
            )
        ).length;

      const commandRejectedCount =
        commandHistory.filter(
          (entry) =>
            entry.result.startsWith(
              'FAILED'
            )
        ).length;

      const lastCommand =
        commandHistory.length > 0
          ? commandHistory[0]
          : null;

      // ----------------------------------------------------------------------
      // PROCESSING
      // ----------------------------------------------------------------------

      const processorLoad =
        clamp(
          32 +
          (dumpActive ? 12 : 0) +
          (imageTaken.value ? 4 : 0) +
          wave(
            t,
            0,
            5,
            17,
            0.4
          ),
          15,
          85
        );

      const processorIdle =
        clamp(
          100 -
          processorLoad,
          0,
          100
        );

      const processorTemp =
        38 +
        processorLoad * 0.10 +
        wave(
          t,
          0,
          0.8,
          31,
          0.5
        );

      const fpgaLoad =
        clamp(
          24 +
          (dumpActive ? 18 : 0) +
          wave(
            t,
            0,
            4,
            19,
            0.9
          ),
          10,
          85
        );

      const fpgaTemp =
        39 +
        fpgaLoad * 0.09 +
        wave(
          t,
          0,
          0.7,
          34,
          1.0
        );

      const watchdogKickAge =
        Math.round(
          clamp(
            wave(
              t,
              45,
              12,
              13,
              0.4
            ),
            10,
            100
          )
        );

      // ----------------------------------------------------------------------
      // MEMORY
      // ----------------------------------------------------------------------

      const memoryControllerTemp =
        39.0 +
        (dumpActive ? 2.5 : 0) +
        wave(
          t,
          0,
          1.3,
          13,
          0.3
        );

      const ssdTemp =
        42.0 +
        (dumpActive ? 3.0 : 0) +
        wave(
          t,
          0,
          1.5,
          15,
          1.1
        );

      const externalBayTemp =
        wave(
          t,
          -4.0,
          4.0,
          20,
          2.7
        );

      const memoryIoFpgaTemp =
        44.0 +
        (dumpActive ? 2.0 : 0) +
        wave(
          t,
          0,
          1.2,
          14,
          0.8
        );

      const sdramUse =
        clamp(
          38 +
          processorLoad * 0.20 +
          (dumpActive ? 8 : 0) +
          wave(
            t,
            0,
            3,
            21,
            0.6
          ),
          20,
          82
        );

      const packetBufferUse =
        dumpActive
          ? clamp(
              massMemoryUsed - 12,
              4,
              85
            )
          : clamp(
              18 +
              massMemoryUsed * 0.18 +
              wave(
                t,
                0,
                3,
                20,
                0.7
              ),
              5,
              70
            );

      const rawImagePartition =
        clamp(
          massMemoryUsed + 6,
          0,
          98
        );

      const housekeepingPartition =
        clamp(
          wave(
            t,
            32,
            2.0,
            17,
            0.9
          ),
          20,
          45
        );

      const fileIndexUse =
        clamp(
          45 +
          massMemoryUsed * 0.22 +
          wave(
            t,
            0,
            2,
            21,
            0.4
          ),
          35,
          75
        );

      const dumpProgress =
        dumpActive || dumpFinished
          ? clamp(
              100 -
              (
                massMemoryUsed /
                87
              ) *
              100,
              0,
              100
            )
          : 0;

      const dumpPointer =
        dumpActive || dumpFinished
          ? dumpProgress
          : 0;

      const eccCorrectedCount =
        Math.max(
          0,
          Math.floor(
            2 +
            Math.sin(
              t / 23
            ) * 2
          )
        );

      const badBlockCount =
        1;

      const downlinkQueueDepth =
        dumpActive
          ? clamp(
              massMemoryUsed * 0.75,
              5,
              95
            )
          : clamp(
              massMemoryUsed * 0.08,
              0,
              20
            );

      // ----------------------------------------------------------------------
      // NETWORK
      // ----------------------------------------------------------------------

      const spaceWireUtilization =
        clamp(
          24 +
          (dumpActive ? 28 : 0) +
          (imageTaken.value ? 4 : 0) +
          wave(
            t,
            0,
            4,
            18,
            0.5
          ),
          10,
          85
        );

      const canUtilization =
        clamp(
          wave(
            t,
            18,
            3,
            22,
            0.8
          ),
          8,
          35
        );

      const spaceWireErrors =
        Math.max(
          0,
          Math.floor(
            0.6 +
            Math.sin(
              t / 71
            ) * 0.6
          )
        );

      const canErrors =
        0;

      const busErrorCount =
        spaceWireErrors +
        canErrors;

      // ----------------------------------------------------------------------
      // TELEMETRY / PACKETS
      // ----------------------------------------------------------------------

      const telemetryRate =
        8.0 +
        wave(
          t,
          0,
          0.25,
          30,
          0.4
        );

      const telemetryPacketCount =
        Math.max(
          0,
          Math.floor(
            t *
            telemetryRate
          )
        );

      const packetErrorCount =
        Math.max(
          0,
          Math.floor(
            0.8 +
            Math.sin(
              t / 83
            ) * 0.8
          )
        );

      const telemetryBuffer =
        clamp(
          12 +
          (dumpActive ? 9 : 0) +
          wave(
            t,
            0,
            2,
            19,
            1.1
          ),
          5,
          40
        );

      // ----------------------------------------------------------------------
      // SOFTWARE / TIME
      // ----------------------------------------------------------------------

      const scrubberProgress =
        (
          t * 0.35
        ) %
        100;

      const timeSyncError =
        wave(
          t,
          0,
          0.25,
          37,
          0.8
        );

      const clockDrift =
        wave(
          t,
          0.12,
          0.035,
          55,
          0.5
        );

      const openFileCount =
        5 +
        (imageTaken.value ? 1 : 0) +
        (dumpActive ? 2 : 0);

      const directoryUtilization =
        clamp(
          28 +
          massMemoryUsed * 0.18,
          20,
          55
        );

      // ----------------------------------------------------------------------
      // HEALTH / STATUS
      // ----------------------------------------------------------------------

      const memoryStatus =
        massMemoryUsed <= 10
          ? 'good'
          : massMemoryUsed <= 70
            ? 'warning'
            : 'bad';

      const memoryHealth =
        massMemoryUsed >= 95
          ? 'CAPACITY CRITICAL'
          : massMemoryUsed > 70
            ? 'HIGH UTILIZATION'
            : 'NOMINAL';

      const cdhOverallStatus: CdhTelemetryStatus =
        massMemoryUsed >= 95
          ? 'bad'
          : massMemoryUsed > 70
            ? 'warning'
            : 'good';

      const cdhOverallHealth =
        cdhOverallStatus === 'bad'
          ? 'DEGRADED'
          : cdhOverallStatus === 'warning'
            ? 'CAUTION'
            : 'NOMINAL';

      // ----------------------------------------------------------------------
      // LIVE TELEMETRY
      // ----------------------------------------------------------------------

      return [
        // PROCESSING
        row(
          'CDH001',
          'C&DH Overall Health',
          cdhOverallHealth,
          'state',
          cdhOverallStatus
        ),

        row(
          'CDH002',
          'C&DH Operating Mode',
          dumpActive
            ? 'DATA DUMP SUPPORT'
            : 'NOMINAL OPERATIONS',
          'state',
          dumpActive
            ? 'warning'
            : 'good'
        ),

        row(
          'OBC101',
          'Onboard Computer A',
          'ACTIVE',
          'state'
        ),

        row(
          'OBC102',
          'Onboard Computer B',
          'HOT STANDBY',
          'state'
        ),

        row(
          'OBC103',
          'Active Onboard Computer',
          'OBC-A',
          'state'
        ),

        row(
          'CPU110',
          'Central Processor State',
          'RUNNING',
          'state'
        ),

        row(
          'CPU111',
          'Processor Load',
          processorLoad.toFixed(0),
          '%',
          percentStatus(
            processorLoad,
            75,
            90
          )
        ),

        row(
          'CPU112',
          'Processor Temperature',
          processorTemp.toFixed(1),
          '°C',
          temperatureStatus(
            processorTemp,
            10,
            55,
            -5,
            70
          )
        ),

        row(
          'CPU113',
          'Processor Clock',
          '400.0',
          'MHz'
        ),

        row(
          'CPU114',
          'Processor Idle Time',
          processorIdle.toFixed(0),
          '%'
        ),

        row(
          'FPGA120',
          'C&DH FPGA State',
          'ACTIVE',
          'state'
        ),

        row(
          'FPGA121',
          'C&DH FPGA Load',
          fpgaLoad.toFixed(0),
          '%',
          percentStatus(
            fpgaLoad,
            75,
            90
          )
        ),

        row(
          'FPGA122',
          'C&DH FPGA Temperature',
          fpgaTemp.toFixed(1),
          '°C',
          temperatureStatus(
            fpgaTemp,
            10,
            58,
            -5,
            70
          )
        ),

        row(
          'RTU130',
          'Remote Terminal Unit',
          'ACTIVE',
          'state'
        ),

        row(
          'IO131',
          'Input/Output Module',
          'ACTIVE',
          'state'
        ),

        row(
          'IO132',
          'Discrete I/O Channels Active',
          '24',
          'count'
        ),

        row(
          'IO133',
          'Analog Acquisition Channels Active',
          '16',
          'count'
        ),

        row(
          'WDG140',
          'Watchdog Status',
          'HEALTHY',
          'state'
        ),

        row(
          'WDG141',
          'Watchdog Kick Age',
          watchdogKickAge.toString(),
          'ms',
          watchdogKickAge <= 250
            ? 'good'
            : 'warning'
        ),

        row(
          'RST150',
          'Reset Controller',
          'ARMED',
          'state'
        ),

        row(
          'RST151',
          'Reset Cause',
          'POWER-ON RESET',
          'state'
        ),

        row(
          'RST152',
          'Boot Count',
          '1',
          'count'
        ),

        // MEMORY
        row(
          'MEM001',
          'Memory Subsystem Health',
          memoryHealth,
          'state',
          cdhOverallStatus
        ),

        row(
          'MEM010',
          'Boot ROM',
          'VALID / READ ONLY',
          'state'
        ),

        row(
          'MEM020',
          'EEPROM',
          'VALID',
          'state'
        ),

        row(
          'MEM030',
          'MRAM',
          'VALID',
          'state'
        ),

        row(
          'MEM040',
          'NAND Flash',
          'ONLINE',
          'state'
        ),

        row(
          'MEM050',
          'SDRAM',
          'ONLINE',
          'state'
        ),

        row(
          'MEM051',
          'SDRAM Utilization',
          sdramUse.toFixed(0),
          '%',
          percentStatus(
            sdramUse,
            75,
            90
          )
        ),

        row(
          'MEM052',
          'SDRAM ECC Status',
          'CORRECTING / NOMINAL',
          'state'
        ),

        row(
          'MEM221',
          'Payload Memory Used',
          massMemoryUsed.toFixed(0),
          '%',
          memoryStatus
        ),

        row(
          'MEM222',
          'Mass Memory Available',
          massMemoryAvailable.toFixed(0),
          '%',
          massMemoryAvailable >= 30
            ? 'good'
            : massMemoryAvailable >= 10
              ? 'warning'
              : 'bad'
        ),

        row(
          'MEM223',
          'Mass Memory State',
          dumpActive
            ? 'DUMP IN PROGRESS'
            : dumpFinished
              ? 'DUMP COMPLETE / READY'
              : 'ONLINE',
          'state',
          dumpActive
            ? 'warning'
            : 'good'
        ),

        row(
          'MEM224',
          'Payload Data Recorder',
          imageTaken.value
            ? 'DATA STORED'
            : 'READY',
          'state'
        ),

        row(
          'MEM404',
          'Memory Controller',
          memoryControllerTemp.toFixed(1),
          '°C',
          temperatureStatus(
            memoryControllerTemp,
            25,
            48,
            10,
            60
          )
        ),

        row(
          'MEM315',
          'Solid State Recorder',
          ssdTemp.toFixed(1),
          '°C',
          temperatureStatus(
            ssdTemp,
            28,
            50,
            10,
            62
          )
        ),

        row(
          'MEM611',
          'External Memory Bay',
          externalBayTemp.toFixed(1),
          '°C',
          temperatureStatus(
            externalBayTemp,
            -18,
            15,
            -35,
            35
          )
        ),

        row(
          'MEM622',
          'Memory I/O FPGA',
          memoryIoFpgaTemp.toFixed(1),
          '°C',
          temperatureStatus(
            memoryIoFpgaTemp,
            20,
            55,
            5,
            68
          )
        ),

        row(
          'MEM110',
          'Packet Buffer',
          packetBufferUse.toFixed(0),
          '%',
          percentStatus(
            packetBufferUse,
            70,
            90
          )
        ),

        row(
          'MEM332',
          'Raw Image Partition',
          rawImagePartition.toFixed(0),
          '%',
          percentStatus(
            rawImagePartition,
            70,
            90
          )
        ),

        row(
          'MEM073',
          'Housekeeping Partition',
          housekeepingPartition.toFixed(0),
          '%',
          'good'
        ),

        row(
          'MEM504',
          'File Index Table',
          fileIndexUse.toFixed(0),
          '%',
          fileIndexUse <= 80
            ? 'good'
            : 'warning'
        ),

        row(
          'MEM662',
          'Dump Pointer',
          dumpPointer.toFixed(0),
          '%',
          dumpActive
            ? 'warning'
            : dumpFinished
              ? 'good'
              : 'empty'
        ),

        row(
          'MEM009',
          'ECC Corrected Counter',
          eccCorrectedCount.toString(),
          'count',
          'good'
        ),

        row(
          'MEM008',
          'ECC Uncorrected Counter',
          '0',
          'count',
          'good'
        ),

        row(
          'MEM007',
          'NAND Bad Block Count',
          badBlockCount.toString(),
          'count',
          'good'
        ),

        row(
          'MEM806',
          'Downlink Queue',
          dumpActive
            ? 'ACTIVE'
            : 'STANDBY',
          'state',
          dumpActive
            ? 'warning'
            : 'good'
        ),

        row(
          'MEM807',
          'Downlink Queue Depth',
          downlinkQueueDepth.toFixed(0),
          '%',
          percentStatus(
            downlinkQueueDepth,
            70,
            90
          )
        ),

        row(
          'MEM901',
          'MMU Sync',
          'SYNC',
          'state'
        ),

        row(
          'MEM902',
          'Checksum',
          'OK',
          'state'
        ),

        // ONBOARD NETWORK
        row(
          'NET201',
          'Onboard Network Health',
          'NOMINAL',
          'state'
        ),

        row(
          'SPW210',
          'SpaceWire Router',
          'ACTIVE',
          'state'
        ),

        row(
          'SPW211',
          'SpaceWire Active Links',
          '6',
          'count'
        ),

        row(
          'SPW212',
          'SpaceWire Link Utilization',
          spaceWireUtilization.toFixed(0),
          '%',
          percentStatus(
            spaceWireUtilization,
            75,
            90
          )
        ),

        row(
          'SPW213',
          'SpaceWire Error Count',
          spaceWireErrors.toString(),
          'count',
          spaceWireErrors <= 2
            ? 'good'
            : 'warning'
        ),

        row(
          'CAN220',
          'CAN Controller',
          'ACTIVE',
          'state'
        ),

        row(
          'CAN221',
          'CAN Bus Utilization',
          canUtilization.toFixed(0),
          '%'
        ),

        row(
          'CAN222',
          'CAN Bus Error Count',
          canErrors.toString(),
          'count'
        ),

        row(
          'MIL230',
          'MIL-STD-1553 Controller',
          'NOT CONFIGURED',
          'state',
          'empty'
        ),

        row(
          'ETH240',
          'Ethernet Switch',
          'NOT CONFIGURED',
          'state',
          'empty'
        ),

        row(
          'UART250',
          'UART Interface',
          'AVAILABLE',
          'state'
        ),

        row(
          'RS422251',
          'RS-422 Interface',
          'ACTIVE',
          'state'
        ),

        row(
          'DIO260',
          'Discrete Input/Output Interface',
          'ACTIVE',
          'state'
        ),

        row(
          'AAU270',
          'Analog Acquisition Unit',
          'ACTIVE',
          'state'
        ),

        row(
          'NET280',
          'Bus Error Count',
          busErrorCount.toString(),
          'count',
          busErrorCount <= 2
            ? 'good'
            : 'warning'
        ),

        // COMMAND HANDLING
        row(
          'CMD301',
          'Command Dispatcher',
          'READY',
          'state'
        ),

        row(
          'CMD302',
          'Command Queue Depth',
          '0',
          'count'
        ),

        row(
          'CMD303',
          'Command Acceptance Count',
          commandAcceptedCount.toString(),
          'count'
        ),

        row(
          'CMD304',
          'Command Rejection Count',
          commandRejectedCount.toString(),
          'count',
          commandRejectedCount === 0
            ? 'good'
            : 'warning'
        ),

        row(
          'CMD305',
          'Last Executed Command',
          lastCommand
            ? lastCommand.command
            : 'NONE',
          'state',
          lastCommand
            ? 'good'
            : 'empty'
        ),

        row(
          'CMD306',
          'Last Command Result',
          lastCommand
            ? lastCommand.result
            : 'NONE',
          'state',
          lastCommand
            ? (
                lastCommand.result.startsWith(
                  'FAILED'
                )
                  ? 'bad'
                  : 'good'
              )
            : 'empty'
        ),

        row(
          'CMD307',
          'Command Decoder',
          'VALID',
          'state'
        ),

        row(
          'CMD308',
          'Command Authentication',
          'VALID',
          'state'
        ),

        // TELEMETRY / PACKETS
        row(
          'TM401',
          'Telemetry Manager',
          'ACTIVE',
          'state'
        ),

        row(
          'TM402',
          'Packet Router',
          'ACTIVE',
          'state'
        ),

        row(
          'TM403',
          'Telemetry Packet Count',
          telemetryPacketCount.toString(),
          'count'
        ),

        row(
          'TM404',
          'Packet Error Count',
          packetErrorCount.toString(),
          'count',
          packetErrorCount <= 2
            ? 'good'
            : 'warning'
        ),

        row(
          'TM405',
          'Telemetry Generation Rate',
          telemetryRate.toFixed(2),
          'pkt/s'
        ),

        row(
          'TM406',
          'Telemetry Output Buffer',
          telemetryBuffer.toFixed(0),
          '%',
          percentStatus(
            telemetryBuffer,
            70,
            90
          )
        ),

        row(
          'TM407',
          'Housekeeping Packet Service',
          'ACTIVE',
          'state'
        ),

        row(
          'TM408',
          'Event Packet Service',
          'ACTIVE',
          'state'
        ),

        // SOFTWARE SERVICES
        row(
          'SW501',
          'Bootloader',
          'VALID',
          'state'
        ),

        row(
          'SW502',
          'Real-Time Operating System',
          'RUNNING',
          'state'
        ),

        row(
          'SW503',
          'Software Version',
          'SIM-FSW-1.0',
          'state'
        ),

        row(
          'SW504',
          'Active Software Bank',
          'BANK-A',
          'state'
        ),

        row(
          'SW505',
          'Task Status',
          'ALL CRITICAL TASKS RUNNING',
          'state'
        ),

        row(
          'SW506',
          'Task Restart Count',
          '0',
          'count'
        ),

        row(
          'SW510',
          'Onboard Scheduler',
          'ACTIVE',
          'state'
        ),

        row(
          'SW511',
          'Time Manager',
          'LOCKED',
          'state'
        ),

        row(
          'SW512',
          'Mode Manager',
          'ACTIVE',
          'state'
        ),

        row(
          'SW513',
          'FDIR Manager',
          'ACTIVE',
          'state'
        ),

        row(
          'SW514',
          'Event Manager',
          'ACTIVE',
          'state'
        ),

        row(
          'SW520',
          'File System',
          dumpActive
            ? 'MOUNTED / READ ACTIVE'
            : 'MOUNTED / RW',
          'state'
        ),

        row(
          'SW521',
          'Memory Scrubber',
          'ACTIVE',
          'state'
        ),

        row(
          'SW522',
          'Memory Scrubber Progress',
          scrubberProgress.toFixed(1),
          '%'
        ),

        row(
          'SW530',
          'Software Image Manager',
          'NOMINAL',
          'state'
        ),

        row(
          'SW531',
          'Onboard Procedure Engine',
          'AVAILABLE',
          'state'
        ),

        row(
          'SW532',
          'Security Manager',
          'ACTIVE',
          'state'
        ),

        // TIME
        row(
          'TIM601',
          'Onboard Time',
          formatOnboardTime(t),
          'hh:mm:ss'
        ),

        row(
          'TIM602',
          'Time Synchronization',
          'SYNCHRONIZED',
          'state'
        ),

        row(
          'TIM603',
          'Time Synchronization Error',
          timeSyncError.toFixed(3),
          'ms',
          Math.abs(
            timeSyncError
          ) <= 1
            ? 'good'
            : 'warning'
        ),

        row(
          'TIM604',
          '1 PPS Validity',
          'VALID',
          'state'
        ),

        row(
          'TIM605',
          'Clock Drift Estimate',
          clockDrift.toFixed(3),
          'ppm',
          Math.abs(
            clockDrift
          ) <= 1
            ? 'good'
            : 'warning'
        ),

        // FILE SYSTEM
        row(
          'FIL701',
          'File-System Status',
          'MOUNTED / HEALTHY',
          'state'
        ),

        row(
          'FIL702',
          'Open File Count',
          openFileCount.toString(),
          'count'
        ),

        row(
          'FIL703',
          'Directory Utilization',
          directoryUtilization.toFixed(0),
          '%',
          percentStatus(
            directoryUtilization,
            75,
            90
          )
        ),

        row(
          'FIL704',
          'File-System Error Count',
          '0',
          'count'
        ),

        row(
          'FIL705',
          'Payload Image File State',
          imageTaken.value
            ? 'IMAGE FILE PRESENT'
            : 'NO NEW IMAGE FILE',
          'state',
          imageTaken.value
            ? 'good'
            : 'empty'
        ),

        // DATA RECORDER / MEMORY DUMP
        row(
          'DMP801',
          'Memory Dump State',
          dumpActive
            ? 'IN PROGRESS'
            : dumpFinished
              ? 'COMPLETE'
              : 'IDLE',
          'state',
          dumpActive
            ? 'warning'
            : 'good'
        ),

        row(
          'DMP802',
          'Memory Dump Progress',
          dumpProgress.toFixed(0),
          '%',
          dumpActive
            ? 'warning'
            : dumpFinished
              ? 'good'
              : 'empty'
        ),

        row(
          'DMP803',
          'Memory Dump Read Rate',
          dumpActive
            ? wave(
                t,
                42,
                4,
                17,
                0.5
              ).toFixed(1)
            : '0.0',
          'MB/s',
          dumpActive
            ? 'good'
            : 'empty'
        ),

        row(
          'DMP804',
          'Memory Dump Data Integrity',
          dumpActive ||
          dumpFinished
            ? 'VALID'
            : 'IDLE',
          'state',
          dumpActive ||
          dumpFinished
            ? 'good'
            : 'empty'
        ),
      ];
    });

  return {
    cdhTelemetry,
  };
}
