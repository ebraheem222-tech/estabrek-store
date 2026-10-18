// The buyer's products on this PC: %LOCALAPPDATA%\Estabrek\Launcher\<licence>\
//   package.zip   her encrypted copy, as downloaded
//   licence.dat   serial + signed licence + this PC's fingerprint, sealed with
//                 Windows DPAPI for this Windows user: copied to another PC or
//                 another account, it can't be opened.
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

namespace Estabrek.Launcher
{
    public sealed class Owned
    {
        public string Id;
        public string Folder;
        public string Title;
        public string Serial;
        public string Token;
        public string DeviceHash;
        public long LastCheck;
        public Dictionary<string, object> Payload;
    }

    public static class Library
    {
        static readonly byte[] Entropy = Encoding.UTF8.GetBytes("estabrek-launcher/licence/v1");

        public static string Root
        {
            get
            {
                // ESTABREK_LAUNCHER_HOME: a folder of its own (the build's tests use it).
                string home = Environment.GetEnvironmentVariable("ESTABREK_LAUNCHER_HOME");
                string d = !string.IsNullOrEmpty(home) ? home : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Estabrek", "Launcher");
                Directory.CreateDirectory(d);
                return d;
            }
        }

        public static List<Owned> All(List<string> unreadable)
        {
            var list = new List<Owned>();
            foreach (string dir in Directory.GetDirectories(Root))
            {
                if (Path.GetFileName(dir) == "run") continue;
                Owned o = Load(dir);
                if (o != null) list.Add(o);
                else if (unreadable != null) unreadable.Add(Path.GetFileName(dir));
            }
            return list;
        }

        public static Owned Load(string dir)
        {
            try
            {
                byte[] sealedBytes = File.ReadAllBytes(Path.Combine(dir, "licence.dat"));
                byte[] plain = ProtectedData.Unprotect(sealedBytes, Entropy, DataProtectionScope.CurrentUser);
                var d = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(plain));
                var o = new Owned
                {
                    Id = Path.GetFileName(dir),
                    Folder = dir,
                    Serial = LicenceToken.Str(d, "serial"),
                    Token = LicenceToken.Str(d, "token"),
                    DeviceHash = LicenceToken.Str(d, "device"),
                    LastCheck = LicenceToken.Num(d, "lastCheck"),
                };
                o.Payload = LicenceToken.Verify(o.Token);
                if (o.Payload == null || LicenceToken.Str(o.Payload, "dev") != o.DeviceHash) return null;
                o.Title = LicenceToken.Str(o.Payload, "title");
                return o;
            }
            catch (Exception)
            {
                return null;
            }
        }

        public static Owned Save(string licenceId, byte[] package, string serial, string token, string deviceHash)
        {
            string dir = Path.Combine(Root, ZipAes.SafeName(licenceId));
            Directory.CreateDirectory(dir);
            File.WriteAllBytes(Path.Combine(dir, "package.zip"), package);
            WriteLicence(dir, serial, token, deviceHash);
            return Load(dir);
        }

        public static void WriteLicence(string dir, string serial, string token, string deviceHash)
        {
            var d = new Dictionary<string, object>();
            d["serial"] = serial;
            d["token"] = token;
            d["device"] = deviceHash;
            d["lastCheck"] = Now();
            byte[] plain = Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(d));
            File.WriteAllBytes(Path.Combine(dir, "licence.dat"), ProtectedData.Protect(plain, Entropy, DataProtectionScope.CurrentUser));
        }

        public static void Remove(Owned o)
        {
            try { Directory.Delete(o.Folder, true); } catch (Exception) { }
        }

        public static long Now()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
        }
    }
}
