"""
Azure Speech Service for Harf Platform
TTS (Text-to-Speech) and STT (Speech-to-Text)

Shared AzureSpeechService dan foydalanadi — barcha platformalar uchun bitta service.
"""
from shared.services.azure_speech_service import AzureSpeechService, speech_service

__all__ = ["AzureSpeechService", "speech_service"]
