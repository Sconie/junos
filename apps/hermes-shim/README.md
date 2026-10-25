# junos-hermes-shim

A small service that runs **next to Hermes on the VPS** and lets junosd supervise it: a live step stream, a queue, approvals, memory, skills and Telegram mirroring. It has no dependencies and only needs Node 24.

Hermes's own API (port 8642) carries a conversation and nothing more. Without the shim, junosd can send Hermes a directive and show the answer, and that is all. With it, the Hermes screen has everything the mock showed.

```
junosd (your PC)  --Tailscale or SSH tunnel-->  shim :8650  -->  Hermes API 127.0.0.1:8642
                                                  |  reads  -->  Hermes memory files, skills folder, conversation log
                                                  '- Hermes calls the shim's hooks to ask for an approval
```

## What you need to give it

**One secret: the Hermes API key** (`API_SERVER_KEY` on the VPS). The shim uses it to call Hermes, and junosd presents the same value to the shim, so there is nothing else to invent. If you would rather use two different secrets, set `JUNOS_SHIM_KEY` on the VPS and give junosd that one.

The key lives in the environment only. It is not in this repository, not in a config file, and the shim never prints it or returns it in an answer.

## Set it up

1. **Copy the folder.** Put `apps/hermes-shim` on the VPS, for example in `/opt/junos-hermes-shim`. It needs Node 24 and nothing else (no `npm install`; the `@junos/shared` import is types only and disappears when Node runs the file).
2. **Write the environment file** `/etc/junos-hermes-shim.env` (mode 600, owned by the user that runs the shim). Start from `deploy/env.example`:
   ```
   HERMES_API_KEY=<the same value as Hermes's API_SERVER_KEY>
   JUNOS_SHIM_HOST=100.x.y.z           # this VPS's Tailscale address (or 127.0.0.1 behind an SSH tunnel)
   ```
3. **Point it at Hermes's files** with `JUNOS_SHIM_MEMORY_DIR`, `JUNOS_SHIM_SKILLS_DIR` and, for Telegram mirroring, `JUNOS_SHIM_LOG_FILE`. Defaults and what each does are in the table below. If Hermes runs in Docker, mount those folders **read-only** into the shim (or run the shim on the host and read the volume paths).
4. **Run it** as a service: copy `deploy/junos-hermes-shim.service` to `/etc/systemd/system/`, then `systemctl enable --now junos-hermes-shim`. For the Docker sidecar form, see `deploy/docker-compose.snippet.yml`.
5. **Tell junosd.** On your PC, before starting junosd:
   ```
   JUNOS_HERMES_URL=http://<the VPS tailscale address>:8650
   JUNOS_HERMES_PROTOCOL=shim
   JUNOS_HERMES_KEY=<the same Hermes API key>
   ```
   (With an SSH tunnel: `ssh -N -L 8650:127.0.0.1:8650 you@vps`, then use `http://127.0.0.1:8650`.) The Hermes screen's status pill should turn from "unreachable" to "idle".
6. **Check it.** `curl http://<address>:8650/shim/health` answers `{"ok":true,"name":"junos-hermes-shim","protocol":1}` without a key. Everything else needs `Authorization: Bearer <key>`.

Nothing in these steps touches the VPS from this repository: the shim is code you run there yourself.

## Settings

| Variable | Default | Meaning |
| --- | --- | --- |
| `HERMES_API_KEY` | none, required | Hermes's key. Also the key junosd presents unless `JUNOS_SHIM_KEY` is set. At least 16 characters. |
| `JUNOS_SHIM_KEY` | `HERMES_API_KEY` | A separate key for junosd, if you want one. |
| `JUNOS_SHIM_HOST` | `127.0.0.1` | Where the shim listens. Only this machine or a Tailscale address (100.64.0.0/10). `0.0.0.0` and public addresses are refused at start. |
| `JUNOS_SHIM_CONTAINER` | off | Set to `1` inside the Docker sidecar so `0.0.0.0` is accepted there. Ignored outside a container. |
| `JUNOS_SHIM_PORT` | `8650` | The port. |
| `HERMES_API_URL` | `http://127.0.0.1:8642` | Hermes's API: this machine, a private address or a container name. |
| `JUNOS_SHIM_MEMORY_DIR` | `/opt/data/memories` | Hermes's memory files. Bullet lines (`- ` or `* `) in `.md` and `.txt` files are read as facts. |
| `JUNOS_SHIM_SKILLS_DIR` | `/opt/data/skills` | Folders that hold a `SKILL.md`, one level of category folders allowed. |
| `JUNOS_SHIM_STATE_DIR` | `./state` | The shim's own small files: pins and skill switches. |
| `JUNOS_SHIM_LOG_FILE` | off | A JSON-lines log of Hermes's conversation, tailed to mirror Telegram. |
| `JUNOS_SHIM_HOOK_CIDRS` | none | IPv4 ranges besides loopback that may call the hooks (for example `172.16.0.0/12` when Hermes runs in Docker). |

