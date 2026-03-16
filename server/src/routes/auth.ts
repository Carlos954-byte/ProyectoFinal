import { Router, Request, Response } from 'express';
import prisma from '../prismaClient';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendResetCodeEmail } from '../services/mail.service';


const router = Router();
const SECRET = process.env.JWT_SECRET || 'kaivet_secret';

// POST /api/auth/register - Registrar un nuevo usuario
router.post('/register', async (req: Request, res: Response) => {
    try {
        const correo = req.body.correo?.trim().toLowerCase();
        const contrasena = req.body.contrasena;
        const nombre_usuario = req.body.nombre_usuario?.trim();
        const nombre_rol = req.body.nombre_rol || 'cliente';
        const cedula = req.body.cedula;
        const id_cliente = req.body.id_cliente;
        const id_empleado = req.body.id_empleado;
        const telefono = req.body.telefono;
        const direccion = req.body.direccion;

        if (!correo || !contrasena || !nombre_usuario) {
            return res.status(400).json({ error: 'Correo, contraseña y nombre_usuario son obligatorios' });
        }

        const existeCorreo = await prisma.usuario.findFirst({ where: { correo } });
        if (existeCorreo) return res.status(400).json({ error: 'El correo ya se encuentra registrado. Intenta con otro o inicia sesión.' });

        if (cedula) {
            const existeCedula = await prisma.usuario.findFirst({ where: { cedula } });
            const existeClienteCedula = await prisma.cliente.findFirst({ where: { cedula } });
            if (existeCedula || existeClienteCedula) {
                return res.status(400).json({ error: 'El número de documento (Cédula) ya está registrado en el sistema.' });
            }
        }


        let rolDb = await prisma.roles.findFirst({
            where: { nombre_rol: { contains: nombre_rol } }
        });

        if (!rolDb) {
            rolDb = await prisma.roles.create({ data: { nombre_rol: nombre_rol, activo: true } });
        }

        let clienteIdToLink = id_cliente ? parseInt(id_cliente) : null;
        let empleadoIdToLink = id_empleado ? parseInt(id_empleado) : null;


        // Si es un registro de cliente, creamos el perfil de cliente automáticamente
        if (nombre_rol.toLowerCase().includes('cliente') && !clienteIdToLink) {
            const clienteExistente = await prisma.cliente.findFirst({
                where: { OR: [{ correo }, { cedula: cedula || '---' }] }
            });

            if (clienteExistente) {
                clienteIdToLink = clienteExistente.id_cliente;
            } else {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        nombre: nombre_usuario,
                        correo: correo,
                        cedula: cedula,
                        telefono: telefono,
                        direccion: direccion,
                        tipo_documento: req.body.tipoDocumento || 'CC'
                    }
                });
                clienteIdToLink = nuevoCliente.id_cliente;
            }
        }
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // 1. Crear el usuario
        const usuario = await prisma.usuario.create({
            data: {
                correo,
                contrasena: hashedPassword,
                nombre_usuario,
                id_rol: rolDb.id_rol,
                cedula,
                activo: true,
                estado: 'activo'
            },
        });

        // 2. Sincronización Automática: Crear ficha de Cliente o Empleado según el Rol
        const nombreRolLower = rolDb.nombre_rol.toLowerCase();

        if (nombreRolLower === 'cliente') {
            const clienteExistente = await prisma.cliente.findFirst({
                where: { OR: [{ correo }, { cedula: cedula || '---' }] }
            });

            if (!clienteExistente) {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        nombre: nombre_usuario,
                        correo,
                        cedula,
                        tipo_documento: req.body.tipoDocumento || 'CC',
                        telefono: telefono || '00000000',
                        direccion: direccion || 'Sin dirección'
                    }
                });
                await prisma.usuario.update({
                    where: { id_usuario: usuario.id_usuario },
                    data: { id_cliente: nuevoCliente.id_cliente }
                });
            } else {
                await prisma.usuario.update({
                    where: { id_usuario: usuario.id_usuario },
                    data: { id_cliente: clienteExistente.id_cliente }
                });
            }
        } else {
            // Se asume que cualquier otro rol (Administrador, Veterinario, etc.) es un Empleado
            const empleadoExistente = await prisma.empleado.findFirst({
                where: { OR: [{ correo }, { cedula: cedula || '---' }] }
            });

            if (!empleadoExistente) {
                const nuevoEmpleado = await prisma.empleado.create({
                    data: {
                        nombre: nombre_usuario,
                        correo,
                        cedula,
                        tipo_documento: req.body.tipoDocumento || 'CC',
                        telefono: telefono || '00000000',
                        direccion: direccion || 'Sin dirección',
                        cargo: rolDb.nombre_rol
                    }
                });
                await prisma.usuario.update({
                    where: { id_usuario: usuario.id_usuario },
                    data: { id_empleado: nuevoEmpleado.id_empleado }
                });
            } else {
                await prisma.usuario.update({
                    where: { id_usuario: usuario.id_usuario },
                    data: { id_empleado: empleadoExistente.id_empleado }
                });
            }
        }

        // Intentar enviar email de bienvenida
        sendWelcomeEmail(correo, nombre_usuario).catch(err =>
            console.error('[AUTH-SYNC] Error al enviar bienvenida:', err)
        );

        const token = jwt.sign({ id: usuario.id_usuario, email: usuario.correo, rol: rolDb.nombre_rol }, SECRET, { expiresIn: '24h' });
        res.status(201).json({
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                nombre_usuario: usuario.nombre_usuario,
                id_rol: usuario.id_rol,
                rol: rolDb.nombre_rol,
                cedula: usuario.cedula,
                id_cliente: usuario.id_cliente,
                id_empleado: usuario.id_empleado,
                estado: usuario.estado
            }
        });
    } catch (error: any) {
        console.error('[AUTH] ERROR EN REGISTRO:', error);
        res.status(500).json({
            error: 'Error interno del servidor al registrar.'
        });
    }
});



// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { correo, contrasena } = req.body;

        if (!correo || !contrasena) {
            return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
        }

        const emailLower = correo.trim().toLowerCase();
        const usuario = await prisma.usuario.findFirst({
            where: { correo: emailLower },
            include: { rol: true }
        });

        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        if (usuario.activo === false) {
            return res.status(403).json({ error: 'Esta cuenta está desactivada' });
        }

        const valido = await bcrypt.compare(contrasena, usuario.contrasena);
        if (!valido) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const token = jwt.sign({ id: usuario.id_usuario, email: usuario.correo, rol: usuario.rol.nombre_rol }, SECRET, { expiresIn: '24h' });
        res.json({
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                nombre_usuario: usuario.nombre_usuario,
                id_rol: usuario.id_rol,
                rol: usuario.rol.nombre_rol,
                cedula: usuario.cedula,
                id_cliente: usuario.id_cliente,
                id_empleado: usuario.id_empleado,
                nombre_completo: usuario.nombre_completo,
                grupo_usuario: usuario.grupo_usuario,
                permisos_especificos: usuario.permisos_especificos,
                estado: usuario.estado
            }
        });
    } catch (error) {
        console.error('[AUTH] ERROR EN LOGIN:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// GET /api/auth/users - Obtener todos los usuarios
router.get('/users', async (_req: Request, res: Response) => {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: { rol: true }
        });
        res.json(usuarios);
    } catch (error) {
        console.error('[AUTH] ERROR AL LISTAR USUARIOS:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// PUT /api/auth/users/:id - Actualizar un usuario
router.put('/users/:id', async (req: Request, res: Response) => {
    try {
        const id_usuario = parseInt(req.params.id as string);
        const { nombre_usuario, correo, contrasena, id_rol, nombre_rol, cedula, activo, id_cliente, id_empleado } = req.body;

        const data: any = {};
        if (nombre_usuario) data.nombre_usuario = nombre_usuario;
        if (correo) data.correo = correo;
        if (cedula !== undefined) data.cedula = cedula;
        if (activo !== undefined) data.activo = activo;
        if (id_cliente !== undefined) data.id_cliente = id_cliente;
        if (id_empleado !== undefined) data.id_empleado = id_empleado;

        if (nombre_rol) {
            let rolDb = await prisma.roles.findFirst({ where: { nombre_rol } });
            if (!rolDb) {
                rolDb = await prisma.roles.create({ data: { nombre_rol } });
            }
            data.id_rol = rolDb.id_rol;
        } else if (id_rol) {
            data.id_rol = parseInt(id_rol as string);
        }

        if (contrasena) {
            data.contrasena = await bcrypt.hash(contrasena, 10);
        }

        const actualizada = await prisma.usuario.update({
            where: { id_usuario },
            data,
            include: { rol: true }
        });

        // --- LÓGICA DE SINCRONIZACIÓN AL EDITAR ROL ---
        const nuevoRolNombre = actualizada.rol?.nombre_rol?.toLowerCase() || '';

        // Caso A: El usuario pasó a ser CLIENTE
        if (nuevoRolNombre === 'cliente') {
            // Si antes era empleado, borramos la ficha de empleado para que no aparezca en ese módulo
            if (actualizada.id_empleado) {
                try {
                    const empId = actualizada.id_empleado;
                    // Desvinculamos primero el usuario
                    await prisma.usuario.update({
                        where: { id_usuario: actualizada.id_usuario },
                        data: { id_empleado: null }
                    });
                    // Intentamos borrar el registro de empleado (si no tiene agendamientos o ventas amarradas)
                    await prisma.empleado.delete({ where: { id_empleado: empId } });
                    console.log(`[SYNC] Empleado ${empId} eliminado porque ahora es Cliente.`);
                } catch (e) {
                    console.warn('[SYNC] No se pudo borrar el empleado (posiblemente tiene registros asociados), solo se desvinculó.');
                }
            }

            // Aseguramos que tenga ficha de cliente
            const clienteExistente = await prisma.cliente.findFirst({
                where: { OR: [{ correo: actualizada.correo }, { cedula: actualizada.cedula || '---' }] }
            });

            if (!clienteExistente) {
                const nuevoCliente = await prisma.cliente.create({
                    data: {
                        nombre: actualizada.nombre_usuario,
                        correo: actualizada.correo,
                        cedula: actualizada.cedula,
                        tipo_documento: 'CC',
                        telefono: '00000000',
                        direccion: 'Creado por cambio de rol'
                    }
                });
                await prisma.usuario.update({
                    where: { id_usuario: actualizada.id_usuario },
                    data: { id_cliente: nuevoCliente.id_cliente }
                });
            } else {
                await prisma.usuario.update({
                    where: { id_usuario: actualizada.id_usuario },
                    data: { id_cliente: clienteExistente.id_cliente }
                });
            }
        }
        // Caso B: El usuario pasó a ser ADMINISTRADOR / VETERINARIO (Cualquier rol que NO sea cliente)
        else {
            // Si antes era cliente, desvinculamos la ficha de cliente
            if (actualizada.id_cliente) {
                await prisma.usuario.update({
                    where: { id_usuario: actualizada.id_usuario },
                    data: { id_cliente: null }
                });
            }

            // Aseguramos que tenga ficha de EMPLEADO
            const empleadoExistente = await prisma.empleado.findFirst({
                where: { OR: [{ correo: actualizada.correo }, { cedula: actualizada.cedula || '---' }] }
            });

            if (!empleadoExistente) {
                const nuevoEmp = await prisma.empleado.create({
                    data: {
                        nombre: actualizada.nombre_usuario,
                        correo: actualizada.correo,
                        cedula: actualizada.cedula,
                        tipo_documento: 'CC',
                        telefono: '00000000',
                        direccion: 'Creado por cambio de rol',
                        cargo: actualizada.rol?.nombre_rol || 'Staff'
                    }
                });
                await prisma.usuario.update({
                    where: { id_usuario: actualizada.id_usuario },
                    data: { id_empleado: nuevoEmp.id_empleado }
                });
            } else {
                // Si el empleado ya existe, actualizamos su cargo
                await prisma.empleado.update({
                    where: { id_empleado: empleadoExistente.id_empleado },
                    data: { cargo: actualizada.rol?.nombre_rol || 'Staff' }
                });
                await prisma.usuario.update({
                    where: { id_usuario: actualizada.id_usuario },
                    data: { id_empleado: empleadoExistente.id_empleado }
                });
            }
        }

        res.json(actualizada);
    } catch (error) {
        console.error('[AUTH] ERROR EN PUT /users/:id:', error);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// DELETE /api/auth/users/:id - Eliminar un usuario
router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
        const id_usuario = parseInt(req.params.id as string);
        await prisma.usuario.delete({ where: { id_usuario } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});


// === RUTAS DE RECUPERACIÓN DE CONTRASEÑA (Para el frontend) ===


router.post('/request-reset', async (req: Request, res: Response) => {
    const { email } = req.body;
    const emailLower = email?.trim().toLowerCase();
    try {
        const usuario = await prisma.usuario.findUnique({ where: { correo: emailLower } });
        if (!usuario) {
            return res.status(404).json({ error: 'No existe un usuario con este correo.' });
        }

        const codigo = Math.floor(100000 + Math.random() * 900000).toString();

        await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: { token_recuperacion: codigo }
        });

        sendResetCodeEmail(email, codigo).catch(err => console.error('[AUTH-ASYNC] Error al enviar código:', err));

        res.json({ success: true, message: 'Código de recuperación enviado' });
    } catch (error) {
        console.error('[AUTH] REFRESH-RESET ERROR:', error);
        res.status(500).json({ error: 'Error al enviar código' });
    }
});

router.post('/reset-password', async (req: Request, res: Response) => {
    const { email, token, newPassword } = req.body;
    const emailLower = email?.trim().toLowerCase();
    try {
        const usuario = await prisma.usuario.findUnique({ where: { correo: emailLower } });
        if (!usuario || usuario.token_recuperacion !== token) {
            return res.status(400).json({ error: 'Código inválido o correo incorrecto' });
        }

        const hashedPsw = await bcrypt.hash(newPassword, 10);

        await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: {
                contrasena: hashedPsw,
                token_recuperacion: null
            }
        });

        res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
        console.error('[AUTH] RESET-PASSWORD ERROR:', error);
        res.status(500).json({ error: 'Error al cambiar contraseña' });
    }
});

export default router;

