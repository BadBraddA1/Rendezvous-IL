# Raspberry Pi — Live Updates kiosk (Pi-1 / Pi-2)

Provision venue display boards that show [rendezvousil.com/live-updates](https://rendezvousil.com/live-updates) in sync across multiple Pis (`?sync=1&kiosk=1`).

See [docs/ROADMAP_ANDROID_AND_PI.md](../../docs/ROADMAP_ANDROID_AND_PI.md) (Phase Pi-1 / Pi-2) for fleet architecture and Pi-0 web prerequisites.

## Hardware

| Item | Recommendation |
|------|----------------|
| Board | Raspberry Pi 4 (2GB+) or Pi 5 |
| Storage | 16GB+ SD; USB SSD preferred |
| Display | HDMI TV/monitor |
| Network | Venue WiFi; static DHCP reservation per Pi |

## SD card setup

1. Flash **Raspberry Pi OS (64-bit)** with [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
   - **Desktop** is easiest for debugging (Chromium + graphical session).
   - **Lite** works if you add a minimal desktop stack separately; Desktop is recommended for Pi-1.
2. In Imager **OS Customization** (gear icon) before write:
   - **Hostname:** `rendezvous-lu-01`, `rendezvous-lu-02`, … (one per board)
   - **Enable SSH** with password or public key
   - **Set username/password** for the kiosk user (e.g. `pi` or `kiosk`)
   - **Configure wireless LAN** (SSID + password) if not using Ethernet
   - **Set locale:** `America/Chicago` timezone when offered
3. Boot the Pi, SSH in, and update:

```bash
sudo apt update && sudo apt full-upgrade -y
sudo reboot
```

## WiFi (if not set in Imager)

Edit `/etc/wpa_supplicant/wpa_supplicant.conf` (Bookworm may use NetworkManager instead):

```bash
sudo raspi-config
# System Options → Wireless LAN → enter SSID and passphrase
```

Or with NetworkManager:

```bash
nmcli device wifi list
nmcli device wifi connect "YourSSID" password "YourPassword"
```

Verify connectivity:

```bash
ping -c 3 rendezvousil.com
```

## Clone repo and install kiosk

On the Pi (or copy `scripts/pi/` via `scp`):

```bash
git clone https://github.com/BadBraddA1/Rendezvous-IL.git
cd Rendezvous-IL/scripts/pi
chmod +x *.sh
./install-kiosk.sh
sudo reboot
```

`install-kiosk.sh` is idempotent — safe to re-run after pulling script updates.

It will:

- Install **Chromium**, **curl**, and **x11-xserver-utils** (`xset`)
- Set timezone to **America/Chicago** via `set-timezone.sh`
- Enable **NTP** (`systemd-timesyncd`) so clocks agree within ~100ms
- Copy `env.example` → `~/.config/rendezvous-kiosk/env` (first run only)
- Install kiosk scripts to `~/.local/share/rendezvous-kiosk/`
- Install and enable **`rendezvous-kiosk.service`** (systemd user unit)
- Install and enable **`rendezvous-kiosk-watchdog.timer`** (Pi-2 health checks every 2 minutes)
- Set **`DEVICE_ID`** in the env file on first install if missing (fleet heartbeat)
- Install **`~/.config/autostart/rendezvous-kiosk.desktop`** (Bookworm graphical session fallback)
- Enable **linger** so the user systemd manager runs at boot, and pair it with **desktop autologin** so the graphical session (and kiosk) start without manual login

## Production URL

Default (no env override):

```
https://rendezvousil.com/live-updates?sync=1&kiosk=1
```

- `sync=1` — server-driven view rotation (requires Pi-0 display-state API)
- `kiosk=1` — hide footer controls, attempt fullscreen
- `view=<name>` — optional fixed view; disables auto-rotate on that Pi

### Fixed view (dedicated displays)

Use `view=` when a screen should stay on one panel (cafeteria = meal, lobby = schedule, etc.). Works with `sync=1` and `kiosk=1`; the Pi ignores fleet rotation and server display-state polling.

**Valid values:** `schedule`, `weather`, `meal`, `map`, `wifi`, `upcoming`, `volunteers`, `announcements`, `all`

**Production examples:**

```
https://rendezvousil.com/live-updates?sync=1&kiosk=1&view=meal
https://rendezvousil.com/live-updates?sync=1&kiosk=1&view=schedule
```

**Via `VIEW` env var** (appended to the default production URL, or to `LOCAL_URL` if it has no `view=` yet):

```bash
VIEW=meal ./chromium-kiosk.sh
```

`KIOSK_VIEW` is an alias for `VIEW`.

**Persistent (systemd):** edit `~/.config/systemd/user/rendezvous-kiosk.service`:

```ini
Environment=VIEW=meal
```

Or set the full URL:

```ini
Environment=LOCAL_URL="https://rendezvousil.com/live-updates?sync=1&kiosk=1&view=meal"
```

Then:

```bash
systemctl --user daemon-reload
systemctl --user restart rendezvous-kiosk.service
```

### Local / dev override

Point at a dev server instead of production via `~/.config/rendezvous-kiosk/env`:

```bash
# ~/.config/rendezvous-kiosk/env
LOCAL_URL="http://192.168.1.10:3000/live-updates?sync=1&kiosk=1"
```

Optional full URL override (`KIOSK_URL` takes precedence over `LOCAL_URL`):

```bash
KIOSK_URL="https://rendezvousil.com/live-updates?sync=1&kiosk=1&view=meal"
```

Then:

```bash
systemctl --user daemon-reload
systemctl --user restart rendezvous-kiosk.service
```

**One-shot test (no env file):**

```bash
LOCAL_URL="http://192.168.1.10:3000/live-updates?sync=1&kiosk=1" ~/.local/share/rendezvous-kiosk/chromium-kiosk.sh
```

## NTP and timezone

Central Time matters for schedule “now / up next” even though Pi-0 server sync is authoritative for view rotation.

```bash
./set-timezone.sh          # America/Chicago (default)
timedatectl status         # verify Time zone + System clock synchronized: yes
sudo timedatectl set-ntp true
```

Override timezone (rare):

```bash
TZ_NAME=America/Chicago ./set-timezone.sh
```

## Screen blanking

`chromium-kiosk.sh` runs on each launch:

```bash
xset s off
xset -dpms
xset s noblank
```

Re-run install or restart the service if blanking returns after an OS update.

## Post-install verify

```bash
~/.local/share/rendezvous-kiosk/verify-kiosk.sh
```

Checks: `timedatectl` (Chicago + NTP), `curl` to display-state API, Chromium installed, user unit enabled, watchdog timer enabled, linger.

## Fleet device id (`DEVICE_ID`, Pi-2)

Each Pi needs a stable id for fleet heartbeat (`POST /api/live-updates/heartbeat`). `install-kiosk.sh` writes `DEVICE_ID` into `~/.config/rendezvous-kiosk/env` on first install (or adds it on re-run if missing):

- Hostname already `rendezvous-lu-01` → `DEVICE_ID=rendezvous-lu-01`
- Otherwise → `DEVICE_ID=rendezvous-$(hostname -s)`

Override manually if needed:

```bash
# ~/.config/rendezvous-kiosk/env
DEVICE_ID=rendezvous-lu-01
```

`chromium-kiosk.sh` appends `device=` to the kiosk URL from `DEVICE_ID`; the **web page** sends heartbeats every 60s when `kiosk=1`.

## Watchdog (Pi-2)

Two layers keep the kiosk up:

1. **systemd `Restart=always`** on `rendezvous-kiosk.service` — Chromium restarts after crashes.
2. **User timer** `rendezvous-kiosk-watchdog.timer` — every 2 minutes, `kiosk-watchdog.sh` curls the display-state API (and optionally the kiosk page URL). After **two consecutive** failures it runs `systemctl --user restart rendezvous-kiosk.service`.

Manual run:

```bash
~/.local/share/rendezvous-kiosk/kiosk-watchdog.sh
~/.local/share/rendezvous-kiosk/kiosk-watchdog.sh --strict   # restart on first failure
~/.local/share/rendezvous-kiosk/kiosk-watchdog.sh --no-page  # skip kiosk page check
```

Timer status:

```bash
systemctl --user status rendezvous-kiosk-watchdog.timer
journalctl --user -u rendezvous-kiosk-watchdog.service -n 20
```

Skip the optional page check persistently via env:

```bash
# ~/.config/rendezvous-kiosk/env
WATCHDOG_SKIP_PAGE=1
```

## systemd service

| Command | Purpose |
|---------|---------|
| `systemctl --user start rendezvous-kiosk.service` | Start kiosk |
| `systemctl --user stop rendezvous-kiosk.service` | Stop kiosk |
| `systemctl --user status rendezvous-kiosk.service` | Check status |
| `journalctl --user -u rendezvous-kiosk.service -f` | Tail logs |

The unit loads `~/.config/rendezvous-kiosk/env`, waits for X11/Wayland via `wait-for-display.sh`, and uses `Restart=always` so Chromium comes back after crashes.

On **Pi OS Bookworm**, enable **Desktop autologin** (`raspi-config` → System Options → Boot / Auto Login → Desktop). Linger alone does not start a graphical session; autologin brings up `graphical-session.target`, which starts the kiosk unit. The install script also adds a desktop autostart entry that imports `DISPLAY` / `WAYLAND_DISPLAY` and starts the user service if the unit is late.

## Per-Pi checklist

- [ ] Flash SD, hostname `rendezvous-lu-NN`, WiFi/SSH configured
- [ ] `sudo apt update && full-upgrade`
- [ ] `./install-kiosk.sh` and reboot
- [ ] `timedatectl status` — Chicago TZ, NTP synchronized
- [ ] Two Pis side-by-side switch views within ~1s (Pi-0 sync)
- [ ] Optional fixed view: `VIEW=meal` in systemd or `&view=meal` in URL

## Files

| File | Purpose |
|------|---------|
| `install-kiosk.sh` | Packages, NTP, timezone, env file, deploy scripts, enable systemd |
| `chromium-kiosk.sh` | Disable blanking, launch Chromium kiosk URL |
| `wait-for-display.sh` | Wait for X11 or Wayland before Chromium starts |
| `verify-kiosk.sh` | Post-install health checks |
| `kiosk-watchdog.sh` | Display-state / page health check; restart kiosk on failure |
| `rendezvous-kiosk-watchdog.service` | Oneshot watchdog (invoked by timer) |
| `rendezvous-kiosk-watchdog.timer` | Run watchdog every 2 minutes |
| `env.example` | Template for `~/.config/rendezvous-kiosk/env` |
| `set-timezone.sh` | Idempotent `America/Chicago` |
| `rendezvous-kiosk.service` | systemd user unit template |

## Troubleshooting

**Black screen after boot** — graphical session may not be ready. Check `journalctl --user -u rendezvous-kiosk.service`; ensure Pi OS Desktop is installed and auto-login to desktop is enabled (`raspi-config` → System Options → Boot / Auto Login).

**Wrong view or clock** — confirm `timedatectl` shows `America/Chicago` and NTP sync; confirm URL includes `sync=1`.

**Chromium OOM on Pi 4 1GB** — use Pi 4 2GB+ or Pi 5; close other services.

**Re-install after git pull:**

```bash
cd Rendezvous-IL && git pull
./scripts/pi/install-kiosk.sh
systemctl --user restart rendezvous-kiosk.service
```
