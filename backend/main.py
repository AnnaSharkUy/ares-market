from fastapi import FastAPI, Depends, HTTPException, status, Query, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import random

from .database import engine, get_db, Base
from . import models, schemas, auth

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AresMarket API",
    description="Межпланетный маркетплейс колонии Марса. Учебное приложение с намеренными дефектами для практики тестирования.",
    version="1.0.0-training",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR, "static")), name="static")


# ==================== SEED ====================
def seed_data(db: Session):
    if db.query(models.Category).count() > 0:
        return

    cats = [
        models.Category(code="life_support", name="Жизнеобеспечение", name_mars="Oxy-Vault Systems", description="Кислород, фильтры, ресайклеры", icon="🫁"),
        models.Category(code="construction", name="Строительство", name_mars="Regolith Works", description="Кирпичи, панели, купола", icon="🧱"),
        models.Category(code="food", name="Питание", name_mars="Hydro-Feast", description="Семена, рационы, гидропоника", icon="🌱"),
        models.Category(code="gear", name="Экипировка", name_mars="DustGuard Outfitters", description="Костюмы, ботинки, защита", icon="🛡️"),
        models.Category(code="energy", name="Энергия", name_mars="SolTech Power", description="Панели, аккумуляторы", icon="☀️"),
        models.Category(code="comm", name="Связь и навигация", name_mars="Phobos Link", description="Коммуникаторы, маяки", icon="📡"),
    ]
    db.add_all(cats)
    db.flush()

    products = [
        # Life Support
        models.Product(sku="OX-MK3-01", name="Кислородный баллон Mk.III", name_mars="Oxy-Canister Prime", brand="SolTech", description="Лёгкий композитный баллон на 48 часов автономной работы. Совместим со шлюзами Olympus City.", price_sols=245.0, price_credits=890.0, stock=42, category_id=1, image_emoji="🫁", rating=4.7, is_featured=True),
        models.Product(sku="WR-FIL-02", name="Фильтр ресайклера воды", name_mars="Aqua-Sieve V2", brand="HeliumLabs", description="Сменный картридж для систем регенерации воды. Ресурс 90 сол.", price_sols=68.5, price_credits=250.0, stock=120, category_id=1, image_emoji="💧", rating=4.4),
        models.Product(sku="CO2-SCR-03", name="Скруббер CO₂ портативный", name_mars="BreathClean Mini", brand="SolTech", description="Компактный модуль удаления углекислого газа для шлемов и кают.", price_sols=189.0, price_credits=690.0, stock=28, category_id=1, image_emoji="🌬️", rating=4.2),
        # Construction
        models.Product(sku="REG-BRK-100", name="Реголитовые кирпичи (100 шт)", name_mars="DustBrick Pack", brand="RegolithWorks", description="Прессованные блоки из марсианского реголита. Идеально для внутренних перегородок.", price_sols=95.0, price_credits=340.0, stock=500, category_id=2, image_emoji="🧱", rating=4.1, is_featured=True),
        models.Product(sku="DOM-PAN-05", name="Панель купола (1×1 м)", name_mars="SkyShell Panel", brand="OlympusForge", description="Прозрачная радиационно-защищённая панель для жилых куполов.", price_sols=420.0, price_credits=1520.0, stock=35, category_id=2, image_emoji="🔲", rating=4.8),
        models.Product(sku="SEAL-FOAM-07", name="Герметик аварийный", name_mars="LeakStop Foam", brand="RegolithWorks", description="Быстротвердеющая пена для герметизации трещин. Работает при −60 °C.", price_sols=42.0, price_credits=155.0, stock=200, category_id=2, image_emoji="🧴", rating=4.0),
        # Food
        models.Product(sku="SEED-TOM-M", name="Семена томатов (адаптированные)", name_mars="RedFruit Seeds", brand="Hydro-Feast", description="Генно-адаптированные семена томатов для марсианской гидропоники. Урожай за 45 сол.", price_sols=28.0, price_credits=100.0, stock=300, category_id=3, image_emoji="🍅", rating=4.6, is_featured=True),
        models.Product(sku="RATION-ALG-12", name="Рацион из водорослей (12 порций)", name_mars="GreenBite Pack", brand="Hydro-Feast", description="Сублимированный питательный рацион на основе спирулины. 2200 ккал/день.", price_sols=55.0, price_credits=200.0, stock=180, category_id=3, image_emoji="🥗", rating=3.9),
        models.Product(sku="YEAST-CULT-01", name="Культура дрожжей для ферментации", name_mars="Ferment-Core", brand="Hydro-Feast", description="Стартовая культура для производства белка и напитков на базе.", price_sols=35.0, price_credits=125.0, stock=90, category_id=3, image_emoji="🧫", rating=4.3),
        # Gear
        models.Product(sku="BOOT-RAD-42", name="Ботинки с радиационной защитой", name_mars="DustWalkers Pro", brand="DustGuard", description="Усиленная подошва, защита от пыли и ионизирующего излучения. Размеры 38–46.", price_sols=310.0, price_credits=1120.0, stock=55, category_id=4, image_emoji="👢", rating=4.5, is_featured=True),
        models.Product(sku="SUIT-LIGHT-09", name="Лёгкий скафандр (дневной)", name_mars="SunShell Lite", brand="DustGuard", description="Упрощённый костюм для работы внутри куполов и коротких выходов.", price_sols=890.0, price_credits=3200.0, stock=18, category_id=4, image_emoji="🧑‍🚀", rating=4.7),
        models.Product(sku="GLOVE-DEX-03", name="Перчатки высокой ловкости", name_mars="FineGrip Gloves", brand="DustGuard", description="Тонкие, но прочные перчатки для работы с инструментами.", price_sols=75.0, price_credits=270.0, stock=110, category_id=4, image_emoji="🧤", rating=4.2),
        # Energy
        models.Product(sku="SOL-PANEL-MINI", name="Солнечная панель мини (50 Вт)", name_mars="SolPlate 50", brand="SolTech", description="Складная панель для зарядки оборудования и маяков.", price_sols=160.0, price_credits=580.0, stock=70, category_id=5, image_emoji="☀️", rating=4.4),
        models.Product(sku="BATT-LI-S20", name="Аккумулятор Li-S 20 кВт·ч", name_mars="PowerCell 20", brand="SolTech", description="Лёгкий литий-серный аккумулятор для жилых модулей.", price_sols=1250.0, price_credits=4500.0, stock=12, category_id=5, image_emoji="🔋", rating=4.9, is_featured=True),
        # Comm
        models.Product(sku="COMM-WRIST-01", name="Наручный комм-линк", name_mars="Phobos Band", brand="Phobos Link", description="Связь с орбитой и базой в радиусе 50 км. Голосовые и текстовые сообщения.", price_sols=195.0, price_credits=710.0, stock=85, category_id=6, image_emoji="⌚", rating=4.3),
        models.Product(sku="BEACON-EM-02", name="Аварийный маяк", name_mars="SignalFlare X", brand="Phobos Link", description="Автоматический маяк с GPS-координатами и сигналом бедствия.", price_sols=88.0, price_credits=320.0, stock=60, category_id=6, image_emoji="🚨", rating=4.6),
    ]
    db.add_all(products)

    # Users
    admin = models.User(
        email="admin@aresmarket.mars",
        username="admin",
        full_name="Администратор Колонии",
        hashed_password=auth.get_password_hash("admin123"),
        role="admin",
        colony="Olympus City",
    )
    colonist = models.User(
        email="nova@aresmarket.mars",
        username="nova",
        full_name="Nova Chen",
        hashed_password=auth.get_password_hash("nova123"),
        role="colonist",
        colony="Valles Base",
    )
    db.add(admin)
    db.add(colonist)
    db.commit()


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_data(db)
    finally:
        db.close()


