from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Enum, Text, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum
import uuid

# --- Enums ---
class RoleEnum(str, enum.Enum):
    admin = "admin"
    staff = "staff"

class ShipmentStatusEnum(str, enum.Enum):
    New = "New"
    Assigned = "Assigned"
    PickedUp = "PickedUp"
    Delivered = "Delivered"
    Completed = "Completed"
    Cancelled = "Cancelled"

class ShipmentTypeEnum(str, enum.Enum):
    In_House = "In-House"
    Outsource = "Outsource"

# --- Tables ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    password_hash = Column(String(255))
    role = Column(Enum(RoleEnum), default=RoleEnum.staff)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    active_session_token = Column(String(64), nullable=True, unique=True)
    active_session_expires_at = Column(DateTime(timezone=True), nullable=True)

class Shipment(Base):
    __tablename__ = "shipments"
    
    # Identifiers
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4())) # UUID
    booking_reference = Column(String(50), unique=True, index=True)
    
    # Logistics & Dates
    customer_name = Column(String(100), nullable=False)
    collection_from = Column(Text, nullable=False)
    deliver_to = Column(Text, nullable=False)
    pickup_date = Column(Date, nullable=False)
    delivery_date = Column(Date, nullable=False)
    
    # Operations Status
    status = Column(Enum(ShipmentStatusEnum), default=ShipmentStatusEnum.New, index=True)
    shipment_type = Column(Enum(ShipmentTypeEnum), nullable=False)
    
    # Finance
    revenue_amount = Column(DECIMAL(10, 2), default=0.00, nullable=False)
    cost_amount = Column(DECIMAL(10, 2), default=0.00)
    driver_commission = Column(DECIMAL(10, 2), default=0.00)

    # Fleet
    lorry_no = Column(String(20), nullable=True)
    lorry_company = Column(String(100), nullable=True)
    driver_name = Column(String(100), nullable=True)

    # Documentation
    delivery_order_no = Column(String(50), nullable=True)
    company_invoice_no = Column(String(50), nullable=True)
    creditor_invoice_no = Column(String(50), nullable=True)
    
    # Files
    pod_image_url = Column(String(255), nullable=True)
    creditor_invoice_file_url = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    # Soft delete marker
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Meta
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    updater = relationship("User")