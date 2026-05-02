# Host and Local Network Setup

This document explains how to run MCS26_V26_01 on a host computer and open it from other computers in the same local network.

---

## Basic Concept

MCS26_V26_01 runs in a browser.

One computer acts as the host.

The host computer runs the production server.

All other computers open the simulator through the host computer IP address.

Example:

```text
http://192.168.2.183:4173/
```

---

## Files Used for Hosting

The project includes three helper scripts inside the `scripts` folder:

```text
scripts/start-host-production.bat
scripts/open-simulator.bat
scripts/show-host-ip.bat
```

---

## 1. Check the Host IP Address

Before starting a lab session, run:

```text
show-host-ip.bat
```

This file displays the current IPv4 addresses of the host computer.

Example output:

```text
IPv4 Address . . . . . . . . . . : 172.23.208.1
IPv4 Address . . . . . . . . . . : 192.168.2.183
```

For the local network, use the IP address that belongs to the active network adapter.

In this example, the correct address is:

```text
192.168.2.183
```

---

## 2. Check the Simulator URL

Open:

```text
scripts/open-simulator.bat
```

Make sure the URL inside the file uses the correct host IP address.

Example:

```bat
@echo off
start "" "http://192.168.2.183:4173/"
```

If the host IP address changes, update this file.

---

## 3. Start the Production Server

On the host computer, run:

```text
start-host-production.bat
```

This script builds the project and starts the production preview server.

Expected output:

```text
Local:   http://localhost:4173/
Network: http://192.168.2.183:4173/
```

The server window must remain open while the simulator is being used.

If this window is closed, the simulator will stop.

---

## 4. Open the Simulator on the Host

On the host computer, run:

```text
open-simulator.bat
```

The browser should open the simulator.

---

## 5. Open the Simulator on Other Computers

On other computers in the same local network, run the same:

```text
open-simulator.bat
```

or open the browser manually and enter:

```text
http://HOST-IP-ADDRESS:4173/
```

Example:

```text
http://192.168.2.183:4173/
```

---

## Recommended Lab Workflow

On the host computer:

1. Run `show-host-ip.bat`.
2. Confirm that the host IP matches the URL in `open-simulator.bat`.
3. Run `start-host-production.bat`.
4. Keep the server window open.
5. Run `open-simulator.bat`.

On other computers:

1. Make sure the computer is connected to the same local network.
2. Run `open-simulator.bat`.
3. Confirm that the simulator opens in the browser.

---

## Important Notes

The host IP address may change depending on the network.

If the IP changes, update the URL inside:

```text
scripts/open-simulator.bat
```

The `172.x.x.x` address may belong to a virtual adapter such as WSL, Docker, VPN, or Hyper-V.

For local network access, the correct address is usually the `192.168.x.x` address.

The production server uses port:

```text
4173
```

The development server uses port:

```text
5173
```

---

## Troubleshooting

### The simulator does not open on another computer

Check that:

- The host server is running.
- The server window is still open.
- The other computer is connected to the same local network.
- The URL uses the correct host IP address.
- Windows Firewall allows access to Node.js or Vite.
- The correct port is used: `4173` for production preview.

### The shortcut opens the wrong address

Edit:

```text
scripts/open-simulator.bat
```

and update the IP address.

### The server window closes immediately

Run the script from Command Prompt to see the error message:

```cmd
scripts\start-host-production.bat
```

### The build fails

Run manually:

```bash
npm install
npm run build
```

Then check the error message.

---

## Final Reminder

Only the host computer runs the server.

All other computers only open the simulator in the browser.

The host server must stay open during the simulation session.