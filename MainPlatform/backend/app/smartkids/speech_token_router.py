"""
Azure Speech SDK Token endpoint
"""
from fastapi import APIRouter, HTTPException
import httpx
from ..core.config import settings

router = APIRouter()

@router.get("/speech-token")
async def get_speech_token():
    """
    Azure Speech SDK uchun token olish.
    Frontend bu token bilan ishlatadi (key o'rniga)
    """
    try:
        speech_key = settings.AZURE_SPEECH_KEY
        speech_region = settings.AZURE_SPEECH_REGION
        
        if not speech_key:
            raise HTTPException(status_code=500, detail="AZURE_SPEECH_KEY not configured")
        
        # Azure Speech token endpoint
        token_url = f"https://{speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
        
        headers = {
            'Ocp-Apim-Subscription-Key': speech_key
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, headers=headers, timeout=10.0)
        
        if response.status_code == 200:
            return {
                "token": response.text,
                "region": speech_region
            }
        else:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Failed to get token: {response.text}"
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
