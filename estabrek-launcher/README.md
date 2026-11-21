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

## Every shop has it ready

Nobody builds a launcher per shop. One **blank** program is built once and
kept with the backend (`estabrek-store-backend/assets/launcher/`, with
`launcher.json`: its version and a hash of the sources it was built from). When a
buyer (or the owner, from the admin) downloads it, that shop's server writes its
address, its name and its licence keys at the end of the file
(`modules/protected/launcherStamp.ts`); the program reads them from its own file
at start (`src/Config.cs`). Windows ignores bytes after a program's last section,
so it still runs. A change of keys (the vault turned on) reaches the next
download by itself; buyers with an older copy are told to download it again.

After changing anything here, build the blank program again and commit it (a
backend test, `launcher.ready.spec.ts`, fails until you do). Nothing to install:
it uses the C# compiler that comes with Windows (.NET Framework 4.8):

```bash
powershell -ExecutionPolicy Bypass -File estabrek-launcher/build.ps1 -Blank -Version 1.1.1
```

## A build of the owner's own

Still possible, for a build signed with the owner's certificate. It reads the
shop's licence keys from `<ApiUrl>/v1/licences/public-key` and builds them in:

```bash
powershell -ExecutionPolicy Bypass -File estabrek-launcher/build.ps1 -ApiUrl https://estabrek-store-production.up.railway.app -Version 1.0.0
```

It writes `estabrek-launcher/dist/EstabrekLauncher.exe`. Upload it in the admin:
**الخزنة والبرنامج → متقدم → رفع EstabrekLauncher.exe**. The upload is offered
instead of the ready one until it is deleted; build it again whenever the keys
change.

### Signing (optional)

Without a code-signing certificate Windows shows "Windows protected your PC" the
first time (More info → Run anyway). With one:

```bash
signtool sign /fd sha256 /tr http://timestamp.digicert.com /td sha256 /a estabrek-launcher/dist/EstabrekLauncher.exe
```

## Checking a build

Switches used by the backend's tests (`src/tests/launcher.interop.spec.ts`):
`--version`, `--fingerprint`, `--keys`, `--store`, `--unzip <copy.zip> <serial> <folder>`,
`--verify <licence>`, `--activate <copy.zip> <serial>`, `--list`,
`--run <licence> <file>`. `ESTABREK_LAUNCHER_HOME` points it at a folder of its own.
