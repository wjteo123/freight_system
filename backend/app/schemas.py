from datetime import date, datetime
from enum import Enum
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field

# --- Enums ---
class ShipmentStatus(str, Enum):
    New = "New"
    Assigned = "Assigned"
    PickedUp = "PickedUp"
    Delivered = "Delivered"
    Completed = "Completed"
    Cancelled = "Cancelled"

class ShipmentType(str, Enum):
    In_House = "In-House"
    Outsource = "Outsource"

class UserRole(str, Enum):
    admin = "admin"
    staff = "staff"

# --- Shipment Schemas ---

class ShipmentBase(BaseModel):
    customer_name: str
    collection_from: str
    deliver_to: str
    pickup_date: date
    delivery_date: date
    shipment_type: ShipmentType
    
    # Finance
    revenue_amount: Decimal = Field(default=0.00, max_digits=10, decimal_places=2)
    cost_amount: Optional[Decimal] = Field(default=0.00, max_digits=10, decimal_places=2)
    driver_commission: Optional[Decimal] = Field(default=0.00, max_digits=10, decimal_places=2)
    
    # Fleet
    lorry_no: Optional[str] = None
    lorry_company: Optional[str] = None
    driver_name: Optional[str] = None
    
    # Docs
    delivery_order_no: Optional[str] = None
    company_invoice_no: Optional[str] = None
    creditor_invoice_no: Optional[str] = None
    remarks: Optional[str] = None
    
    # Files
    pod_image_url: Optional[str] = None
    creditor_invoice_file_url: Optional[str] = None

class ShipmentCreate(ShipmentBase):
    status: Optional[ShipmentStatus] = ShipmentStatus.New

class ShipmentUpdate(BaseModel):
    status: Optional[ShipmentStatus] = None
    shipment_type: Optional[ShipmentType] = None
    # Allow updating any field
    customer_name: Optional[str] = None
    collection_from: Optional[str] = None
    deliver_to: Optional[str] = None
    pickup_date: Optional[date] = None
    delivery_date: Optional[date] = None
    revenue_amount: Optional[Decimal] = None
    cost_amount: Optional[Decimal] = None
    driver_commission: Optional[Decimal] = None
    lorry_no: Optional[str] = None
    lorry_company: Optional[str] = None
    driver_name: Optional[str] = None
    delivery_order_no: Optional[str] = None
    company_invoice_no: Optional[str] = None
    creditor_invoice_no: Optional[str] = None
    pod_image_url: Optional[str] = None
    creditor_invoice_file_url: Optional[str] = None
    remarks: Optional[str] = None

class ShipmentResponse(ShipmentBase):
    id: str  # UUID is a string in JSON
    booking_reference: str
    status: ShipmentStatus
    created_at: datetime
    updated_at: datetime
    updated_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True

# --- User Schemas (Unchanged) ---
class UserBase(BaseModel):
    username: str
    role: UserRole = UserRole.staff

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)
    name: Optional[str] = None
    email: Optional[str] = None

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str = Field(..., min_length=8, max_length=72)
    force: bool = False

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    expires_in: int

class PasswordResetRequest(BaseModel):
    username: str
    new_password: str = Field(..., min_length=8, max_length=72)