-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id_usuario" SERIAL NOT NULL,
    "correo_electronico" TEXT NOT NULL,
    "nombre_usuario" TEXT NOT NULL,
    "nombre_perfil" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "biografia" TEXT,
    "foto_perfil_url" TEXT,
    "foto_portada_url" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "public"."Publicacion" (
    "id_publicacion" SERIAL NOT NULL,
    "texto_contenido" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id_publicacion")
);

-- CreateTable
CREATE TABLE "public"."ArchivoPublicacion" (
    "id_archivo" SERIAL NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "tipo_archivo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "id_publicacion" INTEGER NOT NULL,

    CONSTRAINT "ArchivoPublicacion_pkey" PRIMARY KEY ("id_archivo")
);

-- CreateTable
CREATE TABLE "public"."Comentario" (
    "id_comentario" SERIAL NOT NULL,
    "texto_comentario" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_publicacion" INTEGER NOT NULL,
    "id_comentario_padre" INTEGER,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id_comentario")
);

-- CreateTable
CREATE TABLE "public"."MeGusta" (
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_publicacion" INTEGER NOT NULL,

    CONSTRAINT "MeGusta_pkey" PRIMARY KEY ("id_usuario","id_publicacion")
);

-- CreateTable
CREATE TABLE "public"."MeGustaComentario" (
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_comentario" INTEGER NOT NULL,

    CONSTRAINT "MeGustaComentario_pkey" PRIMARY KEY ("id_usuario","id_comentario")
);

-- CreateTable
CREATE TABLE "public"."Seguidor" (
    "id_seguidor" INTEGER NOT NULL,
    "id_seguido" INTEGER NOT NULL,

    CONSTRAINT "Seguidor_pkey" PRIMARY KEY ("id_seguidor","id_seguido")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_electronico_key" ON "public"."Usuario"("correo_electronico");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nombre_usuario_key" ON "public"."Usuario"("nombre_usuario");

-- AddForeignKey
ALTER TABLE "public"."Publicacion" ADD CONSTRAINT "Publicacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ArchivoPublicacion" ADD CONSTRAINT "ArchivoPublicacion_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comentario" ADD CONSTRAINT "Comentario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comentario" ADD CONSTRAINT "Comentario_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Comentario" ADD CONSTRAINT "Comentario_id_comentario_padre_fkey" FOREIGN KEY ("id_comentario_padre") REFERENCES "public"."Comentario"("id_comentario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."MeGusta" ADD CONSTRAINT "MeGusta_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeGusta" ADD CONSTRAINT "MeGusta_id_publicacion_fkey" FOREIGN KEY ("id_publicacion") REFERENCES "public"."Publicacion"("id_publicacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeGustaComentario" ADD CONSTRAINT "MeGustaComentario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeGustaComentario" ADD CONSTRAINT "MeGustaComentario_id_comentario_fkey" FOREIGN KEY ("id_comentario") REFERENCES "public"."Comentario"("id_comentario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seguidor" ADD CONSTRAINT "Seguidor_id_seguidor_fkey" FOREIGN KEY ("id_seguidor") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seguidor" ADD CONSTRAINT "Seguidor_id_seguido_fkey" FOREIGN KEY ("id_seguido") REFERENCES "public"."Usuario"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
