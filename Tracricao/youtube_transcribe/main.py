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
PROXY_PORT = os.getenv("DATAIMPULSE_PORT", "10000")  # Sticky session recomendada

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

def get_transcript_with_retry(video_id, max_retries=3):
    for attempt in range(max_retries):
        try:
            # Primeiro tenta obter em português ou inglês
            try:
                transcript = YouTubeTranscriptApi.get_transcript(
                    video_id,
                    languages=["pt", "en"],
                    proxies=PROXY_CONFIG
                )
                logger.info(f"Transcrição obtida em PT/EN para {video_id}")
                return transcript
            except:
                # Se não encontrar PT/EN, tenta listar todas as transcrições
                try:
                    transcript_list = YouTubeTranscriptApi(proxies=PROXY_CONFIG).list_transcripts(video_id)
                    available_languages = []

                    # Coleta todos os idiomas disponíveis
                    for t in transcript_list:
                        available_languages.append(t.language_code)

                        # Se encontrar português ou inglês, usa diretamente
                        if t.language_code in ['pt', 'pt-BR', 'en', 'en-US']:
                            try:
                                result = t.fetch()
                                logger.info(f"Transcrição obtida em {t.language_code}")
                                return result
                            except:
                                continue

                    logger.info(f"Idiomas disponíveis: {available_languages}")

                    # Se não encontrou PT/EN, tenta qualquer idioma disponível
                    if available_languages:
                        # Tenta obter diretamente especificando o primeiro idioma disponível
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

                    # Última tentativa: pega qualquer transcrição disponível
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
    # Removido verificação do Supabase - sempre retorna False para processar
    return False, None

def save_to_supabase(video_id, transcription, contem):
    # Removido salvamento no Supabase
    logger.info(f"Transcrição processada para o vídeo {video_id}")
    return None

def process_video(url):
    try:
        logger.info(f"Iniciando processamento do vídeo: {url}")
        video_id = url.split("v=")[1] if "v=" in url else url.split("/")[-1]
        logger.info(f"ID do vídeo extraído: {video_id}")

        exists, existing_data = check_video_exists(video_id)
        if exists:
            logger.info(f"Vídeo {video_id} já existe no banco de dados")
            return {
                "video_id": video_id,
                "transcription": existing_data["trancription"],
                "contem": existing_data["contem"],
                "message": "Vídeo já processado anteriormente"
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
                "contem": True
            }

        except Exception as e:
            logger.error(f"Erro ao processar transcrição: {str(e)}")
            save_to_supabase(video_id, "", False)
            return {
                "video_id": video_id,
                "transcription": "",
                "contem": False,
                "error": str(e),
                "message": "Nenhuma transcrição disponível em nenhum idioma"
            }

    except Exception as e:
        logger.error(f"Erro em process_video: {str(e)}")
        raise
