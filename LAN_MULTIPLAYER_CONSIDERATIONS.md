# LAN multiplayer — considerations so far

Status: brainstorm only. Nothing in this document is implemented. No networking
code exists in this project yet.

## The goal

Seamless, LAN-only multiplayer: two people on the same WiFi should see each other
appear automatically the moment the second person loads the GitHub Pages URL — no
room codes, no manual pairing, no special input from either player.

## The core constraint: browsers can't do LAN discovery

This shaped every option below, so it's worth stating plainly: a web page has no
API for discovering other devices on the local network. No mDNS/Bonjour access, no
raw UDP broadcast/multicast, no listening sockets. This is a deliberate, long-
standing security boundary of the web platform, not a gap waiting for a clever
workaround — a "Network Service Discovery API" (mDNS/DNS-SD for the web) was
proposed around 2012–2013 and rejected by browser vendors on exactly these
grounds. The trend since has moved further in that direction: Chrome's ongoing
"Private Network Access" work is adding *more* friction (CORS preflight checks,
eventually permission prompts) before a public HTTPS page can even talk to a
private IP at all, let alone discover one blindly.

Game consoles (e.g. Nintendo Switch local wireless play) and native PC games solve
LAN discovery via UDP broadcast — "I'm hosting a game" blasted on the subnet, with
other devices passively listening. That works because native apps get raw socket
access from the OS. Browsers deliberately withhold that from arbitrary websites
(otherwise any website could silently probe every device on your home network on
page load).

## What is feasible: WebRTC for the actual gameplay traffic

Once two browsers know about each other, `RTCDataChannel` gives a real
peer-to-peer connection. On a LAN, that connection goes directly machine-to-
machine — no relay, no internet round-trip — so gameplay state (positions,
rotations, whatever gets synced) stays exactly as local as intended.

## The remaining gap: signaling

WebRTC does not specify how the initial handshake (SDP offer/answer + ICE
candidates — a few KB of text) gets from one browser to the other. That exchange
needs *some* rendezvous point reachable by both browsers before the direct
connection can be established. Three options were considered:

### 1. External relay + public-IP auto-pairing (the chosen starting point)

A minimal external service (e.g. **PeerJS's public cloud broker**, or a
self-hosted equivalent such as a small **Cloudflare Worker** using Durable
Objects, or Firebase/Supabase realtime) does nothing but pass that one small
handshake blob between two waiting clients. Gameplay data never touches it.

