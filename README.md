# 🤖 Instagram Webhook Bot

Bot de automatización para Instagram desplegado en Vercel (Serverless).

## 📋 Funcionalidad

- ✅ Escucha comentarios en posts de Instagram
- ✅ Detecta palabras clave: `PRECIO`, `INFO` (case insensitive)
- ✅ Responde públicamente al comentario
- ✅ Envía mensaje directo (DM) al usuario

## 🚀 Despliegue en Vercel

### 1. Clonar/Subir el proyecto

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel
```

### 2. Configurar Variables de Entorno

En el dashboard de Vercel (Settings > Environment Variables):

| Variable | Descripción |
|----------|-------------|
| `PAGE_ACCESS_TOKEN` | Token de acceso de la página de Facebook/Instagram |
| `VERIFY_TOKEN` | Token de verificación personalizado (el que usarás en Meta) |

### 3. Configurar Webhook en Meta

1. Ve a [Meta for Developers](https://developers.facebook.com/)
2. Selecciona tu App > Webhooks
3. Configura el webhook:
   - **URL**: `https://tu-app.vercel.app/api`
   - **Verify Token**: El mismo que pusiste en `VERIFY_TOKEN`
   - **Suscripciones**: `comments` para Instagram

## 📁 Estructura del Proyecto

```
├── api/
│   └── index.js      # Webhook principal
├── package.json      # Dependencias
├── vercel.json       # Configuración de Vercel
├── .env.example      # Ejemplo de variables de entorno
└── README.md         # Documentación
```

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Crear archivo .env (copiar de .env.example)
cp .env.example .env

# Ejecutar en desarrollo
npm run dev
```

Para probar localmente, usa [ngrok](https://ngrok.com/) para exponer tu servidor:

```bash
ngrok http 3000
```

## 📝 Permisos Requeridos

Tu App de Meta necesita estos permisos:

- `pages_read_engagement`
- `pages_manage_engagement`
- `instagram_basic`
- `instagram_manage_comments`
- `instagram_manage_messages`

## ⚠️ Notas Importantes

1. **Respuesta rápida**: El webhook responde `200 EVENT_RECEIVED` inmediatamente para evitar timeouts de Meta.

2. **Palabras clave**: Puedes modificar el array `KEYWORDS` en `api/index.js` para cambiar las palabras que activan el bot.

3. **Mensaje DM**: Personaliza el mensaje en la función `sendDirectMessage()`.

## 🐛 Troubleshooting

- **Error 403 en verificación**: Verifica que `VERIFY_TOKEN` coincida en Vercel y Meta.
- **No se envían mensajes**: Revisa los logs en Vercel (Dashboard > Logs).
- **Permisos denegados**: Asegúrate de que la App esté en modo Live y tenga todos los permisos.

## 📄 Licencia

MIT
