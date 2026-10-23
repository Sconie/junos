# JunOS desktop wrapper

A small [Tauri 2](https://tauri.app) app: a window that shows the web app junosd serves at `http://127.0.0.1:4777`, a **tray icon** (Open JunOS, Open in the browser, Quit), **start with the OS**, close-to-tray and a single instance. It starts junosd if nothing answers on its port. It is not the daemon's service: `scripts/install-service.ps1` still registers junosd to start at logon, and the wrapper only checks that it is up.

## Status: built and checked on Windows 11 (2026-10-23)

Built with Rust 1.99.1, Tauri 2.12 and the MSVC build tools (`cargo tauri build --no-bundle`, about 3 minutes) and run for real against a junosd it started itself. What was observed:

- **Tray icon**: a `JunOS` button appeared in the notification area (found through Windows UI Automation, beside the Tailscale and Docker icons).
- **Start with the OS**: the first run wrote the Windows Run entry `JunOS` = `…\junos-desktop.exe --hidden`. Started with `--hidden`, as at login, the window is created but **not visible** (tray only); started by hand, it is visible.
- **Close to tray**: closing the window hid it and left the process running. **Single instance**: a second launch exited at once and the first one stayed.
- **junosd**: with nothing on port 4777 the wrapper started `node apps/daemon/src/main.ts` (found through `JUNOS_ROOT`) and the port came up.

Not checked: an actual restart or login of Windows (the Run entry and the `--hidden` behaviour were checked separately, not through a real login), the tray menu items by clicking them, the NSIS installer (`cargo tauri build` without `--no-bundle`, which downloads the NSIS tool), and the window showing the paired app (it loads junosd's address, which was checked in a browser). The test run's Run entry and processes were removed afterwards, so nothing is left starting at login on that machine.

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
