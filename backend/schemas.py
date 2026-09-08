from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime


class UserCreate(BaseModel):
    email: str
    username: str
    full_name: Optional[str] = None
    password: str = Field(..., min_length=4)
    colony: Optional[str] = "Olympus City"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: str
    colony: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class CategoryOut(BaseModel):
    id: int
    code: str
    name: str
    name_mars: Optional[str]
    description: Optional[str]
    icon: Optional[str]

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: int
    sku: str
    name: str
    name_mars: Optional[str]
    brand: Optional[str]
    description: Optional[str]
    price_sols: float
    price_credits: Optional[float]
    stock: int
    category_id: Optional[int]
    image_emoji: Optional[str]
    rating: float
    is_featured: bool
    is_active: bool

    class Config:
        from_attributes = True


class ProductDetail(ProductOut):
    category: Optional[CategoryOut] = None


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(1, ge=1, le=99)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    items: List[CartItemOut]
    total_sols: float
    total_items: int


class OrderCreate(BaseModel):
    delivery_colony: str = "Olympus City"


class OrderOut(BaseModel):
    id: int
    total_sols: float
    status: str
    delivery_colony: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    product_id: int
    rating: int = Field(..., ge=1, le=5)
    title: str = Field(..., min_length=3, max_length=120)
    body: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    title: str
    body: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
