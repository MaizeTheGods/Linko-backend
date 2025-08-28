-- CreateTable
CREATE TABLE "public"."Conversacion" (
    "id_conversacion" SERIAL NOT NULL,
    "id_usuario1" INTEGER NOT NULL,
    "id_usuario2" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultima_actividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id_conversacion")
);

-- CreateTable
CREATE TABLE "public"."Mensaje" (
    "id_mensaje" SERIAL NOT NULL,
    "id_conversacion" INTEGER NOT NULL,
    "id_remitente" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id_mensaje")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversacion_id_usuario1_id_usuario2_key" ON "public"."Conversacion"("id_usuario1", "id_usuario2");

-- AddForeignKey
ALTER TABLE "public"."Conversacion" ADD CONSTRAINT "Conversacion_id_usuario1_fkey" FOREIGN KEY ("id_usuario1") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversacion" ADD CONSTRAINT "Conversacion_id_usuario2_fkey" FOREIGN KEY ("id_usuario2") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mensaje" ADD CONSTRAINT "Mensaje_id_conversacion_fkey" FOREIGN KEY ("id_conversacion") REFERENCES "public"."Conversacion"("id_conversacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mensaje" ADD CONSTRAINT "Mensaje_id_remitente_fkey" FOREIGN KEY ("id_remitente") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
