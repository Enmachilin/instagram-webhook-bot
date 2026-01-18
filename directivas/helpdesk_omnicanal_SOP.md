# Directiva: Helpdesk Omnicanal SOP

Esta directiva rige el desarrollo y mantenimiento del Helpdesk Omnicanal centralizado en Firebase.

## Arquitectura de Datos (Firestore)
- **Colección `customers`**: Unificado por `wa_id` o `ig_id`.
- **Colección `conversations`**: Maneja el estado del ticket y la asignación.
- **Colección `messages`**: Sub-colección o colección raíz con `conversation_id`. (Se recomienda raíz para consultas transversales).

## Reglas de Negocio
1. **Identificación de Cliente:** Antes de crear un cliente, buscar por `wa_id` o `ig_id`.
2. **Mensajería Externa:** Solo los mensajes de tipo `outgoing` activan la API de Meta. Los de tipo `internal_note` son persistencia pura en base de datos.
3. **Seguridad:** Los agentes solo tienen acceso de lectura/escritura a conversaciones asignadas (`assigned_agent_id == auth.uid`) o sin asignar (`assigned_agent_id == null`).

## Integraciones Meta
- **Validación de Webhook:** Usar `HUB_VERIFY_TOKEN` desde variables de entorno.
- **Tokens de Acceso:** No hardcodear tokens de Meta; usar Secret Manager o Firestore `.env`.

## Casos Borde
- **Mensajes Duplicados:** La API de Meta puede reintentar envíos. Validar `meta_msg_id` para evitar duplicados en Firestore.
- **Cambio de Agente:** Al reasignar, actualizar el `updated_at` de la conversación para subirla en la cola de prioridad.
