"""
Azure Speech Service for Harf Platform
TTS (Text-to-Speech) and STT (Speech-to-Text)
"""
import httpx
from fastapi import HTTPException
from app.core.config import settings


class AzureSpeechService:
    def __init__(self):
        self.speech_key = getattr(settings, 'AZURE_SPEECH_KEY', '')
        self.speech_region = getattr(settings, 'AZURE_SPEECH_REGION', 'eastus')
        self.token_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        self.tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self.access_token = None

    async def _get_access_token(self) -> str:
        """Fetch access token from Azure Cognitive Services"""
        if not self.speech_key:
            raise HTTPException(status_code=500, detail="Azure Speech key not configured")
        
        headers = {
            "Ocp-Apim-Subscription-Key": self.speech_key
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(self.token_url, headers=headers)
                response.raise_for_status()
                return response.text
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"Failed to authenticate with Azure Speech: {e}")

    async def generate_speech(self, text: str, voice_name: str = "uz-UZ-MadinaNeural") -> bytes:
        """Convert text to speech using Azure TTS REST API"""
        if not self.speech_key or not self.speech_region:
            raise HTTPException(status_code=500, detail="Azure Speech configuration missing")

        token = await self._get_access_token()

        from xml.sax.saxutils import escape
        escaped_text = escape(text)
        
        ssml = f"""
        <speak version='1.0' xml:lang='uz-UZ'>
            <voice xml:lang='uz-UZ' xml:gender='Female' name='{voice_name}'>
                {escaped_text}
            </voice>
        </speak>
        """

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            "User-Agent": "Harf-Platform"
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.tts_url, headers=headers, content=ssml.encode('utf-8'))
                response.raise_for_status()
                return response.content
        except httpx.HTTPError as e:
            error_detail = str(e)
            if hasattr(e, 'response') and e.response is not None:
                error_detail = e.response.text
            raise HTTPException(status_code=500, detail=f"Azure TTS failed: {error_detail}")


speech_service = AzureSpeechService()
