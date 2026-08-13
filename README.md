# MCS26_V26_01

MCS26_V26_01 is a browser-based Mission Control System simulator for role-based spacecraft operations training.

The simulator reproduces simplified mission operations workflows, including procedure execution, telemetry monitoring, telecommand execution, emergency handling, GNC coordination, SPACON command execution, spacecraft subsystem monitoring, ground-station operations, and imaging mission scenarios.

---

## Overview

This project is an interactive mission operations simulator.

It supports multiple operator roles:

- SOM — Spacecraft Operations Manager
- SOE1 — Subsystem Operator / Engineer 1
- SOE2 — Subsystem Operator / Engineer 2
- SPACON — Spacecraft Controller

The simulator is designed for synchronized multi-computer operation. A Host / Simulation Server runs the frontend and WebSocket sync server. Operator computers connect through role-based URLs.

Recommended architecture:

```text
Computer 0 = Host / Simulation Server
Computer 1 = SOM
Computer 2 = SPACON
Computer 3 = SOE1
Computer 4 = SOE2
```

The Host computer does not need to act as an operator.

---

## Scenarios

### Scenario 1 — Nominal Ground Pass and Imaging

Scenario 1 represents a nominal spacecraft ground pass and imaging operation.

Main mission phases:

- Mission start and ground-station preparation
- Ground Station 1 acquisition of signal
- Spacecraft telemetry acquisition
- Signal verification and filtering
- Payload memory dump
- Spacecraft and subsystem status verification
- EPS thermal mitigation
- Payload power increase
- Camera configuration
- Imaging-window operations
- Image acquisition
- Captured-image verification
- Spacecraft standby mode

### Scenario 2 — Communications & Thermal Contingency

Scenario 2 represents a contingency operations workflow involving communications degradation, telemetry loss, thermal response, operational coordination, and recovery through a secondary ground station.

Main mission phases:

- Initial Ground Station 1 operations
- Payload memory preparation
- Payload calibration / test imaging
- Thermal anomaly development
- Payload power reduction
- RF link degradation
- Ground Station 1 signal loss
- Loss of spacecraft telemetry
- GNC / operations coordination
- Emergency procedure import
- Ground Station 2 acquisition
- Spacecraft telemetry recovery
- EPS thermal mitigation
- Payload power restoration
- Camera reconfiguration
- Frankfurt Airport imaging
- Spacecraft standby mode

### Scenario 3 — Rendezvous & On-Orbit Servicing

**Status: Planned / Not Yet Implemented**

Planned capabilities include:

- Relative navigation
- Rendezvous operations
- Proximity operations
- Hold points
- Station keeping
- Spacecraft attitude maneuvers
- Target pointing
- Close approach
- On-orbit inspection / servicing operations
- Separation maneuver
- Safe departure

---

## Main Features

- Role-based mission operations workflow
- Role-based URLs for SOM, SOE, and SPACON
- Shared WebSocket state synchronization between operator clients
- Independent local panel selection for each operator
- SOM procedure table and mission coordination workflow
- SOE telemetry reporting workflow
- SPACON telecommand execution using SELECT → ARM → GO
- Searchable SPACON command / telemetry parameter catalog
- Ground Station 1 and Ground Station 2 operations
- Dynamic spacecraft telemetry availability based on communications-link state
- Dedicated EPS telemetry and power-system behavior
- Dedicated AOCS telemetry and attitude / navigation monitoring
- Dedicated TCS telemetry and thermal-state monitoring
- Dedicated Payload telemetry and imaging-instrument monitoring
- Dedicated Command & Data Handling (C&DH) telemetry
- Dedicated Captured Image panel
- Payload memory and data-dump operations
- TM History and TC History tables
- Emergency modal and GNC response workflow
- Dynamic procedure import for contingency recovery
- Cross-subsystem coupling between EPS, TCS, Payload, and mission state
- Synchronized end-of-simulation video sequence
- Local network operation over Wi-Fi or LAN
- Helper scripts for host startup and role-based client access
- Modular Vue subsystem components and telemetry composables

---

## Spacecraft and Ground Subsystems

### Ground Station

