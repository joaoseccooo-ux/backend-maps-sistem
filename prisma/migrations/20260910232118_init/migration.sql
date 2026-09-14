-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'CONTATADO', 'RESPONDEU', 'NEGOCIANDO', 'FECHADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('NAO_BUSCADO', 'BUSCANDO', 'ENCONTRADO', 'NAO_ENCONTRADO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WHATSAPP', 'EMAIL', 'TELEFONE', 'OUTRO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "endereco" TEXT NOT NULL DEFAULT '',
    "telefone" TEXT NOT NULL DEFAULT '',
    "site" TEXT NOT NULL DEFAULT '',
    "googleMapsUrl" TEXT NOT NULL DEFAULT '',
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "cidade" TEXT NOT NULL DEFAULT '',
    "estado" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL DEFAULT '',
    "rating" DOUBLE PRECISION,
    "totalAvaliacoes" INTEGER,
    "temSite" BOOLEAN NOT NULL DEFAULT false,
    "temWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'NAO_BUSCADO',
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "favorito" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT NOT NULL DEFAULT '',
    "contatadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_osmId_key" ON "Lead"("osmId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_cidade_idx" ON "Lead"("cidade");

-- CreateIndex
CREATE INDEX "Lead_categoria_idx" ON "Lead"("categoria");

-- CreateIndex
CREATE INDEX "Lead_temSite_idx" ON "Lead"("temSite");

-- CreateIndex
CREATE INDEX "Lead_temWhatsApp_idx" ON "Lead"("temWhatsApp");

-- CreateIndex
CREATE INDEX "Interaction_leadId_idx" ON "Interaction"("leadId");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
