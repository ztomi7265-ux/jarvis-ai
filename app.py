"""
JARVIS - Asistente de IA personal
----------------------------------
Backend en Flask. No necesitas entender todo este archivo para usarlo,
pero está comentado por si algún día quieres tocarlo.
"""

import os
import json
import re
import uuid
from datetime import datetime

from flask import Flask, request, jsonify, render_template, Response
from dotenv import load_dotenv
import requests

# Carga la API key desde el archivo .env
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODELO_TEXTO = "openai/gpt-oss-120b"   # modelo gratuito de Groq para texto
MODELO_VISION = "qwen/qwen3.6-27b"     # modelo gratuito de Groq con visión (entiende imágenes)

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "ErXwobaYiN019PkySvjV")  # voz por defecto
ELEVENLABS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{{}}"

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
_spotify_token_cache = {"token": None, "expira": 0}

CHATS_PATH = os.path.join(os.path.dirname(__file__), "chats.json")
NOTAS_PATH = os.path.join(os.path.dirname(__file__), "notas.json")
MAX_TURNOS_HISTORIAL = 24  # cuántos mensajes recientes recuerda Jarvis por chat

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB máx. por imagen


# ---------- CHATS (cada conversación se guarda por separado) ----------

def cargar_chats():
    if not os.path.exists(CHATS_PATH):
        return []
    with open(CHATS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_chats(chats):
    with open(CHATS_PATH, "w", encoding="utf-8") as f:
        json.dump(chats, f, ensure_ascii=False, indent=2)


def obtener_chat(chats, chat_id):
    for c in chats:
        if c["id"] == chat_id:
            return c
    return None


def crear_chat_nuevo():
    return {
        "id": str(uuid.uuid4()),
        "titulo": None,  # se pone solo con el primer mensaje
        "creado": datetime.now().isoformat(),
        "hechos": [],
        "historial": [],
    }


def titulo_desde_mensaje(mensaje, imagen):
    if imagen and not mensaje:
        return "Imagen"
    texto = mensaje.strip()
    if len(texto) > 42:
        texto = texto[:42].rstrip() + "…"
    return texto or "Nueva conversación"


# ---------- NOTAS (Jarvis las organiza automáticamente al pedírselo) ----------

def cargar_notas():
    if not os.path.exists(NOTAS_PATH):
        return []
    with open(NOTAS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_notas(notas):
    with open(NOTAS_PATH, "w", encoding="utf-8") as f:
        json.dump(notas, f, ensure_ascii=False, indent=2)


def obtener_nota(notas, nota_id):
    for n in notas:
        if n["id"] == nota_id:
            return n
    return None


def extraer_json(texto):
    """El modelo a veces envuelve el JSON en ```json ... ``` o agrega texto alrededor.
    Esto se queda solo con el bloque {...} más externo y lo parsea."""
    texto = texto.strip()
    texto = re.sub(r"^```(?:json)?\s*", "", texto)
    texto = re.sub(r"\s*```$", "", texto)
    inicio = texto.find("{")
    fin = texto.rfind("}")
    if inicio == -1 or fin == -1:
        raise ValueError("El modelo no devolvió JSON")
    return json.loads(texto[inicio:fin + 1])


def crear_nota_organizada(contenido_bruto):
    """Le pide al modelo que limpie y organice el contenido antes de guardarlo."""
    prompt = f"""Organiza el siguiente contenido en una nota clara, bien estructurada y
fácil de leer (usa listas con guiones si aplica, quita relleno innecesario, pero no
inventes información que no esté ahí). Responde ÚNICAMENTE con JSON, sin texto
adicional ni markdown, con esta forma exacta:
{{"titulo": "título corto y descriptivo (máx 8 palabras)", "contenido": "el contenido ya organizado, en texto plano con saltos de línea"}}

CONTENIDO A ORGANIZAR:
{contenido_bruto}
"""
    mensajes = [
        {"role": "system", "content": "Respondes únicamente con JSON válido, nada de texto adicional ni markdown."},
        {"role": "user", "content": prompt},
    ]
    respuesta = preguntar_al_modelo(mensajes, modelo=MODELO_TEXTO, max_tokens=900)
    try:
        datos = extraer_json(respuesta)
    except Exception:
        base = contenido_bruto.strip()
        datos = {
            "titulo": (base[:40] + "…") if len(base) > 40 else (base or "Nota"),
            "contenido": contenido_bruto,
        }

    nota = {
        "id": str(uuid.uuid4()),
        "titulo": (datos.get("titulo") or "Nota").strip()[:80],
        "contenido": datos.get("contenido", contenido_bruto),
        "creado": datetime.now().isoformat(),
        "actualizado": datetime.now().isoformat(),
    }
    notas = cargar_notas()
    notas.append(nota)
    guardar_notas(notas)
    return nota


@app.route("/api/notas", methods=["GET"])
def listar_notas():
    notas = cargar_notas()
    resumen = [
        {
            "id": n["id"],
            "titulo": n["titulo"],
            "creado": n.get("creado"),
            "resumen": (n["contenido"][:90] + "…") if len(n.get("contenido", "")) > 90 else n.get("contenido", ""),
        }
        for n in notas
    ]
    resumen.sort(key=lambda n: n["creado"] or "", reverse=True)
    return jsonify(resumen)


@app.route("/api/notas", methods=["POST"])
def crear_nota_manual():
    datos = request.get_json(force=True)
    titulo = (datos.get("titulo") or "").strip()
    contenido = (datos.get("contenido") or "").strip()
    if not titulo or not contenido:
        return jsonify({"error": "Falta el título o el contenido"}), 400
    nota = {
        "id": str(uuid.uuid4()),
        "titulo": titulo[:80],
        "contenido": contenido,
        "creado": datetime.now().isoformat(),
        "actualizado": datetime.now().isoformat(),
    }
    notas = cargar_notas()
    notas.append(nota)
    guardar_notas(notas)
    return jsonify(nota)


@app.route("/api/notas/<nota_id>", methods=["GET"])
def ver_nota(nota_id):
    notas = cargar_notas()
    nota = obtener_nota(notas, nota_id)
    if not nota:
        return jsonify({"error": "Nota no encontrada"}), 404
    return jsonify(nota)


@app.route("/api/notas/<nota_id>", methods=["DELETE"])
def borrar_nota(nota_id):
    notas = cargar_notas()
    notas = [n for n in notas if n["id"] != nota_id]
    guardar_notas(notas)
    return jsonify({"ok": True})


@app.route("/api/notas/<nota_id>", methods=["PATCH"])
def editar_nota(nota_id):
    datos = request.get_json(force=True)
    notas = cargar_notas()
    nota = obtener_nota(notas, nota_id)
    if not nota:
        return jsonify({"error": "Nota no encontrada"}), 404
    if "titulo" in datos:
        nota["titulo"] = (datos["titulo"] or "Nota").strip()[:80]
    if "contenido" in datos:
        nota["contenido"] = (datos["contenido"] or "").strip()
    nota["actualizado"] = datetime.now().isoformat()
    guardar_notas(notas)
    return jsonify(nota)


# ---------- BÚSQUEDA EN INTERNET (gratis, sin API key) ----------

def buscar_en_internet(consulta, max_resultados=4):
    try:
        from ddgs import DDGS
    except ImportError:
        from duckduckgo_search import DDGS  # nombre anterior del paquete

    try:
        with DDGS() as ddgs:
            resultados = list(ddgs.text(consulta, max_results=max_resultados, region="es-es"))
    except Exception as e:
        return f"(No se pudo buscar en internet: {e})"

    if not resultados:
        return "(Sin resultados de búsqueda)"

    bloques = []
    for r in resultados:
        titulo = r.get("title", "")
        cuerpo = r.get("body", "")
        url = r.get("href", "")
        bloques.append(f"- {titulo}: {cuerpo} (Fuente: {url})")
    return "\n".join(bloques)


# ---------- SPOTIFY (buscar y abrir canciones) ----------

def obtener_token_spotify():
    """Consigue (y cachea) un token de acceso de Spotify usando Client Credentials.
    Esto solo permite BUSCAR canciones, no requiere que el usuario inicie sesión."""
    ahora = datetime.now().timestamp()
    if _spotify_token_cache["token"] and ahora < _spotify_token_cache["expira"]:
        return _spotify_token_cache["token"]

    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        return None

    import base64
    credenciales = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {credenciales}", "Content-Type": "application/x-www-form-urlencoded"},
        data={"grant_type": "client_credentials"},
        timeout=15,
    )
    if resp.status_code != 200:
        return None
    datos = resp.json()
    _spotify_token_cache["token"] = datos["access_token"]
    _spotify_token_cache["expira"] = ahora + datos.get("expires_in", 3600) - 30
    return _spotify_token_cache["token"]


def buscar_cancion_spotify(consulta):
    token = obtener_token_spotify()
    if not token:
        return None
    resp = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {token}"},
        params={"q": consulta, "type": "track", "limit": 1},
        timeout=15,
    )
    if resp.status_code != 200:
        return None
    items = resp.json().get("tracks", {}).get("items", [])
    if not items:
        return None
    cancion = items[0]
    return {
        "nombre": cancion["name"],
        "artista": ", ".join(a["name"] for a in cancion["artists"]),
        "uri": cancion["uri"],
        "url": cancion["external_urls"]["spotify"],
    }