The Ground Station panel provides simulated ground-segment telemetry and operational status for spacecraft communications.

The simulator supports two ground-station operational contexts:

- **GS1** — nominal ground-pass operations and initial spacecraft contact
- **GS2** — contingency re-acquisition and telemetry recovery

During the contingency scenario, the GS1 RF link can progressively degrade and eventually lose spacecraft telemetry. GS2 is then used for spacecraft re-acquisition and telemetry recovery.

### Electrical Power System (EPS)

The EPS subsystem provides simulated spacecraft electrical-power telemetry including battery status, electrical loads, power distribution, payload power allocation, power-system temperatures, and operational power states.

EPS behavior is coupled with Payload and TCS behavior during nominal and contingency operations.

### Attitude and Orbit Control System (AOCS)

The AOCS subsystem provides simulated telemetry for spacecraft attitude and orbit-control monitoring, including:

- Attitude knowledge
- Quaternion and spacecraft orientation data
- Angular rates
- Star trackers
- Sun sensors
- Magnetometers
- Gyros / IMU
- Reaction wheels
- Magnetorquers
- Navigation data
- Guidance and control states
- Maneuver-related telemetry

### Thermal Control System (TCS)

The TCS subsystem provides dynamic spacecraft thermal telemetry for:

- Electronics
- Payload hardware
- Batteries
- Radiators
- Heaters
- Heat pipes
- Thermal sensors
- Thermal gradients
- Predicted thermal margins

The thermal model is coupled with spacecraft power and payload states.

### Payload

The Payload panel provides simulated imaging-instrument telemetry including:

- Payload electronics
- Camera configuration
- Detector and focal-plane telemetry
- Optical hardware
- Calibration states
- Imaging readiness
- Exposure and image-quality parameters
- Compression
- Payload data handling
- Payload thermal behavior

### Command & Data Handling (C&DH)

The C&DH subsystem provides simulated telemetry for:

- Onboard computer processing
- CPU and FPGA activity
- Watchdog and reset status
- SDRAM / NAND / MRAM / EEPROM
- Mass memory
- Payload data recorder
- SpaceWire and onboard data buses
- Command handling
- Telemetry packet handling
- Flight software services
- File-system status
- Time synchronization
- Memory scrubbing
- Memory dump operations

Memory is treated as part of the C&DH subsystem rather than as a standalone operator panel.

### Captured Image

Payload image-acquisition results are displayed in a dedicated **Captured Image** panel.

The panel shows:

- Captured image
- Image name
- Image validity status

Captured images are no longer displayed inside the C&DH panel.

---

## Telemetry Availability

Spacecraft subsystem telemetry depends on the simulated space-to-ground communications link.

Before a valid telemetry path is available, or during spacecraft signal loss, spacecraft subsystem panels report:

```text
NO TELEMETRY
```

The onboard spacecraft simulation continues internally during loss of signal, but live spacecraft telemetry is not observable from the ground.

Telemetry becomes visible again after a valid ground-station telemetry lock is recovered.

---

## SPACON Command Execution

SPACON is the spacecraft telecommand operator console.

Command execution follows the sequence:

```text
SELECT
ARM
GO
```

The SPACON interface contains a searchable command and telemetry-parameter catalog grouped by subsystem.

The catalog includes parameters from:

- Ground Station
- EPS
- AOCS
- TCS
- Payload
- C&DH

Operators can search using:

- Parameter code
- Command name
- Subsystem name

Example:

```text
IMG901
MEM221
EPT014
CAM000
```

Pressing `Enter` after typing a search term selects the first matching entry.

Operational telecommands execute the associated simulator action. Read-only telemetry parameters can be selected for monitoring reference without changing spacecraft state.

SPACON must not execute an operational command before the SOM has requested it through the procedure action button.

---

## Operator Instructions

The simulator must be operated by following the procedure table step by step.

The SOM is responsible for coordinating the procedure flow.

SOE operators observe subsystem telemetry values.

SPACON executes spacecraft commands after the SOM requests command execution.

### Case 1 — SOM asks SOE1 or SOE2 for telemetry

When the procedure step requires SOE1 or SOE2 to report a telemetry value, the SOM must first ask the responsible operator for the value.

