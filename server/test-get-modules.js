const fetch = require('node-fetch');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api`;

const endpoints = [
    '/clientes',
    '/mascotas',
    '/ventas',
    '/servicios',
    '/historial',
    '/empleados',
    '/horarios',
    '/agendamiento',
    '/roles',
    '/usuarios'
];

async function runTests() {
    console.log(`Iniciando prueba de lectura (GET) de todos los módulos en ${BASE_URL}...\n`);
    let passed = 0;
    for (const endpoint of endpoints) {
        try {
            const res = await fetch(`${BASE_URL}${endpoint}`);
            if (res.ok) {
                console.log(`✅ EXITO: ${endpoint} respondió con status ${res.status}`);
                passed++;
            } else {
                console.log(`❌ ERROR: ${endpoint} respondió con status ${res.status}`);
            }
        } catch (err) {
            console.log(`🚨 FALLO: No se pudo conectar a ${endpoint} (${err.message})`);
        }
    }
    console.log(`\nResultados: ${passed}/${endpoints.length} módulos funcionando (GET).`);
    process.exit(0);
}

runTests();