# ---------- MODELO DE IA (Groq, capa gratuita) ----------

def preguntar_al_modelo(mensajes, modelo=MODELO_TEXTO, max_tokens=800):
    if not GROQ_API_KEY:
        return ("⚠️ No encontré tu API key de Groq. Abre el archivo .env y pega tu "
                "clave en GROQ_API_KEY=... (es gratis, instrucciones en el README).")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": modelo,
        "messages": mensajes,
        "temperature": 0.6,
        "max_tokens": max_tokens,
    }
    try:
        resp = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"⚠️ Hubo un error hablando con el modelo: {e}"


# ---------- RUTAS ----------

@app.route("/")
def index():
    return render_template("index.html")


# ---------- API de chats guardados ----------

@app.route("/api/chats", methods=["GET"])
def listar_chats():
    chats = cargar_chats()
    resumen = [
        {
            "id": c["id"],
            "titulo": c.get("titulo") or "Nueva conversación",
            "creado": c.get("creado"),
            "cantidad_mensajes": len(c.get("historial", [])),
        }
        for c in chats
    ]
    resumen.sort(key=lambda c: c["creado"] or "", reverse=True)
    return jsonify(resumen)


@app.route("/api/chats/<chat_id>", methods=["GET"])
def ver_chat(chat_id):
    chats = cargar_chats()
    chat = obtener_chat(chats, chat_id)
    if not chat:
        return jsonify({"error": "Chat no encontrado"}), 404
    return jsonify(chat)