# ==================== AUTH ====================
@app.post("/api/auth/register", response_model=schemas.UserOut, tags=["Auth"])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if auth.get_user_by_email(db, user.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if auth.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    # BUG: password length not re-checked strictly beyond pydantic; no strength rules
    db_user = models.User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=auth.get_password_hash(user.password),
        colony=user.colony or "Olympus City",
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/auth/login", response_model=schemas.Token, tags=["Auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/api/auth/me", response_model=schemas.UserOut, tags=["Auth"])
def me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user


# ==================== LOCALE (INTENTIONAL 500) ====================
@app.get("/api/locale/{lang}", tags=["Locale"])
def switch_locale(lang: str):
    """
    Переключение локали.
    Earth locales: ru, en
    Martian: mars / mrt / arean
    """
    if lang.lower() in ("mars", "mrt", "arean", "martian"):
        # INTENTIONAL BUG: Martian locale always returns 500
        raise HTTPException(
            status_code=500,
            detail="Internal Server Error: Martian localization service unavailable. Core dump in sector 7G.",
        )
    if lang.lower() in ("ru", "en", "earth"):
        return {"locale": lang.lower(), "status": "ok", "message": f"Locale set to {lang}"}
    raise HTTPException(status_code=400, detail="Unsupported locale")


# ==================== CATEGORIES ====================
@app.get("/api/categories", response_model=List[schemas.CategoryOut], tags=["Catalog"])
def list_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()


# ==================== PRODUCTS ====================
@app.get("/api/products", response_model=List[schemas.ProductOut], tags=["Catalog"])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = Query(None, description="price_asc, price_desc, rating, name"),
    featured: Optional[bool] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Product).filter(models.Product.is_active == True)

    if category:
        cat = db.query(models.Category).filter(models.Category.code == category).first()
        if cat:
            q = q.filter(models.Product.category_id == cat.id)
        # BUG: if category code wrong — silently returns all instead of 404/empty

    if search:
        # BUG: case-sensitive + only name, not description or brand
        q = q.filter(models.Product.name.contains(search))

    if min_price is not None:
        q = q.filter(models.Product.price_sols >= min_price)
    if max_price is not None:
        # BUG: max_price is exclusive (uses < instead of <=) — off-by-one style
        q = q.filter(models.Product.price_sols < max_price)

    if featured is True:
        q = q.filter(models.Product.is_featured == True)

    if sort == "price_asc":
        q = q.order_by(models.Product.price_sols.asc())
    elif sort == "price_desc":
        q = q.order_by(models.Product.price_sols.desc())
    elif sort == "rating":
        q = q.order_by(models.Product.rating.desc())
    elif sort == "name":
        q = q.order_by(models.Product.name.asc())
    else:
        q = q.order_by(models.Product.id.asc())

    # BUG: no total count returned; pagination can be confusing
    return q.offset(skip).limit(limit).all()


