-- CreateTable
CREATE TABLE "ChatbotEntry" (
    "id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'ar',
    "title" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatbotConversation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'storefront',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "messages" JSONB NOT NULL,
    "lastMessage" TEXT,
    "lastRole" TEXT,
    "lastAt" TIMESTAMP(3),
    "pageUrl" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatbotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatbotEntry_locale_isEnabled_priority_idx" ON "ChatbotEntry"("locale", "isEnabled", "priority");

-- CreateIndex
CREATE INDEX "ChatbotConversation_createdAt_idx" ON "ChatbotConversation"("createdAt");

-- CreateIndex
CREATE INDEX "ChatbotConversation_sessionId_idx" ON "ChatbotConversation"("sessionId");

-- CreateIndex
CREATE INDEX "ChatbotConversation_userId_idx" ON "ChatbotConversation"("userId");

-- AddForeignKey
ALTER TABLE "ChatbotConversation" ADD CONSTRAINT "ChatbotConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

