const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const users = await prisma.usuario.findMany();
        console.log('--- USER STATES ---');
        users.forEach(u => console.log(`- User: ${u.nombre_usuario}, Active: ${u.activo}, Estado: ${u.estado}`));
        const clientsCount = await prisma.cliente.count();
        console.log('Clients:', clientsCount);
        const petsCount = await prisma.mascotas.count();
        console.log('Pets:', petsCount);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