## What it does, and the honest limits

Everything here is built and tested against a stand-in Hermes. **None of it has run against the real Hermes yet**, because the key has not been supplied. What is known about the real one is only its `/health` (HTTP 200, version 0.22.2) and that `/v1/models` answers 401 without a key. The parts below that depend on how the real Hermes lays things out are marked.

- **Directives and steps.** A directive becomes a streamed question to Hermes's chat API. Text becomes the answer. Each tool call Hermes announces in the stream becomes a step (shell, browser, file or api, chosen from the tool's name), shown running and then done. The tool's own output does not come back on this API, so tool steps show their input only.
- **Queue, pause, resume.** One directive at a time, high priority first. Pause holds the queue.
- **Stop.** Closes the request to Hermes, empties the queue and denies every step waiting for an approval. The shim cannot see whether Hermes itself stopped, so when something was running it answers `confirmed: false` and junosd tells you to check.
- **Approvals.** Hermes (or a small script beside it) asks by calling `POST /v1/hooks/approval` with `{ class, target, summary }`. The call waits. junosd turns the step into an Inbox approval; Approve or Deny there, or `POST /v1/hooks/approval/<step>/resolve` with `{ "decision", "via": "telegram" }` from the Telegram side. **The first answer wins** and the other is refused. No answer in 30 minutes means deny, and so does a caller that hangs up. *How Hermes is made to call this hook is not set up here.* It needs Hermes's tool-approval setting pointed at the hook, which has to be looked at on the real Hermes.
- **Memory.** Lists the facts in Hermes's memory files. JunOS can pin them (kept in the shim's state) and can add or edit notes of its own, which go in `junos-notes.md` in the memory folder. It never edits or removes what Hermes wrote: change those by asking Hermes. *The bullet-line format is an assumption about how Hermes writes memory; check it against the real folder.*
- **Skills.** Lists skill folders. Hermes has no on/off switch the shim can reach, so a switch is kept by the shim and added to every directive as "do not use these skills". That is a request Hermes follows, not a lock.
- **Telegram mirroring.** The shim tails `JUNOS_SHIM_LOG_FILE` and shows lines marked as Telegram in the Hermes console with a badge. It never sees the bot token. *The line format it reads (`role`, `text`, and `via` or `source` or `platform` set to `telegram`) is an assumption; the real log may need a small adapter in `src/convlog.ts`.* A directive sent with "echo to Telegram" adds a line asking Hermes to send its answer there.
- **Board.** `POST /v1/hooks/kanban` passes a card request from Hermes to junosd, which still refuses anything that would move a card to Done.

## Safety

- Listens only on loopback or the tailnet, and refuses to start on anything else.
- Every route except `/shim/health` needs the key (compared in constant time). Ten wrong keys in a minute lock everything for the minute. A request carrying an `Origin` header (a web page) is refused.
- Hooks answer only to the machine Hermes runs on: loopback, plus ranges you list in `JUNOS_SHIM_HOOK_CIDRS`.
- It reads memory and skills read-only except for its own `junos-notes.md`, skips links and large files, and only talks to the Hermes URL you give it.
- Errors tell the caller what happened, never a path or a key.

## Tests

`npm test -w @junos/hermes-shim` runs against a stand-in Hermes on 127.0.0.1. The daemon's `test/hermes-shim.test.ts` runs the whole chain: junosd, the bridge, the shim, and the stand-in. `test/fixtures/README.md` explains the stream fixture and how to record a real one with `scripts/record-fixture.mjs` once the key exists.
