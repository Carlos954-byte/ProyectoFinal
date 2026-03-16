const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Connecting...');
        const user = await prisma.usuario.findFirst({
            where: { correo: 'urregoa639@gmail.com' }
        });
        if (user) {
            console.log('User:', user.nombre_usuario);
            console.log('Token in DB:', user.token_recuperacion);
        } else {
            console.log('User not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
