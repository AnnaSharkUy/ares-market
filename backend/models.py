from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Table
)
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# Many-to-many for cart items is handled via CartItem model

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100))
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="colonist")  # colonist, admin
    colony = Column(String(50), default="Olympus City")  # fictional colony
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="user")
    cart_items = relationship("CartItem", back_populates="user")
    reviews = relationship("Review", back_populates="user")


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True)
    name = Column(String(80), nullable=False)
    name_mars = Column(String(80))  # "Martian" name
    description = Column(Text)
    icon = Column(String(10), default="📦")

    products = relationship("Product", back_populates="category")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(40), unique=True, index=True)
    name = Column(String(120), nullable=False)
    name_mars = Column(String(120))  # invented Martian-sounding name
    brand = Column(String(60))
    description = Column(Text)
    price_sols = Column(Float, nullable=False)  # Martian currency
    price_credits = Column(Float)  # Earth credits (approx)
    stock = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"))
    image_emoji = Column(String(10), default="📦")  # CSS/emoji placeholder
    rating = Column(Float, default=4.0)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    category = relationship("Category", back_populates="products")
    cart_items = relationship("CartItem", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class CartItem(Base):
    __tablename__ = "cart_items"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer, default=1)

    user = relationship("User", back_populates="cart_items")
    product = relationship("Product", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    total_sols = Column(Float)
    status = Column(String(30), default="pending")  # pending, processing, shipped, delivered, cancelled
    delivery_colony = Column(String(80))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    quantity = Column(Integer)
    price_sols = Column(Float)

    order = relationship("Order", back_populates="items")


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    rating = Column(Integer)  # 1-5
    title = Column(String(120))
    body = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
