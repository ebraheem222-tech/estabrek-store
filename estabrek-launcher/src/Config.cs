// Which shop this copy of the launcher belongs to: its address, its name and the
// keys its licences are signed with.
//
// One blank program is built once (build.ps1 -Blank) and kept in the backend
// (estabrek-store-backend/assets/launcher). When a buyer or the owner downloads
// it, that shop's server writes its details at the end of the file
// (modules/protected/launcherStamp.ts):
//
//   <program> <JSON, UTF-8> <JSON length, 4 bytes little-endian> "ESTBCFG1"
//
// Windows ignores bytes after a program's last section, so the program still runs.
// A build made for one shop (build.ps1 -ApiUrl ...) carries them in Built instead;
// a stamp, when there is one, wins.
using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

namespace Estabrek.Launcher
{
    public static class Config
    {
        public const string Version = Built.Version;
        public const int OfflineGraceDays = 14;
        public const string Magic = "ESTBCFG1";

        /** The shop's address (without /v1); empty when this copy doesn't know its shop. */
        public static readonly string ApiBase;
        /** The shop's name, shown in the window's title. */
        public static readonly string StoreName;
        /** { kid, x, y } per key (base64url). */
        public static readonly string[][] Keys;
        /** True when a shop wrote its details into this file. */
        public static readonly bool Stamped;

        static readonly Regex KeyPart = new Regex("^[A-Za-z0-9_-]{1,100}$");

        static Config()
        {
            ApiBase = Built.ApiBase;
            StoreName = "";
            Keys = Built.Keys;
            Dictionary<string, object> s = ReadStamp(SelfPath());
            if (s == null) return;
            string api = LicenceToken.Str(s, "api").Trim().TrimEnd('/');
            if (!api.StartsWith("https://") && !api.StartsWith("http://")) return;
            var keys = new List<string[]>();
            var list = s.ContainsKey("keys") ? s["keys"] as ArrayList : null;
            if (list != null)
            {
                foreach (object item in list)
                {
                    var k = item as Dictionary<string, object>;
                    if (k == null) continue;
                    string kid = LicenceToken.Str(k, "kid"), x = LicenceToken.Str(k, "x"), y = LicenceToken.Str(k, "y");
                    if (KeyPart.IsMatch(kid) && KeyPart.IsMatch(x) && KeyPart.IsMatch(y)) keys.Add(new[] { kid, x, y });
                }
            }
            if (keys.Count == 0) return;
            ApiBase = api;
            Keys = keys.ToArray();
            string name = LicenceToken.Str(s, "name").Trim();
            StoreName = name.Length > 60 ? name.Substring(0, 60) : name;
            Stamped = true;
        }

        /** What the window and messages are titled with. */
        public static string Title
        {
            get { return StoreName.Length > 0 ? StoreName : "استبرق"; }
        }

        static string SelfPath()
        {
            try { return Assembly.GetExecutingAssembly().Location; }
            catch (Exception) { return null; }
        }

        /** The details written at the end of this file, or null. */
        public static Dictionary<string, object> ReadStamp(string file)
        {
            if (string.IsNullOrEmpty(file)) return null;
            try
            {
                using (var f = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    if (f.Length < 12) return null;
                    byte[] tail = ReadAt(f, f.Length - 12, 12);
                    if (Encoding.ASCII.GetString(tail, 4, 8) != Magic) return null;
                    int len = BitConverter.ToInt32(tail, 0);
                    if (len <= 0 || len > 65536 || len > f.Length - 12) return null;
                    byte[] json = ReadAt(f, f.Length - 12 - len, len);
                    return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(new UTF8Encoding(false).GetString(json));
                }
            }
            catch (Exception)
            {
                return null;
            }
        }

        static byte[] ReadAt(FileStream f, long at, int count)
        {
            f.Seek(at, SeekOrigin.Begin);
            byte[] b = new byte[count];
            int got = 0;
            while (got < count)
            {
                int n = f.Read(b, got, count - got);
                if (n <= 0) throw new EndOfStreamException();
                got += n;
            }
            return b;
        }
    }
}
