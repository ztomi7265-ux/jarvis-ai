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
  `"recuerda que mi color favorito es el azul"` y lo guardará para siempre
  (en el archivo `memoria.json`).
- **Buscar en internet**: activa la casilla "🌐 Buscar en internet" antes de
  preguntarle algo que necesite información actual (noticias, precios,
  datos recientes).
- **Analizar imágenes**: dale clic al ícono 📎 junto a la caja de texto,
  elige una foto (captura de pantalla, documento, lo que sea), escribe
  opcionalmente una pregunta sobre ella, y envíala. Jarvis la analiza y te
  responde.
- Botón **"Olvidar"**: borra toda la memoria y el historial si quieres
  empezar de cero.

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

## ¿Algo no funciona?

Los errores más comunes:
- **"python no se reconoce como un comando"** → No marcaste "Add to PATH"
  al instalar Python. Vuelve a instalarlo y marca esa casilla.
- **Jarvis responde con un mensaje de advertencia (⚠️)** → Revisa que tu
  archivo `.env` tenga la clave de Groq bien pegada, sin espacios extra.
- **El micrófono no aparece o no funciona** → Usa Chrome o Edge, y
  permite el acceso al micrófono cuando el navegador lo pida.
