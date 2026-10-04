async function uploadToCloudinary(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", "estabrek_unsigned");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dpnzrmmxx/image/upload",
    {
      method: "POST",
      body: form,
    }
  );

  const data = await res.json();
  return data.secure_url; // هذا اللي تخزّنه بالـ DB
}
