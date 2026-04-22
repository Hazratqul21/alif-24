import asyncio
import httpx

async def check_api():
    url = "https://alif24.uz/api/v1/teachers/assignments"
    # Note: I don't have the token, so this will likely return 401.
    # But the user reported a 500. A 500 means even with a valid token (or before/after auth check), it crashes.
    # Actually, the 500 happens during the request, which means the token is likely valid but the backend fails.
    
    # I'll check the local backend if possible.
    # But I don't know if it's running.
    
    pass

if __name__ == "__main__":
    # Just a placeholder
    print("Checking backend files for potential 500 errors...")
