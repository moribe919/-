from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models for Inventory Management System

# Resident Models
class Resident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str

class ResidentCreate(BaseModel):
    name: str

class ResidentUpdate(BaseModel):
    name: str

# Purchase Models
class Purchase(BaseModel):
    date: str
    qty: int
    price: float = 0.0

# Usage History Models
class UsageHistory(BaseModel):
    date: str
    qty: int

# Item Models
class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    residentId: str
    name: str
    quantity: int = 0
    used: int = 0
    min: int = 0
    source: str = "購入"
    purchases: List[Purchase] = []
    usageHistory: List[UsageHistory] = []

class ItemCreate(BaseModel):
    residentId: str
    name: str
    quantity: int = 0
    used: int = 0
    min: int = 0
    source: str = "購入"

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[int] = None
    used: Optional[int] = None
    min: Optional[int] = None
    source: Optional[str] = None

class PurchaseCreate(BaseModel):
    qty: int
    price: float = 0.0

class UsageCreate(BaseModel):
    qty: int


# Legacy Status Check Models (keeping for compatibility)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Legacy endpoints
@api_router.get("/")
async def root():
    return {"message": "Inventory Management System API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Resident endpoints
@api_router.get("/residents", response_model=List[Resident])
async def get_residents():
    residents = await db.residents.find().to_list(1000)
    return [Resident(**resident) for resident in residents]

@api_router.post("/residents", response_model=Resident)
async def create_resident(resident: ResidentCreate):
    resident_dict = resident.dict()
    resident_obj = Resident(**resident_dict)
    await db.residents.insert_one(resident_obj.dict())
    return resident_obj

@api_router.put("/residents/{resident_id}", response_model=Resident)
async def update_resident(resident_id: str, resident_update: ResidentUpdate):
    resident = await db.residents.find_one({"id": resident_id})
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    await db.residents.update_one(
        {"id": resident_id},
        {"$set": resident_update.dict()}
    )
    
    updated_resident = await db.residents.find_one({"id": resident_id})
    return Resident(**updated_resident)

@api_router.delete("/residents/{resident_id}")
async def delete_resident(resident_id: str):
    # Delete resident
    result = await db.residents.delete_one({"id": resident_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resident not found")
    
    # Delete all items associated with this resident
    await db.items.delete_many({"residentId": resident_id})
    
    return {"message": "Resident and associated items deleted successfully"}

# Item endpoints
@api_router.get("/items", response_model=List[Item])
async def get_items(resident_id: Optional[str] = None):
    filter_dict = {}
    if resident_id:
        filter_dict["residentId"] = resident_id
    
    items = await db.items.find(filter_dict).to_list(1000)
    return [Item(**item) for item in items]

@api_router.post("/items", response_model=Item)
async def create_item(item: ItemCreate):
    item_dict = item.dict()
    item_obj = Item(**item_dict)
    await db.items.insert_one(item_obj.dict())
    return item_obj

@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, item_update: ItemUpdate):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    update_dict = {k: v for k, v in item_update.dict().items() if v is not None}
    await db.items.update_one(
        {"id": item_id},
        {"$set": update_dict}
    )
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    result = await db.items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted successfully"}

# Purchase tracking
@api_router.post("/items/{item_id}/purchase", response_model=Item)
async def add_purchase(item_id: str, purchase: PurchaseCreate):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    today = datetime.now().strftime("%Y-%m-%d")
    new_purchase = Purchase(
        date=today,
        qty=purchase.qty,
        price=purchase.price
    )
    
    # Update item with new purchase
    await db.items.update_one(
        {"id": item_id},
        {
            "$inc": {"quantity": purchase.qty},
            "$push": {"purchases": new_purchase.dict()}
        }
    )
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

# Usage tracking
@api_router.post("/items/{item_id}/usage", response_model=Item)
async def add_usage(item_id: str, usage: UsageCreate):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item["quantity"] < usage.qty:
        raise HTTPException(status_code=400, detail="Not enough quantity in stock")
    
    today = datetime.now().strftime("%Y-%m-%d")
    new_usage = UsageHistory(
        date=today,
        qty=usage.qty
    )
    
    # Update item with usage
    await db.items.update_one(
        {"id": item_id},
        {
            "$inc": {
                "quantity": -usage.qty,
                "used": usage.qty
            },
            "$push": {"usageHistory": new_usage.dict()}
        }
    )
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

# Quantity adjustment endpoints
@api_router.post("/items/{item_id}/adjust-quantity")
async def adjust_quantity(item_id: str, delta: int):
    item = await db.items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    new_quantity = max(0, item["quantity"] + delta)
    
    await db.items.update_one(
        {"id": item_id},
        {"$set": {"quantity": new_quantity}}
    )
    
    updated_item = await db.items.find_one({"id": item_id})
    return Item(**updated_item)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
