// Using a product's files on this PC.
//   Run: scripts with their interpreter (Python, PowerShell, batch, Node,
//   AutoHotkey, Lua) and programs. The whole copy is unpacked into a private
//   folder under this user's profile only while it runs, then wiped.
//   Save to a folder: everything else (Roblox models, AutoCAD files, 3D print
//   files) — once saved it is an ordinary file, still carrying its buyer mark.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Microsoft.Win32;

namespace Estabrek.Launcher
{
    public static class Runner
    {
        public static string RunDir
        {
            get { return Path.Combine(Library.Root, "run"); }
        }

        /** What runs this file ("python", "powershell"…); null when it's only saved, not run. */
        public static string Kind(string name)
        {
            string ext = Path.GetExtension(name).TrimStart('.').ToLowerInvariant();
            switch (ext)
            {
                case "py": case "pyw": return "python";
                case "ps1": return "powershell";
                case "bat": case "cmd": return "batch";
                case "js": case "mjs": case "cjs": return "node";
                case "ahk": case "ahk2": return "autohotkey";
                case "lua": return "lua";
                case "exe": return "program";
                default: return null;
            }
        }

        /** The interpreter on this PC, or null (then the buyer is told what to install). */
        public static string Interpreter(string kind)
        {
            switch (kind)
            {
                case "python": return FindOnPath("py.exe") ?? FindOnPath("python.exe");
                case "powershell": return Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe");
                case "batch": return Path.Combine(Environment.SystemDirectory, "cmd.exe");
                case "node": return FindOnPath("node.exe");
                case "lua": return FindOnPath("lua.exe") ?? FindOnPath("lua54.exe");
                case "autohotkey": return AutoHotkey();
                case "program": return "";
                default: return null;
            }
        }

        /** Unpacks the copy into a fresh private folder and starts the file; the folder goes when it exits. */
        public static Process Start(List<ZipEntryData> files, ZipEntryData chosen)
        {
            string kind = Kind(chosen.Name);
            string exe = Interpreter(kind);
            if (exe == null) throw new InvalidOperationException("NO_INTERPRETER:" + kind);
            Wipe();
            string dir = Path.Combine(RunDir, Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(dir);
            foreach (ZipEntryData f in files) File.WriteAllBytes(Path.Combine(dir, ZipAes.SafeName(f.Name)), f.Data);
            string file = Path.Combine(dir, ZipAes.SafeName(chosen.Name));
            var si = new ProcessStartInfo { WorkingDirectory = dir, UseShellExecute = false };
            switch (kind)
            {
                case "program": si.FileName = file; break;
                case "powershell": si.FileName = exe; si.Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + file + "\""; break;
                case "batch": si.FileName = exe; si.Arguments = "/c \"\"" + file + "\"\""; break;
                default: si.FileName = exe; si.Arguments = "\"" + file + "\""; break;
            }
            Process p = Process.Start(si);
            p.EnableRaisingEvents = true;
            p.Exited += delegate { TryDelete(dir); };
            return p;
        }

        /** Saves the chosen files into a folder the buyer picked. */
        public static void Export(IEnumerable<ZipEntryData> files, string folder)
        {
            foreach (ZipEntryData f in files) File.WriteAllBytes(Path.Combine(folder, ZipAes.SafeName(f.Name)), f.Data);
        }

        /** Leftovers from a run that didn't end cleanly (power cut…). */
        public static void Wipe()
        {
            if (!Directory.Exists(RunDir)) return;
            foreach (string d in Directory.GetDirectories(RunDir)) TryDelete(d);
        }

        static void TryDelete(string dir)
        {
            for (int i = 0; i < 5; i++)
            {
                try { if (Directory.Exists(dir)) Directory.Delete(dir, true); return; }
                catch (Exception) { System.Threading.Thread.Sleep(400); }
            }
        }

        static string FindOnPath(string exe)
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string part in path.Split(';'))
            {
                try
                {
                    string p = Path.Combine(part.Trim().Trim('"'), exe);
                    if (part.Trim().Length > 0 && File.Exists(p)) return p;
                }
                catch (Exception) { }
            }
            string win = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), exe);
            return File.Exists(win) ? win : null;
        }

        static string AutoHotkey()
        {
            try
            {
                using (RegistryKey k = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\AutoHotkey"))
                {
                    object dir = k == null ? null : k.GetValue("InstallDir");
                    if (dir != null)
                    {
                        foreach (string n in new[] { "AutoHotkey.exe", @"v2\AutoHotkey64.exe", "AutoHotkey64.exe", "AutoHotkeyU64.exe" })
                        {
                            string p = Path.Combine(dir.ToString(), n);
                            if (File.Exists(p)) return p;
                        }
                    }
                }
            }
            catch (Exception) { }
            string pf = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"AutoHotkey\AutoHotkey.exe");
            return File.Exists(pf) ? pf : FindOnPath("AutoHotkey.exe");
        }
    }
}
