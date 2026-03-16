const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log('--- Iniciando Limpieza de Base de Datos ---');

    // 1. Carlos Andrés Urrego (ID #14 en usuarios, cedula 1118122995)
    // Crear empleado si no existe
    const carlosCedula = '1118122995';
    let empCarlos = await prisma.empleado.findUnique({ where: { cedula: carlosCedula } });

    if (!empCarlos) {
        console.log('Creando registro de empleado para Carlos...');
        empCarlos = await prisma.empleado.create({
            data: {
                nombre: 'Carlos Andrés urrego bohorquez',
                cedula: carlosCedula,
                correo: 'urrego639@gmail.com',
                telefono: '3125445454',
                cargo: 'Administrador'
            }
        });
    }

    // Vincular usuario 14 al empleado
    await prisma.usuario.update({
        where: { id_usuario: 14 },
        data: {
            id_empleado: empCarlos.id_empleado,
            id_cliente: null // Asegurar que NO sea cliente
        }
    });

    // 2. Kai Vet (ID #12, cedula 123456789)
    // El usuario dice que es SOLO CLIENTE.
    // Buscamos el rol de "Cliente"
    const rolCliente = await prisma.roles.findFirst({ where: { nombre_rol: 'Cliente' } });
    if (rolCliente) {
        console.log('Corrigiendo perfil de Kai Vet a solo CLIENTE...');
        await prisma.usuario.update({
            where: { id_usuario: 12 },
            data: {
                id_rol: rolCliente.id_rol,
                id_empleado: null // Quitar cualquier vínculo con empleados
            }
        });
    }

    // 3. Borrar empleados basura con cedula 123456789 (si existen y no son Mishell)
    // Mishell Roldán tiene cedula 123456789 según la foto? 
    // No, en la foto 1 Mishell Roldán tiene cedula 123456789.
    // Re-vinculamos a Mishell (id_empleado 7) con su usuario si existe.
    // Buscamos si hay un usuario para Mishell (por correo roldangiraldomishell@gmail.com)
    const userMishell = await prisma.usuario.findUnique({ where: { correo: 'roldangiraldomishell@gmail.com' } });
    if (userMishell) {
        await prisma.usuario.update({
            where: { id_usuario: userMishell.id_usuario },
            data: { id_empleado: 7, id_cliente: null }
        });
    }

    console.log('--- Limpieza Completada ---');
}

fix().catch(e => console.error(e)).finally(() => prisma.$disconnect());
