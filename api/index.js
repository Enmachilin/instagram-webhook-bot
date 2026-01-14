// api/index.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

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

        // 1. Responder a Meta inmediatamente para evitar timeouts
        res.status(200).send('EVENT_RECEIVED');

        // 2. Verificar si es un evento de Instagram
        if (body.object === 'instagram') {

            // Recorrer las entradas (entries)
            for (const entry of body.entry) {

                // Opción A: Es un COMENTARIO (viene en 'changes')
                if (entry.changes) {
                    for (const change of entry.changes) {
                        if (change.field === 'comments') {
                            const value = change.value;
                            const text = value.text || ""; // El texto del comentario
                            const commentId = value.id;    // ID para responder
                            const userId = value.from.id;  // Quién comentó

                            console.log(`📝 Texto recibido (Comentario): "${text}"`);

                            // Lógica de Palabras Clave (Flexible)
                            const mensajeLimpio = text.toLowerCase();

                            if (mensajeLimpio.includes('precio') || mensajeLimpio.includes('info')) {
                                console.log('🚀 Palabra clave detectada! Ejecutando respuesta...');
                                await responderInstagram(commentId, userId);
                            } else {
                                console.log('ℹ️ Ignorando: No contiene palabras clave.');
                            }
                        }
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Error procesando el evento:', error.message);
    }
});

// Función auxiliar para responder
async function responderInstagram(commentId, userId) {
    const token = process.env.PAGE_ACCESS_TOKEN;

    try {
        // 1. Responder al Comentario Público
        await axios.post(`https://graph.facebook.com/v18.0/${commentId}/replies`, {
            message: "¡Hola! Te envié la info al privado 📩✨",
            access_token: token
        });
        console.log('✅ Respuesta pública enviada');

        // 2. Enviar Mensaje Privado (DM)
        // Nota: Esto usa 'recipient: { comment_id: ... }' para cumplir la regla de 24h
        await axios.post(`https://graph.facebook.com/v18.0/me/messages`, {
            recipient: { comment_id: commentId },
            message: { text: "Hola 👋 Aquí tienes la información de precios: [Tu Info Aquí]" },
            messaging_type: "RESPONSE",
            access_token: token
        });
        console.log('✅ DM enviado correctamente');

    } catch (error) {
        console.error('❌ Error enviando respuesta (API):', error.response ? error.response.data : error.message);
    }
}

module.exports = app;
