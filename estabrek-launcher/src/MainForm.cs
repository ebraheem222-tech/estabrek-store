// The launcher's window (Arabic, right to left): her products on this PC, their
// files, and what she can do with each (run it, or save it to a folder).
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

namespace Estabrek.Launcher
{
    public sealed class MainForm : Form
    {
        readonly ListBox products = new ListBox();
        readonly ListView files = new ListView();
        readonly Button add = new Button();
        readonly Button run = new Button();
        readonly Button save = new Button();
        readonly Button saveAll = new Button();
        readonly Button remove = new Button();
        readonly Label status = new Label();
        List<Owned> owned = new List<Owned>();
        List<ZipEntryData> open = new List<ZipEntryData>();

        public MainForm()
        {
            Text = "استبرق — برنامج التشغيل " + Config.Version;
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;
            Font = new Font("Segoe UI", 10f);
            ClientSize = new Size(820, 520);
            MinimumSize = new Size(640, 420);
            StartPosition = FormStartPosition.CenterScreen;

            var top = new FlowLayoutPanel { Dock = DockStyle.Top, Height = 48, Padding = new Padding(8), FlowDirection = FlowDirection.RightToLeft };
            add.Text = "+ إضافة منتج";
            add.AutoSize = true;
            add.Click += delegate { AddProduct(); };
            var title = new Label { Text = "منتجاتكِ على هالجهاز", AutoSize = true, Padding = new Padding(0, 6, 12, 0), Font = new Font("Segoe UI", 11f, FontStyle.Bold) };
            top.Controls.Add(title);
            top.Controls.Add(add);

            products.Dock = DockStyle.Right;
            products.Width = 260;
            products.SelectedIndexChanged += delegate { ShowFiles(); };

            files.Dock = DockStyle.Fill;
            files.View = View.Details;
            files.FullRowSelect = true;
            files.MultiSelect = false;
            files.Columns.Add("الملف", 320);
            files.Columns.Add("شو بتعملي فيه", 220);
            files.DoubleClick += delegate { RunSelected(); };

            var actions = new FlowLayoutPanel { Dock = DockStyle.Bottom, Height = 48, Padding = new Padding(8), FlowDirection = FlowDirection.RightToLeft };
            run.Text = "تشغيل";
            save.Text = "حفظ بمجلد…";
            saveAll.Text = "حفظ الكل…";
            remove.Text = "إزالة من الجهاز";
            foreach (Button b in new[] { run, save, saveAll, remove }) { b.AutoSize = true; actions.Controls.Add(b); }
            run.Click += delegate { RunSelected(); };
            save.Click += delegate { SaveSelected(false); };
            saveAll.Click += delegate { SaveSelected(true); };
            remove.Click += delegate { RemoveSelected(); };

            status.Dock = DockStyle.Bottom;
            status.Height = 44;
            status.Padding = new Padding(8, 4, 8, 4);
            status.ForeColor = Color.DimGray;

            Controls.Add(files);
            Controls.Add(products);
            Controls.Add(actions);
            Controls.Add(status);
            Controls.Add(top);
            Load += delegate { Reload(); };
        }

        void Reload()
        {
            var unreadable = new List<string>();
            owned = Library.All(unreadable);
            products.Items.Clear();
            foreach (Owned o in owned) products.Items.Add(o.Title);
            if (owned.Count > 0) products.SelectedIndex = 0;
            else ShowFiles();
            status.Text = owned.Count == 0
                ? "ما في منتجات بعد. اضغطي «إضافة منتج» واختاري الملف المشفّر اللي نزّلتيه من صفحة طلبك، والصقي السيريال."
                : unreadable.Count > 0 ? "في منتجات انضافت من حساب ويندوز ثاني أو جهاز ثاني: لازم تنضاف من جديد هون." : "";
        }

        Owned Current
        {
            get { return products.SelectedIndex >= 0 && products.SelectedIndex < owned.Count ? owned[products.SelectedIndex] : null; }
        }

        void ShowFiles()
        {
            files.Items.Clear();
            open = new List<ZipEntryData>();
            Owned o = Current;
            bool has = o != null;
            foreach (Button b in new[] { run, save, saveAll, remove }) b.Enabled = has;
            if (!has) return;
            try
            {
                open = ZipAes.Read(File.ReadAllBytes(Path.Combine(o.Folder, "package.zip")), o.Serial);
            }
            catch (Exception)
            {
                status.Text = "ما قدرنا نفتح النسخة. جرّبي تزيليها وتضيفيها من جديد.";
                return;
            }
            foreach (ZipEntryData f in open)
            {
                string kind = Runner.Kind(f.Name);
                string how = kind == null ? "حفظ بمجلد" : Runner.Interpreter(kind) == null ? "تشغيل (بدّه " + Needs(kind) + ")" : "تشغيل";
                var item = new ListViewItem(new[] { f.Name, how });
                files.Items.Add(item);
            }
            status.Text = "مفعّل على هالجهاز · " + o.Title;
        }

        static string Needs(string kind)
        {
            switch (kind)
            {
                case "python": return "Python";
                case "node": return "Node.js";
                case "autohotkey": return "AutoHotkey";
                case "lua": return "Lua";
                default: return kind;
            }
        }

        ZipEntryData SelectedFile
        {
            get { return files.SelectedIndices.Count == 1 ? open[files.SelectedIndices[0]] : null; }
        }

