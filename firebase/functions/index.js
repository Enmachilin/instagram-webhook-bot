const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const CustomerService = require("./services/CustomerService");

admin.initializeApp();
const db = admin.firestore();

/**
 * Webhook central para Meta (WhatsApp & Instagram)
 */
exports.webhookReceiver = onRequest(async (req, res) => {
    // 1. Verificación de Webhook (GET)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode && token === process.env.HUB_VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).send("Forbidden");
    }

    // 2. Procesamiento de Mensajes (POST)
    if (req.method === "POST") {
        const body = req.body;

        try {
            const service = new CustomerService(db);

            // Lógica para WhatsApp
            if (body.object === "whatsapp_business_account") {
                const entry = body.entry?.[0];
                const changes = entry?.changes?.[0];
                const value = changes?.value;
                const message = value?.messages?.[0];
                const contact = value?.contacts?.[0];

                if (message) {
                    await service.processIncomingMessage({
                        sourceId: contact.wa_id,
                        sourceType: "whatsapp",
                        name: contact.profile?.name,
                        text: message.text?.body,
                        metaMsgId: message.id
                    });
                }
            }

            // Lógica para Instagram (DMs y Comentarios)
            if (body.object === "instagram") {
                const entry = body.entry?.[0];
                const messaging = entry?.messaging?.[0]; // DMs
                const changes = entry?.changes?.[0]; // Comentarios

                // Manejo de Mensajes Directos (DMs)
                if (messaging) {
                    const senderId = messaging.sender.id;
                    const message = messaging.message;

                    if (message && !message.is_echo) {
                        await service.processIncomingMessage({
                            sourceId: senderId,
                            sourceType: "instagram",
                            text: message.text,
                            metaMsgId: message.mid
                        });
                    }
                }

                // Manejo de Comentarios en Posts
                if (changes && changes.field === "comments") {
                    const comment = changes.value;
                    const senderId = comment.from.id;

                    await service.processIncomingMessage({
                        sourceId: senderId,
                        sourceType: "instagram",
                        name: comment.from.username,
                        text: `[Comentario]: ${comment.text}`,
                        metaMsgId: comment.id
                    });
                }
            }

            return res.status(200).send("OK");
        } catch (error) {
            console.error("Webhook Error:", error);
            return res.status(500).send("Internal Error");
        }
    }

    res.status(405).send("Method Not Allowed");
});

/**
 * Trigger para enviar NPS al cerrar conversación
 */
exports.sendNPSOnClose = onDocumentUpdated("conversations/{convId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status !== "closed" && afterData.status === "closed") {
        const service = new CustomerService(db);
        await service.sendExternalMessage(afterData.customer_id, {
            type: "template",
            template_name: "nps_survey"
        });
    }
});

/**
 * Función para transferir un ticket de un agente A a un agente B
 */
exports.assignAgent = onRequest(async (req, res) => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
    const { conversationId, newAgentId } = req.body;

    try {
        const convRef = db.collection("conversations").doc(conversationId);
        await convRef.update({
            assigned_agent_id: newAgentId,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("messages").add({
            conversation_id: conversationId,
            type: "internal_note",
            text: `Ticket reasignado al agente: ${newAgentId}`,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).send({ success: true });
    } catch (error) {
        console.error("AssignAgent Error:", error);
        return res.status(500).send("Internal Error");
    }
});
