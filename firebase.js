// lib/firebase.js
// Inicializa o Firebase Admin SDK (uso exclusivo do backend/serverless).
// Nunca importar isso no frontend.

const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !clientEmail || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error(
        'Variáveis de ambiente do Firebase ausentes. Confira FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY nas Environment Variables da Vercel.'
      );
    }

    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    // Remove aspas externas caso tenham sido coladas junto (ex: "-----BEGIN...")
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    // Se já tem quebras de linha reais (a Vercel às vezes converte \n em enter de verdade),
    // usa direto. Senão, converte o \n literal (texto) em quebra de linha real.
    if (!privateKey.includes('\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    } else if (privateKey.includes('\\n')) {
      // caso raro: mistura dos dois formatos
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
    } catch (err) {
      throw new Error('Falha ao inicializar Firebase Admin: ' + err.message);
    }
  }
  return admin;
}

module.exports = { getAdmin };
