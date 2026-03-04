"""
GeoIP Utility - IP manzildan joylashuv aniqlash (Background task)
ip-api.com (bepul, 45 req/min) yoki fallback sifatida faqat IP saqlash
"""
import httpx
import logging
import re
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# User-Agent parsing (basic)
MOBILE_RE = re.compile(r'(iPhone|iPad|Android|Mobile|webOS)', re.I)
TABLET_RE = re.compile(r'(iPad|Tablet|PlayBook)', re.I)

def parse_device_type(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    if TABLET_RE.search(user_agent):
        return "tablet"
    if MOBILE_RE.search(user_agent):
        return "mobile"
    return "desktop"

def parse_browser(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    ua = user_agent.lower()
    if "edg/" in ua: return "Edge"
    if "opr/" in ua or "opera" in ua: return "Opera"
    if "chrome/" in ua and "safari/" in ua: return "Chrome"
    if "firefox/" in ua: return "Firefox"
    if "safari/" in ua: return "Safari"
    if "yabrowser" in ua: return "Yandex"
    return "Other"

def parse_os(user_agent: str) -> str:
    if not user_agent:
        return "unknown"
    ua = user_agent.lower()
    if "windows" in ua: return "Windows"
    if "macintosh" in ua or "mac os" in ua: return "macOS"
    if "iphone" in ua or "ipad" in ua: return "iOS"
    if "android" in ua: return "Android"
    if "linux" in ua: return "Linux"
    return "Other"


async def get_geo_from_ip(ip: str) -> Dict:
    """
    IP manzildan geolokatsiyani aniqlash (ip-api.com). 
    Bepul limit: 45 so'rov/daqiqa.
    Fallback: faqat IP saqlash (hech qanday exception)
    """
    result = {
        "country": None, "country_code": None, "region": None,
        "city": None, "latitude": None, "longitude": None, "isp": None,
    }

    # Skip local/private IPs
    if not ip or ip in ("127.0.0.1", "::1", "localhost") or ip.startswith(("10.", "192.168.", "172.")):
        return result

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}?fields=status,country,countryCode,regionName,city,lat,lon,isp&lang=en")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    result["country"] = data.get("country")
                    result["country_code"] = data.get("countryCode")
                    result["region"] = data.get("regionName")
                    result["city"] = data.get("city")
                    result["latitude"] = data.get("lat")
                    result["longitude"] = data.get("lon")
                    result["isp"] = data.get("isp")
    except Exception as e:
        logger.debug(f"GeoIP lookup failed for {ip}: {e}")

    return result


def get_client_ip(request) -> str:
    """Extract real client IP from request (behind proxy/nginx)"""
    # X-Forwarded-For headerlarni tekshirish (Nginx/reverse proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    
    # Direct connection
    if request.client:
        return request.client.host
    
    return "unknown"
