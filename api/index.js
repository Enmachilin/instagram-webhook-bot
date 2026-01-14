// api/index.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const https = require('https'); // Necesario para el arreglo de red

const app = express();
app.use(bodyParser.json());

// Agente para forzar IPv4 (Arregla el error ETIMEDOUT en Vercel)
const httpsAgent = new https.Agent({ family: 4 });

// Verificación del Token (GET)
app.get('/api', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.status(400).send('Faltan parámetros');
    }
});

// Recepción de Eventos (POST)
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
                            const userId = value.from.id;

                            console.log(`📝 Texto recibido (Comentario): "${text}"`);

                            // Lógica de detección
                            const mensajeLimpio = text.toLowerCase();
                            if (mensajeLimpio.includes('precio') || mensajeLimpio.includes('info')) {
                                console.log('🚀 Palabra clave detectada! Ejecutando respuesta...');
                                // Esperamos a que se envíe la respuesta ANTES de cerrar con Meta
                                await responderInstagram(commentId, userId);
                            } else {
                                console.log('ℹ️ Ignorando: No contiene palabras clave.');
                            }
                        }
                    }
                }
            }
        }

        // Respondemos a Meta AL FINAL para asegurar que el proceso no se corte
        res.status(200).send('EVENT_RECEIVED');

    } catch (error) {
        console.error('❌ Error general en el endpoint:', error.message);
        res.status(500).send('ERROR');
    }
});

// Función para responder
async function responderInstagram(commentId, userId) {
    const token = process.env.PAGE_ACCESS_TOKEN;
    const version = 'v21.0';

    try {
        const config = {
            timeout: 5000, // 5 segundos máximo
            headers: { Authorization: `Bearer ${token}` },
            httpsAgent: httpsAgent // 👈 ESTO ES LA MAGIA DEL FIX IPV4
        };

        // 1. Responder al Comentario Público
        await axios.post(
            `https://graph.facebook.com/${version}/${commentId}/replies`,
            { message: "¡Hola! Te envié la info al privado 📩✨" },
            config
        );
        console.log('✅ Respuesta pública enviada');

        // 2. Enviar Mensaje Privado (DM)
        await axios.post(
            `https://graph.facebook.com/${version}/me/messages`,
            {
                recipient: { comment_id: commentId },
                message: { text: "Hola 👋 Aquí tienes la información de precios: [Tu Info Aquí]" },
                messaging_type: "RESPONSE"
            },
            config
        );
        console.log('✅ DM enviado correctamente');

    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ Error enviando respuesta (API): ${errorMsg}`);
    }
}

module.exports = app;
