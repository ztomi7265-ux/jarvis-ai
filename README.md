# 🤖 JARVIS — tu asistente de IA personal

Guía paso a paso para que lo tengas funcionando en tu computadora con Windows,
aunque nunca hayas programado.

## ¿Qué vas a instalar? (todo gratis)

1. **Python** — el lenguaje que corre el "cerebro" de Jarvis.
2. **Visual Studio Code** (opcional, pero recomendado) — para abrir la carpeta
   del proyecto fácilmente.
3. Una **clave gratuita de Groq** — es el servicio que le presta la
   inteligencia a Jarvis (como el "cerebro"). Tiene un nivel gratuito
   generoso, no pide tarjeta de crédito.

---

## Paso 1 — Instalar Python

1. Ve a **https://www.python.org/downloads/** y descarga la última versión
   para Windows.
2. Abre el instalador. **Muy importante:** marca la casilla
   **"Add python.exe to PATH"** antes de darle a "Install Now".
3. Para comprobar que quedó bien: abre el menú Inicio, escribe `cmd`, abre la
   "Símbolo del sistema" y escribe:
   ```
   python --version
   ```
   Si te muestra un número de versión (ej. `Python 3.12.4`), quedó instalado.

## Paso 2 — Instalar Visual Studio Code (opcional)

Descárgalo de **https://code.visualstudio.com/** e instálalo con las
opciones por defecto. Te sirve para abrir la carpeta del proyecto y ver los
archivos, pero no es obligatorio: también puedes usar el Bloc de notas y la
Símbolo del sistema.

## Paso 3 — Descargar los archivos de Jarvis

Descarga (o copia) la carpeta `jarvis-ai` completa a un lugar fácil de
encontrar, por ejemplo `C:\Users\TU_USUARIO\jarvis-ai`.

## Paso 4 — Consigue tu clave gratuita de Groq

1. Entra a **https://console.groq.com/keys**
2. Crea una cuenta gratis (con tu correo o con Google).
3. Dale a **"Create API Key"**, ponle un nombre (ej. "jarvis") y copia la
   clave que te muestra (empieza algo así como `gsk_...`). Solo la vas a ver
   una vez, así que cópiala ya.
4. Dentro de la carpeta `jarvis-ai`, busca el archivo `.env.example`,
   haz una copia y renómbrala a **`.env`** (sin ".example").
5. Ábrelo con el Bloc de notas y pega tu clave así:
   ```
   GROQ_API_KEY=gsk_tu_clave_aqui
   ```
   Guarda el archivo.

## Paso 4.5 — (Opcional) Dale a Jarvis una voz de ElevenLabs

Por defecto Jarvis habla con la voz que trae tu navegador. Si prefieres una
voz más realista, puedes conectar ElevenLabs — tiene un nivel gratuito,
aunque con límite mensual (no es tan ilimitado como la del navegador):

1. Crea una cuenta gratis en **https://elevenlabs.io/app/sign-up**
2. El plan gratis te da aproximadamente **10 minutos de audio al mes**
   (se renueva cada mes). Si se acaba, Jarvis vuelve automáticamente a la
   voz del navegador sin que tengas que hacer nada.
3. Ve a tu perfil (ícono arriba a la derecha) → **"API Keys"** y crea una
   clave nueva. Cópiala.
4. En tu archivo `.env`, agrega:
   ```
   ELEVENLABS_API_KEY=tu_clave_aqui
   ```
5. Para elegir la voz: entra a **https://elevenlabs.io/app/voice-library**,
   escucha las opciones, y cuando encuentres una que te guste dale a
   **"Add to my voices"**. Luego ve a **"My Voices"**, ábrela y copia su
   **Voice ID** (un código como `ErXwobaYiN019PkySvjV`).
6. Pega ese ID en tu `.env`:
   ```
   ELEVENLABS_VOICE_ID=el_id_que_copiaste
   ```
   Si no pones nada, Jarvis usa una voz por defecto (masculina, en inglés
   pero funciona razonablemente con texto en español gracias al modelo
   multilingüe).