Auto-pairing without room codes: group waiting clients by the **public IP address
the relay sees them connect from** — devices on the same home WiFi share the same
router's public IP, so this naturally pairs "people on this WiFi" without any
manual step. (Caveat: over-groups on big shared NATs — offices, campus WiFi, some
carrier-grade NAT ISPs — where "same public IP" doesn't mean "same LAN.")

Why this can be free: bandwidth/compute needed is tiny (a few KB per pairing
event, no persistent game state), which is exactly the profile free tiers of
serverless/broker platforms are built around. Self-hosting your own tiny relay
(vs. depending on PeerJS's shared public one) trades a little setup effort for
full control and no shared rate limits with other PeerJS users worldwide.

**Tradeoff:** zero install for either player, works across any home network
without local firewall friction, not fragile to browser Private Network Access
changes (it's a normal outbound WSS connection, not a private-IP probe) — at the
cost of a brief, genuine internet touch for the handshake only, and dependency on
a third party's continued uptime/terms (mitigated by self-hosting).

### 2. Local companion process (considered, not chosen)

One player ("host") runs a small local server; the other player's plain browser
tab would need to discover it via **subnet-scanning `fetch()`** across the likely
local IP range (e.g. `192.168.1.1`–`.254`) at a fixed port, since it can't listen
for a broadcast. This can work today, but:

- Requires the host's local server to send explicit CORS headers permitting the
  GitHub Pages origin.
- The host will very likely get an OS firewall prompt the first time the server
  starts listening.
- Relies on browsers continuing to permit public-page-to-private-IP `fetch()` at
  all — exactly the behavior Chrome's Private Network Access work is tightening.
  Works now; not guaranteed to keep working without changes.
- Asymmetric setup burden (only the "host" installs something) and meaningfully
  more code to build/maintain (a real server, cross-platform packaging so the
  host doesn't need Node installed, subnet-scan logic).

**Tradeoff vs. option 1:** keeps 100% of traffic (including the handshake) inside
the LAN, at the cost of setup asymmetry, more code, and long-term fragility as
browser security policy keeps tightening in this exact area.

### 3. Full native app (Electron/Tauri) — not pursued now, but the natural upgrade path

A native shell gives real OS-level socket access, so genuine broadcast-based
discovery (no signaling step needed at all, console-style) becomes
straightforward — but it also means the project stops being "just visit a URL,"
which cuts against the current goal. Notably, this does **not** require
discarding a PeerJS-based implementation; see below.

### Nintendo Switch — considered and ruled out as a near-term target

Switch development requires being a registered/licensed Nintendo developer using
the proprietary NintendoSDK under NDA, plus passing certification before anything
reaches a retail console or the eShop — there's no open toolchain path. Three.js
has no Switch export target (unlike Unity/Godot/Unreal, which do, for licensed
developers); none of this project's JS/WebGL code would run there. An unofficial
homebrew scene exists via console exploits, but that requires a modified console
and sits outside Nintendo's terms of service, so it isn't a real distribution
path to plan around. Bottom line: a Switch version would be a from-scratch
project in a different engine, where at best today's design decisions (the ECS
pattern, the shader/dithering approach — this project already has precedent for
porting shader concepts across engines, from the Unity HLSL source into Three.js
GLSL — and the general "sync via broadcast messages" networking shape) transfer,
not any of today's code.

### Android — much closer to the PC-app case than the Switch case

Unlike Switch, Android is an open platform with official, lightweight paths for
turning an existing web app into something installable, and none of them require
rewriting the Three.js/WebGL/ECS code:

- **PWA install, already works today.** This project already has a `manifest.json`
  (`display: "standalone"`, icons, `start_url`) and a service worker, which is all
  Chrome on Android needs to offer "Add to Home Screen" — an installed icon that
  launches full-screen, no browser chrome. Zero extra work; this already exists.
- **Trusted Web Activity (TWA).** Google's official way to wrap a PWA into a real,
  Play Store-publishable APK/AAB. A TWA loads the already-deployed GitHub Pages
  URL full-screen via Chrome Custom Tabs under the hood — no bundling, no code
  changes. Tooling is official and mature: **Bubblewrap** (Google's CLI) or
  **PWABuilder** (generates Android/iOS/Windows packages from a PWA manifest).
  Lighter than Electron/Tauri since it doesn't bundle a Chromium copy — it reuses
  whatever Chrome is already on the device.
- **Capacitor** (or Cordova). The Android/iOS equivalent of Electron/Tauri: wraps
  the web app's assets into a native WebView-based shell, bundled into the app
  rather than loaded from a URL (works offline, allows native plugins). This is
  the path that matters for the LAN-discovery story below.

WebGL2 (this project explicitly requires a WebGL2 context) has been solid in
Android's Chrome/WebView for years, so rendering isn't a real risk.

**Would it require starting over? No.** This is much closer to the Electron/Tauri
case above than to the Switch case: TWA/Capacitor wrap the *existing* deployed web
app rather than replacing it with a different engine's rewrite.

**What genuinely would need work, independent of packaging:** the current input
scheme (keyboard WASD/arrows, mouse via Pointer Lock) has no touchscreen
equivalent — a virtual joystick / drag-to-look scheme would need to be built for
this to be playable on a phone at all. That's a UX gap true of the plain website
on an Android browser today, not something specific to wrapping it as an app.

**LAN discovery on Android, specifically:** a TWA gets no capabilities beyond what
Chrome already exposes, so the PeerJS/WebRTC approach carries over completely
unchanged. Capacitor, like Electron/Tauri, *can* ship native plugin code alongside
the WebView — so the same progressive-enhancement discovery strategy described
below (native broadcast when available, PeerJS/WebRTC fallback otherwise) applies
to a Capacitor-wrapped Android build too. One Android-specific wrinkle: apps that
want to receive WiFi multicast/broadcast traffic need to explicitly acquire a
`WifiManager.MulticastLock`, since Android normally filters that traffic to save
battery — a well-documented API, not a platform-level blocker like the browser
sandbox is.

## Decision: start with the PeerJS approach

Zero install for either player, fits the existing "just visit the GitHub Pages
link" model, and — per the next section — doesn't box out a native version later.

## Future path: intermingling PeerJS with native sockets (Electron/Tauri, Capacitor)

If/when this becomes a wrapped native PC app (Electron/Tauri) or a wrapped Android
app (Capacitor), the plan is the same in both cases — **progressive enhancement,
not a rewrite**:

- Electron, Tauri, and Capacitor all embed a full browser engine, so the existing
  Three.js code, the ECS, WebRTC, and the PeerJS client all keep working unchanged
  inside the native shell.
- The native shell additionally exposes real socket access (Node's `dgram` in
  Electron; a Rust-side UDP socket surfaced to the frontend in Tauri; a native
  Java/Kotlin plugin talking `WifiManager`/multicast sockets in Capacitor), which
  can implement genuine LAN broadcast discovery — the same mechanism consoles use
  — with no signaling step required at all.
- Architecturally, this fits the existing ECS pattern as a swappable discovery
  strategy: a small abstraction (e.g. a `NetworkDiscovery`-style
  entity component) with two implementations — one using PeerJS/WebRTC signaling
  (used when running as a plain web page, where native sockets aren't available),
  one using native UDP broadcast (used when running inside a native shell,
  detected at runtime). Gameplay sync itself (whatever ends up moving player state
  around once two peers are connected) stays the same either way; only *how the
  two peers find each other* differs by environment.
- Net effect: nothing built for the web/PeerJS version becomes dead code when a
  native version arrives — each native wrapper gets a better discovery path *in
  addition to*, not instead of, the one already built, and the plain web version
  keeps working for anyone who doesn't install a native app.
