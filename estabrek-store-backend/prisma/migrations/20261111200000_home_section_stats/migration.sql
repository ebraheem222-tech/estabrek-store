-- The home page's sections in numbers (lib/homeStats.ts).
CREATE TABLE "HomeSectionDay" (
    "day" DATE NOT NULL,
    "section" TEXT NOT NULL,
    "seen" INTEGER NOT NULL DEFAULT 0,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "bags" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HomeSectionDay_pkey" PRIMARY KEY ("day","section")
);