Si no configuras nada de esto, Jarvis simplemente sigue usando la voz del
navegador — no es obligatorio.

## Paso 4.6 — (Opcional) Que Jarvis ponga música en Spotify

1. Entra a **https://developer.spotify.com/dashboard** e inicia sesión con
   tu cuenta normal de Spotify (gratis o Premium, cualquiera sirve para esto).
2. Dale a **"Create app"**. Ponle un nombre (ej. "Jarvis") y una descripción
   cualquiera.
3. En "Redirect URI" pon `http://localhost:5000` (no lo vamos a usar de
   verdad, pero Spotify pide que pongas algo). Acepta los términos y crea
   la app.
4. Dentro de tu app, dale a **"Settings"** y copia el **Client ID** y el
   **Client Secret** (dale a "View client secret" para verlo).
5. Agrégalos a tu archivo `.env`:
   ```
   SPOTIFY_CLIENT_ID=tu_client_id
   SPOTIFY_CLIENT_SECRET=tu_client_secret
   ```
6. Reinicia Jarvis (`Ctrl+C` y `python app.py` otra vez).

Ahora puedes decirle (por texto o por voz): **"pon Bohemian Rhapsody"** o
**"reproduce la de Bad Bunny que se llama Monaco"**, y Jarvis va a buscar
la canción y abrir tu app de Spotify para reproducirla automáticamente.

**Importante:** esto necesita que ya tengas la aplicación de Spotify
instalada en tu computadora (no el navegador) para que la canción empiece
a sonar sola. Si no la tienes instalada, Jarvis igual te va a dejar un
botón "🎵 Abrir en Spotify" en el chat para abrirla en el navegador y
darle play tú mismo.

## Paso 5 — Instalar lo que Jarvis necesita (una sola vez)

1. Abre la Símbolo del sistema (`cmd`).
2. Navega hasta la carpeta del proyecto, por ejemplo:
   ```
   cd C:\Users\TU_USUARIO\jarvis-ai
   ```
3. Instala las dependencias con:
   ```
   pip install -r requirements.txt
   ```
   Espera a que termine (puede tardar un par de minutos).

## Paso 6 — Encender a Jarvis

Desde esa misma ventana, escribe:
```
python app.py
```
Vas a ver un mensaje como `Running on http://127.0.0.1:5000`. Abre tu
navegador (recomendado: **Google Chrome** o **Edge**, por el micrófono) y
entra a:

```
http://localhost:5000
```

¡Listo! Ya puedes escribirle o hablarle a Jarvis con el botón del micrófono.

Para apagarlo, vuelve a la ventana negra y presiona `Ctrl + C`. Para
volver a encenderlo otro día, repite solo el **Paso 6** (`python app.py`).

---

## ¿Qué sabe hacer Jarvis ahora mismo?

- **Conversar** contigo por texto o por voz (botón del micrófono).
- **Recordar cosas** que le pidas explícitamente: escríbele
  `"recuerda que mi color favorito es el azul"` y lo guardará para esa
  conversación (en el archivo `chats.json`).
- **Buscar en internet**: activa la casilla "🌐 Buscar en internet" antes de
  preguntarle algo que necesite información actual (noticias, precios,
  datos recientes).
- **Analizar imágenes**: dale clic al ícono 📎 junto a la caja de texto,
  elige una foto (captura de pantalla, documento, lo que sea), escribe
  opcionalmente una pregunta sobre ella, y envíala. Jarvis la analiza y te
  responde.
- **Reproducir música**: dile "pon [canción]", "reproduce [canción]" o
  "toca [canción]" y Jarvis la busca y abre en Spotify.
- Botón **"✕" junto al mensaje**: borra el historial de la conversación
  actual si quieres empezar de cero en ese mismo chat.

## 💬 Chats guardados

Arriba a la derecha hay un botón **"💬 Chats"**. Cada conversación que
tienes con Jarvis queda guardada por separado, como en cualquier app de
chat:

