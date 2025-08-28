-- CreateEnum
CREATE TYPE "public"."FollowStatus" AS ENUM ('PENDIENTE', 'ACEPTADO');

-- AlterTable
ALTER TABLE "public"."Seguidor" ADD COLUMN     "estado" "public"."FollowStatus" NOT NULL DEFAULT 'ACEPTADO';

-- AlterTable
ALTER TABLE "public"."Usuario" ADD COLUMN     "correo_pendiente" TEXT,
ADD COLUMN     "perfil_privado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "token_cambio_correo" TEXT,
ADD COLUMN     "token_cambio_correo_expira" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."PublicacionEtiqueta" (
    "id_publicacion" INTEGER NOT NULL,
    "id_usuario_etiquetado" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicacionEtiqueta_pkey" PRIMARY KEY ("id_publicacion","id_usuario_etiquetado")
);

-- CreateTable
CREATE TABLE "public"."Encuesta" (
    "id_encuesta" SERIAL NOT NULL,
    "pregunta" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_publicacion" INTEGER NOT NULL,

    CONSTRAINT "Encuesta_pkey" PRIMARY KEY ("id_encuesta")
);

-- CreateTable
CREATE TABLE "public"."OpcionEncuesta" (
    "id_opcion" SERIAL NOT NULL,
    "id_encuesta" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpcionEncuesta_pkey" PRIMARY KEY ("id_opcion")
);

-- CreateTable
CREATE TABLE "public"."VotoEncuesta" (
    "id_encuesta" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_opcion" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotoEncuesta_pkey" PRIMARY KEY ("id_encuesta","id_usuario")
);

-- CreateTable
CREATE TABLE "public"."Guardado" (
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_publicacion" INTEGER NOT NULL,

    CONSTRAINT "Guardado_pkey" PRIMARY KEY ("id_usuario","id_publicacion")
);

-- CreateIndex
CREATE UNIQUE INDEX "Encuesta_id_publicacion_key" ON "public"."Encuesta"("id_publicacion");

-- AddForeignKey
ALTER TABLE "public"."PublicacionEtiqueta" ADD CONSTRAINT "PublicacionEtiqueta_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PublicacionEtiqueta" ADD CONSTRAINT "PublicacionEtiqueta_id_usuario_etiquetado_fkey" FOREIGN KEY ("id_usuario_etiquetado") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Encuesta" ADD CONSTRAINT "Encuesta_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OpcionEncuesta" ADD CONSTRAINT "OpcionEncuesta_id_encuesta_fkey" FOREIGN KEY ("id_encuesta") REFERENCES "public"."Encuesta"("id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VotoEncuesta" ADD CONSTRAINT "VotoEncuesta_id_encuesta_fkey" FOREIGN KEY ("id_encuesta") REFERENCES "public"."Encuesta"("id_encuesta") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VotoEncuesta" ADD CONSTRAINT "VotoEncuesta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VotoEncuesta" ADD CONSTRAINT "VotoEncuesta_id_opcion_fkey" FOREIGN KEY ("id_opcion") REFERENCES "public"."OpcionEncuesta"("id_opcion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guardado" ADD CONSTRAINT "Guardado_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guardado" ADD CONSTRAINT "Guardado_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;
