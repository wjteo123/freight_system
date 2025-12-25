from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, crud, database, realtime
from ..dependencies import get_current_user
from ..models import RoleEnum

router = APIRouter(
    prefix="/shipments",
    tags=["Shipments"]
)

@router.post("/", response_model=schemas.ShipmentResponse)
async def create_new_shipment(
    shipment: schemas.ShipmentCreate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    try:
        created = crud.create_shipment(db=db, shipment=shipment, user_id=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    
    # Broadcast to frontend
    await realtime.shipments_manager.broadcast(
        {"channel": "shipments", "event": "created", "payload": realtime.serialize_shipment(created)}
    )
    return created

@router.get("/", response_model=List[schemas.ShipmentResponse])
def read_shipments(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    shipments = crud.get_shipments(db, skip=skip, limit=limit, status=status)
    return shipments

@router.get("/{shipment_id}", response_model=schemas.ShipmentResponse)
def read_shipment_detail(
    shipment_id: str,  # Changed from int to str (UUID)
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    db_shipment = crud.get_shipment_by_id(db, shipment_id=shipment_id)
    if db_shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return db_shipment

@router.patch("/{shipment_id}", response_model=schemas.ShipmentResponse)
async def update_shipment(
    shipment_id: str, # Changed from int to str (UUID)
    shipment_update: schemas.ShipmentUpdate,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    updated_shipment = crud.update_shipment_status(
        db, 
        shipment_id=shipment_id, 
        update_data=shipment_update,
        user_id=current_user.id
    )
    if updated_shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
        
    await realtime.shipments_manager.broadcast(
        {"channel": "shipments", "event": "updated", "payload": realtime.serialize_shipment(updated_shipment)}
    )
    return updated_shipment


@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shipment(
    shipment_id: str,
    db: Session = Depends(database.get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role != RoleEnum.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete shipments")

    deleted = crud.delete_shipment(db, shipment_id=shipment_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shipment not found")

    await realtime.shipments_manager.broadcast(
        {"channel": "shipments", "event": "deleted", "payload": {"id": shipment_id}}
    )