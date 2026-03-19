import asyncio
import os
import sys

# Tizim yo'lini qo'shish (loyiha ildiz direktori uchun)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from shared.database.session import AsyncSessionLocal
from shared.database.models.payment import PaymentGatewayConfig
from sqlalchemy import select

async def setup_payme():
    # VDS da .env fayldan yoki argument sifatida ID va KEY ni olamiz
    merchant_id = os.getenv("PAYME_MERCHANT_ID", "69b90d022762d31ffd7f7da4")
    secret_key = os.getenv("PAYME_TEST_KEY", "6yX&ncgz&bstu6%w#D4Wb#B7ftztHack9kTB")
    
    if not merchant_id or not secret_key:
        print("XATOLIK: PAYME_MERCHANT_ID yoki PAYME_TEST_KEY topilmadi!")
        return

    async with AsyncSessionLocal() as db:
        # Payme gateway mavjudligini tekshiramiz
        result = await db.execute(
            select(PaymentGatewayConfig).where(PaymentGatewayConfig.provider == "payme")
        )
        gateway = result.scalars().first()
        
        if gateway:
            gateway.merchant_id = merchant_id
            gateway.secret_key = secret_key
            gateway.is_active = True
            gateway.is_test_mode = True # Test rejim
            gateway.is_default = True
            print("Payme konfiguratsiyasi bazada yangilandi.")
        else:
            gateway = PaymentGatewayConfig(
                provider="payme",
                name="Payme",
                description="Payme orqali to'lovlar (Test)",
                merchant_id=merchant_id,
                secret_key=secret_key,
                is_active=True,
                is_test_mode=True,
                is_default=True
            )
            db.add(gateway)
            print("Payme konfiguratsiyasi yangi sifatida saqlandi.")
            
        await db.commit()
        print("Muvaffaqiyatli saqlandi! Endi to'lovlarni amalga oshirib tekshirishingiz mumkin.")

if __name__ == "__main__":
    asyncio.run(setup_payme())
