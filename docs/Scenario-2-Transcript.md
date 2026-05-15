# Scenario 2 Transcript

## Emergency Battery Recovery and GS2 Imaging Mission

Hello everyone, and welcome to the Mission Control System Operations Simulator.

In this video, I will introduce **Scenario 2**.

Scenario 2 is more complex than Scenario 1.

In Scenario 1, the main challenge was an EPS thermal issue during a nominal imaging operation.

But in Scenario 2, the mission starts in a similar way and then develops into a more serious spacecraft emergency.

The main objective of Scenario 2 is to recover the spacecraft from a critical battery condition, coordinate with the GNC team, import a new emergency procedure, switch from Ground Station 1 to Ground Station 2, and still complete the imaging task within the new valid imaging window.

So this scenario is not only about commanding the spacecraft to take an image.

It is about managing a changing operational situation under time pressure.

---

## Role Overview

The mission begins with the normal preparation sequence.

As in Scenario 1, the first active role is the **SOM**, or Spacecraft Operations Manager.

The SOM is responsible for following the procedure table step by step, asking the subsystem operators for telemetry, evaluating the reported values, and requesting commands from SPACON when required.

The **SOE1** and **SOE2** roles are responsible for checking telemetry in the subsystem panels.

They support the SOM by opening the correct panels and reporting the requested parameters.

The **SPACON**, or Spacecraft Controller, executes spacecraft commands.

SPACON uses the command panel, selects the required command, presses ARM, and then executes the command using GO.

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

## Initial Ground Station Preparation

At the beginning of Scenario 2, the team follows the same operational logic as in the nominal imaging preparation.

First, the SOM starts the simulation.

Then the SOM asks SOE1 to open the Ground Station panel and report the current elevation of **GS1 / GEL005**.

The elevation must be at least five degrees to support link operations.

SOE1 checks the value and reports it back to SOM.

The SOM compares the value with the success criteria and then presses the action button.

After that, the SOM asks SOE2 to report the signal quality values, especially **GSE001** and **GBL092**.

SOE2 checks the Ground Station panel and reports the values back to SOM.

If the signal is not good enough, the SOM requests SPACON to execute the signal filtering command.

Because this is a SPACON command step, the SOM presses the action button first.

SPACON then selects the **GS1 / GSE001 Filter Signal** command, arms it, and sends it with GO.

The result appears in the TC History table.

The SOM then asks SOE1 to verify that the signal is now nominal.

SOE1 reports the updated signal values.

The SOM checks the criteria and presses the action button.

---

## Memory Preparation

After the communication preparation, the team continues with memory preparation.

The SOM asks SOE2 to open the Memory panel and report **MEM221**, which represents payload memory usage before the dump.

SOE2 checks the Memory panel and reports the value back to SOM.

If the memory is occupied, the SOM authorizes a memory dump.

Then SOM requests SPACON to execute the **Dump Payload Memory** command.

The SOM presses the action button first.

SPACON selects **MEM221**, arms the command, and sends it with GO.

After the dump is complete, SOM asks SOE1 to report the memory usage again.

SOE1 checks the Memory panel and reports the updated value.

The expected result is that **MEM221** is less than or equal to ten percent.

After receiving and checking the value, SOM presses the action button.

Then the SOM asks SOE2 to open the Payload panel and report **PLD620**, the payload instrument mode.

At this point, the payload should still be in safe mode.

SOE2 reports the value, SOM checks the criteria, and then presses the action button.

Up to this point, Scenario 2 looks similar to Scenario 1.

But now the main emergency of Scenario 2 begins.

---

## Battery Emergency Detection

The SOM asks SOE1 to open the EPS panel and report the battery charge values:

**BCH096**, **BCH097**, and **BCH098**.

These values represent the charge levels of Battery A, Battery B, and Battery C.

The expected nominal condition is that all battery charge values are above fifty percent.

If one battery is below thirty percent, the condition is non-nominal.

If one battery is below twenty percent, the situation becomes an emergency.

In this scenario, the battery distribution is highly unbalanced.

Battery A is still high, but Battery B and Battery C are critically low.

This creates an **emergency situation**.

At this moment, the emergency banner and emergency modal become important.

The simulation shows that a critical battery discharge has been detected.

---

## GNC Contact and Emergency Response

The SOM must now contact the appropriate support team.

The emergency contact list is opened, and the correct contact is **GNC**, the Guidance, Navigation and Control team.

The SOM sends an emergency message to GNC.