@app.route("/api/chats/<chat_id>", methods=["DELETE"])
def borrar_chat(chat_id):
    chats = cargar_chats()
    chats = [c for c in chats if c["id"] != chat_id]
    guardar_chats(chats)
    return jsonify({"ok": True})


@app.route("/api/chats/<chat_id>", methods=["PATCH"])
def renombrar_chat(chat_id):
    datos = request.get_json(force=True)
    nuevo_titulo = (datos.get("titulo") or "").strip()
    if not nuevo_titulo:
        return jsonify({"error": "Falta el nuevo título"}), 400
    chats = cargar_chats()
    chat = obtener_chat(chats, chat_id)
    if not chat:
        return jsonify({"error": "Chat no encontrado"}), 404
    chat["titulo"] = nuevo_titulo[:60]
    guardar_chats(chats)
    return jsonify(chat)


# ---------- Chat principal con Jarvis ----------

@app.route("/api/chat", methods=["POST"])
def chat():
    datos = request.get_json(force=True)
    mensaje_usuario = (datos.get("mensaje") or "").strip()
    buscar_internet = bool(datos.get("buscar_internet"))
    imagen = datos.get("imagen")  # data URL base64, ej. "data:image/png;base64,...."
    chat_id = datos.get("chat_id")

    if not mensaje_usuario and not imagen:
        return jsonify({"respuesta": "No escuché nada."})

    chats = cargar_chats()
    chat_actual = obtener_chat(chats, chat_id) if chat_id else None
    if chat_actual is None:
        chat_actual = crear_chat_nuevo()
        chats.append(chat_actual)

    if chat_actual["titulo"] is None:
        chat_actual["titulo"] = titulo_desde_mensaje(mensaje_usuario, imagen)

    # Comando: "anota/apunta/agrega a notas ..." -> Jarvis organiza y guarda una nota
    match_nota = re.match(
        r"(?i)^(?:anota|apunta|agrega(?:lo)?\s+a\s+(?:mis\s+)?notas?|guarda(?:lo)?\s+en\s+(?:mis\s+)?notas?)\b[:,]?\s*(.*)",
        mensaje_usuario
    ) if not imagen else None
    if match_nota:
        contenido_extra = match_nota.group(1).strip()
        if contenido_extra:
            base = contenido_extra
        else:
            # Sin contenido explícito: usa la última respuesta de Jarvis en este chat.
            anteriores = [m["content"] for m in chat_actual["historial"] if m["role"] == "assistant"]
            base = anteriores[-1] if anteriores else mensaje_usuario

        nota = crear_nota_organizada(base)
        texto_resp = f"Listo, lo agregué a tus notas como «{nota['titulo']}»."

        chat_actual["historial"].append({"role": "user", "content": mensaje_usuario})
        chat_actual["historial"].append({"role": "assistant", "content": texto_resp})
        chat_actual["historial"] = chat_actual["historial"][-MAX_TURNOS_HISTORIAL:]
        guardar_chats(chats)

        return jsonify({
            "respuesta": texto_resp,
            "nota_creada": {"id": nota["id"], "titulo": nota["titulo"]},
            "chat_id": chat_actual["id"],
            "titulo": chat_actual["titulo"],
        })

    # Comando: "pon/reproduce/toca <canción>" -> buscar y abrir en Spotify
    match_musica = re.match(r"(?i)^(?:pon|reproduce|reproducir|toca|toca la canción|pon la canción)\s+(.+)", mensaje_usuario) if not imagen else None
    if match_musica:
        consulta = match_musica.group(1).strip()
        cancion = buscar_cancion_spotify(consulta)
        if cancion:
            texto_resp = f"Reproduciendo «{cancion['nombre']}» de {cancion['artista']} en Spotify."
            chat_actual["historial"].append({"role": "user", "content": mensaje_usuario})
            chat_actual["historial"].append({"role": "assistant", "content": texto_resp})
            chat_actual["historial"] = chat_actual["historial"][-MAX_TURNOS_HISTORIAL:]
            guardar_chats(chats)
            return jsonify({"respuesta": texto_resp, "spotify": cancion, "chat_id": chat_actual["id"], "titulo": chat_actual["titulo"]})
        else:
            sin_config = not (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)
            texto_resp = (
                "⚠️ No tengo conectado Spotify todavía. Revisa el README para configurar "
                "SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en tu archivo .env."
                if sin_config else
                f"No encontré ninguna canción que coincida con «{consulta}»."
            )
            return jsonify({"respuesta": texto_resp, "chat_id": chat_actual["id"], "titulo": chat_actual["titulo"]})

    # Comando simple para guardar un dato permanente de este chat: "recuerda que ..."
    match = re.match(r"(?i)^recuerda(?:\s+que)?\s+(.+)", mensaje_usuario) if not imagen else None
    if match:
        hecho = match.group(1).strip()
        chat_actual["hechos"].append(hecho)
        guardar_chats(chats)
        return jsonify({"respuesta": f"Anotado. Lo tendré presente: «{hecho}».", "chat_id": chat_actual["id"], "titulo": chat_actual["titulo"]})

    contexto_busqueda = ""
    if buscar_internet and not imagen:
        contexto_busqueda = buscar_en_internet(mensaje_usuario)

    hechos_texto = "\n".join(f"- {h}" for h in chat_actual["hechos"]) or "(sin datos guardados todavía)"

    system_prompt = (
        "Eres JARVIS, un asistente de IA personal: cortés, ingenioso, directo y "
        "ligeramente sarcástico, al estilo del asistente de Iron Man, pero siempre "
        "útil ante todo. Respondes SIEMPRE en español, de forma clara y sin relleno. "
        f"\n\nDatos que el usuario te pidió recordar en esta conversación:\n{hechos_texto}"
    )
    if imagen:
        system_prompt += "\n\nEl usuario te acaba de mostrar una imagen. Analízala con detalle y responde su pregunta sobre ella."

    if contexto_busqueda:
        system_prompt += (
            f"\n\nResultados de una búsqueda reciente en internet sobre este tema:\n"
            f"{contexto_busqueda}\n\nÚsalos si son relevantes y cita la fuente cuando corresponda."
        )

    mensajes = [{"role": "system", "content": system_prompt}]
    mensajes.extend(chat_actual["historial"][-MAX_TURNOS_HISTORIAL:])

    if imagen:
        mensajes.append({
            "role": "user",
            "content": [
                {"type": "text", "text": mensaje_usuario or "Describe esta imagen con detalle."},
                {"type": "image_url", "image_url": {"url": imagen}},
            ],
        })
        respuesta = preguntar_al_modelo(mensajes, modelo=MODELO_VISION)
        texto_para_historial = f"[Imagen adjunta] {mensaje_usuario}".strip()
    else:
        mensajes.append({"role": "user", "content": mensaje_usuario})
        respuesta = preguntar_al_modelo(mensajes, modelo=MODELO_TEXTO)
        texto_para_historial = mensaje_usuario

    chat_actual["historial"].append({"role": "user", "content": texto_para_historial})
    chat_actual["historial"].append({"role": "assistant", "content": respuesta})
    chat_actual["historial"] = chat_actual["historial"][-MAX_TURNOS_HISTORIAL:]
    guardar_chats(chats)

    return jsonify({"respuesta": respuesta, "chat_id": chat_actual["id"], "titulo": chat_actual["titulo"]})