        bool Allowed(Owned o)
        {
            string why = Licensing.EnsureAllowed(o);
            if (why == null) return true;
            MessageBox.Show(this, why, "استبرق", MessageBoxButtons.OK, MessageBoxIcon.Warning, MessageBoxDefaultButton.Button1, MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign);
            return false;
        }

        void RunSelected()
        {
            Owned o = Current;
            ZipEntryData f = SelectedFile;
            if (o == null || f == null) { status.Text = "اختاري ملف من القائمة."; return; }
            if (Runner.Kind(f.Name) == null) { SaveSelected(false); return; }
            if (!Allowed(o)) return;
            try
            {
                Runner.Start(open, f);
                status.Text = "اشتغل «" + f.Name + "». الملفات بتنمسح من الجهاز لما يسكّر.";
            }
            catch (Exception e)
            {
                status.Text = e.Message.StartsWith("NO_INTERPRETER") ? "لتشغيل هالملف لازم يكون " + Needs(Runner.Kind(f.Name)) + " منزّل على الجهاز." : "ما اشتغل: " + e.Message;
            }
        }

        void SaveSelected(bool all)
        {
            Owned o = Current;
            if (o == null) return;
            ZipEntryData f = SelectedFile;
            if (!all && f == null) { status.Text = "اختاري ملف من القائمة."; return; }
            if (!Allowed(o)) return;
            using (var dlg = new FolderBrowserDialog { Description = "وين بدك تحفظي؟" })
            {
                if (dlg.ShowDialog(this) != DialogResult.OK) return;
                Runner.Export(all ? open : new List<ZipEntryData> { f }, dlg.SelectedPath);
                status.Text = "انحفظ بـ " + dlg.SelectedPath + ". النسخة فيها علامة طلبك: لا تشاركيها.";
            }
        }

        void RemoveSelected()
        {
            Owned o = Current;
            if (o == null) return;
            if (MessageBox.Show(this, "إزالة «" + o.Title + "» من هالجهاز؟ بتقدري تضيفيه من جديد بالملف والسيريال.", "استبرق", MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button2, MessageBoxOptions.RtlReading | MessageBoxOptions.RightAlign) != DialogResult.Yes) return;
            Library.Remove(o);
            Reload();
        }

        void AddProduct()
        {
            using (var f = new AddForm())
            {
                if (f.ShowDialog(this) == DialogResult.OK) Reload();
            }
        }
    }

    /** Pick the encrypted copy, paste the serial, activate. */
    sealed class AddForm : Form
    {
        readonly TextBox path = new TextBox();
        readonly TextBox serial = new TextBox();
        readonly Label message = new Label();

        public AddForm()
        {
            Text = "إضافة منتج";
            RightToLeft = RightToLeft.Yes;
            RightToLeftLayout = true;
            Font = new Font("Segoe UI", 10f);
            ClientSize = new Size(520, 240);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            StartPosition = FormStartPosition.CenterParent;

            var grid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 3, RowCount = 4, Padding = new Padding(12) };
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
            grid.Controls.Add(new Label { Text = "الملف المشفّر:", AutoSize = true, Anchor = AnchorStyles.Right }, 0, 0);
            path.Dock = DockStyle.Fill;
            path.RightToLeft = RightToLeft.No;
            grid.Controls.Add(path, 1, 0);
            var pick = new Button { Text = "اختاري…", AutoSize = true };
            pick.Click += delegate
            {
                using (var d = new OpenFileDialog { Filter = "النسخة المشفّرة (*.zip)|*.zip", Title = "الملف اللي نزّلتيه من صفحة الطلب" })
                    if (d.ShowDialog(this) == DialogResult.OK) path.Text = d.FileName;
            };
            grid.Controls.Add(pick, 2, 0);
            grid.Controls.Add(new Label { Text = "السيريال:", AutoSize = true, Anchor = AnchorStyles.Right }, 0, 1);
            serial.Dock = DockStyle.Fill;
            serial.RightToLeft = RightToLeft.No;
            serial.Font = new Font("Consolas", 11f);
            grid.Controls.Add(serial, 1, 1);
            grid.SetColumnSpan(serial, 2);
            message.Dock = DockStyle.Fill;
            message.ForeColor = Color.Firebrick;
            grid.Controls.Add(message, 0, 2);
            grid.SetColumnSpan(message, 3);
            var go = new Button { Text = "تفعيل على هالجهاز", AutoSize = true };
            go.Click += delegate { ActivateCopy(); };
            grid.Controls.Add(go, 0, 3);
            grid.SetColumnSpan(go, 3);
            AcceptButton = go;
            Controls.Add(grid);
        }

        void ActivateCopy()
        {
            if (!File.Exists(path.Text)) { message.Text = "اختاري الملف اللي نزّلتيه."; return; }
            if (serial.Text.Trim().Length < 10) { message.Text = "الصقي السيريال من صفحة طلبك."; return; }
            Cursor = Cursors.WaitCursor;
            Owned o;
            string why = Licensing.Activate(File.ReadAllBytes(path.Text), serial.Text, out o);
            Cursor = Cursors.Default;
            if (why != null) { message.Text = why; return; }
            DialogResult = DialogResult.OK;
            Close();
        }
    }
}
