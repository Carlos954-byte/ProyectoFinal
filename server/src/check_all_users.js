const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const users = await prisma.usuario.findMany({
            select: { nombre_usuario: true, correo: true, token_recuperacion: true }
        });
        console.log('--- USERS ---');
        users.forEach(u => {
            console.log(`User: ${u.nombre_usuario}, Email: ${u.correo}, Token: ${u.token_recuperacion}`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
