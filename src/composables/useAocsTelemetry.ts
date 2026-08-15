import { computed, type Ref, type ComputedRef } from 'vue';

// ============================================================================
// AOCS / GNC TELEMETRY MODEL
// Generic simulator telemetry only.
// READ ONLY: this module never changes mission/procedure state.
//
// IMPORTANT:
// Numerical ranges are simulator-development values.
// They are NOT flight-certified operational limits.
// ============================================================================

export type AocsTelemetryStatus = 'empty' | 'good' | 'warning' | 'bad';

export type AocsTelemetryRow = {
  parameter: string;
  subsystem: string;
  measurement: string;
  unit: string;
  status: AocsTelemetryStatus;
};

type ReactiveValue<T> = Ref<T> | ComputedRef<T>;

type UseAocsTelemetryOptions = {
  missionSeconds: ReactiveValue<number>;
  spacecraftTelemetryAvailable: ReactiveValue<boolean>;
  isScenario2: ReactiveValue<boolean>;
  scenario2NewProcedureImported: ReactiveValue<boolean>;
};

type TelemetryDefinition = {
  parameter: string;
  subsystem: string;
  unit: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function wave(time: number, center: number, amplitude: number, period: number, phase = 0) {
  return center + Math.sin(time / period + phase) * amplitude;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function classifyRange(
  value: number,
  goodMin: number,
  goodMax: number,
  warningMin: number,
  warningMax: number
): AocsTelemetryStatus {
  if (value >= goodMin && value <= goodMax) {
    return 'good';
  }

  if (value >= warningMin && value <= warningMax) {
    return 'warning';
  }

  return 'bad';
}

function telemetryRow(
  parameter: string,
  subsystem: string,
  measurement: string,
  unit: string,
  status: AocsTelemetryStatus = 'good'
): AocsTelemetryRow {
  return {
    parameter,
    subsystem,
    measurement,
    unit,
    status,
  };
}

function noTelemetryRows(definitions: TelemetryDefinition[]): AocsTelemetryRow[] {
  return definitions.map((item) => ({
    ...item,
    measurement: 'NO TELEMETRY',
    status: 'empty',
  }));
}

// ============================================================================
// TELEMETRY INVENTORY
// ============================================================================

const aocsTelemetryDefinition: TelemetryDefinition[] = [
  // --------------------------------------------------------------------------
  // AOCS PROCESSING / ELECTRONICS
  // --------------------------------------------------------------------------

  { parameter: 'AOC001', subsystem: 'AOCS Operating Mode', unit: 'state' },
  { parameter: 'AOC002', subsystem: 'AOCS Computer', unit: 'state' },
  { parameter: 'AOC003', subsystem: 'AOCS Computer Temperature', unit: '°C' },
  { parameter: 'AOC004', subsystem: 'AOCS Computer Load', unit: '%' },

  { parameter: 'AOC005', subsystem: 'Sensor Processing Unit', unit: 'state' },
  { parameter: 'AOC006', subsystem: 'Sensor Processing Unit Temperature', unit: '°C' },

  { parameter: 'AOC007', subsystem: 'Actuator Drive Electronics', unit: 'state' },
  { parameter: 'AOC008', subsystem: 'Actuator Drive Electronics Temperature', unit: '°C' },

  { parameter: 'AOC009', subsystem: 'Safe Mode Controller', unit: 'state' },
  { parameter: 'AOC010', subsystem: 'AOCS Overall Health', unit: 'state' },

  // --------------------------------------------------------------------------
  // ATTITUDE SOLUTION
  // --------------------------------------------------------------------------

  { parameter: 'ATT101', subsystem: 'Attitude Quaternion Q0', unit: '-' },
  { parameter: 'ATT102', subsystem: 'Attitude Quaternion Q1', unit: '-' },
  { parameter: 'ATT103', subsystem: 'Attitude Quaternion Q2', unit: '-' },
  { parameter: 'ATT104', subsystem: 'Attitude Quaternion Q3', unit: '-' },

  { parameter: 'ATT111', subsystem: 'LVLH Roll Angle', unit: 'deg' },
  { parameter: 'ATT112', subsystem: 'LVLH Pitch Angle', unit: 'deg' },
  { parameter: 'ATT113', subsystem: 'LVLH Yaw Angle', unit: 'deg' },

  { parameter: 'ATT121', subsystem: 'Body Angular Rate X', unit: 'deg/s' },
  { parameter: 'ATT122', subsystem: 'Body Angular Rate Y', unit: 'deg/s' },
  { parameter: 'ATT123', subsystem: 'Body Angular Rate Z', unit: 'deg/s' },

  { parameter: 'ATT130', subsystem: 'Attitude Knowledge Validity', unit: 'state' },
  { parameter: 'ATT131', subsystem: 'Attitude Knowledge Error', unit: 'deg' },
  { parameter: 'ATT132', subsystem: 'Attitude Control Error', unit: 'deg' },
  { parameter: 'ATT133', subsystem: 'Payload Pointing Error', unit: 'deg' },
  { parameter: 'ATT134', subsystem: 'Settling Status', unit: 'state' },

  { parameter: 'ATT135', subsystem: 'Attitude Solution Age', unit: 'ms' },
  { parameter: 'ATT136', subsystem: 'AOCS Control Cycle Rate', unit: 'Hz' },

  // --------------------------------------------------------------------------
  // STAR TRACKERS
  // --------------------------------------------------------------------------

  { parameter: 'STR201', subsystem: 'Star Tracker A State', unit: 'state' },
  { parameter: 'STR202', subsystem: 'Star Tracker A Quality', unit: '%' },
  { parameter: 'STR203', subsystem: 'Star Tracker A Stars Tracked', unit: 'count' },
  { parameter: 'STR204', subsystem: 'Star Tracker A Temperature', unit: '°C' },
  { parameter: 'STR205', subsystem: 'Star Tracker A Residual', unit: 'arcsec' },

  { parameter: 'STR211', subsystem: 'Star Tracker B State', unit: 'state' },
  { parameter: 'STR212', subsystem: 'Star Tracker B Quality', unit: '%' },
  { parameter: 'STR213', subsystem: 'Star Tracker B Stars Tracked', unit: 'count' },
  { parameter: 'STR214', subsystem: 'Star Tracker B Temperature', unit: '°C' },
  { parameter: 'STR215', subsystem: 'Star Tracker B Residual', unit: 'arcsec' },

  // --------------------------------------------------------------------------
  // SUN SENSORS
  // --------------------------------------------------------------------------

  { parameter: 'SUN301', subsystem: 'Fine Sun Sensor State', unit: 'state' },
  { parameter: 'SUN302', subsystem: 'Fine Sun Sensor Error', unit: 'deg' },
  { parameter: 'SUN303', subsystem: 'Fine Sun Sensor Temperature', unit: '°C' },

  { parameter: 'SUN304', subsystem: 'Coarse Sun Sensor Array', unit: 'state' },
  { parameter: 'SUN305', subsystem: 'Coarse Sun Sensor Active Faces', unit: 'count' },

  { parameter: 'SUN311', subsystem: 'Sun Vector X', unit: '-' },
  { parameter: 'SUN312', subsystem: 'Sun Vector Y', unit: '-' },
  { parameter: 'SUN313', subsystem: 'Sun Vector Z', unit: '-' },
  { parameter: 'SUN314', subsystem: 'Sun Vector Magnitude', unit: '-' },
  { parameter: 'SUN315', subsystem: 'Sun Aspect Angle', unit: 'deg' },

  // --------------------------------------------------------------------------
  // EARTH / HORIZON SENSORS
  // --------------------------------------------------------------------------

  { parameter: 'EHS320', subsystem: 'Earth Horizon Sensor State', unit: 'state' },
  { parameter: 'EHS321', subsystem: 'Earth Horizon Error', unit: 'deg' },
  { parameter: 'EHS322', subsystem: 'Earth Horizon Sensor Temperature', unit: '°C' },

  { parameter: 'IRS330', subsystem: 'Infrared Earth Sensor State', unit: 'state' },
  { parameter: 'IRS331', subsystem: 'Infrared Earth Sensor Error', unit: 'deg' },
  { parameter: 'IRS332', subsystem: 'Infrared Earth Sensor Temperature', unit: '°C' },

  // --------------------------------------------------------------------------
  // MAGNETOMETER
  // --------------------------------------------------------------------------

  { parameter: 'MAG401', subsystem: 'Magnetic Field X', unit: 'µT' },
  { parameter: 'MAG402', subsystem: 'Magnetic Field Y', unit: 'µT' },
  { parameter: 'MAG403', subsystem: 'Magnetic Field Z', unit: 'µT' },
  { parameter: 'MAG404', subsystem: 'Magnetic Field Magnitude', unit: 'µT' },

  { parameter: 'MAG405', subsystem: 'Magnetometer Validity', unit: 'state' },
  { parameter: 'MAG406', subsystem: 'Magnetometer Temperature', unit: '°C' },
  { parameter: 'MAG407', subsystem: 'Magnetometer Sample Rate', unit: 'Hz' },

  // --------------------------------------------------------------------------
  // RATE GYROS
  // --------------------------------------------------------------------------

  { parameter: 'GYR501', subsystem: 'Rate Gyro X', unit: 'deg/s' },
  { parameter: 'GYR502', subsystem: 'Rate Gyro Y', unit: 'deg/s' },
  { parameter: 'GYR503', subsystem: 'Rate Gyro Z', unit: 'deg/s' },
  { parameter: 'GYR504', subsystem: 'Rate Gyro Temperature', unit: '°C' },

  { parameter: 'GYR511', subsystem: 'Gyro X Bias', unit: 'deg/h' },
  { parameter: 'GYR512', subsystem: 'Gyro Y Bias', unit: 'deg/h' },
  { parameter: 'GYR513', subsystem: 'Gyro Z Bias', unit: 'deg/h' },

  // --------------------------------------------------------------------------
  // FIBER OPTIC GYRO
  // --------------------------------------------------------------------------

  { parameter: 'FOG521', subsystem: 'Fiber Optic Gyro X', unit: 'deg/s' },
  { parameter: 'FOG522', subsystem: 'Fiber Optic Gyro Y', unit: 'deg/s' },
  { parameter: 'FOG523', subsystem: 'Fiber Optic Gyro Z', unit: 'deg/s' },

  // --------------------------------------------------------------------------
  // IMU / ACCELEROMETERS
  // --------------------------------------------------------------------------

  { parameter: 'IMU530', subsystem: 'Inertial Measurement Unit', unit: 'state' },

  { parameter: 'ACC531', subsystem: 'Accelerometer X', unit: 'm/s²' },
  { parameter: 'ACC532', subsystem: 'Accelerometer Y', unit: 'm/s²' },
  { parameter: 'ACC533', subsystem: 'Accelerometer Z', unit: 'm/s²' },

  { parameter: 'IMU534', subsystem: 'IMU Temperature', unit: '°C' },

  // --------------------------------------------------------------------------
  // GNSS / NAVIGATION
  // --------------------------------------------------------------------------

  { parameter: 'NAV601', subsystem: 'GNSS Receiver State', unit: 'state' },
  { parameter: 'NAV602', subsystem: 'GNSS Satellites Tracked', unit: 'count' },
  { parameter: 'NAV603', subsystem: 'GNSS PDOP', unit: '-' },
  { parameter: 'NAV604', subsystem: 'Navigation Solution Validity', unit: 'state' },
  { parameter: 'NAV605', subsystem: 'GNSS Receiver Temperature', unit: '°C' },
  { parameter: 'NAV606', subsystem: 'Navigation Solution Age', unit: 'ms' },

  // --------------------------------------------------------------------------
  // ORBIT STATE
  // --------------------------------------------------------------------------

  { parameter: 'ORB611', subsystem: 'ECI Position X', unit: 'km' },
  { parameter: 'ORB612', subsystem: 'ECI Position Y', unit: 'km' },
  { parameter: 'ORB613', subsystem: 'ECI Position Z', unit: 'km' },

  { parameter: 'ORB621', subsystem: 'ECI Velocity X', unit: 'km/s' },
  { parameter: 'ORB622', subsystem: 'ECI Velocity Y', unit: 'km/s' },
  { parameter: 'ORB623', subsystem: 'ECI Velocity Z', unit: 'km/s' },
  { parameter: 'ORB624', subsystem: 'Orbital Velocity', unit: 'km/s' },

  { parameter: 'ORB631', subsystem: 'Geodetic Latitude', unit: 'deg' },
  { parameter: 'ORB632', subsystem: 'Geodetic Longitude', unit: 'deg' },
  { parameter: 'ORB633', subsystem: 'Orbit Altitude', unit: 'km' },

  // --------------------------------------------------------------------------
  // NAVIGATION UNCERTAINTY / COVARIANCE
  // --------------------------------------------------------------------------

  { parameter: 'ORB640', subsystem: 'Position Sigma X', unit: 'm' },
  { parameter: 'ORB641', subsystem: 'Position Sigma Y', unit: 'm' },
  { parameter: 'ORB642', subsystem: 'Position Sigma Z', unit: 'm' },
  { parameter: 'ORB643', subsystem: 'Velocity Solution Sigma', unit: 'm/s' },

  { parameter: 'COV650', subsystem: 'Orbit Covariance Pxx', unit: 'm²' },
  { parameter: 'COV651', subsystem: 'Orbit Covariance Pyy', unit: 'm²' },
  { parameter: 'COV652', subsystem: 'Orbit Covariance Pzz', unit: 'm²' },

  { parameter: 'COV653', subsystem: 'Velocity Covariance Vxx', unit: '(m/s)²' },
  { parameter: 'COV654', subsystem: 'Velocity Covariance Vyy', unit: '(m/s)²' },
  { parameter: 'COV655', subsystem: 'Velocity Covariance Vzz', unit: '(m/s)²' },

  // --------------------------------------------------------------------------
  // ADDITIONAL NAVIGATION INTERFACES
  // --------------------------------------------------------------------------

  { parameter: 'NAV670', subsystem: 'Ranging Receiver Interface', unit: 'state' },
  { parameter: 'NAV671', subsystem: 'Doppler Measurement Interface', unit: 'state' },

  { parameter: 'NAV672', subsystem: 'Navigation Radar', unit: 'state' },
  { parameter: 'NAV673', subsystem: 'Navigation LiDAR', unit: 'state' },
  { parameter: 'NAV674', subsystem: 'Laser Range Finder', unit: 'state' },
  { parameter: 'NAV675', subsystem: 'Relative Navigation Camera', unit: 'state' },
  { parameter: 'NAV676', subsystem: 'Optical Navigation Camera', unit: 'state' },
  { parameter: 'NAV677', subsystem: 'Terrain Relative Navigation Sensor', unit: 'state' },

  // --------------------------------------------------------------------------
  // REACTION WHEEL 1
  // --------------------------------------------------------------------------

  { parameter: 'RW701', subsystem: 'Reaction Wheel 1 Speed', unit: 'rpm' },
  { parameter: 'RW702', subsystem: 'Reaction Wheel 1 Torque', unit: 'mN·m' },
  { parameter: 'RW703', subsystem: 'Reaction Wheel 1 Current', unit: 'A' },
  { parameter: 'RW704', subsystem: 'Reaction Wheel 1 Temperature', unit: '°C' },
  { parameter: 'RW705', subsystem: 'Reaction Wheel 1 State', unit: 'state' },

  // --------------------------------------------------------------------------
  // REACTION WHEEL 2
  // --------------------------------------------------------------------------

  { parameter: 'RW711', subsystem: 'Reaction Wheel 2 Speed', unit: 'rpm' },
  { parameter: 'RW712', subsystem: 'Reaction Wheel 2 Torque', unit: 'mN·m' },
  { parameter: 'RW713', subsystem: 'Reaction Wheel 2 Current', unit: 'A' },
  { parameter: 'RW714', subsystem: 'Reaction Wheel 2 Temperature', unit: '°C' },
  { parameter: 'RW715', subsystem: 'Reaction Wheel 2 State', unit: 'state' },

  // --------------------------------------------------------------------------
  // REACTION WHEEL 3
  // --------------------------------------------------------------------------

  { parameter: 'RW721', subsystem: 'Reaction Wheel 3 Speed', unit: 'rpm' },
  { parameter: 'RW722', subsystem: 'Reaction Wheel 3 Torque', unit: 'mN·m' },
  { parameter: 'RW723', subsystem: 'Reaction Wheel 3 Current', unit: 'A' },
  { parameter: 'RW724', subsystem: 'Reaction Wheel 3 Temperature', unit: '°C' },
  { parameter: 'RW725', subsystem: 'Reaction Wheel 3 State', unit: 'state' },

  // --------------------------------------------------------------------------
  // REACTION WHEEL 4
  // --------------------------------------------------------------------------

  { parameter: 'RW731', subsystem: 'Reaction Wheel 4 Speed', unit: 'rpm' },
  { parameter: 'RW732', subsystem: 'Reaction Wheel 4 Torque', unit: 'mN·m' },
  { parameter: 'RW733', subsystem: 'Reaction Wheel 4 Current', unit: 'A' },
  { parameter: 'RW734', subsystem: 'Reaction Wheel 4 Temperature', unit: '°C' },
  { parameter: 'RW735', subsystem: 'Reaction Wheel 4 State', unit: 'state' },

  // --------------------------------------------------------------------------
  // MOMENTUM
  // --------------------------------------------------------------------------

  { parameter: 'MOM740', subsystem: 'Stored Angular Momentum', unit: 'N·m·s' },
  { parameter: 'MOM741', subsystem: 'Momentum Capacity Margin', unit: '%' },
  { parameter: 'MOM742', subsystem: 'Momentum Management State', unit: 'state' },
  { parameter: 'MOM743', subsystem: 'Momentum Unload Request', unit: 'state' },

  // --------------------------------------------------------------------------
  // MAGNETORQUERS
  // --------------------------------------------------------------------------

  { parameter: 'MTQ801', subsystem: 'Magnetorquer X Dipole Command', unit: 'A·m²' },
  { parameter: 'MTQ802', subsystem: 'Magnetorquer Y Dipole Command', unit: 'A·m²' },
  { parameter: 'MTQ803', subsystem: 'Magnetorquer Z Dipole Command', unit: 'A·m²' },

  { parameter: 'MTQ804', subsystem: 'Magnetorquer Electronics', unit: 'state' },
  { parameter: 'MTQ805', subsystem: 'Magnetorquer Electronics Temperature', unit: '°C' },
  { parameter: 'MTQ806', subsystem: 'Magnetorquer Bus Current', unit: 'A' },

  // --------------------------------------------------------------------------
  // ESTIMATION / GUIDANCE / CONTROL
  // --------------------------------------------------------------------------

  { parameter: 'CTL901', subsystem: 'Attitude Estimator', unit: 'state' },
  { parameter: 'CTL902', subsystem: 'Orbit Estimator', unit: 'state' },
  { parameter: 'CTL903', subsystem: 'Kalman Filter', unit: 'state' },
  { parameter: 'CTL904', subsystem: 'Kalman Innovation', unit: 'sigma' },

  { parameter: 'CTL905', subsystem: 'Guidance Function', unit: 'state' },
  { parameter: 'CTL906', subsystem: 'Control Law', unit: 'state' },
  { parameter: 'CTL907', subsystem: 'Momentum Management Function', unit: 'state' },

  { parameter: 'CTL908', subsystem: 'Maneuver Planner', unit: 'state' },
  { parameter: 'CTL909', subsystem: 'Maneuver Status', unit: 'state' },

  { parameter: 'CTL910', subsystem: 'Safe Mode Controller', unit: 'state' },
  { parameter: 'CTL911', subsystem: 'Estimator Covariance Quality', unit: '%' },
  { parameter: 'CTL912', subsystem: 'Guidance Target', unit: 'state' },

  // --------------------------------------------------------------------------
  // THRUSTER / PROPULSION INTERFACE
  // --------------------------------------------------------------------------

  { parameter: 'ACT950', subsystem: 'Attitude Thruster Interface', unit: 'state' },
  { parameter: 'ACT951', subsystem: 'Attitude Thruster Pulse Width', unit: 'ms' },
  { parameter: 'ACT952', subsystem: 'Attitude Thruster Command', unit: 'state' },
  { parameter: 'ACT953', subsystem: 'Propulsion Command Inhibit', unit: 'state' },

  // --------------------------------------------------------------------------
  // OPTIONAL AOCS ACTUATORS
  // --------------------------------------------------------------------------

  { parameter: 'ACT960', subsystem: 'Momentum Wheel', unit: 'state' },
  { parameter: 'ACT961', subsystem: 'Control Moment Gyroscope', unit: 'state' },
  { parameter: 'ACT962', subsystem: 'Main Propulsion AOCS Interface', unit: 'state' },
  { parameter: 'ACT963', subsystem: 'Gimbal Actuator', unit: 'state' },
  { parameter: 'ACT964', subsystem: 'Moving Mass Actuator', unit: 'state' },
];

// ============================================================================
// COMPOSABLE
// ============================================================================

export function useAocsTelemetry(options: UseAocsTelemetryOptions) {
  const {
    missionSeconds,
    spacecraftTelemetryAvailable,
    isScenario2,
    scenario2NewProcedureImported,
  } = options;

  const aocsTelemetry = computed<AocsTelemetryRow[]>(() => {
    // ----------------------------------------------------------------------
    // SPACECRAFT TELEMETRY AVAILABILITY
    //
    // No GS link / no spacecraft TM path => no AOCS telemetry.
    // ----------------------------------------------------------------------

    if (!spacecraftTelemetryAvailable.value) {
      return noTelemetryRows(aocsTelemetryDefinition);
    }

    const t = missionSeconds.value;

    // ======================================================================
    // MISSION ACTIVITY
    // ======================================================================

    const scenario1FrankfurtImaging = !isScenario2.value && t >= 900 && t <= 960;

    const scenario2TestImaging =
      isScenario2.value && !scenario2NewProcedureImported.value && t >= 900 && t <= 960;

    const scenario2FrankfurtImaging =
      isScenario2.value && scenario2NewProcedureImported.value && t >= 1800 && t <= 1830;

    const frankfurtTargetTracking = scenario1FrankfurtImaging || scenario2FrankfurtImaging;

    const imagingActive =
      scenario1FrankfurtImaging || scenario2TestImaging || scenario2FrankfurtImaging;

    const aocsMode = frankfurtTargetTracking ? 'AOCS_TARGET_TRACKING' : 'AOCS_NADIR_POINTING';

    const guidanceTarget = frankfurtTargetTracking
      ? 'FRANKFURT TARGET'
      : scenario2TestImaging
        ? 'CALIBRATION TEST / NADIR'
        : 'NADIR';

    // ======================================================================
    // AOCS PROCESSING / ELECTRONICS
    // ======================================================================

    const aocsComputerTemp = wave(t, 41.5, 1.4, 43, 0.4);

    const aocsComputerLoad = imagingActive ? wave(t, 56, 5, 19, 0.8) : wave(t, 42, 6, 24, 0.8);

    const sensorProcessorTemp = wave(t, 38.5, 1.2, 47, 0.9);

    const actuatorElectronicsTemp = wave(t, 36.8, 1.5, 51, 1.3);

    // ======================================================================
    // ATTITUDE SOLUTION
    //
    // Displayed attitude is LVLH-relative.
    // ======================================================================

    const pointingScale = frankfurtTargetTracking ? 0.72 : 1;

    const roll = wave(t, 0, 0.045 * pointingScale, 17);

    const pitch = wave(t, 0, 0.038 * pointingScale, 19, 0.8);

    const yaw = wave(t, 0, 0.06 * pointingScale, 23, 1.5);

    const rollRad = (roll * Math.PI) / 180;

    const pitchRad = (pitch * Math.PI) / 180;

    const yawRad = (yaw * Math.PI) / 180;

    const cr = Math.cos(rollRad / 2);

    const sr = Math.sin(rollRad / 2);

    const cp = Math.cos(pitchRad / 2);

    const sp = Math.sin(pitchRad / 2);

    const cy = Math.cos(yawRad / 2);

    const sy = Math.sin(yawRad / 2);

    const q0 = cr * cp * cy + sr * sp * sy;

    const q1 = sr * cp * cy - cr * sp * sy;

    const q2 = cr * sp * cy + sr * cp * sy;

    const q3 = cr * cp * sy - sr * sp * cy;

    const rateScale = frankfurtTargetTracking ? 0.75 : 1;

    const rateX = wave(t, 0, 0.008 * rateScale, 8);

    const rateY = wave(t, 0, 0.007 * rateScale, 9, 0.7);

    const rateZ = wave(t, 0, 0.009 * rateScale, 11, 1.3);

    const attitudeKnowledgeError = frankfurtTargetTracking
      ? 0.014 + Math.abs(Math.sin(t / 18)) * 0.008
      : 0.018 + Math.abs(Math.sin(t / 18)) * 0.012;

    const attitudeControlError = frankfurtTargetTracking
      ? 0.026 + Math.abs(Math.sin(t / 14)) * 0.018
      : 0.035 + Math.abs(Math.sin(t / 14)) * 0.025;

    const pointingError = frankfurtTargetTracking
      ? 0.02 + Math.abs(Math.sin(t / 12)) * 0.015
      : 0.03 + Math.abs(Math.sin(t / 12)) * 0.02;

    const attitudeSolutionAge = Math.round(wave(t, 90, 18, 13, 0.2));

    const controlCycleRate = wave(t, 10, 0.03, 60, 0.4);

    // ======================================================================
    // STAR TRACKERS
    // ======================================================================

    const starTrackerAQuality = clamp(wave(t, 98.2, 0.8, 21, 0.2), 0, 100);

    const starTrackerBQuality = clamp(wave(t, 97.8, 0.9, 24, 0.8), 0, 100);

    const starTrackerAStars = Math.round(clamp(wave(t, 10, 2, 14, 0.3), 6, 14));

    const starTrackerBStars = Math.round(clamp(wave(t, 9, 2, 16, 0.9), 6, 14));

    const starTrackerATemp = wave(t, 22.0, 1.7, 54, 0.5);

    const starTrackerBTemp = wave(t, 23.0, 1.6, 58, 1.1);

    const starTrackerAResidual = wave(t, 3.2, 0.7, 19, 0.4);

    const starTrackerBResidual = wave(t, 3.6, 0.8, 22, 0.9);

    // ======================================================================
    // SUN VECTOR / SUN SENSORS
    // ======================================================================

    let sunX = wave(t, 0.72, 0.025, 80);

    let sunY = wave(t, -0.34, 0.02, 90, 0.8);

    let sunZ = wave(t, 0.6, 0.025, 75, 1.2);

    const rawSunMagnitude = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);

    sunX /= rawSunMagnitude;
    sunY /= rawSunMagnitude;
    sunZ /= rawSunMagnitude;

    const normalizedSunMagnitude = Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);

    const sunAspectAngle = (Math.acos(clamp(sunZ, -1, 1)) * 180) / Math.PI;

    const fineSunSensorError = wave(t, 0.055, 0.012, 19, 0.6);

    const fineSunSensorTemp = wave(t, 20.5, 2.0, 65, 1);

    const coarseSunFaces = Math.round(clamp(wave(t, 3, 1, 38, 0.7), 2, 4));

    // ======================================================================
    // EARTH SENSORS
    // ======================================================================

    const earthHorizonError = wave(t, 0.11, 0.025, 27, 0.3);

    const earthHorizonTemp = wave(t, 25.0, 1.8, 66, 0.4);

    const infraredEarthError = wave(t, 0.09, 0.02, 29, 0.8);

    const infraredEarthTemp = wave(t, 27.0, 1.5, 61, 1.1);

    // ======================================================================
    // MAGNETOMETER
    // ======================================================================

    const magX = wave(t, 23, 4, 37);

    const magY = wave(t, -8, 3, 41, 0.4);

    const magZ = wave(t, 35, 5, 44, 1.1);

    const magneticFieldMagnitude = Math.sqrt(magX * magX + magY * magY + magZ * magZ);

    const magnetometerTemp = wave(t, 26.0, 1.8, 59, 0.7);

    const magnetometerSampleRate = wave(t, 20, 0.05, 50, 0.4);

    // ======================================================================
    // GYRO / FOG / IMU
    // ======================================================================

    const gyroX = rateX + wave(t, 0, 0.00012, 5, 0.4);

    const gyroY = rateY + wave(t, 0, 0.00011, 6, 0.8);

    const gyroZ = rateZ + wave(t, 0, 0.00013, 7, 1.2);

    const gyroTemp = wave(t, 34.0, 1.4, 53, 0.8);

    const gyroBiasX = wave(t, 0.006, 0.001, 120, 0.2);

    const gyroBiasY = wave(t, -0.004, 0.001, 130, 0.7);

    const gyroBiasZ = wave(t, 0.005, 0.001, 140, 1.1);

    const fogX = rateX + wave(t, 0, 0.000035, 4, 0.2);

    const fogY = rateY + wave(t, 0, 0.000035, 4.5, 0.7);

    const fogZ = rateZ + wave(t, 0, 0.00004, 5, 1.1);

    const accelX = wave(t, 0, 0.00025, 7);

    const accelY = wave(t, 0, 0.00022, 8, 0.7);

    const accelZ = wave(t, 0, 0.00028, 9, 1.2);

    const imuTemp = wave(t, 32.0, 1.5, 57, 0.5);

    // ======================================================================
    // ORBIT / GNSS MODEL
    //
    // Generic ~500 km circular LEO.
    // ======================================================================

    const earthRadiusKm = 6378.137;

    const nominalAltitudeKm = 500;

    const altitudeVariationKm = 1.2;

    const altitudePeriod = 430;

    const altitudeKm = nominalAltitudeKm + altitudeVariationKm * Math.sin(t / altitudePeriod);

    const altitudeRateKmS = (altitudeVariationKm / altitudePeriod) * Math.cos(t / altitudePeriod);

    const orbitRadiusKm = earthRadiusKm + altitudeKm;

    const mu = 398600.4418;

    const nominalOrbitRadiusKm = earthRadiusKm + nominalAltitudeKm;

    const orbitRate = Math.sqrt(mu / Math.pow(nominalOrbitRadiusKm, 3));

    const inclinationRad = (51.6 * Math.PI) / 180;

    const theta = orbitRate * t;

    const cosTheta = Math.cos(theta);

    const sinTheta = Math.sin(theta);

    const cosInclination = Math.cos(inclinationRad);

    const sinInclination = Math.sin(inclinationRad);

    const x = orbitRadiusKm * cosTheta;

    const y = orbitRadiusKm * sinTheta * cosInclination;

    const z = orbitRadiusKm * sinTheta * sinInclination;

    const vx = altitudeRateKmS * cosTheta - orbitRadiusKm * orbitRate * sinTheta;

    const vy = (altitudeRateKmS * sinTheta + orbitRadiusKm * orbitRate * cosTheta) * cosInclination;

    const vz = (altitudeRateKmS * sinTheta + orbitRadiusKm * orbitRate * cosTheta) * sinInclination;

    const orbitalVelocity = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // ----------------------------------------------------------------------
    // ECI -> simple Earth-fixed display coordinates
    // ----------------------------------------------------------------------

    const earthRotationRate = 7.2921159e-5;

    const earthRotationAngle = earthRotationRate * t;

    const cosEarth = Math.cos(earthRotationAngle);

    const sinEarth = Math.sin(earthRotationAngle);

    const xEcef = cosEarth * x + sinEarth * y;

    const yEcef = -sinEarth * x + cosEarth * y;

    const zEcef = z;

    const latitude = (Math.atan2(zEcef, Math.sqrt(xEcef * xEcef + yEcef * yEcef)) * 180) / Math.PI;

    let longitude = (Math.atan2(yEcef, xEcef) * 180) / Math.PI;

    longitude = ((longitude + 540) % 360) - 180;

    // ======================================================================
    // GNSS / NAVIGATION QUALITY
    // ======================================================================

    const gnssSatellites = Math.round(clamp(wave(t, 11, 2, 26, 0.4), 8, 14));

    const gnssPdop = wave(t, 1.35, 0.18, 31, 0.2);

    const gnssTemp = wave(t, 31.0, 1.8, 55, 0.8);

    const navigationSolutionAge = Math.round(wave(t, 140, 30, 17, 0.5));

    const positionSigmaX = wave(t, 4.2, 0.7, 29, 0.4);

    const positionSigmaY = wave(t, 4.8, 0.8, 31, 0.7);

    const positionSigmaZ = wave(t, 6.2, 1.0, 34, 1.1);

    const velocitySigma = wave(t, 0.012, 0.003, 34, 0.6);

    // ======================================================================
    // REACTION WHEELS
    // ======================================================================

    const rw1Speed = wave(t, 2450, 180, 28);

    const rw2Speed = wave(t, -2180, 170, 31, 0.7);

    const rw3Speed = wave(t, 1960, 160, 34, 1.2);

    const rw4Speed = wave(t, -1680, 150, 29, 2.0);

    const rw1Torque = wave(t, 0, 1.8, 8);

    const rw2Torque = wave(t, 0, 1.7, 9, 0.8);

    const rw3Torque = wave(t, 0, 1.6, 10, 1.4);

    const rw4Torque = wave(t, 0, 1.5, 11, 2.1);

    const rw1Current = 0.34 + Math.abs(rw1Torque) * 0.055;

    const rw2Current = 0.32 + Math.abs(rw2Torque) * 0.055;

    const rw3Current = 0.31 + Math.abs(rw3Torque) * 0.055;

    const rw4Current = 0.3 + Math.abs(rw4Torque) * 0.055;

    const rw1Temp = wave(t, 34.0, 1.8, 63, 0.1);

    const rw2Temp = wave(t, 33.0, 1.7, 67, 0.6);

    const rw3Temp = wave(t, 35.0, 1.8, 71, 1.0);

    const rw4Temp = wave(t, 32.0, 1.6, 74, 1.6);

    const storedMomentum =
      0.55 +
      ((Math.abs(rw1Speed) + Math.abs(rw2Speed) + Math.abs(rw3Speed) + Math.abs(rw4Speed)) /
        20000) *
        0.7;

    const assumedMomentumCapacity = 4.0;

    const momentumMargin = clamp(100 - (storedMomentum / assumedMomentumCapacity) * 100, 0, 100);

    // ======================================================================
    // MAGNETORQUERS
    // ======================================================================

    const mtqX = wave(t, 0, 0.22, 16);

    const mtqY = wave(t, 0, 0.2, 18, 0.6);

    const mtqZ = wave(t, 0, 0.24, 20, 1.1);

    const mtqTemp = wave(t, 29.5, 1.8, 69, 0.9);

    const mtqCurrent = 0.08 + (Math.abs(mtqX) + Math.abs(mtqY) + Math.abs(mtqZ)) * 0.1;

    // ======================================================================
    // ESTIMATOR / CONTROL
    // ======================================================================

    const kalmanInnovation = wave(t, 0.42, 0.12, 22, 0.4);

    const covarianceQuality = clamp(wave(t, 96.5, 1.0, 48, 0.6), 0, 100);

    // ======================================================================
    // STATUS HELPERS
    // ======================================================================

    const attitudeErrorStatus =
      attitudeControlError <= 0.1 ? 'good' : attitudeControlError <= 0.3 ? 'warning' : 'bad';

    const pointingStatus = pointingError <= 0.1 ? 'good' : pointingError <= 0.3 ? 'warning' : 'bad';

    const wheelStatus = (speed: number): AocsTelemetryStatus => {
      const absoluteSpeed = Math.abs(speed);

      if (absoluteSpeed <= 5000) {
        return 'good';
      }

      if (absoluteSpeed <= 6000) {
        return 'warning';
      }

      return 'bad';
    };

    // ======================================================================
    // LIVE TELEMETRY
    // ======================================================================

    return [
      // --------------------------------------------------------------------
      // AOCS PROCESSING
      // --------------------------------------------------------------------

      telemetryRow('AOC001', 'AOCS Operating Mode', aocsMode, 'state'),

      telemetryRow('AOC002', 'AOCS Computer', 'ACTIVE', 'state'),

      telemetryRow(
        'AOC003',
        'AOCS Computer Temperature',
        aocsComputerTemp.toFixed(1),
        '°C',
        classifyRange(aocsComputerTemp, 20, 55, 5, 70)
      ),

      telemetryRow(
        'AOC004',
        'AOCS Computer Load',
        aocsComputerLoad.toFixed(0),
        '%',
        aocsComputerLoad <= 75 ? 'good' : aocsComputerLoad <= 90 ? 'warning' : 'bad'
      ),

      telemetryRow('AOC005', 'Sensor Processing Unit', 'ACTIVE', 'state'),

      telemetryRow(
        'AOC006',
        'Sensor Processing Unit Temperature',
        sensorProcessorTemp.toFixed(1),
        '°C',
        classifyRange(sensorProcessorTemp, 18, 52, 5, 65)
      ),

      telemetryRow('AOC007', 'Actuator Drive Electronics', 'ACTIVE', 'state'),

      telemetryRow(
        'AOC008',
        'Actuator Drive Electronics Temperature',
        actuatorElectronicsTemp.toFixed(1),
        '°C',
        classifyRange(actuatorElectronicsTemp, 15, 55, 0, 70)
      ),

      telemetryRow('AOC009', 'Safe Mode Controller', 'ARMED / STANDBY', 'state'),

      telemetryRow('AOC010', 'AOCS Overall Health', 'NOMINAL', 'state'),

      // --------------------------------------------------------------------
      // ATTITUDE
      // --------------------------------------------------------------------

      telemetryRow('ATT101', 'Attitude Quaternion Q0', q0.toFixed(7), '-'),

      telemetryRow('ATT102', 'Attitude Quaternion Q1', q1.toFixed(7), '-'),

      telemetryRow('ATT103', 'Attitude Quaternion Q2', q2.toFixed(7), '-'),

      telemetryRow('ATT104', 'Attitude Quaternion Q3', q3.toFixed(7), '-'),

      telemetryRow('ATT111', 'LVLH Roll Angle', roll.toFixed(4), 'deg'),

      telemetryRow('ATT112', 'LVLH Pitch Angle', pitch.toFixed(4), 'deg'),

      telemetryRow('ATT113', 'LVLH Yaw Angle', yaw.toFixed(4), 'deg'),

      telemetryRow(
        'ATT121',
        'Body Angular Rate X',
        rateX.toFixed(5),
        'deg/s',
        Math.abs(rateX) <= 0.1 ? 'good' : 'warning'
      ),

      telemetryRow(
        'ATT122',
        'Body Angular Rate Y',
        rateY.toFixed(5),
        'deg/s',
        Math.abs(rateY) <= 0.1 ? 'good' : 'warning'
      ),

      telemetryRow(
        'ATT123',
        'Body Angular Rate Z',
        rateZ.toFixed(5),
        'deg/s',
        Math.abs(rateZ) <= 0.1 ? 'good' : 'warning'
      ),

      telemetryRow('ATT130', 'Attitude Knowledge Validity', 'VALID', 'state'),

      telemetryRow(
        'ATT131',
        'Attitude Knowledge Error',
        attitudeKnowledgeError.toFixed(4),
        'deg',
        attitudeKnowledgeError <= 0.1 ? 'good' : 'warning'
      ),

      telemetryRow(
        'ATT132',
        'Attitude Control Error',
        attitudeControlError.toFixed(4),
        'deg',
        attitudeErrorStatus
      ),

      telemetryRow(
        'ATT133',
        'Payload Pointing Error',
        pointingError.toFixed(4),
        'deg',
        pointingStatus
      ),

      telemetryRow('ATT134', 'Settling Status', 'SETTLED', 'state'),

      telemetryRow(
        'ATT135',
        'Attitude Solution Age',
        attitudeSolutionAge.toString(),
        'ms',
        attitudeSolutionAge <= 250 ? 'good' : 'warning'
      ),

      telemetryRow('ATT136', 'AOCS Control Cycle Rate', controlCycleRate.toFixed(2), 'Hz'),

      // --------------------------------------------------------------------
      // STAR TRACKERS
      // --------------------------------------------------------------------

      telemetryRow('STR201', 'Star Tracker A State', 'TRACKING', 'state'),

      telemetryRow(
        'STR202',
        'Star Tracker A Quality',
        starTrackerAQuality.toFixed(1),
        '%',
        starTrackerAQuality >= 90 ? 'good' : starTrackerAQuality >= 75 ? 'warning' : 'bad'
      ),

      telemetryRow(
        'STR203',
        'Star Tracker A Stars Tracked',
        starTrackerAStars.toString(),
        'count',
        starTrackerAStars >= 5 ? 'good' : 'warning'
      ),

      telemetryRow(
        'STR204',
        'Star Tracker A Temperature',
        starTrackerATemp.toFixed(1),
        '°C',
        classifyRange(starTrackerATemp, -5, 40, -15, 50)
      ),

      telemetryRow(
        'STR205',
        'Star Tracker A Residual',
        starTrackerAResidual.toFixed(2),
        'arcsec',
        starTrackerAResidual <= 8 ? 'good' : 'warning'
      ),

      telemetryRow('STR211', 'Star Tracker B State', 'TRACKING', 'state'),

      telemetryRow(
        'STR212',
        'Star Tracker B Quality',
        starTrackerBQuality.toFixed(1),
        '%',
        starTrackerBQuality >= 90 ? 'good' : starTrackerBQuality >= 75 ? 'warning' : 'bad'
      ),

      telemetryRow(
        'STR213',
        'Star Tracker B Stars Tracked',
        starTrackerBStars.toString(),
        'count',
        starTrackerBStars >= 5 ? 'good' : 'warning'
      ),

      telemetryRow(
        'STR214',
        'Star Tracker B Temperature',
        starTrackerBTemp.toFixed(1),
        '°C',
        classifyRange(starTrackerBTemp, -5, 40, -15, 50)
      ),

      telemetryRow(
        'STR215',
        'Star Tracker B Residual',
        starTrackerBResidual.toFixed(2),
        'arcsec',
        starTrackerBResidual <= 8 ? 'good' : 'warning'
      ),

      // --------------------------------------------------------------------
      // SUN SENSORS
      // --------------------------------------------------------------------

      telemetryRow('SUN301', 'Fine Sun Sensor State', 'VALID', 'state'),

      telemetryRow(
        'SUN302',
        'Fine Sun Sensor Error',
        fineSunSensorError.toFixed(3),
        'deg',
        fineSunSensorError <= 0.2 ? 'good' : 'warning'
      ),

      telemetryRow(
        'SUN303',
        'Fine Sun Sensor Temperature',
        fineSunSensorTemp.toFixed(1),
        '°C',
        classifyRange(fineSunSensorTemp, -15, 45, -25, 60)
      ),

      telemetryRow('SUN304', 'Coarse Sun Sensor Array', 'SUN ACQUIRED', 'state'),

      telemetryRow('SUN305', 'Coarse Sun Sensor Active Faces', coarseSunFaces.toString(), 'count'),

      telemetryRow('SUN311', 'Sun Vector X', sunX.toFixed(5), '-'),

      telemetryRow('SUN312', 'Sun Vector Y', sunY.toFixed(5), '-'),

      telemetryRow('SUN313', 'Sun Vector Z', sunZ.toFixed(5), '-'),

      telemetryRow('SUN314', 'Sun Vector Magnitude', normalizedSunMagnitude.toFixed(6), '-'),

      telemetryRow('SUN315', 'Sun Aspect Angle', sunAspectAngle.toFixed(2), 'deg'),

      // --------------------------------------------------------------------
      // EARTH SENSORS
      // --------------------------------------------------------------------

      telemetryRow('EHS320', 'Earth Horizon Sensor State', 'VALID', 'state'),

      telemetryRow(
        'EHS321',
        'Earth Horizon Error',
        earthHorizonError.toFixed(3),
        'deg',
        earthHorizonError <= 0.5 ? 'good' : 'warning'
      ),

      telemetryRow(
        'EHS322',
        'Earth Horizon Sensor Temperature',
        earthHorizonTemp.toFixed(1),
        '°C',
        classifyRange(earthHorizonTemp, -5, 45, -20, 60)
      ),

      telemetryRow('IRS330', 'Infrared Earth Sensor State', 'TRACKING', 'state'),

      telemetryRow(
        'IRS331',
        'Infrared Earth Sensor Error',
        infraredEarthError.toFixed(3),
        'deg',
        infraredEarthError <= 0.5 ? 'good' : 'warning'
      ),

      telemetryRow(
        'IRS332',
        'Infrared Earth Sensor Temperature',
        infraredEarthTemp.toFixed(1),
        '°C',
        classifyRange(infraredEarthTemp, -5, 50, -20, 65)
      ),

      // --------------------------------------------------------------------
      // MAGNETOMETER
      // --------------------------------------------------------------------

      telemetryRow('MAG401', 'Magnetic Field X', magX.toFixed(2), 'µT'),

      telemetryRow('MAG402', 'Magnetic Field Y', magY.toFixed(2), 'µT'),

      telemetryRow('MAG403', 'Magnetic Field Z', magZ.toFixed(2), 'µT'),

      telemetryRow('MAG404', 'Magnetic Field Magnitude', magneticFieldMagnitude.toFixed(2), 'µT'),

      telemetryRow('MAG405', 'Magnetometer Validity', 'VALID', 'state'),

      telemetryRow(
        'MAG406',
        'Magnetometer Temperature',
        magnetometerTemp.toFixed(1),
        '°C',
        classifyRange(magnetometerTemp, -10, 45, -25, 60)
      ),

      telemetryRow('MAG407', 'Magnetometer Sample Rate', magnetometerSampleRate.toFixed(2), 'Hz'),

      // --------------------------------------------------------------------
      // RATE GYROS
      // --------------------------------------------------------------------

      telemetryRow('GYR501', 'Rate Gyro X', gyroX.toFixed(6), 'deg/s'),

      telemetryRow('GYR502', 'Rate Gyro Y', gyroY.toFixed(6), 'deg/s'),

      telemetryRow('GYR503', 'Rate Gyro Z', gyroZ.toFixed(6), 'deg/s'),

      telemetryRow(
        'GYR504',
        'Rate Gyro Temperature',
        gyroTemp.toFixed(1),
        '°C',
        classifyRange(gyroTemp, 5, 50, -10, 65)
      ),

      telemetryRow('GYR511', 'Gyro X Bias', gyroBiasX.toFixed(5), 'deg/h'),

      telemetryRow('GYR512', 'Gyro Y Bias', gyroBiasY.toFixed(5), 'deg/h'),

      telemetryRow('GYR513', 'Gyro Z Bias', gyroBiasZ.toFixed(5), 'deg/h'),

      // --------------------------------------------------------------------
      // FIBER OPTIC GYRO
      // --------------------------------------------------------------------

      telemetryRow('FOG521', 'Fiber Optic Gyro X', fogX.toFixed(6), 'deg/s'),

      telemetryRow('FOG522', 'Fiber Optic Gyro Y', fogY.toFixed(6), 'deg/s'),

      telemetryRow('FOG523', 'Fiber Optic Gyro Z', fogZ.toFixed(6), 'deg/s'),

      // --------------------------------------------------------------------
      // IMU
      // --------------------------------------------------------------------

      telemetryRow('IMU530', 'Inertial Measurement Unit', 'ACTIVE', 'state'),

      telemetryRow('ACC531', 'Accelerometer X', accelX.toFixed(7), 'm/s²'),

      telemetryRow('ACC532', 'Accelerometer Y', accelY.toFixed(7), 'm/s²'),

      telemetryRow('ACC533', 'Accelerometer Z', accelZ.toFixed(7), 'm/s²'),

      telemetryRow(
        'IMU534',
        'IMU Temperature',
        imuTemp.toFixed(1),
        '°C',
        classifyRange(imuTemp, 5, 50, -10, 65)
      ),

      // --------------------------------------------------------------------
      // GNSS
      // --------------------------------------------------------------------

      telemetryRow('NAV601', 'GNSS Receiver State', '3D FIX', 'state'),

      telemetryRow(
        'NAV602',
        'GNSS Satellites Tracked',
        gnssSatellites.toString(),
        'count',
        gnssSatellites >= 6 ? 'good' : gnssSatellites >= 4 ? 'warning' : 'bad'
      ),

      telemetryRow(
        'NAV603',
        'GNSS PDOP',
        gnssPdop.toFixed(2),
        '-',
        gnssPdop <= 3 ? 'good' : gnssPdop <= 6 ? 'warning' : 'bad'
      ),

      telemetryRow('NAV604', 'Navigation Solution Validity', 'VALID', 'state'),

      telemetryRow(
        'NAV605',
        'GNSS Receiver Temperature',
        gnssTemp.toFixed(1),
        '°C',
        classifyRange(gnssTemp, 0, 50, -15, 65)
      ),

      telemetryRow(
        'NAV606',
        'Navigation Solution Age',
        navigationSolutionAge.toString(),
        'ms',
        navigationSolutionAge <= 500 ? 'good' : 'warning'
      ),

      // --------------------------------------------------------------------
      // ORBIT
      // --------------------------------------------------------------------

      telemetryRow('ORB611', 'ECI Position X', x.toFixed(3), 'km'),

      telemetryRow('ORB612', 'ECI Position Y', y.toFixed(3), 'km'),

      telemetryRow('ORB613', 'ECI Position Z', z.toFixed(3), 'km'),

      telemetryRow('ORB621', 'ECI Velocity X', vx.toFixed(5), 'km/s'),

      telemetryRow('ORB622', 'ECI Velocity Y', vy.toFixed(5), 'km/s'),

      telemetryRow('ORB623', 'ECI Velocity Z', vz.toFixed(5), 'km/s'),

      telemetryRow(
        'ORB624',
        'Orbital Velocity',
        orbitalVelocity.toFixed(4),
        'km/s',
        orbitalVelocity >= 7 && orbitalVelocity <= 8.2 ? 'good' : 'warning'
      ),

      telemetryRow('ORB631', 'Geodetic Latitude', latitude.toFixed(4), 'deg'),

      telemetryRow('ORB632', 'Geodetic Longitude', longitude.toFixed(4), 'deg'),

      telemetryRow(
        'ORB633',
        'Orbit Altitude',
        altitudeKm.toFixed(2),
        'km',
        altitudeKm >= 450 && altitudeKm <= 550 ? 'good' : 'warning'
      ),

      // --------------------------------------------------------------------
      // NAVIGATION UNCERTAINTY
      // --------------------------------------------------------------------

      telemetryRow('ORB640', 'Position Sigma X', positionSigmaX.toFixed(2), 'm'),

      telemetryRow('ORB641', 'Position Sigma Y', positionSigmaY.toFixed(2), 'm'),

      telemetryRow('ORB642', 'Position Sigma Z', positionSigmaZ.toFixed(2), 'm'),

      telemetryRow('ORB643', 'Velocity Solution Sigma', velocitySigma.toFixed(4), 'm/s'),

      telemetryRow(
        'COV650',
        'Orbit Covariance Pxx',
        (positionSigmaX * positionSigmaX).toFixed(2),
        'm²'
      ),

      telemetryRow(
        'COV651',
        'Orbit Covariance Pyy',
        (positionSigmaY * positionSigmaY).toFixed(2),
        'm²'
      ),

      telemetryRow(
        'COV652',
        'Orbit Covariance Pzz',
        (positionSigmaZ * positionSigmaZ).toFixed(2),
        'm²'
      ),

      telemetryRow(
        'COV653',
        'Velocity Covariance Vxx',
        (velocitySigma * velocitySigma).toFixed(6),
        '(m/s)²'
      ),

      telemetryRow(
        'COV654',
        'Velocity Covariance Vyy',
        (velocitySigma * 1.08 * velocitySigma * 1.08).toFixed(6),
        '(m/s)²'
      ),

      telemetryRow(
        'COV655',
        'Velocity Covariance Vzz',
        (velocitySigma * 1.15 * velocitySigma * 1.15).toFixed(6),
        '(m/s)²'
      ),

      // --------------------------------------------------------------------
      // NAVIGATION INTERFACES
      // --------------------------------------------------------------------

      telemetryRow('NAV670', 'Ranging Receiver Interface', 'STANDBY', 'state'),

      telemetryRow('NAV671', 'Doppler Measurement Interface', 'AVAILABLE', 'state'),

      // Generic handoff inventory items that are not part of this
      // LEO imaging simulator baseline are explicitly represented instead
      // of generating fake measurements.

      telemetryRow('NAV672', 'Navigation Radar', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('NAV673', 'Navigation LiDAR', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('NAV674', 'Laser Range Finder', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('NAV675', 'Relative Navigation Camera', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('NAV676', 'Optical Navigation Camera', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow(
        'NAV677',
        'Terrain Relative Navigation Sensor',
        'NOT INSTALLED',
        'state',
        'empty'
      ),

      // --------------------------------------------------------------------
      // REACTION WHEEL 1
      // --------------------------------------------------------------------

      telemetryRow(
        'RW701',
        'Reaction Wheel 1 Speed',
        rw1Speed.toFixed(0),
        'rpm',
        wheelStatus(rw1Speed)
      ),

      telemetryRow('RW702', 'Reaction Wheel 1 Torque', rw1Torque.toFixed(3), 'mN·m'),

      telemetryRow('RW703', 'Reaction Wheel 1 Current', rw1Current.toFixed(3), 'A'),

      telemetryRow(
        'RW704',
        'Reaction Wheel 1 Temperature',
        rw1Temp.toFixed(1),
        '°C',
        classifyRange(rw1Temp, 5, 50, -10, 65)
      ),

      telemetryRow('RW705', 'Reaction Wheel 1 State', 'ACTIVE', 'state'),

      // --------------------------------------------------------------------
      // REACTION WHEEL 2
      // --------------------------------------------------------------------

      telemetryRow(
        'RW711',
        'Reaction Wheel 2 Speed',
        rw2Speed.toFixed(0),
        'rpm',
        wheelStatus(rw2Speed)
      ),

      telemetryRow('RW712', 'Reaction Wheel 2 Torque', rw2Torque.toFixed(3), 'mN·m'),

      telemetryRow('RW713', 'Reaction Wheel 2 Current', rw2Current.toFixed(3), 'A'),

      telemetryRow(
        'RW714',
        'Reaction Wheel 2 Temperature',
        rw2Temp.toFixed(1),
        '°C',
        classifyRange(rw2Temp, 5, 50, -10, 65)
      ),

      telemetryRow('RW715', 'Reaction Wheel 2 State', 'ACTIVE', 'state'),

      // --------------------------------------------------------------------
      // REACTION WHEEL 3
      // --------------------------------------------------------------------

      telemetryRow(
        'RW721',
        'Reaction Wheel 3 Speed',
        rw3Speed.toFixed(0),
        'rpm',
        wheelStatus(rw3Speed)
      ),

      telemetryRow('RW722', 'Reaction Wheel 3 Torque', rw3Torque.toFixed(3), 'mN·m'),

      telemetryRow('RW723', 'Reaction Wheel 3 Current', rw3Current.toFixed(3), 'A'),

      telemetryRow(
        'RW724',
        'Reaction Wheel 3 Temperature',
        rw3Temp.toFixed(1),
        '°C',
        classifyRange(rw3Temp, 5, 50, -10, 65)
      ),

      telemetryRow('RW725', 'Reaction Wheel 3 State', 'ACTIVE', 'state'),

      // --------------------------------------------------------------------
      // REACTION WHEEL 4
      // --------------------------------------------------------------------

      telemetryRow(
        'RW731',
        'Reaction Wheel 4 Speed',
        rw4Speed.toFixed(0),
        'rpm',
        wheelStatus(rw4Speed)
      ),

      telemetryRow('RW732', 'Reaction Wheel 4 Torque', rw4Torque.toFixed(3), 'mN·m'),

      telemetryRow('RW733', 'Reaction Wheel 4 Current', rw4Current.toFixed(3), 'A'),

      telemetryRow(
        'RW734',
        'Reaction Wheel 4 Temperature',
        rw4Temp.toFixed(1),
        '°C',
        classifyRange(rw4Temp, 5, 50, -10, 65)
      ),

      telemetryRow('RW735', 'Reaction Wheel 4 State', 'ACTIVE', 'state'),

      // --------------------------------------------------------------------
      // MOMENTUM
      // --------------------------------------------------------------------

      telemetryRow('MOM740', 'Stored Angular Momentum', storedMomentum.toFixed(3), 'N·m·s'),

      telemetryRow(
        'MOM741',
        'Momentum Capacity Margin',
        momentumMargin.toFixed(1),
        '%',
        momentumMargin >= 40 ? 'good' : momentumMargin >= 20 ? 'warning' : 'bad'
      ),

      telemetryRow('MOM742', 'Momentum Management State', 'NOMINAL', 'state'),

      telemetryRow('MOM743', 'Momentum Unload Request', 'NOT REQUIRED', 'state'),

      // --------------------------------------------------------------------
      // MAGNETORQUERS
      // --------------------------------------------------------------------

      telemetryRow('MTQ801', 'Magnetorquer X Dipole Command', mtqX.toFixed(4), 'A·m²'),

      telemetryRow('MTQ802', 'Magnetorquer Y Dipole Command', mtqY.toFixed(4), 'A·m²'),

      telemetryRow('MTQ803', 'Magnetorquer Z Dipole Command', mtqZ.toFixed(4), 'A·m²'),

      telemetryRow('MTQ804', 'Magnetorquer Electronics', 'ACTIVE', 'state'),

      telemetryRow(
        'MTQ805',
        'Magnetorquer Electronics Temperature',
        mtqTemp.toFixed(1),
        '°C',
        classifyRange(mtqTemp, 0, 50, -15, 65)
      ),

      telemetryRow('MTQ806', 'Magnetorquer Bus Current', mtqCurrent.toFixed(3), 'A'),

      // --------------------------------------------------------------------
      // ESTIMATION / CONTROL
      // --------------------------------------------------------------------

      telemetryRow('CTL901', 'Attitude Estimator', 'VALID', 'state'),

      telemetryRow('CTL902', 'Orbit Estimator', 'VALID', 'state'),

      telemetryRow('CTL903', 'Kalman Filter', 'CONVERGED', 'state'),

      telemetryRow(
        'CTL904',
        'Kalman Innovation',
        kalmanInnovation.toFixed(3),
        'sigma',
        Math.abs(kalmanInnovation) <= 2
          ? 'good'
          : Math.abs(kalmanInnovation) <= 3
            ? 'warning'
            : 'bad'
      ),

      telemetryRow(
        'CTL905',
        'Guidance Function',
        frankfurtTargetTracking
          ? 'TARGET TRACKING'
          : scenario2TestImaging
            ? 'NADIR CALIBRATION'
            : 'NADIR GUIDANCE',
        'state'
      ),

      telemetryRow('CTL906', 'Control Law', '3-AXIS CLOSED LOOP', 'state'),

      telemetryRow('CTL907', 'Momentum Management Function', 'NOMINAL', 'state'),

      telemetryRow('CTL908', 'Maneuver Planner', 'STANDBY', 'state'),

      telemetryRow('CTL909', 'Maneuver Status', 'NONE', 'state'),

      telemetryRow('CTL910', 'Safe Mode Controller', 'AVAILABLE', 'state'),

      telemetryRow(
        'CTL911',
        'Estimator Covariance Quality',
        covarianceQuality.toFixed(1),
        '%',
        covarianceQuality >= 90 ? 'good' : covarianceQuality >= 75 ? 'warning' : 'bad'
      ),

      telemetryRow('CTL912', 'Guidance Target', guidanceTarget, 'state'),

      // --------------------------------------------------------------------
      // THRUSTER INTERFACE
      // --------------------------------------------------------------------

      telemetryRow('ACT950', 'Attitude Thruster Interface', 'INHIBITED', 'state'),

      telemetryRow('ACT951', 'Attitude Thruster Pulse Width', '0.0', 'ms'),

      telemetryRow('ACT952', 'Attitude Thruster Command', 'NONE', 'state'),

      telemetryRow('ACT953', 'Propulsion Command Inhibit', 'ACTIVE', 'state'),

      // --------------------------------------------------------------------
      // OPTIONAL ACTUATORS
      // --------------------------------------------------------------------

      telemetryRow('ACT960', 'Momentum Wheel', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('ACT961', 'Control Moment Gyroscope', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('ACT962', 'Main Propulsion AOCS Interface', 'NOT CONFIGURED', 'state', 'empty'),

      telemetryRow('ACT963', 'Gimbal Actuator', 'NOT INSTALLED', 'state', 'empty'),

      telemetryRow('ACT964', 'Moving Mass Actuator', 'NOT INSTALLED', 'state', 'empty'),
    ];
  });

  return {
    aocsTelemetry,
  };
}
