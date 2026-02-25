import asyncio
from httpx import AsyncClient

async def run():
    async with AsyncClient(base_url="http://localhost:8000") as client:
        # Pinging send-code
        resp = await client.post("/api/v1/verification/send-code", json={"phone": "+998901234567", "lang": "uz"})
        print("SEND CODE:", resp.status_code, resp.text)

asyncio.run(run())
