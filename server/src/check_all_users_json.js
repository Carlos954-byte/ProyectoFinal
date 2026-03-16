const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.usuario.findMany({
            select: { nombre_usuario: true, correo: true, token_recuperacion: true }
        });
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
