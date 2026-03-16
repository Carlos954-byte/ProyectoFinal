const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.usuario.findFirst({
            where: { correo: 'urregoa639@gmail.com' }
        });
        if (user) {
            await prisma.usuario.update({
                where: { id_usuario: user.id_usuario },
                data: { token_recuperacion: '9d20b860-a7d4-4018-9a8d-5e360a46af08' }
            });
            console.log('Token updated successfully for urregoa639@gmail.com');
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
