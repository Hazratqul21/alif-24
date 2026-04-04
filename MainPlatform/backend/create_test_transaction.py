import asyncio
import os
import sys

# `.env` fayldan bevosita o'qiymiz (agar kerak bo'lsa)
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Ota papkani path ga qo'shamiz to shared ni import qila olish uchun
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from shared.database.session import AsyncSessionLocal
from shared.database.models import User, PaymentTransaction, TransactionStatus
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Bitta user ni topib olamiz
        result = await db.execute(select(User).limit(1))
        user = result.scalars().first()
        
        if not user:
            print("Xato: Databazada birorta ham foydalanuvchi yo'q ekan. Oldin bitta user ro'yxatdan o'tishi kerak.")
            return
            
        print(f"User topildi: {user.first_name} (ID: {user.id})")
        
        # 2. Eskidan qolib ketgan xuddi shu ID ni o'chirib turamiz (agar bor bo'lsa)
        exec_res = await db.execute(select(PaymentTransaction).where(PaymentTransaction.id == "11223344"))
        old_txn = exec_res.scalars().first()
        if old_txn:
            await db.delete(old_txn)
            await db.commit()
        
        # 3. Yop-yangi tranzaksiya yaratamiz
        txn = PaymentTransaction(
            id="11223344",
            user_id=user.id,
            provider="payme",
            amount=15000,
            status=TransactionStatus.pending.value,
            description="Sandbox testi uchun maxsus to'lov"
        )
        
        db.add(txn)
        await db.commit()
        
        print("\n✅ MUVAFFAQIYATLI YARATILDI!")
        print("=" * 40)
        print("Endi Payme Sandbox testing sahifasiga kirib ushbu ma'lumotlarni kiriting:")
        print("ID заказа: 11223344")
        print("Сумма оплаты: 15000")
        print("=" * 40)
        print("Izoh: 'Неверный счет' testlariga buning o'rniga boshqa oddiy raqam (masalan 123456) kiriting.")

if __name__ == "__main__":
    asyncio.run(main())
