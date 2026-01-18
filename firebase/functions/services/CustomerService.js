const axios = require("axios");

/**
 * Service to handle Customer logic and Meta API communication
 */
class CustomerService {
    constructor(db) {
        this.db = db;
    }

    /**
     * Process an incoming message from Meta Webhook
     */
    async processIncomingMessage({ sourceId, sourceType, name, text, metaMsgId }) {
        const customerRef = await this._getOrCreateCustomer(sourceId, sourceType, name);

        // Buscar o crear conversación activa
        const conversationRef = await this._getActiveConversation(customerRef.id, sourceType);

        // Guardar mensaje
        await this.db.collection("messages").add({
            conversation_id: conversationRef.id,
            customer_id: customerRef.id,
            type: "incoming",
            text: text,
            timestamp: new Date(),
            meta_msg_id: metaMsgId,
        });
    }

    /**
     * Send message to Meta API (only if not internal_note)
     */
    async sendExternalMessage(customerId, messageData) {
        // Si el mensaje es una nota interna, NO enviamos a Meta
        if (messageData.type === "internal_note") {
            console.log("Internal note saved locally only.");
            return;
        }

        // Lógica para enviar a Meta (WhatsApp/Instagram)
        const customerDoc = await this.db.collection("customers").doc(customerId).get();
        const customer = customerDoc.data();

        try {
            if (customer.wa_id) {
                // WhatsApp Business API
                console.log(`Sending WhatsApp message to ${customer.wa_id}`);
                // axios.post(...)
            } else if (customer.ig_id) {
                // Instagram Graph API
                console.log(`Sending Instagram message to ${customer.ig_id}`);
                /*
                await axios.post(`https://graph.facebook.com/v21.0/${process.env.INSTAGRAM_PAGE_ID}/messages`, {
                    recipient: { id: customer.ig_id },
                    message: messageData
                }, {
                    headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
                });
                */
            }
            console.log(`External message processed via Meta API.`);
        } catch (error) {
            console.error("Meta API Error:", error.response?.data || error.message);
            throw error;
        }
    }

    async _getOrCreateCustomer(sourceId, sourceType, name) {
        const field = sourceType === "whatsapp" ? "wa_id" : "ig_id";

        // Buscar por el ID específico del canal
        const snapshot = await this.db.collection("customers").where(field, "==", sourceId).limit(1).get();

        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }

        // Si no existe, crear un nuevo perfil omnicanal
        const customerData = {
            name: name || "Cliente Nuevo",
            [field]: sourceId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_interaction: admin.firestore.FieldValue.serverTimestamp()
        };

        return await this.db.collection("customers").add(customerData);
    }

    async _getActiveConversation(customerId, sourceType) {
        const snapshot = await this.db.collection("conversations")
            .where("customer_id", "==", customerId)
            .where("status", "==", "open")
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return snapshot.docs[0].ref;
        }

        // Crear nueva conversación
        return await this.db.collection("conversations").add({
            customer_id: customerId,
            status: "open",
            channel_source: sourceType,
            assigned_agent_id: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}

module.exports = CustomerService;