The SOE operator opens the correct subsystem panel, checks the requested telemetry parameter, and reports the value back to the SOM.

After receiving the information, the SOM compares the reported value with the success criteria shown in the procedure table.

Only after the value has been received and checked, the SOM presses the action button.

Correct order:

```text
SOM asks SOE
SOE checks telemetry
SOE reports value
SOM checks criteria
SOM presses action button
```

### Case 2 — SOM requests SPACON command execution

When the procedure step requires SPACON to execute a spacecraft command, the order is different.

The SOM must press the action button first. This officially sends the command request to SPACON.

Only after the SOM has pressed the action button, SPACON selects and executes the requested command.

Correct order:

```text
SOM presses action button
SPACON selects the requested command
SPACON presses ARM
SPACON presses GO
Command result is shown in TC History
```

---

## Status Colors

General meaning:

- Green — nominal, completed, or successful
- Yellow — warning, waiting, or attention required
- Blue — operation in progress
- Red — emergency, failed condition, or non-nominal status

Operators should pay attention to blinking yellow, blue, or red values because they usually indicate an active operational situation.

---

## Technology Stack

- Vue 3
- TypeScript
- Vite
- Socket.IO
- Express
- JavaScript
- CSS
- HTML

---

## Software Architecture

Subsystem telemetry generation is separated from the main application using Vue composables, while dedicated Vue components provide subsystem operator panels.

`App.vue` acts primarily as the mission/scenario orchestrator and connects shared mission state to the subsystem models and operator interfaces.

Current subsystem architecture:

```text
src/
├── App.vue
├── main.ts
├── style.css
│
├── components/
│   └── subsystems/
│       ├── GroundStationPanel.vue
│       ├── EpsPanel.vue
│       ├── AocsPanel.vue
│       ├── TcsPanel.vue
│       ├── PayloadPanel.vue
│       ├── CdhPanel.vue
│       └── ImagePanel.vue
│
└── composables/
    ├── useGroundStationTelemetry.ts
    ├── useEpsTelemetry.ts
    ├── useAocsTelemetry.ts
    ├── useTcsTelemetry.ts
    ├── usePayloadTelemetry.ts
    └── useCdhTelemetry.ts
```

Subsystem composables read mission/application state and generate telemetry without directly modifying the mission procedure state.

---

## Installation

Install dependencies:

```bash
npm install
```

---

## Run the Synchronized Simulation

The simulation requires two services on the Host computer:

```text
Frontend server        port 5173
WebSocket sync server  port 3001
```

### Start the Host

On the Host computer, run:

```text
scripts/start-host-dev.bat
```

Keep both terminal windows open.

### Find the Host IP

On the Host computer, run:

```text
scripts/show-host-ip.bat
```

Use the IPv4 address of the Host computer.

### Open Role Clients

Replace `HOST-IP` with the Host computer IPv4 address.

```text
SOM:    http://HOST-IP:5173/?role=SOM
SPACON: http://HOST-IP:5173/?role=SPACON
SOE1:   http://HOST-IP:5173/?role=SOE
SOE2:   http://HOST-IP:5173/?role=SOE
```

Example:

```text
http://192.168.178.129:5173/?role=SOM
```

Shortcut scripts are available:

```text
scripts/open-som.bat
scripts/open-spacon.bat
scripts/open-soe1.bat
scripts/open-soe2.bat
```

Each script asks for the Host IP address and opens the correct role URL.

For more details, see:

```text
RUN_SIMULATION.md
```

---

## Manual Development Commands

Run the WebSocket sync server:

```bash
npm run start:server
```

Run the frontend server:

```bash
npm run start:frontend
```

Equivalent legacy commands:

```bash
npm run server
npm run dev
```

---

## Build

Build the frontend:

```bash
npm run build
```

Preview the frontend build:

```bash
npm run preview
```

Important: the synchronized multi-computer simulation still requires the WebSocket sync server:

```bash
npm run start:server
```

---

## Local Network Operation

The simulator can run over Wi-Fi or LAN.

Only the Host IP address changes.

