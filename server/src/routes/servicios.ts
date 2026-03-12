import { Router, Request, Response } from 'express';
import prisma from '../prismaClient';

const router = Router();

// GET /api/servicios
router.get('/', async (_req: Request, res: Response) => {
    try {
        const servicios = await prisma.servicios.findMany({
            where: {
                NOT: {
                    estado: 'eliminado'
                }
            }
        });
        res.json(servicios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener servicios' });
    }
});

// GET /api/servicios/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id_servicio = parseInt(req.params.id as string);
        const servicio = await prisma.servicios.findUnique({
            where: { id_servicio }
        });
        if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
        res.json(servicio);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el servicio' });
    }
});

// POST /api/servicios
router.post('/', async (req: Request, res: Response) => {
    try {
        const { nombre_servicio, precio, descripcion, estado } = req.body;
        if (!nombre_servicio) return res.status(400).json({ error: 'El nombre del servicio es obligatorio' });

        const nuevoServicio = await prisma.servicios.create({
            data: {
                nombre_servicio,
                precio: precio ? parseFloat(precio) : undefined,
                descripcion,
                estado: estado || 'activo'
            }
        });
        res.status(201).json(nuevoServicio);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el servicio' });
    }
});

// PUT /api/servicios/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id_servicio = parseInt(req.params.id as string);
        const { nombre_servicio, precio, descripcion, estado } = req.body;

        const actualizado = await prisma.servicios.update({
            where: { id_servicio },
            data: {
                nombre_servicio,
                precio: precio ? parseFloat(precio) : undefined,
                descripcion,
                estado
            }
        });
        res.json(actualizado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el servicio' });
    }
});

// DELETE /api/servicios/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id_servicio = parseInt(req.params.id as string);
        await prisma.servicios.update({
            where: { id_servicio },
            data: { estado: 'eliminado' }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el servicio' });
    }
});

export default router;