The message reports the event code and requests GNC approval for an attitude-related recovery action, because improving the charging attitude may help the spacecraft recover battery capacity.

After sending the message, the system enters a waiting state.

The GNC response does not approve a direct attitude change.

Instead, GNC provides a negative response and suggests importing a new emergency procedure.

This is one of the key features of Scenario 2.

The original procedure is no longer sufficient.

The mission must continue with a new imported procedure.

The SOM imports the new procedure.

After the import is complete, the procedure table is extended and the team continues with the recovery sequence.

---

## Battery Equalization Transfer

The next step is **Battery Equalization Transfer**.

The SOM requests SPACON to execute **BAT330**.

This command redistributes charge from Battery A into Battery B and Battery C.

Because this is a SPACON command step, the SOM presses the action button first.

SPACON selects **BAT330 Battery Equalization Transfer**, arms the command, and sends it with GO.

During this step, the status is shown as in progress.

The battery values begin to move toward a balanced level.

The goal is not to fully charge all batteries, but to recover them from the critical emergency state.

After the equalization transfer is complete, the SOM asks SOE2 to check the battery values again.

SOE2 reports the updated values for **BCH096**, **BCH097**, and **BCH098**.

The expected result is that the batteries are now approximately balanced.

In this scenario, they are expected to be around thirty-four point seven percent.

This is still not fully nominal, but it is no longer the same emergency state.

After checking the values, the SOM presses the action button.

---

## Power Saving Mode

The next step is to check the spacecraft power margin.

The SOM asks SOE1 to report **NET118** from the EPS panel.

SOE1 checks the EPS panel and reports the value back to SOM.

If **NET118** is at least nine hundred watts, the spacecraft can be commanded into Power Saving Mode.

The SOM then requests SPACON to execute **PSM001 Enter Power Saving Mode**.

The SOM presses the action button first.

SPACON selects **PSM001**, arms the command, and sends it with GO.

The command takes time, and the status is shown as in progress before it becomes complete.

After Power Saving Mode is active, the SOM asks SOE2 to verify the power and battery condition again.

SOE2 reports the updated values.

The goal is to confirm that the power state is stable and that the battery values remain above the critical threshold.

At this point, the alert is downgraded from **Emergency Situation** to **Warning**.

This is an important operational transition.

The spacecraft has not fully returned to a perfect nominal state, but the most critical battery emergency has been stabilized.

---

## EPS Thermal and Power Check

The SOM then asks SOE1 to report the thermal and power values, especially **EPT014** and **NET118**.

**EPT014** is the EPS main electronics temperature.

**NET118** is the spacecraft power margin.

The expected EPS temperature range is approximately seventy to seventy-five degrees Celsius.

If the temperature is too high, thermal mitigation is required.

SOE1 reports the values, the SOM checks the criteria, and the SOM presses the action button when the condition is acceptable or when the next mitigation step is required.

---

## GS1 Loss and GS2 Acquisition

After this point, Scenario 2 introduces another important operational problem: the ground station link changes.

The SOM asks SOE2 to verify the signal quality with **GS1 / GSE001**.

SOE2 checks the Ground Station panel and reports the signal value.

If the GS1 signal is bad or the GS1 link is lost, the team must establish uplink with **GS2**, Ground Station 2.

This means the mission must continue using the second ground station.

The SOM waits for an acceptable GS2 elevation using **GS2 / GEL005**.

The required elevation is again at least five degrees.

Once GS2 elevation is acceptable, the SOM asks SOE1 to report the GS2 signal quality.

The important values are **GS2SIG** and **GBL092**.

If the GS2 signal is not yet good enough, the SOM requests SPACON to execute signal filtering for GS2.

The SOM presses the action button first.

SPACON selects the filtering command, arms it, and sends it with GO.

After filtering, the GS2 link becomes stable enough to support the remaining mission operations.

---

## EPS Thermal Mitigation

Now the procedure returns to the EPS thermal condition.

The SOM compares the reported thermal values with the criteria.

If **EPT014** is too high, the SOM requests mitigation.

The SOM then commands SPACON to select **EPT014** and execute **Reduce Payload Power**.

Because this is a SPACON command step, the SOM presses the action button first.

SPACON follows the normal command execution sequence: select, ARM, and GO.

The command reduces the payload power and supports thermal recovery.

After the mitigation, the SOM asks SOE2 to report **EPT014** again.

SOE2 checks the EPS panel and reports the updated temperature.

