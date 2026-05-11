# MCS26_V26_01 — Run Simulation

This document explains how to run the synchronized multi-computer simulation.

## Architecture

The simulation uses one Host / Simulation Server and multiple operator clients.

The Host computer runs two services:

- Frontend server on port `5173`
- WebSocket sync server on port `3001`

Operator computers connect through role-based URLs.

Recommended setup:

```text
Computer 0 = Host / Simulation Server
Computer 1 = SOM
Computer 2 = SPACON
Computer 3 = SOE1
Computer 4 = SOE2
```

The Host computer does not need to act as an operator.

---

## 1. Start the Host

On the Host computer, run:

```text
scripts/start-host-dev.bat
```

Keep both terminal windows open during the simulation.

---

## 2. Find the Host IP

On the Host computer, run:

```text
scripts/show-host-ip.bat
```

Use the IPv4 address of the Host computer.

Example:

```text
192.168.178.129
```

---

## 3. Open Operator Clients

Use the following role URLs.

Replace `HOST-IP` with the actual IPv4 address of the Host computer.

### SOM

```text
http://HOST-IP:5173/?role=SOM
```

### SPACON

```text
http://HOST-IP:5173/?role=SPACON
```

### SOE1

```text
http://HOST-IP:5173/?role=SOE
```

### SOE2

```text
http://HOST-IP:5173/?role=SOE
```

Example:

```text
http://192.168.178.129:5173/?role=SOM
```

---

## 4. Shortcut Scripts

The following scripts can be used to open the correct role URL:

```text
scripts/open-som.bat
scripts/open-spacon.bat
scripts/open-soe1.bat
scripts/open-soe2.bat
```

Each script asks for the Host IP address and opens the correct role URL.

---

## 5. Wi-Fi and LAN Operation

The same setup works over Wi-Fi or LAN.

Only the Host IP address changes.

For LAN operation, use the IPv4 address of the Host computer on the LAN adapter.

---

## 6. Required Ports

The following ports must be reachable from all operator computers:

```text
5173 - Frontend server
3001 - WebSocket sync server
```

If clients cannot connect, allow both ports in Windows Firewall on the Host computer.

---

## 7. Clean Restart

To reset the simulation state:

1. Stop the WebSocket server terminal with `Ctrl + C`.
2. Stop the frontend terminal with `Ctrl + C`.
3. Run `scripts/start-host-dev.bat` again.
4. Hard-refresh the operator browsers with `Ctrl + F5`.

The WebSocket server stores the current shared simulation state in memory. Restarting it clears the shared state.
