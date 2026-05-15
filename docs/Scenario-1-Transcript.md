# Scenario 1 Transcript

## Frankfurt Airport Imaging Mission

Hello everyone, and welcome to the Mission Control System Operations Simulator.

In this video, I will introduce Scenario 1, which is called **Frankfurt Airport Imaging Mission**.

The main objective of this scenario is to operate a simplified satellite mission from the perspective of a mission control team.

The team must prepare the spacecraft, verify the ground station link, check memory and payload status, handle a thermal issue in the electrical power system, configure the camera, capture an image of Frankfurt Airport, and finally place the spacecraft into standby mode.

The target location for this scenario is Frankfurt Airport.

The complete mission flow is controlled through the Mission Control System interface, and every operator has a specific role.

---

## Role Overview

The main coordinating role is the **SOM**, or Spacecraft Operations Manager.

The SOM panel contains the full step-by-step procedure.

This is the central panel of the simulation.

Here, the SOM can see the current procedure step, the responsible role, the required action, the success criteria, the available SOM action button, and the current status of each step.

The other operational roles are represented by subsystem panels and by the SPACON panel.

**SOE1** and **SOE2** are responsible for checking and reporting telemetry from different subsystem panels.

For example, they may need to open the Ground Station panel, the EPS panel, the Payload panel, or the Memory panel, and report the requested values back to the SOM.

The **SPACON**, or Spacecraft Controller, is responsible for executing spacecraft commands.

SPACON does not decide the next operational step independently.

Instead, SPACON waits for a request from SOM, selects the requested command code, arms the command, and then sends it using the GO button.

---

## Interface Overview

At the top of the interface, we can see the main mission status bar.

This bar shows the current simulation status, the mission time, the current mission phase, and the imaging window information.

The mission time is important because the image can only be taken during the valid imaging window.

The simulator also uses several operational panels.

The **SOM panel** contains the procedure table.

The **SPACON panel** contains the command selection matrix and the ARM / GO command workflow.

The **Ground Station panel** shows ground station telemetry.

The **EPS panel** shows electrical power system values.

The **Payload panel** shows payload and camera status.

The **Memory panel** shows memory usage and image capture status.

---

## Important Operator Rule

Before describing the scenario flow, there is one important operating rule.

When SOM asks SOE1 or SOE2 for telemetry, the SOM must first ask the responsible SOE operator for the value.

The SOE operator checks the correct panel and reports the value back.

Only after receiving and checking the value against the success criteria, the SOM presses the action button.

So for SOE telemetry steps, the order is:

```text
SOM asks SOE
SOE checks telemetry
SOE reports value
SOM checks criteria
SOM presses action button
```

However, when SOM requests SPACON to execute a spacecraft command, the order is different.

In SPACON command steps, SOM presses the action button first.

This officially sends the request to SPACON.

Only after that, SPACON selects the command, presses ARM, and then presses GO.

So for SPACON command steps, the order is:

```text
SOM presses action button
SPACON selects command
SPACON presses ARM
SPACON presses GO
```

This rule is essential for using the simulator correctly.

---

## Scenario Objective

Now let us look at the goal of Scenario 1 in more detail.

The mission starts with the spacecraft approaching the target area.

Before any imaging command can be executed, the team must first make sure that the communication link is available.

This starts with the ground station elevation check.

---

## Ground Station Acquisition

The SOM asks SOE1 to open the Ground Station panel and report the current value of **GS1 / GEL005**, which represents the antenna elevation.

The elevation must be at least five degrees.

SOE1 checks the Ground Station panel and reports the value back to SOM.

The SOM compares the value with the success criteria.

If the elevation is sufficient, the SOM presses the action button and confirms that the ground station link can be used.

After that, the SOM asks SOE2 to check the signal quality.

The important parameters here are **GSE001** and **GBL092**.

SOE2 checks the values and reports them back to SOM.

If the signal quality is not good enough, the SOM requests SPACON to execute the signal filtering command.

For this SPACON step, the SOM presses the action button first.

Then SPACON selects the command related to **GS1 / GSE001 Filter Signal**.

SPACON presses ARM, confirms that the command is armed, and then presses GO.

The command result is shown in the TC History table.

Once signal filtering is complete, the SOM asks SOE1 to verify the ground station signal again.

SOE1 reports the updated signal values.

The goal is to confirm that **GSE001** is nominal and **GBL092** is good.

This closes the communication preparation part of the scenario.

---

## Memory Preparation

The next part of the mission is memory preparation.

The SOM asks SOE2 to open the Memory panel and report the value of **MEM221**, which represents payload memory usage.

SOE2 reports the memory value back to SOM.

If the memory is occupied, the SOM authorizes a memory dump.

The SOM then requests SPACON to execute the **Dump Payload Memory** command.

Again, this is a SPACON command step.

Therefore, the SOM presses the action button first.

Then SPACON selects the correct memory dump command, presses ARM, and sends it using GO.

During the command execution, the procedure status changes to an in-progress state.

After completion, the memory usage must be checked again.

The SOM asks SOE1 or SOE2 to report the memory usage after the dump.

The expected result is that **MEM221** is reduced to a nominal level, normally less than or equal to ten percent.

After receiving and checking this value, the SOM presses the action button and continues.

---

