-- CreateTable
CREATE TABLE "public"."Bloqueo" (
    "id_bloqueador" INTEGER NOT NULL,
    "id_bloqueado" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bloqueo_pkey" PRIMARY KEY ("id_bloqueador","id_bloqueado")
);

-- AddForeignKey
ALTER TABLE "public"."Bloqueo" ADD CONSTRAINT "Bloqueo_id_bloqueador_fkey" FOREIGN KEY ("id_bloqueador") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Bloqueo" ADD CONSTRAINT "Bloqueo_id_bloqueado_fkey" FOREIGN KEY ("id_bloqueado") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
