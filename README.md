# MCS26_V26_01

MCS26_V26_01 is a browser-based Mission Control System simulator for role-based spacecraft operations training.

The simulator reproduces simplified mission operations workflows, including procedure execution, telemetry monitoring, telecommand execution, emergency handling, and imaging mission scenarios.

---

## Overview

This project is built as an interactive mission operations simulator.

It includes multiple operator roles:

- SOM — Spacecraft Operations Manager
- SOE1 — Subsystem Operator / Engineer 1
- SOE2 — Subsystem Operator / Engineer 2
- SPACON — Spacecraft Controller

The SOM follows a step-by-step procedure table.

SOE operators report subsystem telemetry values.

SPACON executes spacecraft commands using a command selection, ARM, and GO workflow.

The simulator is intended to support role-based training, mission procedure familiarization, and operational coordination exercises.

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
- SOM procedure table
- SOE telemetry reporting workflow
- SPACON command execution with ARM / GO logic
- Ground Station, EPS, Payload, and Memory panels
- TM History and TC History tables
- Emergency modal and GNC response workflow
- Dynamic procedure import for emergency recovery
- Scenario-specific imaging windows
- Production server scripts for local network operation

---

## Technology Stack

- Vue 3
- TypeScript
- Vite
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

## Development Mode

Run the development server:

```bash
npm run dev
```

Then open the simulator locally:

```text
http://localhost:5173/
```

The development server is configured to run with network access enabled.

Other computers in the same local network can open the simulator through the host IP address and port `5173`.

Example:

```text
http://HOST-IP-ADDRESS:5173/
```

---

## Production Build

Build the project:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Then open the simulator locally:

```text
http://localhost:4173/
```

Other computers in the same local network can open the production preview through the host IP address and port `4173`.

Example:

```text
http://HOST-IP-ADDRESS:4173/
```

---

## Local Network Operation

The simulator can be hosted on one computer and opened from other computers in the same local network.

The host computer starts the production server.

Other computers open the simulator through the host IP address.

Example:

```text
http://192.168.2.183:4173/
```

The IP address may be different on another network or on another day.

Before running the simulator in a lab environment, check the current host IP address.

---

## Host Scripts

The `scripts` folder contains helper files for running the simulator on a host computer.

```text
scripts/start-host-production.bat
scripts/open-simulator.bat
scripts/show-host-ip.bat
```

### `start-host-production.bat`

Builds the project and starts the production preview server.

This file should be executed on the host computer.

The server window must remain open while the simulator is being used.

### `open-simulator.bat`

Opens the simulator in the browser using the configured host IP address.

This file can be used on the host computer and on other computers in the same local network.

If the host IP address changes, the URL inside this file must be updated.

### `show-host-ip.bat`

Displays the current IPv4 addresses of the host computer.

This file is useful before a lab session to confirm that the simulator shortcut still uses the correct host IP address.

---

## Recommended Host Workflow

On the host computer:

1. Run `show-host-ip.bat`.
2. Confirm that the IP address matches the URL inside `open-simulator.bat`.
3. Run `start-host-production.bat`.
4. Keep the server window open.
5. Run `open-simulator.bat` to open the simulator in the browser.

On the other computers:

1. Make sure they are connected to the same local network.
2. Run `open-simulator.bat`.
3. The browser should open the simulator from the host computer.

---

## Operator Instructions

The simulator must be operated by following the procedure table step by step.

The SOM is responsible for coordinating the procedure flow.

However, the correct order of actions depends on whether the SOM is asking SOE1 / SOE2 for telemetry or requesting SPACON to execute a command.

This distinction is critical for operating the simulator correctly.

---

### Case 1 — SOM asks SOE1 or SOE2 for telemetry

When the procedure step requires SOE1 or SOE2 to report a telemetry value, the SOM must first ask the responsible operator for the value.

The SOE operator then opens the correct subsystem panel, checks the requested telemetry parameter, and reports the value back to the SOM.

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

Short form:

```text
Ask → receive value → check criteria → press SOM action button
```

Example:

```text
SOM: SOE1, please report GS1 / GEL005.

SOE1: GS1 / GEL005 is above 5 degrees.

SOM checks the procedure criteria.

SOM presses the action button.
```

Important:

```text
For SOE telemetry steps, the SOM action button is pressed after the telemetry value has been reported and checked.
```

---

### Case 2 — SOM requests SPACON command execution

When the procedure step requires SPACON to execute a spacecraft command, the order is different.

In this case, the SOM must press the action button first.

This action officially sends the command request to SPACON.

Only after the SOM has pressed the action button, SPACON selects and executes the requested command.

Correct order:

```text
SOM presses action button
SPACON selects the requested command
SPACON presses ARM
SPACON presses GO
Command result is shown in TC History
```

Short form:

```text
Press SOM action button → SPACON selects command → ARM → GO
```

Example:

```text
SOM requests SPACON to execute Dump Payload Memory.

SOM presses the action button.

SPACON selects MEM221 Dump Payload Memory.

SPACON presses ARM.

SPACON presses GO.

The command result appears in TC History.
```

Important:

```text
For SPACON command steps, the SOM action button is pressed before SPACON executes the command.
```

SPACON must not execute a command before the SOM has requested it through the procedure action button.

---

## Critical Operation Rule

For SOE telemetry steps:

```text
Ask first, receive the value, check the criteria, then press the SOM action button.
```

For SPACON command steps:

```text
Press the SOM action button first, then SPACON executes the command.
```

This rule is essential for using the simulator correctly.

---

## SPACON Command Execution

SPACON command execution always follows the same sequence:

1. Select the requested command.
2. Press ARM.
3. Confirm that the command is armed.
4. Press GO.
5. Check the command result in TC History.

SPACON should only execute a command after the SOM has requested it through the procedure table.

---

## Status Colors

The simulator uses color-coded statuses to support fast operational understanding.

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
├── src/
│   ├── App.vue
│   ├── main.ts
│   └── style.css
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