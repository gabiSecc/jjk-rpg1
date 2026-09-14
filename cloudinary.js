// lib/cloudinary.js
const crypto = require('crypto');

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Faz upload de uma imagem (base64 puro, sem o prefixo data:) para uma pasta
// do Cloudinary, usando assinatura (sem expor o API_SECRET no frontend).
async function uploadImagem(base64, folder) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error('Cloudinary não configurado (variáveis de ambiente ausentes)');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Parâmetros que entram na assinatura devem estar em ordem alfabética,
  // exceto file/api_key, que não participam da assinatura.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(paramsToSign + API_SECRET).digest('hex');

  const form = new URLSearchParams();
  form.append('file', `data:image/png;base64,${base64}`);
  form.append('api_key', API_KEY);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Falha no upload para o Cloudinary');
  }
  return data.secure_url;
}

module.exports = { uploadImagem };