- El botón **"＋"** (junto al nombre del chat activo, o dentro del panel
  de Chats) empieza una conversación nueva en blanco.
- Cada chat guarda su propio historial y también lo que le pediste
  "recordar" dentro de esa conversación específica (no se mezcla entre
  chats).
- El título de cada chat se pone solo, tomando tus primeras palabras del
  primer mensaje.
- Desde el panel de Chats puedes reabrir cualquier conversación anterior
  o borrarla (ícono 🗑) para siempre.

## 🔥 Paso 4.7 — (Recomendado si vas a publicar en Render) Guardar chats y notas para siempre

Sin esto, tus chats y notas se van a borrar cada vez que Render reinicie
Jarvis (al actualizar, o cuando "despierta" tras estar dormido). Con
Firebase (gratis, de Google, sin tarjeta) quedan guardados de verdad.

1. Ve a **https://console.firebase.google.com** e inicia sesión con una
   cuenta de Google.
2. Dale a **"Crear un proyecto"** (o "Add project"). Ponle un nombre (ej.
   "jarvis"), y sigue los pasos (puedes desactivar Google Analytics, no
   lo necesitas). Espera a que se cree.
3. En el menú de la izquierda, busca **"Compilación"** (Build) →
   **"Realtime Database"**. Dale a **"Crear base de datos"**.
4. Elige la ubicación que te sugiera (cualquiera sirve) y cuando te
   pregunte el modo de seguridad, elige **"Modo de prueba"** (test mode).
5. Ya creada, copia la **URL** que aparece arriba de la base de datos —
   se ve algo así: `https://jarvis-xxxxx-default-rtdb.firebaseio.com`
6. Ve a la pestaña **"Reglas"** (Rules) de esa misma base de datos, borra
   lo que hay y pega esto en su lugar:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
   Dale a **"Publicar"**. (El modo de prueba normal se cierra solo en 30
   días; con esta regla se queda abierto para siempre. Esto significa que
   cualquiera que se consiga esa URL exacta podría leer o escribir ahí —
   trátala como una contraseña: no la compartas ni la subas a un
   repositorio público de GitHub. Como el PIN de acceso, es una traba
   simple para uso personal, no seguridad de nivel bancario.)
7. Pega esa URL en tu `.env`:
   ```
   FIREBASE_DB_URL=https://jarvis-xxxxx-default-rtdb.firebaseio.com
   ```
8. Si ya publicaste Jarvis en Render, agrega esa misma variable en
   **Environment Variables** dentro de tu servicio en Render, y vuelve a
   desplegar (Manual Deploy → Deploy latest commit).

Con esto, tus chats y notas quedan guardados en Firebase para siempre, sin
importar cuántas veces Render reinicie o tú actualices el código. Si
nunca configuras esto, Jarvis sigue funcionando igual que antes, solo que
usando archivos locales (que si se borran en cada reinicio de Render).

## Notas importantes

- El reconocimiento de voz (hablarle a Jarvis) usa una función del
  navegador que **solo funciona en Chrome o Edge**, no en Firefox.
- Todo corre **en tu computadora** (localhost). Solo se conecta a internet
  para hablar con el modelo de IA (Groq) y, si activas la casilla, para
  buscar. Es privado y gratis mientras te mantengas dentro del límite
  gratuito de Groq (muy generoso para uso personal).
- Si algún día quieres que Jarvis sea accesible desde tu celular o desde
  cualquier lugar (no solo tu compu), el siguiente paso sería "publicarlo"
  en un servicio gratuito como Render o Railway — puedo ayudarte con eso
  cuando quieras dar ese salto.

## Paso 7 — Publicar Jarvis en internet (para usarlo desde el iPad, o donde sea)

