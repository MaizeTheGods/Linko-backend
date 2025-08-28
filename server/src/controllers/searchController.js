import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/search/users?q=...&limit=...
export const searchUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q.length === 0) return res.json([]);

    const limitRaw = parseInt(req.query.limit ?? '8', 10);
    const take = Math.min(Math.max(1, isNaN(limitRaw) ? 8 : limitRaw), 25);

    const users = await prisma.usuario.findMany({
      where: {
        OR: [
          { nombre_usuario: { contains: q, mode: 'insensitive' } },
          { nombre_perfil: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id_usuario: true,
        nombre_usuario: true,
        nombre_perfil: true,
        foto_perfil_url: true,
      },
      orderBy: { nombre_usuario: 'asc' },
      take,
    });

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar usuarios', details: error.message });
  }
};

// GET /api/search/posts?q=...&limit=...
export const searchPosts = async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    if (q.length === 0) return res.json([]);

    const limitRaw = parseInt(req.query.limit ?? '12', 10);
    const take = Math.min(Math.max(1, isNaN(limitRaw) ? 12 : limitRaw), 50);

    const posts = await prisma.publicacion.findMany({
      where: {
        OR: [
          { texto_contenido: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nombre_usuario: true,
            nombre_perfil: true,
            foto_perfil_url: true,
          },
        },
        archivos: true,
        _count: { select: { me_gusta: true, comentarios: true } },
      },
      orderBy: { fecha_creacion: 'desc' },
      take,
    });

    return res.json(posts);
  } catch (error) {
    return res.status(500).json({ message: 'Error al buscar publicaciones', details: error.message });
  }
};