The SOM then confirms that the EPS is nominal by pressing the action button after checking the reported value.

At this point, there is an important caution in the procedure.

After increasing payload power again, the EPS temperature may begin to rise slowly.

The SOM must therefore confirm that the EPS condition is stable enough before continuing toward imaging.

---

## Payload Power Increase and Camera Configuration

Once EPS is confirmed, the SOM requests SPACON to increase payload power for imaging.

The command is **PWR740 Increase Payload Power**.

The SOM presses the action button first.

SPACON selects **PWR740**, arms it, and sends it with GO.

After this command, the payload is prepared for imaging, but the temperature may rise slowly over time.

Then the SOM requests SPACON to configure the camera using **CAM000 Configure Camera**.

Again, the SOM presses the action button first.

SPACON selects the command, arms it, and sends it with GO.

After camera configuration, the SOM asks SOE1 to verify the camera status in the Payload panel.

The important parameters are **PLD620** and **CAM201**.

The expected condition is that **PLD620** is active and **CAM201** is in a nominal temperature state.

SOE1 reports the values, SOM checks the criteria, and then SOM presses the action button.

Before taking the image, the SOM asks SOE2 to report the thermal values again after the payload power increase.

This confirms that the spacecraft is still safe to continue.

---

## Image Acquisition

Now the spacecraft is ready for the imaging command.

The imaging window in Scenario 2 is different from Scenario 1.

For Scenario 2, the valid imaging window is from **T plus 30 minutes** to **T plus 30 minutes and 30 seconds**.

This window is very short, so timing is important.

The SOM requests SPACON to execute **IMG901 Take Image**.

Because this is a SPACON command step, the SOM presses the action button first.

SPACON selects the image command, arms it, and sends it with GO.

If the command is executed within the correct imaging window, the target image is captured successfully.

---

## Spacecraft Standby

After the image is taken, the SOM requests the final operational step: spacecraft standby.

The SOM asks SPACON to select **STB901 Spacecraft Standby Mode**.

The SOM presses the action button first.

SPACON selects the standby command, arms it, and executes it with GO.

Once standby mode is active, the spacecraft enters a power-saving final state and the scenario reaches completion.

---

## Feature Summary

Now let us summarize the main interface features used in Scenario 2.

The **SOM panel** is the main procedure control interface.

It shows the current step, responsible role, action, success criteria, SOM action button, and status.

The **EPS panel** is especially important in this scenario.

It shows battery values, power margin, and thermal values.

Battery A, Battery B, and Battery C are tracked separately through **BCH096**, **BCH097**, and **BCH098**.

The **Emergency Modal** appears when the battery state becomes critical.

It shows the emergency situation and allows the SOM to contact the correct support team.

The **GNC response modal** represents the external operational decision process.

In this scenario, GNC does not approve a direct attitude change.

Instead, it suggests importing a new procedure.

The **Import Procedure** function is one of the main scenario-specific features.

It changes the mission flow and adds the emergency recovery steps to the procedure table.

The **SPACON panel** is used for all spacecraft commands.

Commands are not executed directly.

They must first be selected, then armed, and finally sent with GO.

This makes the command execution process more realistic and prevents accidental command execution.

The **Ground Station panels** are also important.

Scenario 2 begins with GS1, but after the GS1 signal problem, the team must continue with GS2.

This introduces an additional operational challenge because the team must verify GS2 elevation and GS2 signal quality before continuing.

The **Memory panel** is used to verify memory usage before and after the memory dump.

After a successful image capture, it also shows the captured image status.

The **Payload panel** is used to verify payload mode, camera configuration, and imaging readiness.

---

## Status Feedback

The simulation also uses clear visual status feedback.

Green indicates completed or nominal states.

Yellow indicates warning or current operational attention.

Blue indicates an operation in progress.

Red indicates a serious emergency or failed condition.

---

## Closing Summary

Overall, Scenario 2 trains the operators to handle a much more dynamic mission case.

They must begin with a nominal preparation flow, detect a critical battery emergency, contact GNC, import a new emergency procedure, recover the battery state, enter Power Saving Mode, switch from GS1 to GS2, manage EPS thermal limits, configure the payload, and still capture the target image inside a short imaging window.

This scenario is therefore a full operational chain from anomaly detection to recovery and mission completion.

It demonstrates how a mission control team must adapt when the original plan is no longer valid.

That concludes the introduction to Scenario 2: **Emergency Battery Recovery and GS2 Imaging Mission**.
