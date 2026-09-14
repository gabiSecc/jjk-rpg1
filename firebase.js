// lib/firebase.js
// Inicializa o Firebase Admin SDK (uso exclusivo do backend/serverless).
// Nunca importar isso no frontend.

const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Vercel guarda quebras de linha como \n literal — precisa converter de volta
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  }
  return admin;
}

module.exports = { getAdmin };
