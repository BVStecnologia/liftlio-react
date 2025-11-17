# main.py
import os
import logging
import time
from random import uniform
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuração do proxy DataImpulse
PROXY_LOGIN = os.getenv("DATAIMPULSE_LOGIN", "")
PROXY_PASSWORD = os.getenv("DATAIMPULSE_PASSWORD", "")
PROXY_HOST = os.getenv("DATAIMPULSE_HOST", "gw.dataimpulse.com")
PROXY_PORT = os.getenv("DATAIMPULSE_PORT", "10000")

# Inicializar proxy config se credenciais estiverem disponíveis
PROXY_CONFIG = None
if PROXY_LOGIN and PROXY_PASSWORD:
    proxy_url = f"http://{PROXY_LOGIN}:{PROXY_PASSWORD}@{PROXY_HOST}:{PROXY_PORT}"
    PROXY_CONFIG = GenericProxyConfig(
        http_url=proxy_url,
        https_url=proxy_url
    )
    logger.info(f"Proxy DataImpulse configurado: {PROXY_HOST}:{PROXY_PORT}")
else:
    logger.warning("Proxy DataImpulse não configurado - usando conexão direta")

# ============================================
# Supabase Cache Configuration
# ============================================
SUPABASE_ENABLED = False
supabase_client = None

try:
    from supabase import create_client, Client

    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        SUPABASE_ENABLED = True
        logger.info(f"Supabase cache HABILITADO")
    else:
        logger.warning("Supabase cache DESABILITADO (credenciais não configuradas)")
except ImportError:
    logger.warning("Supabase cache DESABILITADO (biblioteca supabase não instalada)")
except Exception as e:
    logger.error(f"Erro ao inicializar Supabase (funcionando sem cache): {e}")

def get_transcript_with_retry(video_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            try:
                transcript = YouTubeTranscriptApi.get_transcript(
                    video_id,
                    languages=["pt", "en"],
                    proxies=PROXY_CONFIG
                )
                logger.info(f"Transcrição obtida em PT/EN para {video_id}")
                return transcript
            except:
                try:
                    transcript_list = YouTubeTranscriptApi(proxies=PROXY_CONFIG).list_transcripts(video_id)
                    available_languages = []

                    for t in transcript_list:
                        available_languages.append(t.language_code)

                        if t.language_code in ['pt', 'pt-BR', 'en', 'en-US']:
                            try:
                                result = t.fetch()
                                logger.info(f"Transcrição obtida em {t.language_code}")
                                return result
                            except:
                                continue

                    logger.info(f"Idiomas disponíveis: {available_languages}")

                    if available_languages:
                        transcript = YouTubeTranscriptApi.get_transcript(
                            video_id,
                            languages=[available_languages[0]],
                            proxies=PROXY_CONFIG
                        )
                        logger.info(f"Transcrição obtida em {available_languages[0]}")
                        return transcript
                    else:
                        raise Exception("Nenhum idioma disponível")

                except Exception as list_error:
                    logger.warning(f"Erro ao listar transcrições: {str(list_error)}")

                    try:
                        transcript = YouTubeTranscriptApi.get_transcript(
                            video_id,
                            proxies=PROXY_CONFIG
                        )
                        logger.info(f"Transcrição obtida (idioma padrão)")
                        return transcript
                    except:
                        raise Exception("Nenhuma transcrição disponível")

        except Exception as e:
            logger.error(f"Tentativa {attempt + 1} falhou: {str(e)}")
            if attempt == max_retries - 1:
                raise e
            time.sleep(uniform(2, 5))
            continue

def format_timestamp(seconds):
    minutes = int(seconds) // 60
    remaining_seconds = int(seconds) % 60
    return f"{minutes:02d}:{remaining_seconds:02d}"

def check_video_exists(video_id):
    if not SUPABASE_ENABLED:
        return False, None

    try:
        logger.debug(f"Verificando cache para video_id: {video_id}")

        result = supabase_client.table("Videos_trancricao").select("video_id, trancription, contem").eq("video_id", video_id).order("created_at", desc=True).limit(1).execute()

        if result.data and len(result.data) > 0:
            cached_item = result.data[0]

            if cached_item.get("contem") and cached_item.get("trancription"):
                logger.info(f"CACHE HIT: {video_id}")
                return True, cached_item
            else:
                logger.info(f"Cache encontrado mas vazio para {video_id}")
                return False, None

        logger.info(f"CACHE MISS: {video_id}")
        return False, None

    except Exception as e:
        logger.warning(f"Erro ao verificar cache (continuando sem cache): {e}")
        return False, None

def save_to_supabase(video_id, transcription, contem):
    if not SUPABASE_ENABLED:
        logger.debug(f"Cache desabilitado")
        return None

    try:
        logger.debug(f"Salvando em cache: {video_id}")

        data = {
            "video_id": video_id,
            "trancription": transcription,
            "contem": contem
        }

        supabase_client.table("Videos_trancricao").upsert(data, on_conflict="video_id").execute()

        logger.info(f"CACHE SAVED: {video_id}")
        return True

    except Exception as e:
        logger.warning(f"Erro ao salvar cache: {e}")
        return None

def process_video(url):
    try:
        logger.info(f"Iniciando processamento do vídeo: {url}")
        video_id = url.split("v=")[1] if "v=" in url else url.split("/")[-1]
        logger.info(f"ID do vídeo extraído: {video_id}")

        exists, existing_data = check_video_exists(video_id)
        if exists:
            logger.info(f"Vídeo {video_id} retornado do CACHE")
            return {
                "video_id": video_id,
                "transcription": existing_data["trancription"],
                "contem": existing_data["contem"],
                "message": "Vídeo já processado anteriormente",
                "from_cache": True
            }

        try:
            transcript = get_transcript_with_retry(video_id)
            logger.info(f"Transcrição obtida com sucesso para {video_id}")

            formatted_segments = []
            for segment in transcript:
                timestamp = format_timestamp(segment["start"])
                segment_text = segment["text"].strip()
                formatted_segments.append(f"[{timestamp}] {segment_text}")

            full_text = "\n\n".join(formatted_segments)
            final_text = f"""TRANSCRIÇÃO DO VÍDEO
ID: {video_id}
{"=" * 50}

{full_text}

{"=" * 50}"""

            save_to_supabase(video_id, final_text, True)
            logger.info("Transcrição salva com sucesso")

            return {
                "video_id": video_id,
                "transcription": final_text,
                "contem": True,
                "from_cache": False
            }

        except Exception as e:
            logger.error(f"Erro ao processar transcrição: {str(e)}")
            save_to_supabase(video_id, "", False)
            return {
                "video_id": video_id,
                "transcription": "",
                "contem": False,
                "error": str(e),
                "message": "Nenhuma transcrição disponível em nenhum idioma",
                "from_cache": False
            }

    except Exception as e:
        logger.error(f"Erro em process_video: {str(e)}")
        raise
