import { Router, Request, Response } from 'express';
import prisma from '../../prismaClient';
import { sendResetCodeEmail, sendWelcomeEmail } from '../../services/mail.service';
import bcrypt from 'bcryptjs';


const router = Router();

// GET /api/usuarios
router.get('/', async (_req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: { rol: true } // Return role info too for the UI table
        });
        res.json(usuarios);
    } catch (error) {
        console.error('[USUARIOS] GET ERROR:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// GET /api/usuarios/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id_usuario = parseInt(req.params.id as string);
        const usuario = await prisma.usuario.findUnique({
            where: { id_usuario },
            include: { rol: true }
        });
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (error) {
        console.error('[USUARIOS] GET BY ID ERROR:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
});

// POST /api/usuarios
router.post('/', async (req: Request, res: Response) => {
    try {
        const {
            nombre_usuario, contrasena, correo, cedula, tipo_documento,
            id_rol, nombre_rol, nombre_completo, grupo_usuario,
            permisos_especificos, pregunta_seguridad,
            respuesta_seguridad, estado, activo
        } = req.body;

        if (!nombre_usuario || !contrasena || (!id_rol && !nombre_rol)) {
            return res.status(400).json({ error: 'Nombre de usuario, contraseña y rol son obligatorios' });
        }

        // Validate duplicates
        if (correo) {
            const dupCorreo = await prisma.usuario.findUnique({ where: { correo } });
            if (dupCorreo) return res.status(400).json({ error: 'Ya existe un usuario con ese correo' });
        }

        if (cedula) {
            const dupCedula = await prisma.usuario.findUnique({ where: { cedula } });
            if (dupCedula) return res.status(400).json({ error: 'Ya existe un usuario con esa cédula' });
        }

        let rolIdToUse = id_rol ? parseInt(id_rol.toString()) : null;

        if (nombre_rol && !id_rol) {
            let rolDb = await prisma.roles.findFirst({
                where: { nombre_rol: nombre_rol }
            });
            if (!rolDb) {
                rolDb = await prisma.roles.create({ data: { nombre_rol: nombre_rol } });
            }
            rolIdToUse = rolDb.id_rol;
        }

        const hashedPassword = await bcrypt.hash(contrasena, 10);
        let clienteIdToLink = null;
        let empleadoIdToLink = null;

        const roleLower = (nombre_rol || '').toLowerCase();
        const telefono = req.body.telefono || '';
        const direccion = req.body.direccion || '';
        const tipoDocumento = req.body.tipo_documento || 'CC';

        // 1. Lógica para CLIENTES
        if (roleLower.includes('cliente')) {
            const clienteExistente = await prisma.cliente.findFirst({
                where: { OR: [{ correo }, { cedula: cedula || '---' }] }
            });

            if (clienteExistente) {
                clienteIdToLink = clienteExistente.id_cliente;
            } else {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        nombre: nombre_completo || nombre_usuario,
                        correo: correo,
                        cedula: cedula,
                        telefono: telefono,
                        direccion: direccion,
                        tipo_documento: tipoDocumento
                    }
                });
                clienteIdToLink = nuevoCliente.id_cliente;
            }
        }
        // 2. Lógica para EMPLEADOS (Staff - Incluye Veterinario)
        else {
            const empleadoExistente = await prisma.empleado.findFirst({
                where: { OR: [{ correo }, { cedula: cedula || '---' }] }
            });

            if (empleadoExistente) {
                empleadoIdToLink = empleadoExistente.id_empleado;
                // Sincronizar cargo si es Veterinario
                if (roleLower.includes('veterinario')) {
                    await prisma.empleado.update({
                        where: { id_empleado: empleadoIdToLink },
                        data: { cargo: 'Veterinario' }
                    });
                }
            } else {
                const nuevoEmpleado = await prisma.empleado.create({
                    data: {
                        nombre: nombre_completo || nombre_usuario,
                        correo: correo,
                        cedula: cedula,
                        telefono: telefono,
                        direccion: direccion,
                        tipo_documento: tipoDocumento,
                        cargo: roleLower.includes('veterinario') ? 'Veterinario' : (nombre_rol || 'Empleado')
                    }
                });
                empleadoIdToLink = nuevoEmpleado.id_empleado;
            }
        }

        const newUser = await prisma.usuario.create({
            data: {
                nombre_usuario,
                contrasena: hashedPassword,
                correo,
                cedula,
                id_rol: rolIdToUse as number,
                id_cliente: clienteIdToLink,
                id_empleado: empleadoIdToLink,
                nombre_completo,
                grupo_usuario,
                permisos_especificos,
                pregunta_seguridad,
                respuesta_seguridad,
                tipo_documento: tipo_documento || tipoDocumento,
                estado: estado || 'activo',
                activo: activo ?? true,
                // Generamos un token base para el link de activación
                token_recuperacion: Math.random().toString(36).substring(7)
            }
        });

        // ENVIAR CORREO DE BIENVENIDA AUTOMÁTICO (No bloqueante para evitar errores de red)
        if (correo) {
            sendWelcomeEmail(
                correo,
                nombre_completo || nombre_usuario,
                newUser.token_recuperacion || undefined
            ).catch(err => console.error('[MAIL-U-ASYNC] Error:', err));
        }



        res.status(201).json(newUser);
    } catch (error) {
        console.error('[USUARIOS] POST ERROR:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// PUT /api/usuarios/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const id_usuario = parseInt(req.params.id as string);
        const currentUsuario = await prisma.usuario.findUnique({
            where: { id_usuario },
            include: { rol: true }
        });

        if (!currentUsuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        const {
            nombre_usuario, contrasena, correo, cedula, tipo_documento,
            nombre_rol, nombre_completo, grupo_usuario,
            permisos_especificos, pregunta_seguridad,
            respuesta_seguridad, estado, activo
        } = req.body;

        // --- PROTECCIÓN MAESTRO SUPREMO ---
        const esAdministradorMaestro = currentUsuario.correo === 'josephballestas10@gmail.com' || currentUsuario.cedula === '1001780874';

        let finalActivo = activo;
        let finalEstado = estado;
        let finalNombreRol = nombre_rol;

        if (esAdministradorMaestro) {
            finalActivo = true; // No se puede desactivar
            finalEstado = 'activo';
            // Solo lanzamos error si INTENTA cambiar el rol a algo que NO sea Administrador
            if (nombre_rol && nombre_rol.toLowerCase() !== 'administrador') {
                return res.status(400).json({ error: 'No se puede cambiar el rol del Administrador Maestro.' });
            }
            finalNombreRol = 'Administrador';
        }

        const updateData: any = {
            nombre_usuario,
            correo,
            cedula,
            nombre_completo,
            grupo_usuario,
            permisos_especificos,
            pregunta_seguridad,
            respuesta_seguridad,
            estado: finalEstado,
            activo: finalActivo,
            tipo_documento
        };

        if (contrasena) {
            updateData.contrasena = await bcrypt.hash(contrasena, 10);
        }

        let finalRolId = currentUsuario.id_rol;
        let finalRolName = currentUsuario.rol?.nombre_rol || '';

        if (finalNombreRol) {
            let rolDb = await prisma.roles.findFirst({ where: { nombre_rol: finalNombreRol } });
            if (!rolDb) rolDb = await prisma.roles.create({ data: { nombre_rol: finalNombreRol } });
            finalRolId = rolDb.id_rol;
            finalRolName = rolDb.nombre_rol;
            updateData.id_rol = finalRolId;
        }

        // Sincronizar perfiles en el PUT
        const roleLower = (finalRolName || '').toLowerCase();
        const telefono = req.body.telefono || '';
        const direccion = req.body.direccion || '';
        const tipoDocumento = req.body.tipo_documento || 'CC';

        if (roleLower.includes('cliente')) {
            let clienteId = currentUsuario.id_cliente;
            if (!clienteId) {
                const existing = await prisma.cliente.findFirst({
                    where: { OR: [{ correo: correo || '---' }, { cedula: cedula || '---' }] }
                });
                if (existing) clienteId = existing.id_cliente;
                else {
                    const nuevo = await prisma.cliente.create({
                        data: {
                            nombre: nombre_completo || nombre_usuario,
                            correo,
                            cedula,
                            telefono,
                            direccion,
                            tipo_documento: tipoDocumento
                        }
                    });
                    clienteId = nuevo.id_cliente;
                }
                updateData.id_cliente = clienteId;
                // No quitamos id_empleado para permitir perfiles híbridos (Empleado y Cliente a la vez)
            } else {
                // Actualizar cliente existente
                await prisma.cliente.update({
                    where: { id_cliente: clienteId },
                    data: {
                        nombre: nombre_completo || nombre_usuario,
                        correo,
                        cedula,
                        telefono: telefono || undefined,
                        direccion: direccion || undefined
                    }
                });
            }
        } else {
            // Es staff/empleado
            let empleadoId = currentUsuario.id_empleado;
            const cargoFinal = roleLower.includes('veterinario') ? 'Veterinario' : (finalRolName || 'Empleado');

            if (!empleadoId) {
                const existing = await prisma.empleado.findFirst({
                    where: { OR: [{ correo: correo || '---' }, { cedula: cedula || '---' }] }
                });
                if (existing) empleadoId = existing.id_empleado;
                else {
                    const nuevo = await prisma.empleado.create({
                        data: {
                            nombre: nombre_completo || nombre_usuario,
                            correo,
                            cedula,
                            telefono,
                            direccion,
                            tipo_documento: tipoDocumento,
                            cargo: cargoFinal
                        }
                    });
                    empleadoId = nuevo.id_empleado;
                }
                updateData.id_empleado = empleadoId;
                // No quitamos id_cliente para permitir perfiles híbridos
            } else {
                // Actualizar empleado existente
                await prisma.empleado.update({
                    where: { id_empleado: empleadoId },
                    data: {
                        nombre: nombre_completo || nombre_usuario,
                        correo,
                        cedula,
                        telefono: telefono || undefined,
                        direccion: direccion || undefined,
                        cargo: cargoFinal
                    }
                });
            }
        }

        const updated = await prisma.usuario.update({
            where: { id_usuario },
            data: updateData
        });

        res.json(updated);

    } catch (error) {
        console.error('[USUARIOS] PUT ERROR:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// DELETE /api/usuarios/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const id_usuario = parseInt(req.params.id as string);

        // Disconnect relations safely before deleting
        const usr = await prisma.usuario.findUnique({
            where: { id_usuario }
        });

        if (!usr) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        if (usr.correo === 'josephballestas10@gmail.com' || usr.cedula === '1001780874') {
            return res.status(400).json({ error: 'No se puede eliminar la cuenta del Administrador Maestro.' });
        }

        await prisma.usuario.delete({
            where: { id_usuario }
        });

        res.status(204).send();
    } catch (error) {
        console.error('[USUARIOS] DELETE ERROR:', error);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
});

// === RUTAS DE RECUPERACIÓN DE CONTRASEÑA ===

// 1. Solicitar código de recuperación
router.post('/forgot-password', async (req: Request, res: Response) => {
    const { correo } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { correo } });
        if (!usuario) {
            return res.status(404).json({ error: 'No existe un usuario con este correo electrónico.' });
        }

        // Generar código de 6 dígitos
        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardar código en el usuario (usamos el campo token_recuperacion para esto)
        await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: { token_recuperacion: codigo }
        });

        // Enviar el correo en segundo plano para evitar fallos por mala conexión
        sendResetCodeEmail(correo, codigo).catch(err => console.error('[AUTH-ASYNC] Error al enviar código:', err));

        res.json({ success: true, message: 'Código enviado al correo médico.' });
    } catch (error) {
        console.error('[AUTH] FORGOT-PASSWORD ERROR:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
});

// 2. Verificar código y cambiar contraseña
router.post('/reset-password', async (req: Request, res: Response) => {
    const { correo, codigo, nuevaContrasena } = req.body;
    try {
        const usuario = await prisma.usuario.findUnique({ where: { correo } });
        if (!usuario || usuario.token_recuperacion !== codigo) {
            return res.status(400).json({ error: 'Código inválido o correo incorrecto.' });
        }

        // Encriptar nueva contraseña
        const hashedPsw = await bcrypt.hash(nuevaContrasena, 10);

        // Actualizar contraseña y limpiar código
        await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: {
                contrasena: hashedPsw,
                token_recuperacion: null
            }
        });

        res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('[AUTH] RESET-PASSWORD ERROR:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña.' });
    }
});

export default router;

