const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const email = 'josephballestas10@gmail.com';
    const user = await prisma.usuario.findUnique({
        where: { correo: email }
    });

    if (user) {
        console.log(`Usuario: ${user.correo}`);
        console.log(`Código actual (token_recuperacion): ${user.token_recuperacion}`);
    } else {
        console.log('Usuario no encontrado');
    }
}

check().catch(e => console.error(e)).finally(() => prisma.$disconnect());
