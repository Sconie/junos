# JunOS desktop wrapper

A small [Tauri 2](https://tauri.app) app: a window that shows the web app junosd serves at `http://127.0.0.1:4777`, a **tray icon** (Open JunOS, Open in the browser, Quit), **start with the OS**, close-to-tray and a single instance. It starts junosd if nothing answers on its port. It is not the daemon's service: `scripts/install-service.ps1` still registers junosd to start at logon, and the wrapper only checks that it is up.

## Status: built and checked on Windows 11 (2026-10-23)

Built with Rust 1.99.1, Tauri 2.12 and the MSVC build tools (`cargo tauri build --no-bundle`, about 3 minutes) and run for real against a junosd it started itself. What was observed:

- **Tray icon**: a `JunOS` button appeared in the notification area (found through Windows UI Automation, beside the Tailscale and Docker icons).
- **Start with the OS**: the first run wrote the Windows Run entry `JunOS` = `…\junos-desktop.exe --hidden`. Started with `--hidden`, as at login, the window is created but **not visible** (tray only); started by hand, it is visible.
- **Close to tray**: closing the window hid it and left the process running. **Single instance**: a second launch exited at once and the first one stayed.
- **junosd**: with nothing on port 4777 the wrapper started `node apps/daemon/src/main.ts` (found through `JUNOS_ROOT`) and the port came up.

Not checked: an actual restart or login of Windows (the Run entry and the `--hidden` behaviour were checked separately, not through a real login), the tray menu items by clicking them, the NSIS installer (`cargo tauri build` without `--no-bundle`, which downloads the NSIS tool), and the window showing the paired app (it loads junosd's address, which was checked in a browser). The test run's Run entry and processes were removed afterwards, so nothing is left starting at login on that machine.

Last reviewed 2026-10-25: no wrapper code has changed since that build. Only these docs were brought up to date (the settings and pairing sections below); junosd gained the Hermes shim bridge and a phone layout meanwhile, and neither needs anything from the wrapper.

## Build it

Needs Windows 10 or 11 with WebView2 (already there on current Windows), the [Rust toolchain](https://rustup.rs) and the Visual Studio C++ build tools including the Windows SDK (`winget install Rustlang.Rustup` and `winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"`; the SDK part finishes last, and a build started before it does fails on missing system libraries).

```sh
cargo install tauri-cli --version "^2" --locked
cd apps/desktop/src-tauri
cargo tauri build          # an installer under target/release/bundle/nsis
cargo tauri dev            # or run it straight away (junosd must be built: npm run build)
```

Before the first run, build the web app (`npm run build`) so junosd has something to serve, and make the wrapper able to find junosd: it looks for `apps/daemon/src/main.ts` above its own folder, or in `JUNOS_ROOT`.

The icons in `src-tauri/icons` are drawn by `node apps/desktop/scripts/make-icons.mjs` (a soft-green disc); replace them with real artwork whenever there is some.

## How it behaves

- **Window**: loads junosd's own address, so it is a normal same-origin session (pair it once with the code junosd prints). The window is given no access to the app's commands (`capabilities/default.json` is empty): all the tray and start-up work is in Rust.
- **Start with the OS**: switched on the first time it runs (through the autostart plugin, which writes the Windows Run entry). It is started with `--hidden`, so at login it goes to the tray without opening a window. To stop it, turn it off in Windows Settings, Apps, Startup.
- **Close** hides the window. **Quit the window** in the tray menu ends the wrapper; junosd keeps running.
- **junosd**: if port 4777 does not answer, the wrapper starts `node apps/daemon/src/main.ts` hidden. If junosd already runs (the scheduled task), it does nothing.

## Settings for junosd when it is started for you

When the wrapper (or the `junosd` scheduled task from `scripts/install-service.ps1`) starts junosd, there is no console to set variables in. junosd simply gets **the environment of whatever started it**, which at login is your Windows user environment. So the settings that are read from the environment have to be there, set once and followed by a restart of junosd:

| Setting | What for |
| --- | --- |
| `JUNOS_ROOT` | Where this repository is, so the wrapper can find `apps/daemon/src/main.ts`. |
| `JUNOS_HERMES_URL`, `JUNOS_HERMES_PROTOCOL`, `JUNOS_HERMES_KEY` | The real Hermes: its address, `shim` once the shim is running on the VPS, and Hermes's API key. See `apps/hermes-shim/README.md`. |
| `JUNOS_TELEGRAM_TOKEN`, `JUNOS_TELEGRAM_USER_ID` | The Inbox bot, once you have made one. |
| `JUNOS_FILE_ROOTS` | Folders to index besides the default. |

Set them in Windows under *Edit environment variables for your account* (or `setx NAME value` in a terminal), then quit JunOS from the tray menu, end `node` if junosd was left running, and open JunOS again.

**Be aware of what that means for the Hermes key and the Telegram token.** A Windows user environment variable is stored in your account's registry hive, readable by anything that runs as you, in plain text. That is the same exposure as a dotfile in your home folder, no better. It is why nothing here writes these values into the repository or a JunOS file, and why they are never shown in the app. If that is not acceptable for a key, start junosd from a terminal that you set the variables in yourself (`$env:JUNOS_HERMES_KEY = Read-Host` in PowerShell, then `npm run dev:daemon`), and close the wrapper's own copy from the tray menu first so two junosd do not compete for the port.

## First pairing when it starts hidden

A junosd started by the wrapper has no console, so the one-time pairing code is not printed anywhere you can see. It is written to `~/.junos/pairing-code.txt` (readable by you only, deleted once used, and valid for ten minutes; a new one is written when the old one runs out or after five wrong tries). Open JunOS from the tray, read the file, and type the code once; after that the browser stays paired. The window and a normal browser at `http://127.0.0.1:4777` are separate sessions, so pair each once.

## What the window shows

The window is the same web app a browser gets. At the window's default size you see the sidebar layout; make it narrower than about 720 px and it switches to the phone layout with the bottom bar.
