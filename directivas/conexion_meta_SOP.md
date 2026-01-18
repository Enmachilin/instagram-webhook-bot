# SOP: Conexión de Webhooks de Meta (Instagram/WhatsApp)

Este documento detalla los pasos manuales necesarios para conectar el código desplegado en Firebase con los servicios de Meta.

## Requisitos Previos
1. Tener el CLI de Firebase instalado y logueado (`firebase login`).
2. Tener una App creada en [Meta for Developers](https://developers.facebook.com/).
3. Haber desplegado la función `webhookReceiver` (`firebase deploy --only functions`).

---

## Paso 1: Configurar Secretos en Firebase
Para que el webhook sea seguro, debes configurar los tokens en el entorno de Firebase:

```bash
firebase functions:secrets:set HUB_VERIFY_TOKEN="un_token_inventado_por_ti"
firebase functions:secrets:set META_ACCESS_TOKEN="tu_token_de_acceso_permanente"
firebase functions:secrets:set INSTAGRAM_PAGE_ID="id_de_tu_pagina_vinculada"
```

## Paso 2: Configurar Instagram en el Dashboard de Meta
1. Ve a tu App en el portal de Meta.
2. Agrega el producto **Instagram Graph API**.
3. Ve a **Configuración** -> **Webhooks**.
4. Selecciona el objeto **Instagram**.
5. Haz clic en **Edit Subscription**:
   - **Callback URL**: La URL que te dio Firebase al desplegar (ej: `https://...cloudfunctions.net/webhookReceiver`).
   - **Verify Token**: El valor que pusiste en `HUB_VERIFY_TOKEN`.
6. Haz clic en **Verify and Save**.

## Paso 3: Suscribirse a los Campos Correctos
Una vez verificado, debes suscribirte a:
- `messages`: Para recibir DMs.
- `comments`: Para recibir comentarios en posts.

## Paso 4: Configurar los Permisos
Asegúrate de que tu Token de Acceso tenga los siguientes permisos:
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_manage_comments`
- `pages_manage_metadata`

---

## Verificación de Flujo
1. Abre [interface_realtime.html](file:///c:/Users/enmas/OneDrive/Documentos/Pentacy-Evantra/Antigravity/ChatMulticanal/frontend/interface_realtime.html).
2. Envía un mensaje a tu cuenta de Instagram de prueba.
3. El mensaje llegará a Meta -> Webhook de Firebase -> Firestore -> Tu pantalla.
