# Estabrek launcher (Windows)

The program buyers of protected products install. They add the encrypted copy
they downloaded from their order page plus its serial once; it activates on their
PC (one PC per serial unless the product allows more) and then runs or exports
the files from there.

- **Runs** Python, PowerShell, batch, Node, AutoHotkey and Lua scripts, and
  programs (`.exe`). The copy is unpacked into a private folder under the user's
  profile only while it runs, then wiped.
- **Saves to a folder** everything else (Roblox models, AutoCAD files, 3D print
  files). Once saved it's an ordinary file that still carries the buyer's mark.
- **Binding:** the serial + a SHA-256 of the PC's identifiers (Windows machine id,
  board, system and first-disk serials; only the hash leaves the PC). The shop
  signs a licence for that PC (ECDSA P-256); the launcher checks it offline with
  the keys built into it, and online every 7 days (14 days of grace offline). Its
  local record is sealed with Windows DPAPI for the Windows user, so copying the
  folder to another PC or account doesn't work.
- **Honest limit:** anything running on the buyer's PC can be reverse-engineered
  by someone determined. This makes casual sharing hard and leaks traceable.

## Build

Nothing to install: it uses the C# compiler that comes with Windows (.NET
Framework 4.8). From the project folder:

```bash
powershell -ExecutionPolicy Bypass -File estabrek-launcher/build.ps1 -ApiUrl https://estabrek-store-production.up.railway.app -Version 1.0.0
```

It reads the shop's licence keys from `<ApiUrl>/v1/licences/public-key`, builds
them in, and writes `estabrek-launcher/dist/EstabrekLauncher.exe`. Upload it in
the admin: **الخزنة والبرنامج → رفع EstabrekLauncher.exe**. Build again whenever
the keys change (for example when the vault is turned on).

### Signing (optional)

Without a code-signing certificate Windows shows "Windows protected your PC" the
first time (More info → Run anyway). With one:

```bash
signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a estabrek-launcher/dist/EstabrekLauncher.exe
```

## Checking a build

Switches used by the backend's tests (`src/tests/launcher.interop.spec.ts`):
`--version`, `--fingerprint`, `--keys`, `--unzip <copy.zip> <serial> <folder>`,
`--verify <licence>`, `--activate <copy.zip> <serial>`, `--list`,
`--run <licence> <file>`. `ESTABREK_LAUNCHER_HOME` points it at a folder of its own.
