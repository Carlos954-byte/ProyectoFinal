import 'dotenv/config';
import https from 'https';

/**
 * Función maestra para enviar correos vía la API de Brevo sin usar librerías externas.
 * Este método es infalible en Railway porque usa el puerto web estándar (443).
 */
const callBrevoAPI = (data: any) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.EMAIL_PASS;
    if (!apiKey) return reject('No se encontró API Key en EMAIL_PASS');

    const postData = JSON.stringify(data);
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode && res.statusCode < 300) resolve(body);
        else reject(body);
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
};

const FROM_EMAIL = process.env.EMAIL_USER || "josephballestas10@gmail.com";
const FROM_NAME = "KaiVet Manager";

export const sendWelcomeEmail = async (email: string, nombre: string, tokenActivacion?: string) => {
  try {
    console.log(`[MAIL-API] Disparando envío a: ${email}`);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = tokenActivacion
      ? `${frontendUrl}/?mode=activate&email=${encodeURIComponent(email)}&token=${tokenActivacion}`
      : frontendUrl;

    const emailData = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: email, name: nombre }],
      subject: "¡Bienvenido a KaiVet Manager! 🐾",
      htmlContent: `
                <div style="font-family: Arial, sans-serif; background-color: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center;">
                    <h1 style="color: #3b82f6;">¡Bienvenido a KaiVet, ${nombre}! 👋</h1>
                    <p style="font-size: 16px; color: #94a3b8;">Tu cuenta ha sido creada con éxito. Actívala ahora mismo:</p>
                    <div style="margin-top: 30px;">
                        <a href="${activationLink}" style="background-color: #3b82f6; color: white; padding: 15px 25px; text-decoration: none; border-radius: 10px; font-weight: bold;">
                            ${tokenActivacion ? 'Activar mi cuenta' : 'Ir al Portal'}
                        </a>
                    </div>
                </div>
            `
    };

    await callBrevoAPI(emailData);
    console.log(`[MAIL-API] ¡ÉXITO! Correo enviado a: ${email}`);
  } catch (err: any) {
    console.error('[MAIL-API] ERROR DEFINITIVO:', err);
  }
};

export const sendResetCodeEmail = async (email: string, code: string) => {
  try {
    const emailData = {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: email }],
      subject: "Código de recuperación de contraseña 🔐",
      htmlContent: `
                <div style="font-family: sans-serif; background-color: #020617; color: white; padding: 40px; border-radius: 20px; text-align: center;">
                    <h2 style="color: #3b82f6;">Recuperación de Acceso</h2>
                    <div style="margin: 30px 0;">
                        <div style="background-color: #1e293b; padding: 20px; border-radius: 10px; border: 2px dashed #3b82f6; display: inline-block;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px;">${code}</span>
                        </div>
                    </div>
                </div>
            `
    };
    await callBrevoAPI(emailData);
    console.log(`[MAIL-API] Código enviado a: ${email}`);
  } catch (err: any) {
    console.error('[MAIL-API] ERROR EN CÓDIGO:', err);
  }
};
