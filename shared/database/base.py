"""
Shared Database Base - Umumiy Database asosi
Barcha platformalar uchun bir xil Base class
UUID o'rniga 8 xonalik ID ishlatiladi
"""
from sqlalchemy import Column, String, event
from sqlalchemy.ext.declarative import declarative_base
from shared.database.id_generator import generate_8_digit_id

# Base class - Barcha modellar shu class'dan meros oladi
Base = declarative_base()


class BaseModel(Base):
    """
    Base model with 8-digit auto-generated ID
    
    Usage:
        class MyModel(BaseModel):
            __tablename__ = "my_table"
            name = Column(String(100))
            # id will be auto-generated as 8-digit number
    """
    __abstract__ = True
    
    id = Column(String(8), primary_key=True, default=generate_8_digit_id)


@event.listens_for(BaseModel, 'before_insert', propagate=True)
def _generate_id_before_insert(mapper, connection, target):
    """Auto-generate 8-digit ID if not set"""
    if target.id is None:
        target.id = generate_8_digit_id()


__all__ = ["Base", "BaseModel"]
