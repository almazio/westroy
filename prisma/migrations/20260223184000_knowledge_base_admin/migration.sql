-- CreateEnum
CREATE TYPE "KnowledgeItemType" AS ENUM ('standard', 'snippet', 'calculation', 'measurement', 'hack');

-- CreateEnum
CREATE TYPE "KnowledgeItemStatus" AS ENUM ('draft', 'reviewed', 'published', 'archived');

-- CreateEnum
CREATE TYPE "KnowledgeSourceType" AS ENUM ('standard', 'law', 'article', 'vendor', 'internal');

-- CreateTable
CREATE TABLE "KnowledgeBaseItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'kz',
    "type" "KnowledgeItemType" NOT NULL,
    "status" "KnowledgeItemStatus" NOT NULL DEFAULT 'draft',
    "topic" TEXT,
    "summary" TEXT,
    "contentMd" TEXT NOT NULL,
    "formula" TEXT,
    "inputSchemaJson" TEXT,
    "outputSchemaJson" TEXT,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "regionCode" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "verificationNote" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "KnowledgeSourceType" NOT NULL DEFAULT 'standard',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publisher" TEXT,
    "publishedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseItem_slug_key" ON "KnowledgeBaseItem"("slug");

-- AddForeignKey
ALTER TABLE "KnowledgeBaseItem" ADD CONSTRAINT "KnowledgeBaseItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseItem" ADD CONSTRAINT "KnowledgeBaseItem_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeSource" ADD CONSTRAINT "KnowledgeSource_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "KnowledgeBaseItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
