# JunOS desktop wrapper

A small [Tauri 2](https://tauri.app) app: a window that shows the web app junosd serves at `http://127.0.0.1:4777`, a **tray icon** (Open JunOS, Open in the browser, Quit), **start with the OS**, close-to-tray and a single instance. It starts junosd if nothing answers on its port. It is not the daemon's service: `scripts/install-service.ps1` still registers junosd to start at logon, and the wrapper only checks that it is up.

## Status: written, not built

**This has not been compiled or run.** The machine it was written on has no Rust toolchain, and installing one was not done without being asked. The Rust sources follow the Tauri 2 documentation (tray icon, autostart and single-instance plugins), but until `cargo tauri build` has passed and the app has been seen starting at login with a tray icon, treat the ticket's second acceptance criterion ("starts with the OS and shows a tray icon") as **not yet verified**. The first (nightly verified backups) is done and tested in the daemon.

## Build it

Needs Windows 10 or 11 with WebView2 (already there on current Windows), the [Rust toolchain](https://rustup.rs) and the MSVC C++ build tools.

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
