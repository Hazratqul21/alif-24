import asyncio
from shared.database import get_db
from shared.database.models import PaymentTransaction
from shared.database.session import SessionLocal
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        res = await db.execute(select(PaymentTransaction).where(PaymentTransaction.external_id == '69d3a4325e5e8dad8f3b6782'))
        txn = res.scalars().first()
        if txn:
            print(f"Status: {txn.status}")
            print(f"Error Message: {repr(txn.error_message)}")
        else:
            print("Not found")

if __name__ == "__main__":
    asyncio.run(main())
