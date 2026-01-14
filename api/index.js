// api/index.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const https = require('https');

const app = express();
app.use(bodyParser.json());

// Agente para evitar errores de red en Vercel
const httpsAgent = new https.Agent({ family: 4 });

// GET: Verificación del Webhook
app.get('/api', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.status(400).send('Faltan parámetros');
    }
});

// POST: Recepción de mensajes
app.post('/api', async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'instagram') {
            for (const entry of body.entry) {
                if (entry.changes) {
                    for (const change of entry.changes) {
                        if (change.field === 'comments') {
                            const value = change.value;
                            const text = value.text || "";
                            const commentId = value.id;
                            const userId = value.from.id; // ID de quien comenta

                            console.log(`📝 Texto recibido: "${text}" de usuario: ${userId}`);

                            // 🛑 PROTECCIÓN CONTRA BUCLE INFINITO
                            // Si el texto ya dice "Te envié los detalles", ES EL BOT HABLANDO.
                            // Ignoramos inmediatamente.
                            if (text.includes('Te envié los detalles')) {
                                console.log('🤖 Detectada auto-respuesta. Ignorando para evitar bucle.');
                                continue;
                            }

                            // Lógica de detección
                            const mensajeLimpio = text.toLowerCase();

                            if (mensajeLimpio.includes('precio') || mensajeLimpio.includes('info')) {
                                console.log('🚀 Palabra clave detectada! Respondiendo...');
                                await responderInstagram(commentId);
                            } else {
                                console.log('ℹ️ Ignorando: No hay palabras clave.');
                            }
                        }
                    }
                }
            }
        }

        res.status(200).send('EVENT_RECEIVED');

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).send('ERROR');
    }
});

async function responderInstagram(commentId) {
    // ⚠️ ASEGÚRATE DE QUE ESTE TOKEN SEA DE 'PÁGINA' (EMPIEZA POR EAA...)
    const token = process.env.PAGE_ACCESS_TOKEN;
    const version = 'v21.0';

    try {
        const config = {
            timeout: 5000,
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent: httpsAgent
        };

        // 1. Respuesta Pública (CAMBIADA PARA NO ACTIVAR EL BUCLE)
        // Usamos "detalles" en lugar de "info"
        await axios.post(
            `https://graph.facebook.com/${version}/${commentId}/replies`,
            { message: "¡Hola! Te envié los detalles al privado 📩✨" },
            config
        );
        console.log('✅ Respuesta pública enviada');

        // 2. DM Privado
        await axios.post(
            `https://graph.facebook.com/${version}/me/messages`,
            {
                recipient: { comment_id: commentId },
                message: { text: "Hola 👋 Aquí tienes la lista de precios que pediste: [Tu Info]" },
                messaging_type: "RESPONSE"
            },
            config
        );
        console.log('✅ DM enviado');

    } catch (error) {
        // Ignoramos error si es duplicado, mostramos otros
        console.error(`❌ Error API: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    }
}

module.exports = app;
