// Opens the encrypted copy a buyer downloads (WinZip AES-256, "AE-2": the format
// the shop's backend and vault write, see modules/protected/zipAes.ts). The
// password is her serial. Everything stays in memory.
using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;

namespace Estabrek.Launcher
{
    public sealed class ZipEntryData
    {
        public string Name;
        public byte[] Data;
    }

    public sealed class BadSerialException : Exception
    {
        public BadSerialException() : base("BAD_SERIAL") { }
    }

    public static class ZipAes
    {
        public static List<ZipEntryData> Read(byte[] zip, string password)
        {
            var list = new List<ZipEntryData>();
            int p = 0;
            while (p + 30 <= zip.Length && BitConverter.ToUInt32(zip, p) == 0x04034b50)
            {
                int flags = BitConverter.ToUInt16(zip, p + 6);
                int method = BitConverter.ToUInt16(zip, p + 8);
                int size = (int)BitConverter.ToUInt32(zip, p + 18);
                int nameLen = BitConverter.ToUInt16(zip, p + 26);
                int extraLen = BitConverter.ToUInt16(zip, p + 28);
                Encoding names = (flags & 0x800) != 0 ? Encoding.UTF8 : Encoding.GetEncoding(437);
                string name = names.GetString(zip, p + 30, nameLen);
                int extraStart = p + 30 + nameLen;
                int start = extraStart + extraLen;
                if (method != 99) throw new InvalidDataException("NOT_ENCRYPTED");
                int real = RealMethod(zip, extraStart, extraLen);

                byte[] salt = Slice(zip, start, 16);
                byte[] keys;
                using (var kdf = new Rfc2898DeriveBytes(Encoding.UTF8.GetBytes(password), salt, 1000)) keys = kdf.GetBytes(66);
                if (zip[start + 16] != keys[64] || zip[start + 17] != keys[65]) throw new BadSerialException();

                byte[] encrypted = Slice(zip, start + 18, size - 28);
                byte[] auth = Slice(zip, start + size - 10, 10);
                using (var mac = new HMACSHA1(Slice(keys, 32, 32)))
                {
                    byte[] want = mac.ComputeHash(encrypted);
                    for (int i = 0; i < 10; i++) if (want[i] != auth[i]) throw new InvalidDataException("TAMPERED");
                }
                byte[] body = Ctr(Slice(keys, 0, 32), encrypted);
                list.Add(new ZipEntryData { Name = SafeName(name), Data = real == 8 ? Inflate(body) : body });
                p = start + size;
            }
            if (list.Count == 0) throw new InvalidDataException("NOT_A_COPY");
            return list;
        }

        /** Only the file's own name: nothing can be written outside the chosen folder. */
        public static string SafeName(string name)
        {
            string n = (name ?? "").Replace('\\', '/');
            int slash = n.LastIndexOf('/');
            if (slash >= 0) n = n.Substring(slash + 1);
            foreach (char c in Path.GetInvalidFileNameChars()) n = n.Replace(c, '_');
            n = n.TrimStart('.').Trim();
            return n.Length == 0 ? "file" : n;
        }

        static int RealMethod(byte[] zip, int start, int len)
        {
            int q = start;
            while (q + 4 <= start + len)
            {
                int id = BitConverter.ToUInt16(zip, q);
                int sz = BitConverter.ToUInt16(zip, q + 2);
                if (id == 0x9901 && sz >= 7) return BitConverter.ToUInt16(zip, q + 4 + 5);
                q += 4 + sz;
            }
            throw new InvalidDataException("NOT_AES");
        }

        static byte[] Ctr(byte[] key, byte[] data)
        {
            int blocks = (data.Length + 15) / 16;
            byte[] counters = new byte[blocks * 16];
            for (int i = 0; i < blocks; i++)
            {
                byte[] n = BitConverter.GetBytes((long)(i + 1));
                Buffer.BlockCopy(n, 0, counters, i * 16, 8);
            }
            byte[] stream = new byte[counters.Length];
            using (var aes = new AesManaged())
            {
                aes.Mode = CipherMode.ECB;
                aes.Padding = PaddingMode.None;
                aes.Key = key;
                using (var enc = aes.CreateEncryptor()) enc.TransformBlock(counters, 0, counters.Length, stream, 0);
            }
            byte[] outp = new byte[data.Length];
            for (int i = 0; i < data.Length; i++) outp[i] = (byte)(data[i] ^ stream[i]);
            return outp;
        }

        static byte[] Inflate(byte[] raw)
        {
            using (var input = new MemoryStream(raw))
            using (var z = new DeflateStream(input, CompressionMode.Decompress))
            using (var outp = new MemoryStream())
            {
                z.CopyTo(outp);
                return outp.ToArray();
            }
        }

        static byte[] Slice(byte[] b, int start, int len)
        {
            byte[] r = new byte[len];
            Buffer.BlockCopy(b, start, r, 0, len);
            return r;
        }
    }
}
