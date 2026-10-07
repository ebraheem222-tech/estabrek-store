-- «سؤال وجواب» (2026-10-18): a questions quiz that can win a one-time coupon
-- (counter 1, 3, 7, 15… or a halving chance; reset each period), plus coupons
-- bound to one phone. Starter questions come unapproved: the owner reviews them.
-- Guarded, safe to run again.

ALTER TABLE "Coupon" ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE TABLE IF NOT EXISTS "QuizQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "answer" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT NOT NULL DEFAULT 'general',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "QuizQuestion_approved_active_level_idx" ON "QuizQuestion"("approved", "active", "level");

CREATE TABLE IF NOT EXISTS "QuizDevice" (
    "period" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "chance" BOOLEAN NOT NULL DEFAULT false,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizDevice_pkey" PRIMARY KEY ("period", "device")
);
CREATE INDEX IF NOT EXISTS "QuizDevice_period_seq_idx" ON "QuizDevice"("period", "seq");

CREATE TABLE IF NOT EXISTS "QuizAttempt" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "questionIds" JSONB NOT NULL,
    "correct" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuizAttempt_token_key" ON "QuizAttempt"("token");
CREATE INDEX IF NOT EXISTS "QuizAttempt_period_idx" ON "QuizAttempt"("period");

CREATE TABLE IF NOT EXISTS "QuizWin" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "couponId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizWin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuizWin_period_phone_key" ON "QuizWin"("period", "phone");
CREATE INDEX IF NOT EXISTS "QuizWin_period_idx" ON "QuizWin"("period");
CREATE INDEX IF NOT EXISTS "QuizWin_createdAt_idx" ON "QuizWin"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuizWin_couponId_fkey') THEN
    ALTER TABLE "QuizWin" ADD CONSTRAINT "QuizWin_couponId_fkey"
      FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Starter questions (Quran, seerah, manners; easy → hard). Not asked until approved in the admin.
