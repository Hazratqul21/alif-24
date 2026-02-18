"""
Azure Speech Service - STT (Speech-to-Text) va TTS (Text-to-Speech)
Alif24 Platform - Azure Cognitive Services integratsiyasi
"""
import httpx
import os
from fastapi import HTTPException


class AzureSpeechService:
    """
    Azure Cognitive Services Speech Service
    - Text-to-Speech (TTS)
    - Speech-to-Text (STT) - keyingi versiyada
    """
    
    def __init__(self):
        self.speech_key = os.getenv("AZURE_SPEECH_KEY", "")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
        self.token_url = f"https://{self.speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        self.tts_url = f"https://{self.speech_region}.tts.speech.microsoft.com/cognitiveservices/v1"
        self.access_token = None
    
    def _get_access_token(self) -> str:
        """
        Fetch an access token from Azure Cognitive Services.
        Tokens are valid for 10 minutes.
        """
        headers = {
            "Ocp-Apim-Subscription-Key": self.speech_key
        }
        try:
            import requests
            response = requests.post(self.token_url, headers=headers)
            response.raise_for_status()
            return response.text
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to authenticate with Azure Speech: {e}")
    
    def generate_speech(self, text: str, voice_name: str = "uz-UZ-MadinaNeural") -> bytes:
        """
        Convert text to speech using Azure TTS REST API.
        Returns raw MP3 audio bytes.
        """
        if not self.speech_key or not self.speech_region:
            raise HTTPException(status_code=500, detail="Azure Speech configuration missing")
        
        # Get Token
        token = self._get_access_token()
        
        # Construct SSML
        from xml.sax.saxutils import escape
        escaped_text = escape(text)
        
        ssml = f"""<speak version='1.0' xml:lang='uz-UZ'>
            <voice xml:lang='uz-UZ' xml:gender='Female' name='{voice_name}'>
                {escaped_text}
            </voice>
        </speak>"""
        
        # Send TTS Request
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
            "User-Agent": "Alif24-Backend"
        }
        
        try:
            import requests
            response = requests.post(self.tts_url, headers=headers, data=ssml.encode('utf-8'))
            response.raise_for_status()
            return response.content
        except Exception as e:
            error_detail = str(e)
            raise HTTPException(status_code=500, detail=f"Azure TTS failed: {error_detail}")
    
    async def recognize_speech(self, audio_data: bytes, language: str = "uz-UZ") -> str:
        """
        Speech-to-Text (STT) using Azure Speech Service
        Keyingi versiyada to'liq implementatsiya
        """
        # TODO: Implement full STT with Azure Speech SDK or REST API
        raise NotImplementedError("STT will be implemented in the next version")


# Singleton instance
speech_service = AzureSpeechService()
