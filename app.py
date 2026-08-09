"""
JARVIS - Asistente de IA personal
----------------------------------
Backend en Flask. No necesitas entender todo este archivo para usarlo,
pero está comentado por si algún día quieres tocarlo.
"""

import os
import json
import re
from datetime import datetime

from flask import Flask, request, jsonify, render_template
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

MEMORIA_PATH = os.path.join(os.path.dirname(__file__), "memoria.json")
MAX_TURNOS_HISTORIAL = 16  # cuántos mensajes recientes recuerda Jarvis

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024  # 8 MB máx. por imagen


# ---------- MEMORIA ----------

def cargar_memoria():
    if not os.path.exists(MEMORIA_PATH):
        return {"hechos": [], "historial": []}
    with open(MEMORIA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def guardar_memoria(memoria):
    with open(MEMORIA_PATH, "w", encoding="utf-8") as f:
        json.dump(memoria, f, ensure_ascii=False, indent=2)


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

def preguntar_al_modelo(mensajes, modelo=MODELO_TEXTO):
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
        "max_tokens": 800,
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


@app.route("/api/chat", methods=["POST"])
def chat():
    datos = request.get_json(force=True)
    mensaje_usuario = (datos.get("mensaje") or "").strip()
    buscar_internet = bool(datos.get("buscar_internet"))
    imagen = datos.get("imagen")  # data URL base64, ej. "data:image/png;base64,...."

    if not mensaje_usuario and not imagen:
        return jsonify({"respuesta": "No escuché nada."})

    memoria = cargar_memoria()

    # Comando: "pon/reproduce/toca <canción>" -> buscar y abrir en Spotify
    match_musica = re.match(r"(?i)^(?:pon|reproduce|reproducir|toca|toca la canción|pon la canción)\s+(.+)", mensaje_usuario) if not imagen else None
    if match_musica:
        consulta = match_musica.group(1).strip()
        cancion = buscar_cancion_spotify(consulta)
        if cancion:
            texto_resp = f"Reproduciendo «{cancion['nombre']}» de {cancion['artista']} en Spotify."
            memoria["historial"].append({"role": "user", "content": mensaje_usuario})
            memoria["historial"].append({"role": "assistant", "content": texto_resp})
            memoria["historial"] = memoria["historial"][-MAX_TURNOS_HISTORIAL:]
            guardar_memoria(memoria)
            return jsonify({"respuesta": texto_resp, "spotify": cancion})
        else:
            sin_config = not (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET)
            texto_resp = (
                "⚠️ No tengo conectado Spotify todavía. Revisa el README para configurar "
                "SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en tu archivo .env."
                if sin_config else
                f"No encontré ninguna canción que coincida con «{consulta}»."
            )
            return jsonify({"respuesta": texto_resp})

    # Comando simple para guardar un dato permanente: "recuerda que ..."
    match = re.match(r"(?i)^recuerda(?:\s+que)?\s+(.+)", mensaje_usuario) if not imagen else None
    if match:
        hecho = match.group(1).strip()
        memoria["hechos"].append(hecho)
        guardar_memoria(memoria)
        return jsonify({"respuesta": f"Anotado. Lo tendré presente: «{hecho}»."})

    contexto_busqueda = ""
    if buscar_internet and not imagen:
        contexto_busqueda = buscar_en_internet(mensaje_usuario)

    hechos_texto = "\n".join(f"- {h}" for h in memoria["hechos"]) or "(sin datos guardados todavía)"

    system_prompt = (
        "Eres JARVIS, un asistente de IA personal: cortés, ingenioso, directo y "
        "ligeramente sarcástico, al estilo del asistente de Iron Man, pero siempre "
        "útil ante todo. Respondes SIEMPRE en español, de forma clara y sin relleno. "
        f"\n\nDatos que el usuario te pidió recordar:\n{hechos_texto}"
    )
    if imagen:
        system_prompt += "\n\nEl usuario te acaba de mostrar una imagen. Analízala con detalle y responde su pregunta sobre ella."

    if contexto_busqueda:
        system_prompt += (
            f"\n\nResultados de una búsqueda reciente en internet sobre este tema:\n"
            f"{contexto_busqueda}\n\nÚsalos si son relevantes y cita la fuente cuando corresponda."
        )

    mensajes = [{"role": "system", "content": system_prompt}]
    mensajes.extend(memoria["historial"][-MAX_TURNOS_HISTORIAL:])

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

    memoria["historial"].append({"role": "user", "content": texto_para_historial})
    memoria["historial"].append({"role": "assistant", "content": respuesta})
    memoria["historial"] = memoria["historial"][-MAX_TURNOS_HISTORIAL:]
    guardar_memoria(memoria)

    return jsonify({"respuesta": respuesta})


@app.route("/api/olvidar", methods=["POST"])
def olvidar():
    """Borra toda la memoria (historial y hechos guardados)."""
    guardar_memoria({"hechos": [], "historial": []})
    return jsonify({"ok": True})


@app.route("/api/hablar", methods=["POST"])
def hablar():
    """Convierte texto a voz usando ElevenLabs y devuelve el audio (mp3)."""
    from flask import Response

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
    print("\n🤖 JARVIS está despertando... abre http://localhost:5000 en tu navegador\n")
    app.run(debug=True, port=5000)
