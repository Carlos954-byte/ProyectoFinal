const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Limpiando empleados con cargo Cliente ---');

    // Buscamos empleados que tengan cargo de cliente
    const empleadosCliente = await prisma.empleado.findMany({
        where: {
            cargo: {
                contains: 'cliente'
            }
        }
    });

    for (const emp of empleadosCliente) {
        console.log(`Removiendo a ${emp.nombre} de la tabla de empleados (es Cliente)...`);

        // Desvincular de usuarios primero
        await prisma.usuario.updateMany({
            where: { id_empleado: emp.id_empleado },
            data: { id_empleado: null }
        });

        // Eliminar de la tabla empleado
        await prisma.empleado.delete({
            where: { id_empleado: emp.id_empleado }
        });
    }

    console.log('--- Limpieza completada ---');
}

cleanup().catch(e => console.error(e)).finally(() => prisma.$disconnect());