For LAN operation, use the IPv4 address of the Host computer on the LAN adapter.

The following ports must be reachable from all operator computers:

```text
5173 - Frontend server
3001 - WebSocket sync server
```

If clients cannot connect, allow both ports in Windows Firewall on the Host computer.

---

## Host Scripts

The `scripts` folder contains helper files for running and opening the simulator.

```text
scripts/start-host-dev.bat
scripts/show-host-ip.bat
scripts/open-som.bat
scripts/open-spacon.bat
scripts/open-soe1.bat
scripts/open-soe2.bat
```

### `start-host-dev.bat`

Starts the Host services:

- WebSocket sync server
- Vite frontend server

This file should be executed on the Host computer.

### `show-host-ip.bat`

Displays the current IPv4 addresses of the Host computer.

### `open-som.bat`

Opens the simulator with role `SOM`.

### `open-spacon.bat`

Opens the simulator with role `SPACON`.

### `open-soe1.bat`

Opens the simulator with role `SOE`.

### `open-soe2.bat`

Opens the simulator with role `SOE`.

---

## Recommended Host Workflow

On the Host computer:

1. Run `scripts/start-host-dev.bat`.
2. Run `scripts/show-host-ip.bat`.
3. Keep both server windows open.

On the operator computers:

1. Make sure they are connected to the same Wi-Fi or LAN.
2. Run the correct role script.
3. Enter the Host IP address.
4. Operate the simulator according to the assigned role.

---

## Project Structure

```text
MCS26_V26_01/
├── docs/
├── public/
├── scripts/
│   ├── start-host-dev.bat
│   ├── show-host-ip.bat
│   ├── open-som.bat
│   ├── open-spacon.bat
│   ├── open-soe1.bat
│   └── open-soe2.bat
├── src/
│   ├── components/
│   │   └── subsystems/
│   │       ├── GroundStationPanel.vue
│   │       ├── EpsPanel.vue
│   │       ├── AocsPanel.vue
│   │       ├── TcsPanel.vue
│   │       ├── PayloadPanel.vue
│   │       ├── CdhPanel.vue
│   │       └── ImagePanel.vue
│   ├── composables/
│   │   ├── useGroundStationTelemetry.ts
│   │   ├── useEpsTelemetry.ts
│   │   ├── useAocsTelemetry.ts
│   │   ├── useTcsTelemetry.ts
│   │   ├── usePayloadTelemetry.ts
│   │   └── useCdhTelemetry.ts
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── server.js
├── RUN_SIMULATION.md
├── .gitattributes
├── .gitignore
├── LICENSE
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## Project Name

Official project name:

```text
MCS26_V26_01
```

Project subtitle:

```text
Mission Control System Operations Simulator
```

NPM package name:

```text
mcs26-v26-01
```

---

## Inspiration

This project was inspired by the Sim-Ops software suite, which is used for spacecraft operations simulation exercises and demonstrations.

MCS26_V26_01 is an independent, simplified browser-based simulator created for training and demonstration purposes.

It does not reproduce the full Sim-Ops architecture, backend services, spacecraft simulator, ground station simulator, or operational infrastructure.

Reference project:

```text
https://github.com/nunorc/sim-ops
```

---

## Engineering Disclaimer

This project is an educational, training, and engineering simulation environment.

It is not an operational spacecraft control system and must not be used for real spacecraft operations, safety-critical decision making, or flight operations.

Telemetry values, operational thresholds, thermal limits, equipment characteristics, signal values, subsystem parameters, and mission parameters used in the simulator are generic simulation-development values.

They must not be interpreted as flight-certified spacecraft data or operational limits.

Any institutional names, mission concepts, or operational references are used only for educational, training, or demonstration purposes unless otherwise authorized.

---

## Author

Developed by: Hoshyar Iranpour [Alireza Iranpoor Mobarakeh]

LinkedIn:

```text
https://www.linkedin.com/in/alireza-iranpoor-mobarakeh-53080a307/
```

---

## License

All Rights Reserved.

This project is publicly visible for demonstration and portfolio purposes.

No permission is granted to copy, modify, distribute, sublicense, or use this project commercially without explicit written permission from the author.
