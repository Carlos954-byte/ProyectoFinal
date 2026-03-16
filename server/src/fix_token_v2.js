const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    console.log('Starting script...');
    try {
        console.log('Connecting to DB...');
        const user = await prisma.usuario.findFirst({
            where: { correo: 'urregoa639@gmail.com' }
        });

        if (!user) {
            console.log('USER NOT FOUND: urregoa639@gmail.com');
            return;
        }

        console.log('Found user:', user.nombre_usuario);
        console.log('Current token:', user.token_recuperacion);

        const updated = await prisma.usuario.update({
            where: { id_usuario: user.id_usuario },
            data: { token_recuperacion: '9d20b860-a7d4-4018-9a8d-5e360a46af08' }
        });

        console.log('SUCCESS: Token updated to 9d20b860-a7d4-4018-9a8d-5e360a46af08');
        console.log('New token in DB:', updated.token_recuperacion);

    } catch (error) {
        console.error('FATAL ERROR:', error);
    } finally {
        await prisma.$disconnect();
        console.log('Disconnected.');
    }
}

main();