@app.get("/api/products/{product_id}", response_model=schemas.ProductDetail, tags=["Catalog"])
def get_product(product_id: int, db: Session = Depends(get_db)):
    p = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


# ==================== CART ====================
@app.get("/api/cart", response_model=schemas.CartOut, tags=["Cart"])
def get_cart(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    total = 0.0
    total_items = 0
    for it in items:
        # BUG: total calculation ignores quantity sometimes? No — multiplies, but floating point can look odd
        total += (it.product.price_sols * it.quantity) if it.product else 0
        total_items += it.quantity
    # BUG: total is not rounded → can show 123.456789 sols
    return {"items": items, "total_sols": total, "total_items": total_items}


@app.post("/api/cart/items", response_model=schemas.CartItemOut, tags=["Cart"])
def add_to_cart(
    item: schemas.CartItemCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock < item.quantity:
        # BUG: error message doesn't say how many are available
        raise HTTPException(status_code=400, detail="Not enough stock")

    existing = (
        db.query(models.CartItem)
        .filter(models.CartItem.user_id == current_user.id, models.CartItem.product_id == item.product_id)
        .first()
    )
    if existing:
        # BUG: allows quantity to exceed stock without re-check after add
        existing.quantity += item.quantity
        db.commit()
        db.refresh(existing)
        return existing

    ci = models.CartItem(user_id=current_user.id, product_id=item.product_id, quantity=item.quantity)
    db.add(ci)
    db.commit()
    db.refresh(ci)
    return ci


@app.patch("/api/cart/items/{item_id}", response_model=schemas.CartItemOut, tags=["Cart"])
def update_cart_item(
    item_id: int,
    quantity: int = Query(..., ge=0),
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    ci = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not ci:
        raise HTTPException(status_code=404, detail="Cart item not found")
    if quantity == 0:
        db.delete(ci)
        db.commit()
        # BUG: returns 200 with null body instead of 204
        return None  # will cause response model issues sometimes
    # BUG: no stock check on update
    ci.quantity = quantity
    db.commit()
    db.refresh(ci)
    return ci


@app.delete("/api/cart/items/{item_id}", status_code=204, tags=["Cart"])
def remove_cart_item(
    item_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    ci = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not ci:
        raise HTTPException(status_code=404, detail="Cart item not found")
    db.delete(ci)
    db.commit()
    return None


# ==================== ORDERS ====================
@app.post("/api/orders", response_model=schemas.OrderOut, tags=["Orders"])
def create_order(
    order_data: schemas.OrderCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    items = db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).all()
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = 0.0
    for it in items:
        total += it.product.price_sols * it.quantity
        # BUG: stock is NOT decremented on order

    order = models.Order(
        user_id=current_user.id,
        total_sols=total,
        status="pending",
        delivery_colony=order_data.delivery_colony,
    )
    db.add(order)
    db.flush()

    for it in items:
        oi = models.OrderItem(
            order_id=order.id,
            product_id=it.product_id,
            quantity=it.quantity,
            price_sols=it.product.price_sols,
        )
        db.add(oi)
        db.delete(it)  # clear cart

    db.commit()
    db.refresh(order)
    return order


@app.get("/api/orders", response_model=List[schemas.OrderOut], tags=["Orders"])
def my_orders(
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Order)
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


# ==================== REVIEWS ====================
@app.post("/api/reviews", response_model=schemas.ReviewOut, tags=["Reviews"])
def create_review(
    review: schemas.ReviewCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == review.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    # BUG: allows multiple reviews from same user on same product
    r = models.Review(
        product_id=review.product_id,
        user_id=current_user.id,
        rating=review.rating,
        title=review.title,
        body=review.body,
    )
    db.add(r)
    # BUG: product.rating is never recalculated after new review
    db.commit()
    db.refresh(r)
    return r


@app.get("/api/products/{product_id}/reviews", response_model=List[schemas.ReviewOut], tags=["Reviews"])
def product_reviews(product_id: int, db: Session = Depends(get_db)):
    return db.query(models.Review).filter(models.Review.product_id == product_id).all()


# ==================== STATS / SEARCH HELPERS ====================
@app.get("/api/stats", tags=["Misc"])
def stats(db: Session = Depends(get_db)):
    return {
        "products": db.query(models.Product).count(),
        "categories": db.query(models.Category).count(),
        "users": db.query(models.User).count(),
        "currency": "Sols (Ṡ)",
        "colony_network": ["Olympus City", "Valles Base", "Phobos Dock", "Hellas Outpost"],
    }


# ==================== FRONTEND ====================
@app.get("/")
def root():
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    return JSONResponse({"message": "AresMarket API. See /api/docs"})


@app.get("/{full_path:path}")
def spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")
    index = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index):
        return FileResponse(index)
    raise HTTPException(status_code=404)
