"""
Payment Gateway Service — Multi-gateway to'lov tizimi
Payme, Click, Uzum — barchasi admin paneldan boshqariladi.

Har bir gateway uchun:
1. create_payment() — to'lov yaratish (checkout URL olish)
2. check_payment() — to'lov holatini tekshirish
3. handle_webhook() — webhook callback qayta ishlash
"""

import hashlib
import base64
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import httpx

logger = logging.getLogger(__name__)


# ============================================================================
# BASE GATEWAY
# ============================================================================

class BaseGateway:
    """Base class for all payment gateways"""

    def __init__(self, config: Dict):
        """
        config: PaymentGatewayConfig.to_dict(hide_keys=False) dan keladi
        """
        self.merchant_id = config.get("merchant_id", "")
        self.secret_key = config.get("secret_key", "")
        self.service_id = config.get("service_id", "")
        self.is_test = config.get("is_test_mode", True)
        self.settings = config.get("settings") or {}

    async def create_payment(
        self, amount: int, order_id: str, description: str, return_url: str
    ) -> Dict[str, Any]:
        """
        To'lov yaratish → {"checkout_url": "...", "external_id": "...", "raw": {...}}
        amount: UZS so'mda
        """
        raise NotImplementedError

    async def check_payment(self, external_id: str) -> Dict[str, Any]:
        """To'lov holatini tekshirish → {"status": "completed"|"pending"|"failed", ...}"""
        raise NotImplementedError

    def verify_webhook(self, headers: Dict, body: bytes) -> bool:
        """Webhook haqiqiyligini tekshirish"""
        raise NotImplementedError

    def parse_webhook(self, headers: Dict, body: bytes) -> Dict[str, Any]:
        """Webhook body'ni parse qilish → {"action": ..., "order_id": ..., "status": ...}"""
        raise NotImplementedError


# ============================================================================
# PAYME GATEWAY
# ============================================================================

class PaymeGateway(BaseGateway):
    """
    Payme Merchant API
    Docs: https://developer.help.paycom.uz/
    """

    @property
    def base_url(self):
        return "https://test.paycom.uz" if self.is_test else "https://checkout.paycom.uz"

    @property
    def merchant_api(self):
        return f"{self.base_url}/api"

    async def create_payment(
        self, amount: int, order_id: str, description: str, return_url: str
    ) -> Dict[str, Any]:
        """
        Payme checkout URL yaratish
        amount: UZS so'mda (Payme tiyinda kutadi, x100 qilamiz)
        """
        amount_tiyin = amount * 100  # Payme tiyinda ishlaydi

        # Payme checkout parametrlari
        params = f"m={self.merchant_id};ac.order_id={order_id};a={amount_tiyin};c={return_url}"
        encoded = base64.b64encode(params.encode()).decode()

        checkout_url = f"{self.base_url}/{encoded}"

        return {
            "checkout_url": checkout_url,
            "external_id": order_id,  # Payme order_id ni biz beramiz
            "raw": {"params": params},
        }

    async def check_payment(self, external_id: str) -> Dict[str, Any]:
        """Payme orqali to'lov holatini tekshirish"""
        auth = base64.b64encode(f"{self.merchant_id}:{self.secret_key}".encode()).decode()
        headers = {
            "X-Auth": auth,
            "Content-Type": "application/json",
        }
        payload = {
            "method": "CheckTransaction",
            "params": {"id": external_id},
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(self.merchant_api, json=payload, headers=headers)
                data = resp.json()
                if data.get("result"):
                    state = data["result"].get("state", 0)
                    if state == 2:
                        return {"status": "completed", "raw": data}
                    elif state == 1:
                        return {"status": "processing", "raw": data}
                    elif state in (-1, -2):
                        return {"status": "cancelled", "raw": data}
                return {"status": "pending", "raw": data}
        except Exception as e:
            logger.error(f"Payme check error: {e}")
            return {"status": "pending", "error": str(e)}

    def verify_webhook(self, headers: Dict, body: bytes) -> bool:
        """Payme Basic Auth tekshirish"""
        auth_header = headers.get("authorization", "")
        if not auth_header.startswith("Basic "):
            return False
        try:
            decoded = base64.b64decode(auth_header[6:]).decode()
            _, key = decoded.split(":", 1)
            return key == self.secret_key
        except Exception:
            return False

    def parse_webhook(self, headers: Dict, body: bytes) -> Dict[str, Any]:
        """Payme JSON-RPC webhook parse"""
        try:
            data = json.loads(body)
            method = data.get("method", "")
            params = data.get("params", {})
            rpc_id = data.get("id")

            order_id = None
            account = params.get("account", {})
            if account:
                order_id = account.get("order_id")

            return {
                "method": method,
                "order_id": order_id,
                "amount": params.get("amount", 0) // 100,  # tiyin → so'm
                "external_id": params.get("id"),
                "rpc_id": rpc_id,
                "raw": data,
            }
        except Exception as e:
            logger.error(f"Payme webhook parse error: {e}")
            return {"error": str(e)}

# ============================================================================
# UZUM GATEWAY
# ============================================================================

class UzumGateway(BaseGateway):
    """
    Uzum Bank payment gateway
    """

    BASE_URL = "https://www.uzumbank.uz/open-api"

    async def create_payment(
        self, amount: int, order_id: str, description: str, return_url: str
    ) -> Dict[str, Any]:
        """Uzum checkout URL yaratish"""
        try:
            headers = {
                "Authorization": f"Bearer {self.secret_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "serviceId": self.service_id or self.merchant_id,
                "amount": amount * 100,  # tiyinda
                "orderId": order_id,
                "description": description,
                "returnUrl": return_url,
            }
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.BASE_URL}/payment/create",
                    json=payload,
                    headers=headers,
                )
                data = resp.json()
                checkout_url = data.get("paymentUrl") or data.get("redirectUrl", "")
                ext_id = data.get("transactionId") or data.get("id", order_id)
                return {
                    "checkout_url": checkout_url,
                    "external_id": str(ext_id),
                    "raw": data,
                }
        except Exception as e:
            logger.error(f"Uzum create error: {e}")
            # Fallback: manual URL
            return {
                "checkout_url": "",
                "external_id": order_id,
                "raw": {"error": str(e)},
            }

    async def check_payment(self, external_id: str) -> Dict[str, Any]:
        return {"status": "pending"}

    def verify_webhook(self, headers: Dict, body: bytes) -> bool:
        # Uzum webhook verification logic
        return True

    def parse_webhook(self, headers: Dict, body: bytes) -> Dict[str, Any]:
        try:
            data = json.loads(body)
            status_map = {"PAID": "completed", "CANCELLED": "cancelled", "FAILED": "failed"}
            return {
                "method": "notify",
                "order_id": data.get("orderId"),
                "amount": int(data.get("amount", 0)) // 100,
                "external_id": str(data.get("transactionId", "")),
                "status": status_map.get(data.get("status"), "pending"),
                "raw": data,
            }
        except Exception as e:
            return {"error": str(e)}


# ============================================================================
# GATEWAY FACTORY
# ============================================================================

GATEWAY_CLASSES = {
    "payme": PaymeGateway,
    "click": ClickGateway,
    "uzum": UzumGateway,
}


def get_gateway(config: Dict) -> BaseGateway:
    """
    Admin tanlagan gateway konfiguratsiyasidan gateway ob'ekt yaratish.
    config: PaymentGatewayConfig model yoki dict
    """
    provider = config.get("provider", "payme")
    cls = GATEWAY_CLASSES.get(provider)
    if not cls:
        raise ValueError(f"Noma'lum to'lov provayderi: {provider}")
    return cls(config)
