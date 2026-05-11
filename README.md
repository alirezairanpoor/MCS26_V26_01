# MCS26_V26_01

MCS26_V26_01 is a browser-based Mission Control System simulator for role-based spacecraft operations training.

The simulator reproduces simplified mission operations workflows, including procedure execution, telemetry monitoring, telecommand execution, emergency handling, GNC coordination, SPACON command execution, and imaging mission scenarios.

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

### Scenario 1 — Frankfurt Airport Imaging Mission

Scenario 1 focuses on a nominal imaging operation with an EPS thermal mitigation event.

Main mission phases:

- Ground station acquisition
- Signal verification and filtering
- Payload memory dump
- Payload status verification
- EPS thermal mitigation
- Payload power increase
- Camera configuration
- Image acquisition
- Spacecraft standby mode

### Scenario 2 — Emergency Battery Recovery and GS2 Imaging Mission

Scenario 2 introduces a more complex emergency workflow.

Main mission phases:

- Initial ground station preparation
- Payload memory preparation
- Battery emergency detection
- GNC emergency contact
- Emergency procedure import
- Battery equalization transfer
- Power saving mode
- GS1 signal loss and GS2 acquisition
- EPS thermal mitigation
- Payload preparation
- Image acquisition
- Spacecraft standby mode

---

## Main Features

- Role-based mission operations workflow
- Role-based URLs for SOM, SOE, and SPACON
- Shared WebSocket state synchronization between operator clients
- Independent local panel selection for each operator
- SOM procedure table
- SOE telemetry reporting workflow
- SPACON command execution with command selection, ARM, and GO logic
- Ground Station, EPS, Payload, and Memory panels
- TM History and TC History tables
- Emergency modal and GNC response workflow
- Dynamic procedure import for emergency recovery
- Synchronized end-of-simulation video sequence
- Local network operation over Wi-Fi or LAN
- Helper scripts for host startup and role-based client access

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

## Operator Instructions

The simulator must be operated by following the procedure table step by step.

The SOM is responsible for coordinating the procedure flow.

SOE operators observe subsystem telemetry values.

SPACON executes spacecraft commands after the SOM requests command execution.

---

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

---

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

SPACON must not execute a command before the SOM has requested it through the procedure action button.

---

## SPACON Command Execution

SPACON command execution always follows the same sequence:

1. Select the requested command.
2. Press ARM.
3. Confirm that the command is armed.
4. Press GO.
5. Check the command result in TC History.

---

## Status Colors

General meaning:

- Green — nominal, completed, or successful
- Yellow — warning, waiting, or attention required
- Blue — operation in progress
- Red — emergency, failed condition, or non-nominal status

Operators should pay attention to blinking yellow, blue, or red values because they usually indicate an active operational situation.

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

## Disclaimer

This project is a training and demonstration simulator.

It is not an operational spacecraft control system.

It must not be used for real spacecraft operations, real mission control activities, or safety-critical decision making.

Any institutional names, mission concepts, or operational references are used only for educational, training, or demonstration purposes unless otherwise authorized.

---

## Author

Developed by: Hoshyar Iranpour [Alireza Iranpoor Mobarakeh]

---

## License

All Rights Reserved.

This project is publicly visible for demonstration and portfolio purposes.

No permission is granted to copy, modify, distribute, sublicense, or use this project commercially without explicit written permission from the author.