INSERT INTO "QuizQuestion" ("id", "text", "choices", "answer", "level", "topic", "approved", "active", "updatedAt") VALUES
  ('qzseed01', 'كم عدد سور القرآن الكريم؟', '["110", "114", "120", "99"]'::jsonb, 1, 1, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed02', 'ما هي أول سورة في المصحف؟', '["البقرة", "الإخلاص", "الفاتحة", "الناس"]'::jsonb, 2, 1, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed03', 'ما هي أطول سورة في القرآن الكريم؟', '["البقرة", "آل عمران", "النساء", "الكهف"]'::jsonb, 0, 1, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed04', 'كم عدد أجزاء القرآن الكريم؟', '["20", "60", "114", "30"]'::jsonb, 3, 1, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed05', 'في أي شهر نزل القرآن الكريم؟', '["شعبان", "رمضان", "رجب", "محرّم"]'::jsonb, 1, 1, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed06', 'كم عدد الصلوات المفروضة في اليوم والليلة؟', '["خمس", "ثلاث", "أربع", "ست"]'::jsonb, 0, 1, 'worship', false, true, CURRENT_TIMESTAMP),
  ('qzseed07', 'في أي مدينة وُلد النبي ﷺ؟', '["المدينة المنورة", "الطائف", "مكة المكرمة", "القدس"]'::jsonb, 2, 1, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed08', 'ماذا نقول عند البدء بالطعام؟', '["الحمد لله", "بسم الله", "سبحان الله", "الله أكبر"]'::jsonb, 1, 1, 'manners', false, true, CURRENT_TIMESTAMP),
  ('qzseed09', 'ماذا يقول المسلم إذا عطس؟', '["الحمد لله", "بسم الله", "أستغفر الله", "لا إله إلا الله"]'::jsonb, 0, 1, 'manners', false, true, CURRENT_TIMESTAMP),
  ('qzseed10', 'كم عدد أركان الإسلام؟', '["أربعة", "ستة", "خمسة", "سبعة"]'::jsonb, 2, 1, 'worship', false, true, CURRENT_TIMESTAMP),
  ('qzseed11', 'ما اسم والدة النبي ﷺ؟', '["حليمة السعدية", "آمنة بنت وهب", "خديجة بنت خويلد", "فاطمة بنت أسد"]'::jsonb, 1, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed12', 'من هي أولى زوجات النبي ﷺ؟', '["عائشة بنت أبي بكر", "حفصة بنت عمر", "سودة بنت زمعة", "خديجة بنت خويلد"]'::jsonb, 3, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed13', 'من هو أول الخلفاء الراشدين؟', '["أبو بكر الصديق", "عمر بن الخطاب", "عثمان بن عفان", "علي بن أبي طالب"]'::jsonb, 0, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed14', 'في أي غار نزل الوحي على النبي ﷺ أول مرة؟', '["غار ثور", "غار حراء", "جبل أُحد", "جبل عرفات"]'::jsonb, 1, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed15', 'ما أول كلمة نزلت من القرآن الكريم؟', '["الحمد", "قل", "اقرأ", "يا أيها"]'::jsonb, 2, 2, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed16', 'إلى أي مدينة هاجر النبي ﷺ من مكة؟', '["المدينة المنورة (يثرب)", "الطائف", "الحبشة", "القدس"]'::jsonb, 0, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed17', 'من الصحابي الذي رافق النبي ﷺ في الهجرة؟', '["عمر بن الخطاب", "علي بن أبي طالب", "أبو بكر الصديق", "عثمان بن عفان"]'::jsonb, 2, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed18', 'ما السورة التي لا تبدأ بالبسملة؟', '["الأنفال", "التوبة", "النمل", "يس"]'::jsonb, 1, 2, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed19', 'من الصحابي الملقّب بـ«الفاروق»؟', '["خالد بن الوليد", "أبو بكر الصديق", "عثمان بن عفان", "عمر بن الخطاب"]'::jsonb, 3, 2, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed20', 'بماذا أوصى النبي ﷺ الرجل الذي قال له: «أوصني»؟', '["لا تغضب", "أكثِر من السفر", "لا تتكلم", "نَم مبكراً"]'::jsonb, 0, 2, 'manners', false, true, CURRENT_TIMESTAMP),
  ('qzseed21', 'ما معنى «الإيثار»؟', '["أن تقدّم غيرك على نفسك", "أن تفضّل نفسك على غيرك", "أن تُكثر الكلام", "أن تعتزل الناس"]'::jsonb, 0, 2, 'manners', false, true, CURRENT_TIMESTAMP),
  ('qzseed22', 'في أي سورة ذُكرت البسملة مرتين؟', '["النمل", "الفاتحة", "البقرة", "هود"]'::jsonb, 0, 3, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed23', 'ما السورة التي تعدل ثلث القرآن؟', '["الفاتحة", "الإخلاص", "الكافرون", "الملك"]'::jsonb, 1, 3, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed24', 'ما أول مسجد بناه النبي ﷺ بعد الهجرة؟', '["المسجد النبوي", "مسجد قُباء", "مسجد القبلتين", "المسجد الأقصى"]'::jsonb, 1, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed25', 'في أي سنة هجرية كانت غزوة بدر الكبرى؟', '["الأولى", "الثانية", "الثالثة", "الخامسة"]'::jsonb, 1, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed26', 'من الصحابي الملقّب بـ«ذي النورين»؟', '["علي بن أبي طالب", "عمر بن الخطاب", "عثمان بن عفان", "الزبير بن العوام"]'::jsonb, 2, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed27', 'ما اسم المرأة الوحيدة التي ذُكر اسمها صراحةً في القرآن الكريم؟', '["آسيا", "حواء", "خديجة", "مريم"]'::jsonb, 3, 3, 'quran', false, true, CURRENT_TIMESTAMP),
  ('qzseed28', 'كم كان عمر النبي ﷺ حين نزل عليه الوحي؟', '["أربعون سنة", "خمس وعشرون سنة", "ثلاثون سنة", "ثلاث وخمسون سنة"]'::jsonb, 0, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed29', 'ما اسم الصلح الذي عُقد بين المسلمين وقريش سنة 6 هـ؟', '["فتح مكة", "صلح الحديبية", "بيعة العقبة", "حلف الفضول"]'::jsonb, 1, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed30', 'في أي غزوة أشار سلمان الفارسي بحفر الخندق؟', '["بدر", "أُحد", "الأحزاب", "تبوك"]'::jsonb, 2, 3, 'seerah', false, true, CURRENT_TIMESTAMP),
  ('qzseed31', 'ما اسم مرضعة النبي ﷺ في بادية بني سعد؟', '["أم أيمن", "آمنة بنت وهب", "خديجة بنت خويلد", "حليمة السعدية"]'::jsonb, 3, 3, 'seerah', false, true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
