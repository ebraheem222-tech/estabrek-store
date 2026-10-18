// Activating a copy on this PC and keeping its licence fresh.
//   Activate: the serial must open the copy; then the shop signs a licence for
//   this PC's fingerprint (one PC per serial unless the product allows more).
//   Before each use: when the licence is due (every few days) it is checked
//   online; offline it keeps working for Config.OfflineGraceDays more.
using System;
using System.Collections.Generic;

namespace Estabrek.Launcher
{
    public static class Licensing
    {
        public static string Words(string code)
        {
            switch (code)
            {
                case "BAD_SERIAL": return "السيريال مش صحيح لهالملف. تأكدي إنك نسختيه كامل.";
                case "SERIAL_NOT_FOUND": return "هالسيريال مش معروف عند المتجر.";
                case "DEVICE_LIMIT": return "هالسيريال مفعّل على جهاز ثاني. تواصلي مع المتجر لينقلوه لهالجهاز.";
                case "LICENCE_STOPPED": return "هالسيريال موقوف. تواصلي مع المتجر.";
                case "ORDER_CLOSED": return "الطلب ملغي، فالسيريال وقف.";
                case "DEVICE_RESET": return "هالجهاز انشال من السيريال. إذا بدك تستعمليه هون، فعّليه من جديد.";
                case "OTHER_PC": case "BAD_LICENCE": return "الترخيص مش لهالجهاز.";
                case "TOO_MANY_TRIES": return "محاولات كثيرة. جرّبي كمان شوي.";
                case "OFFLINE": return "ما في اتصال بالإنترنت. التفعيل بدّه إنترنت مرة وحدة بس.";
                case "OFFLINE_TOO_LONG": return "صار وقت طويل بدون إنترنت. اتصلي بالإنترنت مرة لنتأكد من الترخيص.";
                case "NOT_A_COPY": case "NOT_ENCRYPTED": case "NOT_AES": return "هالملف مش نسخة محمية من المتجر.";
                default: return "صار خطأ (" + code + "). جرّبي كمان مرة أو تواصلي مع المتجر.";
            }
        }

        /** Activates the copy on this PC and keeps it in the library. Returns null, or the problem in words. */
        public static string Activate(byte[] package, string serial, out Owned owned)
        {
            owned = null;
            serial = (serial ?? "").Trim().ToUpperInvariant();
            try { ZipAes.Read(package, serial); }
            catch (BadSerialException) { return Words("BAD_SERIAL"); }
            catch (Exception e) { return Words(e.Message); }

            string device = Device.Hash();
            var body = new Dictionary<string, object>();
            body["serial"] = serial;
            body["deviceHash"] = device;
            body["deviceName"] = Device.Name();
            body["appVersion"] = Config.Version;
            ApiResult r = Api.Post("/activate", body);
            if (r.Offline) return Words("OFFLINE");
            if (!r.Ok) return Words(r.Error);
            string token = LicenceToken.Str(r.Body, "token");
            Dictionary<string, object> p = LicenceToken.Verify(token);
            if (p == null || LicenceToken.Str(p, "dev") != device) return Words("BAD_LICENCE");
            owned = Library.Save(LicenceToken.Str(p, "lic"), package, serial, token, device);
            return owned == null ? Words("SAVE_FAILED") : null;
        }

        /** Null when the copy may be used now; else the reason in words (the licence is renewed when due). */
        public static string EnsureAllowed(Owned o)
        {
            long now = Library.Now();
            long chk = LicenceToken.Num(o.Payload, "chk");
            if (now < chk) return null;
            var body = new Dictionary<string, object>();
            body["token"] = o.Token;
            body["deviceHash"] = o.DeviceHash;
            ApiResult r = Api.Post("/check", body);
            if (r.Offline || r.Status >= 500)
            {
                return now < chk + (long)Config.OfflineGraceDays * 86400 ? null : Words("OFFLINE_TOO_LONG");
            }
            if (!r.Ok) return Words(r.Error);
            string token = LicenceToken.Str(r.Body, "token");
            Dictionary<string, object> p = LicenceToken.Verify(token);
            if (p == null || LicenceToken.Str(p, "dev") != o.DeviceHash) return Words("BAD_LICENCE");
            Library.WriteLicence(o.Folder, o.Serial, token, o.DeviceHash);
            o.Token = token;
            o.Payload = p;
            return null;
        }
    }
}
