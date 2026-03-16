import { sendWelcomeEmail } from './services/mail.service';
import 'dotenv/config';

async function diagnostic() {
    console.log('--- INICIANDO DIAGNÓSTICO DE ENVÍO (BREVO) ---');
    console.log('User en .env:', process.env.EMAIL_USER);
    // Usamos el correo del usuario solo para la prueba de envío
    const testEmail = 'josephballestas10@gmail.com';

    console.log('1. Probando envío de Bienvenida (Flujo Veterinario/Cliente)...');
    try {
        await sendWelcomeEmail(testEmail, 'Test Joseph', 'token123test');
        console.log('2. Resultado: El servicio ejecutó la llamada a la API de Brevo sin errores de código.');
        console.log('   Si el registro ENOTFOUND apareció en consola, es un fallo de red/DNS local.');
    } catch (err) {
        console.error('ALERTA: El código del servicio falló:', err);
    }
}

diagnostic();
