const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// Middleware
app.use(bodyParser.json());

// Variables de entorno
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Palabras clave para activar el bot (case insensitive)
const KEYWORDS = ['PRECIO', 'INFO'];

// ================================================
// VERIFICACIÓN DEL WEBHOOK (GET)
// Meta envía una solicitud GET para verificar el endpoint
// ================================================
app.get('/api', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook verificado correctamente');
            return res.status(200).send(challenge);
        } else {
            console.log('❌ Verificación fallida: Token incorrecto');
            return res.sendStatus(403);
        }
    }
    
    return res.sendStatus(400);
});

// ================================================
// RECEPCIÓN DE EVENTOS (POST)
// Meta envía eventos de comentarios aquí
// ================================================
app.post('/api', async (req, res) => {
    const body = req.body;

    // Responder inmediatamente para evitar timeouts de Meta
    res.status(200).send('EVENT_RECEIVED');

    try {
        // Verificar que el evento es de Instagram
        if (body.object !== 'instagram') {
            console.log('⚠️ Evento no es de Instagram:', body.object);
            return;
        }

        // Procesar cada entrada
        if (body.entry && Array.isArray(body.entry)) {
            for (const entry of body.entry) {
                // Procesar cada cambio en la entrada
                if (entry.changes && Array.isArray(entry.changes)) {
                    for (const change of entry.changes) {
                        // Solo procesar eventos de comentarios
                        if (change.field === 'comments') {
                            await processComment(change.value);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Error procesando evento:', error.message);
    }
});

// ================================================
// PROCESAR COMENTARIO
// Detecta palabras clave y ejecuta acciones
// ================================================
async function processComment(commentData) {
    try {
        const commentId = commentData.id;
        const commentText = commentData.text || '';
        const userId = commentData.from?.id;

        console.log(`📝 Nuevo comentario detectado:`);
        console.log(`   - ID: ${commentId}`);
        console.log(`   - Texto: "${commentText}"`);
        console.log(`   - Usuario ID: ${userId}`);

        // Verificar si el comentario contiene palabras clave
        const textUpperCase = commentText.toUpperCase();
        const containsKeyword = KEYWORDS.some(keyword => textUpperCase.includes(keyword));

        if (!containsKeyword) {
            console.log('ℹ️ Comentario no contiene palabras clave, ignorando...');
            return;
        }

        console.log('🎯 Palabra clave detectada! Iniciando acciones...');

        // Ejecutar ambas acciones en paralelo
        await Promise.all([
            replyToComment(commentId),
            sendDirectMessage(userId)
        ]);

        console.log('✅ Acciones completadas exitosamente');

    } catch (error) {
        console.error('❌ Error procesando comentario:', error.message);
        throw error;
    }
}

// ================================================
// RESPONDER AL COMENTARIO PÚBLICAMENTE
// ================================================
async function replyToComment(commentId) {
    try {
        const url = `https://graph.facebook.com/v18.0/${commentId}/replies`;
        
        const response = await axios.post(url, {
            message: 'Te envié DM 👋'
        }, {
            params: {
                access_token: PAGE_ACCESS_TOKEN
            }
        });

        console.log(`✅ Reply público enviado. ID: ${response.data.id}`);
        return response.data;

    } catch (error) {
        console.error('❌ Error enviando reply público:', error.response?.data || error.message);
        throw error;
    }
}

// ================================================
// ENVIAR MENSAJE DIRECTO (DM)
// ================================================
async function sendDirectMessage(userId) {
    if (!userId) {
        console.log('⚠️ No se puede enviar DM: userId no disponible');
        return;
    }

    try {
        const url = 'https://graph.facebook.com/v18.0/me/messages';
        
        const response = await axios.post(url, {
            recipient: {
                id: userId
            },
            message: {
                text: '¡Hola! 👋 Gracias por tu interés. Aquí tienes la información que solicitaste:\n\n📌 [Tu información aquí]\n\n¿Tienes alguna otra pregunta?'
            }
        }, {
            params: {
                access_token: PAGE_ACCESS_TOKEN
            }
        });

        console.log(`✅ DM enviado exitosamente. Recipient ID: ${userId}`);
        return response.data;

    } catch (error) {
        console.error('❌ Error enviando DM:', error.response?.data || error.message);
        throw error;
    }
}

// ================================================
// ENDPOINT DE SALUD (opcional)
// ================================================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Instagram Bot Webhook is running'
    });
});

// ================================================
// EXPORTAR PARA VERCEL (SIN app.listen())
// ================================================
module.exports = app;
