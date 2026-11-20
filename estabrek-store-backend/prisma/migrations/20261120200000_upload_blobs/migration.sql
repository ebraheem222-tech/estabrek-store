-- Pictures uploaded from the admin, kept in the database when the store has no Cloudinary account: the server's disk
-- (uploads/) is wiped at every deploy on Railway, so /uploads/<path> is answered from here (src/lib/uploadBlobs.ts).
-- CreateTable
CREATE TABLE "UploadBlob" (
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadBlob_pkey" PRIMARY KEY ("path")
);
