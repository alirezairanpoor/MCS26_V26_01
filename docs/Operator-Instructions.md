# Operator Instructions

This document explains how to operate MCS26_V26_01 during mission simulation sessions.

MCS26_V26_01 is a role-based Mission Control System Operations Simulator.  
The simulator must be operated by following the procedure table step by step.

---

## Operator Roles

The simulator includes the following roles:

- SOM — Spacecraft Operations Manager
- SOE1 — Subsystem Operator / Engineer 1
- SOE2 — Subsystem Operator / Engineer 2
- SPACON — Spacecraft Controller

---

## SOM Responsibility

The SOM is the main coordinator of the procedure.

The SOM reads the procedure table, asks operators for information, evaluates reported values, requests command execution from SPACON, and confirms completed steps by pressing the correct action button.

The SOM must not skip procedure steps.

---

## SOE Responsibility

SOE1 and SOE2 are responsible for checking subsystem telemetry.

When requested by SOM, the SOE operator opens the correct panel, reads the requested telemetry parameter, and reports the value back to SOM.

Typical telemetry panels include:

- Ground Station
- EPS
- Payload
- Memory

SOE operators do not execute spacecraft commands.

---

## SPACON Responsibility

SPACON is responsible for executing spacecraft commands.

SPACON only executes a command after SOM has officially requested it through the procedure action button.

SPACON uses the command panel to select the requested command, arm it, and execute it with GO.

---

## Critical Operation Rule

The most important rule is:

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

## Case 1 — SOM asks SOE1 or SOE2 for telemetry

When the procedure step requires SOE1 or SOE2 to report a telemetry value, the SOM must first ask the responsible operator for the value.

The SOE operator then opens the correct subsystem panel and checks the requested telemetry parameter.

The SOE reports the value back to SOM.

SOM compares the reported value with the success criteria shown in the procedure table.

Only after the value has been received and checked, SOM presses the action button.

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

---

## Case 2 — SOM requests SPACON command execution

When the procedure step requires SPACON to execute a spacecraft command, the order is different.

In this case, SOM must press the action button first.

This action officially sends the command request to SPACON.

Only after SOM has pressed the action button, SPACON selects and executes the requested command.

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

SPACON must not execute a command before SOM has requested it through the procedure action button.

---

## SPACON Command Execution Sequence

SPACON command execution always follows this sequence:

1. Select the requested command.
2. Press ARM.
3. Confirm that the command is armed.
4. Press GO.
5. Check the command result in TC History.

If the wrong command is selected, the procedure may fail or show a wrong-step status.

---

## Procedure Table Status

The procedure table shows the current state of each procedure step.

Common status meanings:

- Pending — the step has not been completed yet
- In Progress — the operation is currently running
- Complete — the step has been completed successfully
- Failed — the wrong action or wrong command was executed

Operators should always follow the active procedure step.

---

## Status Colors

The simulator uses color-coded statuses.

General meaning:

- Green — nominal, completed, or successful
- Yellow — warning, waiting, or attention required
- Blue — operation in progress
- Red — emergency, failed condition, or non-nominal status

Blinking values usually indicate an active operational situation.

---

## Emergency Handling

In emergency situations, the simulator may show an emergency modal or warning banner.

The SOM must follow the emergency procedure and use the available emergency actions.

In Scenario 2, for example, the SOM contacts GNC and waits for a response.

If GNC suggests importing a new emergency procedure, SOM must import the procedure before continuing with the next recovery steps.

---

## Imaging Window

The imaging command must be executed inside the valid imaging window.

The imaging window is shown in the top status bar.

If the image command is executed outside the valid time window, the image may not be captured successfully.

---

## Recommended Communication

SOM to SOE:

```text
SOE1, please report GS1 / GEL005.
```

SOE to SOM:

```text
GS1 / GEL005 is above 5 degrees.
```

SOM:

```text
Confirmed. Criteria fulfilled.
```

Then SOM presses the action button.

For SPACON steps:

```text
SOM requests SPACON to execute MEM221 Dump Payload Memory.
```

Then SOM presses the action button.

SPACON:

```text
Command selected.
ARM pressed.
GO sent.
Command completed.
```

---

## Final Reminder

Follow the procedure table from top to bottom.

Do not skip steps.

Do not execute SPACON commands before SOM has requested them.

Always compare telemetry values with the success criteria before confirming a telemetry step.

For SOE telemetry steps:

```text
Ask → receive value → check criteria → press SOM action button
```

For SPACON command steps:

```text
Press SOM action button → SPACON selects command → ARM → GO
```