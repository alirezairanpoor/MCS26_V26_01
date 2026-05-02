# Scenario 2 Procedure

## Emergency Battery Recovery and GS2 Imaging Mission

This document summarizes the operational procedure for Scenario 2 of MCS26_V26_01.

Scenario 2 represents a spacecraft mission that starts with nominal imaging preparation but develops into a battery emergency.

The team must detect the emergency, contact GNC, import a new emergency procedure, recover the battery state, switch from GS1 to GS2, manage EPS thermal limits, complete payload preparation, capture the target image, and finally place the spacecraft into standby mode.

---

## Mission Objective

The objective of Scenario 2 is to recover the spacecraft from a critical battery condition and still complete the imaging mission.

The mission is considered successful when:

- the initial GS1 link is established,
- payload memory is prepared,
- the battery emergency is detected,
- GNC is contacted,
- the emergency procedure is imported,
- battery equalization is executed,
- Power Saving Mode is activated,
- the spacecraft transitions from GS1 to GS2,
- EPS thermal limits are managed,
- the payload and camera are prepared,
- the image is captured inside the valid imaging window,
- and the spacecraft is placed into standby mode.

---

## Valid Imaging Window

The valid imaging window for Scenario 2 is:

```text
T+30:00 to T+30:30
```

The image command must be executed inside this time window.

---

## Operator Roles

Scenario 2 uses the following roles:

```text
SOM     — Spacecraft Operations Manager
SOE1    — Subsystem Operator / Engineer 1
SOE2    — Subsystem Operator / Engineer 2
SPACON  — Spacecraft Controller
GNC     — Guidance, Navigation and Control support team
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

Scenario 2 can be divided into the following phases:

1. Start simulation
2. Initial GS1 ground station acquisition
3. Signal verification and filtering
4. Memory preparation
5. Payload status check
6. Battery emergency detection
7. GNC emergency contact
8. Emergency procedure import
9. Battery Equalization Transfer
10. Power Saving Mode
11. EPS thermal and power check
12. GS1 signal loss and GS2 acquisition
13. GS2 signal filtering
14. EPS thermal mitigation
15. Payload power increase
16. Camera configuration
17. Final EPS verification
18. Image acquisition
19. Spacecraft standby

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

## Phase 2 — Initial GS1 Ground Station Acquisition

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

After filtering, the SOM asks SOE1 to verify the GS1 signal again.

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

After the dump, SOM asks SOE1 to report MEM221 again.

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

At this point, the scenario still follows a nominal preparation flow.

---

## Phase 6 — Battery Emergency Detection

The SOM asks SOE1 to open the EPS panel and report:

```text
BCH096
BCH097
BCH098
```

These values represent the charge levels of Battery A, Battery B, and Battery C.

Expected nominal condition:

```text
All battery values > 50 %
```

Non-nominal condition:

```text
One battery < 30 %
```

Emergency condition:

```text
One battery < 20 %
```

In Scenario 2, Battery B and Battery C are critically low.

This creates a battery emergency.

The emergency modal and emergency banner are displayed.

The SOM must not continue with the nominal imaging sequence before handling the emergency.

---

## Phase 7 — GNC Emergency Contact

The SOM opens the emergency contact list.

The correct support team is:

```text
GNC — Guidance, Navigation and Control
```

The SOM sends an emergency message to GNC.

The message reports the critical battery condition and requests support for recovery.

After the message is sent, the simulator enters a waiting state.

GNC responds negatively to a direct attitude change request.

Instead, GNC suggests importing a new emergency procedure.

Expected result:

```text
GNC response received
Emergency procedure import suggested
```

---

## Phase 8 — Emergency Procedure Import

The SOM imports the new emergency procedure.

This extends the procedure table with additional recovery steps.

After the import is complete, the team continues with the updated procedure.

Expected result:

```text
New emergency procedure imported
Procedure table extended
Recovery sequence available
```

---

## Phase 9 — Battery Equalization Transfer

The SOM requests SPACON to execute Battery Equalization Transfer.

SPACON command:

```text
BAT330 Battery Equalization Transfer
```

Purpose:

```text
Redistribute charge from Battery A into Battery B and Battery C.
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects BAT330 Battery Equalization Transfer
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

During this step, the operation may be shown as in progress.

After completion, the SOM asks SOE2 to report the battery values again:

```text
BCH096
BCH097
BCH098
```

Expected result:

```text
Battery values approximately balanced
Battery state recovered from critical emergency condition
```

In this scenario, the expected battery values are approximately:

```text
BCH096 ≈ 34.7 %
BCH097 ≈ 34.7 %
BCH098 ≈ 34.7 %
```

After checking the reported values, SOM presses the action button.

---

## Phase 10 — Power Saving Mode

The SOM asks SOE1 to report:

```text
NET118
```

Success criteria:

```text
NET118 ≥ 900 W
```

If the power condition allows it, the SOM requests SPACON to enter Power Saving Mode.

