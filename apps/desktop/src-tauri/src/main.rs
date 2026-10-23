// JunOS desktop wrapper (Tauri 2). It shows the web app junosd serves, keeps a tray icon, starts with the OS and stays out of the
// way when the window is closed. It does not run junosd itself as a service: it only makes sure the daemon is up when it starts.
//
// NOT COMPILED OR RUN YET. The machine this was written on has no Rust toolchain; see apps/desktop/README.md.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

const DAEMON_ADDR: &str = "127.0.0.1:4777";
const DAEMON_URL: &str = "http://127.0.0.1:4777";
/// Passed by the OS at login, so the app starts in the tray instead of opening a window.
const HIDDEN_FLAG: &str = "--hidden";

fn daemon_is_up() -> bool {
    let addr: SocketAddr = DAEMON_ADDR.parse().expect("a valid address");
    TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
}

/// Where the JunOS checkout is: `JUNOS_ROOT`, or three folders above the app (apps/desktop/src-tauri/target/..) when run from the repo.
fn junos_root() -> Option<PathBuf> {
    if let Ok(root) = std::env::var("JUNOS_ROOT") {
        return Some(PathBuf::from(root));
    }
    let exe = std::env::current_exe().ok()?;
    exe.ancestors().find(|p| p.join("apps").join("daemon").join("src").join("main.ts").exists()).map(|p| p.to_path_buf())
}

/// Starts junosd if nothing answers on its port. When it is already running (as the scheduled task, say) nothing is done.
fn ensure_daemon() {
    if daemon_is_up() {
        return;
    }
    let Some(root) = junos_root() else {
        eprintln!("junosd is not running and JUNOS_ROOT is not set, so it was not started.");
        return;
    };
    let mut command = Command::new("node");
    command
        .arg(root.join("apps").join("daemon").join("src").join("main.ts"))
        .current_dir(&root)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    if let Err(err) = command.spawn() {
        eprintln!("could not start junosd: {err}");
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn open_in_browser() {
    #[cfg(windows)]
    let _ = Command::new("cmd").args(["/C", "start", "", DAEMON_URL]).spawn();
    #[cfg(target_os = "macos")]
    let _ = Command::new("open").arg(DAEMON_URL).spawn();
    #[cfg(all(unix, not(target_os = "macos")))]
    let _ = Command::new("xdg-open").arg(DAEMON_URL).spawn();
}

fn main() {
    tauri::Builder::default()
        // A second launch brings the first one forward instead of starting another.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![HIDDEN_FLAG])))
        .setup(|app| {
            ensure_daemon();

            // Start with the OS: switched on the first time, and left alone after that (turn it off in the OS settings).
            let autostart = app.autolaunch();
            if !autostart.is_enabled().unwrap_or(false) {
                let _ = autostart.enable();
            }

            let open = MenuItem::with_id(app, "open", "Open JunOS", true, None::<&str>)?;
            let browser = MenuItem::with_id(app, "browser", "Open in the browser", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit the window (junosd keeps running)", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &browser, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("the app icon").clone())
                .tooltip("JunOS")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "browser" => open_in_browser(),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // Started by the OS at login: stay in the tray. Started by hand: show the window.
            if !std::env::args().any(|a| a == HIDDEN_FLAG) {
                show_main(app.handle());
            }
            Ok(())
        })
        // Closing the window hides it; the tray menu is how to quit.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the JunOS desktop wrapper");
}
