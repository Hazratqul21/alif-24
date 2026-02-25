import asyncio
from shared.services.azure_speech_service import speech_service

async def test():
    try:
        # Mock the key to see if it fails at network level rather than validation level
        speech_service.speech_key = "fake_key"
        res = await speech_service.text_to_speech("Salom alifbe", "uz", "female")
        print("Success:", len(res))
    except Exception as e:
        print("Caught Exception:", type(e), str(e))

if __name__ == "__main__":
    asyncio.run(test())