SPACON command:

```text
PSM001 Enter Power Saving Mode
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects PSM001 Enter Power Saving Mode
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

The command takes time and may show an in-progress status.

After Power Saving Mode is active, the SOM asks SOE2 to verify battery and power values again.

Expected result:

```text
Battery values remain above critical threshold
Power condition stable
Emergency downgraded to warning
```

---

## Phase 11 — EPS Thermal and Power Check

The SOM asks SOE1 to report:

```text
EPT014
NET118
```

Parameter meaning:

```text
EPT014 — EPS main electronics temperature
NET118 — spacecraft power margin / net power value
```

Expected EPS temperature range:

```text
Approximately 70.0 °C to 75.0 °C
```

If the values are acceptable, SOM checks the success criteria and presses the action button.

If the EPS temperature is too high, thermal mitigation will be required later in the procedure.

---

## Phase 12 — GS1 Signal Loss and GS2 Acquisition

The SOM asks SOE2 to verify GS1 signal quality:

```text
GS1 / GSE001
```

If the GS1 signal is bad or the GS1 link is lost, the mission must continue with GS2.

The SOM waits for acceptable GS2 elevation:

```text
GS2 / GEL005
```

Success criteria:

```text
GS2 / GEL005 ≥ 5 degrees
```

Correct operation:

```text
SOM asks SOE
SOE checks Ground Station panel
SOE reports GS2 / GEL005
SOM checks criteria
SOM presses action button
```

---

## Phase 13 — GS2 Signal Filtering

After GS2 elevation is acceptable, the SOM asks SOE1 to report GS2 signal quality:

```text
GS2SIG
GBL092
```

If the GS2 signal is not good enough, SOM requests SPACON to execute GS2 signal filtering.

SPACON command:

```text
GS2 Signal Filtering
```

Correct SPACON operation:

```text
SOM presses action button
SPACON selects GS2 signal filtering command
SPACON presses ARM
SPACON presses GO
Command result appears in TC History
```

Expected result:

```text
GS2 signal stable
GS2 link available for remaining mission operations
```

---

## Phase 14 — EPS Thermal Mitigation

The SOM evaluates the EPS thermal condition again.

If **EPT014** is too high, the SOM requests SPACON to reduce payload power.

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
EPT014 decreases toward safe range
NET118 reflects reduced power state
```

After the command, SOM asks SOE2 to report EPS values again.

Expected result:

```text
EPS condition nominal or acceptable for mission continuation
```

After checking the reported values, SOM presses the action button.

---

## Phase 15 — Payload Power Increase

Once EPS is confirmed, the SOM requests SPACON to increase payload power for imaging.

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

Note:

```text
After increasing payload power, EPS temperature may begin to rise slowly.
```

The SOM must continue monitoring EPS values.

---

## Phase 16 — Camera Configuration

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

After command execution, the SOM asks SOE1 to verify payload and camera status:

```text
PLD620
CAM201
```

Expected result:

```text
PLD620 active
CAM201 nominal
```

After receiving and checking the values, SOM presses the action button.

---

## Phase 17 — Final EPS Verification

Before imaging, the SOM asks SOE2 to report the EPS thermal condition again.

Important values:

```text
EPT014
NET118
```

Purpose:

```text
Confirm that the spacecraft is still safe to continue after payload power increase.
```

Expected result:

```text
EPS values acceptable for image acquisition
```

After checking the reported values, SOM presses the action button.

---

## Phase 18 — Image Acquisition

The SOM requests SPACON to execute the imaging command.

SPACON command:

```text
IMG901 Take Image
```

This command must be executed inside the valid imaging window:

```text
T+30:00 to T+30:30
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

## Phase 19 — Spacecraft Standby

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

Scenario 2 is successful when:

- GS1 is initially acquired,
- signal quality is verified or filtered,
- payload memory is dumped and available,
- battery emergency is detected,
- GNC is contacted,
- emergency procedure is imported,
- battery equalization transfer is completed,
- Power Saving Mode is activated,
- battery state is recovered from emergency to warning level,
- GS2 is acquired after GS1 signal loss,
- GS2 signal is stabilized,
- EPS thermal mitigation is completed,
- payload power is restored,
- camera is configured,
- final EPS values are acceptable,
- image is captured inside the valid imaging window,
- spacecraft standby mode is executed.

---

## Common Mistakes to Avoid

Do not press the SOM action button before receiving telemetry from SOE1 or SOE2.

Do not allow SPACON to execute commands before SOM has pressed the action button.

Do not continue the nominal imaging sequence before handling the battery emergency.

Do not skip GNC contact.

Do not continue without importing the emergency procedure when GNC suggests it.

Do not ignore GS1 signal loss.

Do not execute the imaging command outside the valid imaging window.

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

Scenario 2 trains the team to adapt to an emergency situation, recover the spacecraft, switch ground station support, and still complete the imaging mission.