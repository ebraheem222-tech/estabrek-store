// The licence the shop signs for this PC ("v1.<kid>.<payload>.<signature>",
// ECDSA P-256 / SHA-256, see modules/protected/licenceToken.ts). Checked against
// the public keys built into this program (Config.Keys), so it works offline.
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Web.Script.Serialization;

namespace Estabrek.Launcher
{
    public static class LicenceToken
    {
        /** The payload when the token is whole and signed by a key we know; null otherwise. */
        public static Dictionary<string, object> Verify(string token)
        {
            if (string.IsNullOrEmpty(token)) return null;
            string[] parts = token.Split('.');
            if (parts.Length != 4 || parts[0] != "v1") return null;
            string[] key = null;
            foreach (string[] k in Config.Keys) if (k[0] == parts[1]) key = k;
            if (key == null) return null;
            try
            {
                var prms = new ECParameters();
                prms.Curve = ECCurve.NamedCurves.nistP256;
                prms.Q = new ECPoint { X = B64u(key[1]), Y = B64u(key[2]) };
                using (ECDsa ecdsa = ECDsa.Create(prms))
                {
                    byte[] data = Encoding.UTF8.GetBytes(parts[0] + "." + parts[1] + "." + parts[2]);
                    if (!ecdsa.VerifyData(data, B64u(parts[3]), HashAlgorithmName.SHA256)) return null;
                }
                string json = Encoding.UTF8.GetString(B64u(parts[2]));
                return new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(json);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public static string Str(Dictionary<string, object> p, string name)
        {
            object v;
            return p != null && p.TryGetValue(name, out v) && v != null ? Convert.ToString(v) : "";
        }

        public static long Num(Dictionary<string, object> p, string name)
        {
            object v;
            return p != null && p.TryGetValue(name, out v) && v != null ? Convert.ToInt64(v) : 0;
        }

        public static byte[] B64u(string s)
        {
            string t = s.Replace('-', '+').Replace('_', '/');
            switch (t.Length % 4) { case 2: t += "=="; break; case 3: t += "="; break; }
            return Convert.FromBase64String(t);
        }
    }
}