Como tu iPad no está en la misma red que tu PC, la mejor opción es **publicar
Jarvis en internet gratis**, con una dirección web fija. Así lo abres desde
el iPad (o cualquier dispositivo) usando solo Chrome, sin instalar nada ahí,
y sin depender de que tu PC esté prendida. Se hace con dos cuentas gratis:
**GitHub** (donde subes los archivos) y **Render** (donde vive Jarvis en
internet). Todo por el navegador, no necesitas instalar nada nuevo en tu PC.

### 7.1 — Sube el proyecto a GitHub

1. Crea una cuenta gratis en **https://github.com** (si no tienes una).
2. Dale clic a **"New repository"** (o el botón verde "New"). Ponle un
   nombre, por ejemplo `jarvis-ai`. Déjalo en **"Public"**. No marques
   ninguna otra opción. Dale a **"Create repository"**.
3. En la página del repositorio recién creado, busca el enlace
   **"uploading an existing file"** (o el botón "Add file" → "Upload files").
4. Arrastra **todos los archivos y carpetas** de tu `jarvis-ai` a esa
   ventana (app.py, requirements.txt, README.md, templates, static — todo
   menos el archivo `.env`, ese **NUNCA** lo subas porque tiene tus claves
   secretas).
5. Baja y dale a **"Commit changes"** para guardar la subida.

### 7.2 — Conecta Render a ese repositorio

1. Crea una cuenta gratis en **https://render.com** (puedes entrar
   directamente con tu cuenta de GitHub, no pide tarjeta).
2. Dale a **"New +"** → **"Web Service"**.
3. Elige tu repositorio `jarvis-ai` de la lista (autoriza a Render a verlo
   si te lo pide).
4. En la configuración:
   - **Name**: el que quieras, ej. `jarvis-ai`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python app.py`
   - **Instance Type**: elige el plan **"Free"**
5. Baja hasta **"Environment Variables"** y agrega ahí las mismas claves
   que tienes en tu `.env` (una por una, con "Add Environment Variable"):
   - `GROQ_API_KEY`
   - `ELEVENLABS_API_KEY` (si la usas)
   - `ELEVENLABS_VOICE_ID` (si la usas)
   - `SPOTIFY_CLIENT_ID` (si lo usas)
   - `SPOTIFY_CLIENT_SECRET` (si lo usas)
6. Dale a **"Create Web Service"**. Render va a instalar todo y prender a
   Jarvis — tarda unos minutos la primera vez. Cuando termine, arriba te
   muestra una dirección tipo `https://jarvis-ai-xxxx.onrender.com`.

Esa dirección es la definitiva. Ábrela en Chrome desde tu iPad (o
cualquier dispositivo, desde cualquier red) y ahí tienes a Jarvis
funcionando completo — texto, voz y micrófono incluidos, porque ya es una
dirección seguras (https).

**Cosas a saber del plan gratis de Render:**
- Si nadie usa Jarvis por un rato, se "duerme" solo para ahorrar recursos.
  La próxima vez que entres, puede tardar hasta un minuto en despertar —
  es normal, solo espera.
- La memoria de Jarvis (lo que le pediste recordar) puede reiniciarse
  cuando el servicio se reinicia o lo actualizas. Para uso personal del
  día a día no debería ser un problema grande.
- Cada vez que quieras actualizar a Jarvis (por ejemplo si yo te doy
  archivos nuevos), subes los archivos actualizados a GitHub de la misma
  forma (Paso 7.1) y Render lo vuelve a publicar solo.

Los errores más comunes:
- **"python no se reconoce como un comando"** → No marcaste "Add to PATH"
  al instalar Python. Vuelve a instalarlo y marca esa casilla.
- **Jarvis responde con un mensaje de advertencia (⚠️)** → Revisa que tu
  archivo `.env` (o las Environment Variables en Render) tenga la clave
  de Groq bien puesta, sin espacios extra.
- **El micrófono no aparece o no funciona** → Usa Chrome o Edge, permite
  el acceso al micrófono cuando el navegador lo pida, y asegúrate de estar
  entrando por la dirección `https://...onrender.com` (no por una `http://`
  normal).
