import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const usersCount = await prisma.usuario.count();
        const clientsCount = await prisma.cliente.count();
        const petsCount = await prisma.mascotas.count();
        const employeesCount = await prisma.empleado.count();
        const rolesCount = await prisma.roles.count();

        console.log('--- DATABASE STATS ---');
        console.log('Users:', usersCount);
        console.log('Clients:', clientsCount);
        console.log('Pets:', petsCount);
        console.log('Employees:', employeesCount);
        console.log('Roles:', rolesCount);
        console.log('-----------------------');

        if (usersCount > 0) {
            const users = await prisma.usuario.findMany({
                take: 5,
                select: { id_usuario: true, nombre_usuario: true, correo: true, estado: true }
            });
            console.log('Sample Users:', users);
        }

    } catch (error) {
        console.error('Error checking database:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