## Payload Status Check

After the memory is prepared, the next step is to check the payload.

The SOM asks SOE2 to open the Payload panel and report **PLD620**, the payload instrument mode.

At this stage, the payload should still be in safe mode.

This is important because the system must first be thermally and electrically ready before the imaging payload is powered up.

SOE2 reports the value back to SOM.

The SOM checks the success criteria and then presses the action button.

---

## EPS Check and Thermal Anomaly

The next major subsystem is the **EPS**, the Electrical Power System.

The SOM asks SOE1 to open the EPS panel and report the key EPS parameters.

The important values in Scenario 1 are **EPT014**, **DCC208**, and **NET118**.

**EPT014** represents the EPS main electronics temperature.

**DCC208** represents a DC converter temperature.

**NET118** is used as an operational power-margin indicator.

At this point, the simulation introduces the main anomaly of Scenario 1.

The EPS temperature becomes too high.

If **EPT014** rises above the immediate mitigation threshold, the SOM must request a power reduction.

This is an operational decision point.

The team must not continue directly to imaging while the EPS is in a non-nominal thermal condition.

---

## EPS Thermal Mitigation

The SOM requests mitigation and commands SPACON to reduce payload power by selecting **EPT014** and executing the **Reduce Payload Power** command.

Because this is a SPACON command step, the SOM presses the action button first.

Then SPACON selects the correct command.

SPACON presses ARM.

SPACON presses GO.

After execution, the EPS temperature begins to decrease, and the power value is reduced.

The SOM then asks SOE2 to check EPS again after mitigation.

SOE2 reports the updated EPS values.

The goal is to confirm that **EPT014** has returned below the safe limit and that **NET118** reflects the reduced power state.

Once the EPS is stable, the SOM confirms that the EPS is nominal by pressing the action button after checking the reported values.

---

## Payload Power Increase and Camera Configuration

Now the mission can continue toward imaging.

The SOM requests SPACON to increase payload power again using the **PWR740 Increase Payload Power** command.

For this command step, the SOM presses the action button first.

Then SPACON selects **PWR740**, presses ARM, and presses GO.

This is necessary because the payload must be powered correctly before the camera can be configured.

After payload power is increased, the SOM requests SPACON to configure the camera using **CAM000 Configure Camera**.

Again, the SOM presses the action button first.

SPACON selects the camera configuration command, arms it, and sends it with GO.

Then the SOM asks SOE1 to verify the camera configuration in the Payload panel.

SOE1 checks the payload and camera telemetry and reports the values back to SOM.

The required result is that **CAM000** is ready.

After the value is reported and checked, the SOM presses the action button.

At this point, the spacecraft is ready for imaging.

---

## Image Acquisition

The image must be taken inside the imaging window.

For Scenario 1, the imaging window is from **T plus 15 minutes** to **T plus 16 minutes**.

The SOM requests SPACON to execute **IMG901 Take Image**.

Because this is a SPACON command step, the SOM presses the action button first.

SPACON selects the imaging command.

SPACON presses ARM.

SPACON presses GO.

When the command is successful, the image is captured and shown in the Memory panel.

This represents the successful completion of the main mission objective: imaging Frankfurt Airport.

---

## Spacecraft Standby

After the image has been taken, Scenario 1 includes a final operational step.

The SOM requests SPACON to place the spacecraft into standby mode using **STB901 Spacecraft Standby Mode**.

The SOM presses the action button first.

SPACON selects the standby command, presses ARM, and executes it with GO.

Once SPACON executes the standby command, the mission reaches its final state.

The simulation then transitions to the ending sequence.

---

## Feature Summary

Now let us briefly summarize the interface features used during this scenario.

The **SOM panel** is the main procedure control panel.

It shows the complete operational sequence and guides the user through the mission step by step.

The **Ground Station panel** shows ground segment telemetry, including antenna elevation, signal quality, beacon level, and other communication-related values.

The **EPS panel** shows electrical power system telemetry.

This is especially important in Scenario 1 because the key anomaly is the EPS thermal condition.

The **Payload panel** shows the imaging instrument status, including payload mode, camera readiness, and related payload telemetry.

The **Memory panel** shows memory usage and, after successful imaging, the captured satellite image.

The **SPACON panel** is used for command execution.

It includes a command selection matrix, ARM and GO logic, and a TC History table.

This makes the command flow more realistic, because commands are not executed directly by pressing one button.

They must first be selected, armed, and then sent.

---

## Status Feedback

The simulation also uses visual status feedback.

Green values indicate nominal or completed states.

Yellow indicates warning or current attention.

Blue indicates an operation in progress.

Red indicates a serious or failed condition.

This helps the operators quickly understand what is happening during the mission.

---

## Closing Summary

Overall, Scenario 1 trains the team to follow a nominal imaging procedure while also reacting to an EPS thermal problem.

The operators must communicate between roles, read telemetry correctly, request the correct spacecraft commands, verify the result after each command, and complete the imaging task within the available time window.

This scenario is therefore not only about taking an image.

It is about understanding the operational chain from ground station acquisition, signal preparation, memory management, payload readiness, thermal mitigation, camera configuration, image capture, and finally spacecraft standby.

That concludes the introduction to Scenario 1: **Frankfurt Airport Imaging Mission**.