@app.route("/api/olvidar", methods=["POST"])
def olvidar():
    """Borra el historial y los datos recordados de un chat puntual (no lo elimina de la lista)."""
    datos = request.get_json(force=True)
    chat_id = datos.get("chat_id")
    chats = cargar_chats()
    chat_actual = obtener_chat(chats, chat_id) if chat_id else None
    if not chat_actual:
        return jsonify({"ok": True})
    chat_actual["hechos"] = []
    chat_actual["historial"] = []
    guardar_chats(chats)
    return jsonify({"ok": True})


@app.route("/api/hablar", methods=["POST"])
def hablar():
    """Convierte texto a voz usando ElevenLabs y devuelve el audio (mp3)."""
    datos = request.get_json(force=True)
    texto = (datos.get("texto") or "").strip()
    if not texto:
        return jsonify({"error": "sin texto"}), 400

    if not ELEVENLABS_API_KEY:
        return jsonify({"error": "sin_api_key"}), 503

    # El nivel gratuito de ElevenLabs limita ~2500 caracteres por solicitud
    texto = texto[:2400]

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": texto,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }
    try:
        resp = requests.post(
            ELEVENLABS_URL.format(ELEVENLABS_VOICE_ID),
            headers=headers, json=payload, timeout=30,
        )
        if resp.status_code != 200:
            return jsonify({"error": "elevenlabs_error", "detalle": resp.text[:300]}), 502
        return Response(resp.content, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 5000))
    modo_debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print(f"\n🤖 JARVIS está despertando... abre http://localhost:{puerto} en tu navegador\n")
    app.run(debug=modo_debug, host="0.0.0.0", port=puerto)
