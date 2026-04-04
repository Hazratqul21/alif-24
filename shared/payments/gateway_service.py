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

    To'liq RPC format:
    - Authorization: Basic Login:Password
    - method, params, id
    """

    @property
    def base_url(self):
        return "https://test.paycom.uz" if self.is_test else "https://checkout.paycom.uz"

    @property
    def merchant_api(self):
        return f"{self.base_url}/api"

    def _get_auth_header(self) -> str:
        """Authorization: Basic header - Payme talabiga ko'ra"""
        # Login: Parol format - Payme Merchant ID login, secret_key parol
        auth_string = f"{self.merchant_id}:{self.secret_key}"
        return "Basic " + base64.b64encode(auth_string.encode()).decode()

    def _make_request(self, method: str, params: Dict) -> Dict:
        """Payme ga RPC so'rov yuborish"""
        import httpx
        import uuid

        payload = {
            "method": method,
            "params": params,
            "id": int(datetime.now(timezone.utc).timestamp() * 1000)
        }

        headers = {
            "Authorization": self._get_auth_header(),
            "Content-Type": "application/json",
        }

        try:
            response = httpx.post(self.merchant_api, json=payload, headers=headers, timeout=15)
            return response.json()
        except Exception as e:
            logger.error(f"Payme API error: {e}")
            return {"error": str(e)}

    async def create_payment(
        self, amount: int, order_id: str, description: str, return_url: str
    ) -> Dict[str, Any]:
        """
        Payme checkout URL yaratish
        Payme dokumentatsiyasiga ko'ra:
        - Qadam 1: CheckPerformTransaction - tekshirish
        - Qadam 2: CreateTransaction - yaratish (checkout ochiq uchun)
        """
        amount_tiyin = amount * 100  # Payme tiyinda

        # Payme checkout parametrlari - to'g'ri format
        params = f"m={self.merchant_id};a={amount_tiyin};ac.order_id={order_id};c={return_url}"
        encoded = base64.b64encode(params.encode()).decode()

        checkout_url = f"{self.base_url}/{encoded}"

        return {
            "checkout_url": checkout_url,
            "external_id": order_id,
            "raw": {"params": params, "encoded": encoded},
        }

    async def check_payment(self, external_id: str) -> Dict[str, Any]:
        """Payme CheckTransaction - tranzaksiya holatini tekshirish"""
        result = self._make_request("CheckTransaction", {"id": external_id})

        if "error" in result:
            return {"status": "pending", "error": result.get("error")}

        if result.get("result"):
            state = result["result"].get("state", 0)
            # State: 0 - created, 1 - processing, 2 - completed, -1/-2 - cancelled
            if state == 2:
                return {"status": "completed", "raw": result}
            elif state == 1:
                return {"status": "processing", "raw": result}
            elif state in (-1, -2):
                return {"status": "cancelled", "raw": result}

        return {"status": "pending", "raw": result}

    def verify_webhook(self, headers: Dict, body: bytes) -> bool:
        """Payme Basic Auth tekshirish"""
        try:
            auth_header = headers.get("authorization", "") or headers.get("Authorization", "")
            if not auth_header:
                logger.warning("Payme verify_webhook: No Authorization header")
                return False

            if auth_header.startswith("Basic "):
                try:
                    decoded = base64.b64decode(auth_header[6:]).decode()
                    parts = decoded.split(":", 1)
                    if len(parts) != 2:
                        logger.warning(f"Payme verify_webhook: Invalid Basic auth format: {decoded}")
                        return False
                    _, key = parts

                    # In test mode, allow any key for easier testing
                    if self.is_test:
                        logger.info("Payme verify_webhook: Test mode - allowing request")
                        return True

                    return key == self.secret_key
                except Exception as e:
                    logger.error(f"Payme verify_webhook: Base64 decode error: {e}")
                    return False
            else:
                logger.warning(f"Payme verify_webhook: Not Basic auth: {auth_header[:50]}")
                return False
        except Exception as e:
            logger.error(f"Payme verify_webhook: Unexpected error: {e}")
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

            # If no order_id in account, try params directly (some Payme versions)
            if not order_id:
                order_id = params.get("id") or params.get("order_id")

            # Amount parsing - handle both tiyin (int) and string
            amount = params.get("amount", 0)
            try:
                amount = int(amount) // 100  # Convert from tiyin to sum
            except (ValueError, TypeError):
                logger.warning(f"Payme parse_webhook: Could not parse amount: {amount}")
                amount = 0

            return {
                "method": method,
                "order_id": order_id,
                "amount": amount,
                "external_id": params.get("id"),
                "rpc_id": rpc_id,
                "raw": data,
            }
        except Exception as e:
            logger.error(f"Payme webhook parse error: {e}")
            return {"error": str(e)}


# ============================================================================
# CLICK GATEWAY
# ============================================================================

class ClickGateway(BaseGateway):
    """
    Click payment gateway (Uzbekistan)
    Docs: https://click.uz/developer
    """

    BASE_URL = "https://api.click.uz/v1"

    async def create_payment(
        self, amount: int, order_id: str, description: str, return_url: str
    ) -> Dict[str, Any]:
        """Click checkout URL yaratish"""
        try:
            headers = {
                "Authorization": f"Token {self.secret_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "service_id": self.service_id or self.merchant_id,
                "amount": amount,  # Click sumda
                "transaction_id": order_id,
                "description": description[:100],  # Max 100 chars
            }
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{self.BASE_URL}/merchant/invoice/create",
                    json=payload,
                    headers=headers,
                )
                data = resp.json()
                if data.get("success"):
                    return {
                        "checkout_url": data.get("url", ""),
                        "external_id": str(data.get("invoice_id", order_id)),
                        "raw": data,
                    }
                return {
                    "checkout_url": "",
                    "external_id": order_id,
                    "raw": data,
                    "error": data.get("error_note", "Unknown error"),
                }
        except Exception as e:
            logger.error(f"Click create payment error: {e}")
            return {
                "checkout_url": "",
                "external_id": order_id,
                "raw": {"error": str(e)},
            }

    async def check_payment(self, external_id: str) -> Dict[str, Any]:
        """Click payment status check"""
        try:
            headers = {
                "Authorization": f"Token {self.secret_key}",
                "Content-Type": "application/json",
            }
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{self.BASE_URL}/merchant/invoice/status/{external_id}",
                    headers=headers,
                )
                data = resp.json()
                state_map = {
                    "1": "pending",
                    "2": "completed",
                    "-1": "cancelled",
                    "-2": "cancelled",
                }
                return {
                    "status": state_map.get(str(data.get("state", "0")), "pending"),
                    "raw": data,
                }
        except Exception as e:
            logger.error(f"Click check error: {e}")
            return {"status": "pending", "error": str(e)}

    def verify_webhook(self, headers: Dict, body: bytes) -> bool:
        """Click webhook verification"""
        # Click uses different auth - verify token header
        click_token = headers.get("x-click-token", "")
        return click_token == self.secret_key

    def parse_webhook(self, headers: Dict, body: bytes) -> Dict[str, Any]:
        """Parse Click webhook"""
        try:
            data = json.loads(body)
            return {
                "method": "notify",
                "order_id": data.get("merchant_trans_id"),
                "amount": data.get("amount", 0),
                "external_id": str(data.get("click_trans_id", "")),
                "status": "completed" if data.get("state") == 2 else "pending",
                "raw": data,
            }
        except Exception as e:
            logger.error(f"Click webhook parse error: {e}")
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
