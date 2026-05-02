# Scenario 1 Procedure

## Frankfurt Airport Imaging Mission

This document summarizes the operational procedure for Scenario 1 of MCS26_V26_01.

Scenario 1 represents a spacecraft imaging mission targeting Frankfurt Airport.

The mission includes ground station acquisition, signal preparation, memory preparation, payload verification, EPS thermal mitigation, camera configuration, image acquisition, and spacecraft standby.

---

## Mission Objective

The objective of Scenario 1 is to capture an image of Frankfurt Airport within the valid imaging window.

The mission is considered successful when:

- the ground station link is available,
- the signal quality is nominal,
- payload memory is available,
- the payload is prepared,
- the EPS thermal issue is mitigated,
- the camera is configured,
- the image is captured inside the imaging window,
- and the spacecraft is placed into standby mode.

---

## Valid Imaging Window

The valid imaging window for Scenario 1 is:

```text
T+15:00 to T+16:00
```

The image command must be executed inside this time window.

---

## Operator Roles

Scenario 1 uses the following roles:

```text
SOM     — Spacecraft Operations Manager
SOE1    — Subsystem Operator / Engineer 1
SOE2    — Subsystem Operator / Engineer 2
SPACON  — Spacecraft Controller
```

---

## Critical Operation Rule

For telemetry reporting steps:

```text
SOM asks SOE → SOE checks telemetry → SOE reports value → SOM checks criteria → SOM presses action button
```

For SPACON command steps:

```text
SOM presses action button → SPACON selects command → ARM → GO
```

SPACON must not execute a command before SOM has requested it through the procedure action button.

---

## Procedure Flow Overview

Scenario 1 can be divided into the following phases:

1. Start simulation
2. Ground station acquisition
3. Signal verification and filtering
4. Memory preparation
5. Payload status check
6. EPS check and anomaly detection
7. EPS thermal mitigation
8. Payload power increase
9. Camera configuration
10. Image acquisition
11. Spacecraft standby

---

## Phase 1 — Start Simulation

The SOM starts the simulation from the SOM procedure panel.

The mission timer begins to run.

The top status bar shows:

- simulation status,
- mission time,
- mission phase,
- imaging window information.

---

## Phase 2 — Ground Station Acquisition

The SOM asks SOE1 to open the Ground Station panel and report:

```text
GS1 / GEL005
```

This value represents the GS1 antenna elevation.

Success criteria:

```text
GS1 / GEL005 ≥ 5 degrees
```

Correct operation:

```text
SOM asks SOE1
SOE1 checks Ground Station panel
SOE1 reports GS1 / GEL005
SOM checks criteria
SOM presses action button
```

If the elevation is at least five degrees, GS1 can support link operations.

---

## Phase 3 — Signal Verification and Filtering

The SOM asks SOE2 to report signal quality values:

```text
GSE001
GBL092
```

The SOM checks whether the signal condition is acceptable.

If signal quality is not good enough, the SOM requests SPACON to execute signal filtering.

SPACON command:

```text
GS1 / GSE001 Filter Signal
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects GS1 / GSE001 Filter Signal
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

After the command, SOM asks SOE1 to verify the signal again.

Expected result:

```text
GSE001 nominal
GBL092 good
```

---

## Phase 4 — Memory Preparation

The SOM asks SOE2 to open the Memory panel and report:

```text
MEM221
```

This value represents payload memory usage.

If the memory is occupied, the SOM requests SPACON to execute the memory dump command.

SPACON command:

```text
MEM221 Dump Payload Memory
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects MEM221 Dump Payload Memory
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

After the dump, the SOM asks an SOE operator to report MEM221 again.

Expected result:

```text
MEM221 ≤ 10 %
```

After receiving and checking the value, SOM presses the action button.

---

## Phase 5 — Payload Status Check

The SOM asks SOE2 to open the Payload panel and report:

```text
PLD620
```

This value represents the payload instrument mode.

Expected condition:

```text
Payload in safe mode
```

Correct operation:

```text
SOM asks SOE2
SOE2 checks Payload panel
SOE2 reports PLD620
SOM checks criteria
SOM presses action button
```

---

## Phase 6 — EPS Check and Anomaly Detection

The SOM asks SOE1 to open the EPS panel and report key EPS values:

```text
EPT014
DCC208
NET118
```

Parameter meaning:

```text
EPT014 — EPS main electronics temperature
DCC208 — DC converter temperature
NET118 — spacecraft power margin / net power value
```

Scenario 1 introduces an EPS thermal anomaly.

If EPT014 is above the safe threshold, the mission must not continue directly to imaging.

The SOM must request EPS thermal mitigation.

---

## Phase 7 — EPS Thermal Mitigation

The SOM requests SPACON to reduce payload power.

SPACON command:

```text
EPT014 Reduce Payload Power
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects EPT014 Reduce Payload Power
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

Expected result:

```text
EPT014 decreases toward the safe range
NET118 reflects the reduced power state
```

After mitigation, the SOM asks SOE2 to report updated EPS values.

Correct operation:

```text
SOM asks SOE2
SOE2 checks EPS panel
SOE2 reports EPT014 and NET118
SOM checks criteria
SOM presses action button
```

---

## Phase 8 — Payload Power Increase

Once EPS is stable, the SOM requests SPACON to increase payload power again.

SPACON command:

```text
PWR740 Increase Payload Power
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects PWR740 Increase Payload Power
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

Purpose:

```text
Prepare the payload for camera configuration and imaging.
```

---

## Phase 9 — Camera Configuration

The SOM requests SPACON to configure the camera.

SPACON command:

```text
CAM000 Configure Camera
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects CAM000 Configure Camera
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

After command execution, the SOM asks SOE1 to verify camera readiness in the Payload panel.

Expected result:

```text
CAM000 ready
```

Correct operation:

```text
SOM asks SOE1
SOE1 checks Payload panel
SOE1 reports camera status
SOM checks criteria
SOM presses action button
```

---

## Phase 10 — Image Acquisition

The SOM requests SPACON to execute the imaging command.

SPACON command:

```text
IMG901 Take Image
```

This command must be executed inside the valid imaging window:

```text
T+15:00 to T+16:00
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects IMG901 Take Image
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

Expected result:

```text
Image captured successfully
Captured image shown in Memory panel
```

---

## Phase 11 — Spacecraft Standby

After successful image acquisition, the SOM requests spacecraft standby mode.

SPACON command:

```text
STB901 Spacecraft Standby Mode
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects STB901 Spacecraft Standby Mode
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

Expected result:

```text
Spacecraft enters standby mode
Scenario reaches final state
Ending sequence begins
```

---

## Success Criteria Summary

Scenario 1 is successful when:

- GS1 elevation is acceptable,
- signal quality is verified,
- payload memory is dumped and available,
- payload initial state is verified,
- EPS thermal anomaly is mitigated,
- payload power is restored,
- camera is configured,
- image is captured inside the valid imaging window,
- spacecraft standby mode is executed.

---

## Common Mistakes to Avoid

Do not press the SOM action button before receiving telemetry from SOE1 or SOE2.

Do not allow SPACON to execute commands before SOM has pressed the action button.

Do not skip the EPS mitigation step when EPT014 is non-nominal.

Do not execute the image command outside the valid imaging window.

Do not close the host server window during the simulation session.

---

## Final Reminder

For SOE telemetry steps:

```text
Ask → receive value → check criteria → press SOM action button
```

For SPACON command steps:

```text
Press SOM action button → SPACON selects command → ARM → GO
```

Scenario 1 trains the team to complete a nominal imaging operation while responding to an EPS thermal issue.