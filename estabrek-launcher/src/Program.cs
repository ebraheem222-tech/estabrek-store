// Estabrek's launcher for protected products (phase 4). Opens with its window;
// a few command-line switches exist for checking a build:
//   --version, --fingerprint, --keys
//   --unzip <copy.zip> <serial> <folder>   opens a copy (exit 3: wrong serial)
//   --verify <token>                       checks a licence (exit 4: not valid)
using System;
using System.IO;
using System.Reflection;
using System.Runtime.Versioning;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: TargetFramework(".NETFramework,Version=v4.8", FrameworkDisplayName = ".NET Framework 4.8")]
[assembly: AssemblyTitle("Estabrek Launcher")]
[assembly: AssemblyProduct("Estabrek")]
[assembly: AssemblyVersion(Estabrek.Launcher.Config.Version)]

namespace Estabrek.Launcher
{
    static class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            if (args.Length > 0 && args[0].StartsWith("--")) return Cli(args);
            try { Runner.Wipe(); } catch (Exception) { }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
            return 0;
        }

        /** Names and titles are Arabic: UTF-8 bytes straight out (a windowed program has no console code page to set). */
        static void Out(string text)
        {
            byte[] b = new System.Text.UTF8Encoding(false).GetBytes(text + "\n");
            using (Stream o = Console.OpenStandardOutput()) o.Write(b, 0, b.Length);
        }

        static int Cli(string[] a)
        {
            try
            {
                switch (a[0])
                {
                    case "--version":
                        Out(Config.Version);
                        return 0;
                    case "--fingerprint":
                        Out(Device.Hash());
                        return 0;
                    case "--keys":
                        foreach (string[] k in Config.Keys) Out(k[0]);
                        return 0;
                    case "--unzip":
                        if (a.Length < 4) return 2;
                        Directory.CreateDirectory(a[3]);
                        foreach (ZipEntryData f in ZipAes.Read(File.ReadAllBytes(a[1]), a[2]))
                        {
                            File.WriteAllBytes(Path.Combine(a[3], f.Name), f.Data);
                            Out(f.Name);
                        }
                        return 0;
                    case "--verify":
                        var p = LicenceToken.Verify(a.Length > 1 ? a[1] : "");
                        if (p == null) return 4;
                        Out(new JavaScriptSerializer().Serialize(p));
                        return 0;
                    case "--activate":
                        // --activate <copy.zip> <serial>: what «إضافة منتج» does (exit 5: refused, the reason printed).
                        {
                            Owned o;
                            string why = Licensing.Activate(File.ReadAllBytes(a[1]), a[2], out o);
                            Out(why ?? ("ok " + o.Id));
                            return why == null ? 0 : 5;
                        }
                    case "--list":
                        foreach (Owned o in Library.All(null)) Out(o.Id + "\t" + o.Title);
                        return 0;
                    case "--run":
                        // --run <licence> <file>: checks the licence, runs the file, waits; exit 6: not allowed.
                        {
                            Owned o = Library.Load(Path.Combine(Library.Root, a[1]));
                            if (o == null) return 6;
                            string why = Licensing.EnsureAllowed(o);
                            if (why != null) { Out(why); return 6; }
                            var files = ZipAes.Read(File.ReadAllBytes(Path.Combine(o.Folder, "package.zip")), o.Serial);
                            ZipEntryData chosen = files.Find(delegate(ZipEntryData f) { return f.Name == a[2]; });
                            if (chosen == null) return 2;
                            var proc = Runner.Start(files, chosen);
                            proc.WaitForExit();
                            System.Threading.Thread.Sleep(800);
                            int left = Directory.Exists(Runner.RunDir) ? Directory.GetDirectories(Runner.RunDir).Length : 0;
                            Out("exit " + proc.ExitCode + " left " + left);
                            return 0;
                        }
                    default:
                        Console.Error.WriteLine("unknown switch");
                        return 2;
                }
            }
            catch (BadSerialException)
            {
                return 3;
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(e.Message);
                return 1;
            }
        }
    }
}
