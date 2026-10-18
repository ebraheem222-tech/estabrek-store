// The shop's licence API (Config.ApiBase + /v1/licences/...): activate a serial
// on this PC, check it again every few days.
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;

namespace Estabrek.Launcher
{
    public sealed class ApiResult
    {
        public int Status;
        public Dictionary<string, object> Body;
        public bool Offline;
        public string Error { get { return LicenceToken.Str(Body, "error"); } }
        public bool Ok { get { return !Offline && Status >= 200 && Status < 300; } }
    }

    public static class Api
    {
        static Api()
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        }

        public static ApiResult Post(string path, Dictionary<string, object> body)
        {
            var r = new ApiResult();
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(Config.ApiBase.TrimEnd('/') + "/v1/licences" + path);
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Timeout = 20000;
                req.UserAgent = "EstabrekLauncher/" + Config.Version;
                byte[] data = Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(body));
                using (Stream s = req.GetRequestStream()) s.Write(data, 0, data.Length);
                using (var res = (HttpWebResponse)req.GetResponse()) Read(res, r);
            }
            catch (WebException e)
            {
                var res = e.Response as HttpWebResponse;
                if (res == null) r.Offline = true;
                else using (res) Read(res, r);
            }
            catch (Exception)
            {
                r.Offline = true;
            }
            return r;
        }

        static void Read(HttpWebResponse res, ApiResult r)
        {
            r.Status = (int)res.StatusCode;
            using (var sr = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
            {
                string text = sr.ReadToEnd();
                try { r.Body = new JavaScriptSerializer().Deserialize<Dictionary<string, object>>(text); }
                catch (Exception) { r.Body = new Dictionary<string, object>(); }
            }
        }
    }
}
