from datetime import datetime
import uuid
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from . import models, schemas, security

# --- Shipment Logic ---

def generate_booking_reference(db: Session):
    """
    Generates a running number like SHP-2025-0001
    """
    current_year = datetime.now().year
    prefix = f"SHP-{current_year}"
    count = db.query(models.Shipment).filter(
        models.Shipment.booking_reference.like(f"{prefix}%")
    ).count()
    
    return f"{prefix}-{str(count + 1).zfill(4)}"

def create_shipment(db: Session, shipment: schemas.ShipmentCreate, user_id: int):
    attempts = 0
    while attempts < 3:
        new_ref = generate_booking_reference(db)
        
        db_shipment = models.Shipment(
            id=str(uuid.uuid4()),
            booking_reference=new_ref,
            
            customer_name=shipment.customer_name,
            collection_from=shipment.collection_from,
            deliver_to=shipment.deliver_to,
            pickup_date=shipment.pickup_date,
            delivery_date=shipment.delivery_date,
            
            status=shipment.status or models.ShipmentStatusEnum.New,
            shipment_type=shipment.shipment_type,
            
            revenue_amount=shipment.revenue_amount,
            cost_amount=shipment.cost_amount,
            driver_commission=shipment.driver_commission,
            
            lorry_no=shipment.lorry_no,
            lorry_company=shipment.lorry_company,
            driver_name=shipment.driver_name,
            
            delivery_order_no=shipment.delivery_order_no,
            company_invoice_no=shipment.company_invoice_no,
            creditor_invoice_no=shipment.creditor_invoice_no,
            
            pod_image_url=shipment.pod_image_url,
            creditor_invoice_file_url=shipment.creditor_invoice_file_url,
            remarks=shipment.remarks,
            
            updated_by_user_id=user_id
        )

        db.add(db_shipment)
        try:
            db.commit()
            db.refresh(db_shipment)
            return db_shipment
        except IntegrityError:
            db.rollback()
            attempts += 1
    raise ValueError("Unable to generate unique booking reference after retries")

def get_shipments(db: Session, skip: int = 0, limit: int = 100, status: str = None):
    query = db.query(models.Shipment).filter(models.Shipment.deleted_at.is_(None))
    if status:
        query = query.filter(models.Shipment.status == status)
    return (
        query.order_by(models.Shipment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_shipment_by_id(db: Session, shipment_id: str):
    # shipment_id is now a UUID string
    return (
        db.query(models.Shipment)
        .filter(models.Shipment.id == shipment_id, models.Shipment.deleted_at.is_(None))
        .first()
    )

def update_shipment_status(db: Session, shipment_id: str, update_data: schemas.ShipmentUpdate, user_id: int):
    db_shipment = (
        db.query(models.Shipment)
        .filter(models.Shipment.id == shipment_id, models.Shipment.deleted_at.is_(None))
        .first()
    )
    
    if not db_shipment:
        return None
    
    # Update all fields provided in payload
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_shipment, key, value)
    
    db_shipment.updated_by_user_id = user_id
    
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, shipment_id: str) -> bool:
    db_shipment = (
        db.query(models.Shipment)
        .filter(models.Shipment.id == shipment_id, models.Shipment.deleted_at.is_(None))
        .first()
    )
    if not db_shipment:
        return False
    db_shipment.deleted_at = datetime.utcnow()
    db.add(db_shipment)
    db.commit()
    return True

# --- User Logic (Keep as is) ---
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user_in: schemas.UserCreate):
    db_user = models.User(
        username=user_in.username,
        password_hash=security.hash_password(user_in.password),
        role=user_in.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username=username)
    if not user:
        return None
    if not security.verify_password(password, user.password_hash):
        return None
    return user

def _now_utc():
    return datetime.utcnow()

def is_user_session_active(user: models.User) -> bool:
    return bool(
        user.active_session_token
        and user.active_session_expires_at
        and user.active_session_expires_at > _now_utc()
    )

def cleanup_expired_session(db: Session, user: models.User) -> bool:
    if (
        user.active_session_token
        and user.active_session_expires_at
        and user.active_session_expires_at <= _now_utc()
    ):
        clear_user_session(db, user)
        return True
    return False

def set_user_session(db: Session, user: models.User, session_token: str, expires_delta) -> models.User:
    user.active_session_token = session_token
    user.active_session_expires_at = _now_utc() + expires_delta
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def clear_user_session(db: Session, user: models.User) -> models.User:
    user.active_session_token = None
    user.active_session_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user_password(db: Session, user: models.User, new_password: str) -> models.User:
    user.password_hash = security.hash_password(new_password)
    user.active_session_token = None
    user.active_session_expires_at = None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user