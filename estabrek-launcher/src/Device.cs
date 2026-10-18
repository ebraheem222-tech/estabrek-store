// This PC's fingerprint: a SHA-256 of Windows' machine id and the board, system
// and first-disk serials. Only the hash leaves the PC (the shop never sees the
// identifiers). Made once at activation and kept (see Library), so a Windows
// update or a USB disk doesn't make the PC look new.
using System;
using System.Collections.Generic;
using System.Management;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Win32;

namespace Estabrek.Launcher
{
    public static class Device
    {
        public static string Hash()
        {
            var parts = new List<string>();
            parts.Add(MachineGuid());
            parts.Add(Wmi("SELECT SerialNumber FROM Win32_BaseBoard", "SerialNumber"));
            parts.Add(Wmi("SELECT UUID FROM Win32_ComputerSystemProduct", "UUID"));
            parts.Add(Wmi("SELECT SerialNumber FROM Win32_DiskDrive WHERE Index = 0", "SerialNumber"));
            string s = "estabrek-pc-v1|" + string.Join("|", parts.ToArray());
            using (var sha = SHA256.Create()) return Hex(sha.ComputeHash(Encoding.UTF8.GetBytes(s)));
        }

        public static string Name()
        {
            try { return Environment.MachineName; } catch (Exception) { return "PC"; }
        }

        static string MachineGuid()
        {
            try
            {
                using (RegistryKey b = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64))
                using (RegistryKey k = b.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography"))
                {
                    object v = k == null ? null : k.GetValue("MachineGuid");
                    return v == null ? "" : v.ToString();
                }
            }
            catch (Exception) { return ""; }
        }

        static string Wmi(string query, string prop)
        {
            try
            {
                using (var s = new ManagementObjectSearcher(query))
                {
                    foreach (ManagementObject o in s.Get())
                    {
                        object v = o[prop];
                        if (v != null && v.ToString().Trim().Length > 0) return v.ToString().Trim();
                    }
                }
            }
            catch (Exception) { }
            return "";
        }

        public static string Hex(byte[] b)
        {
            var sb = new StringBuilder(b.Length * 2);
            foreach (byte x in b) sb.Append(x.ToString("x2"));
            return sb.ToString();
        }
    }
}
