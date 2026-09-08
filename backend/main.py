from fastapi import FastAPI, Depends, HTTPException, status, Query, Response, File, UploadFile, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import random
import uuid
import shutil

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
        # Life Support — names inspired by Olympus Market draft
        models.Product(sku="OX-VD9-01", name="Кислородный баллон «Вдох-9»", name_mars="Oxy-Canister Prime", brand="SolTech", description="Компактный баллон на плечевом креплении. Хватает на полную рабочую смену снаружи купола. Индикатор давления виден даже в перчатках 3-го класса.", price_sols=149.9, price_credits=540.0, stock=34, category_id=1, image_emoji="🫁", rating=4.8, is_featured=True),
        models.Product(sku="WR-FIL-02", name="Фильтр ресайклера воды «Аква-Сито»", name_mars="Aqua-Sieve V2", brand="HeliumLabs", description="Сменный картридж для систем регенерации воды. Ресурс 90 сол.", price_sols=68.5, price_credits=250.0, stock=120, category_id=1, image_emoji="💧", rating=4.4),
        models.Product(sku="CO2-SCR-03", name="Скруббер CO₂ «Дыхание-Мини»", name_mars="BreathClean Mini", brand="SolTech", description="Компактный модуль удаления углекислого газа для шлемов и кают.", price_sols=189.0, price_credits=690.0, stock=28, category_id=1, image_emoji="🌬️", rating=4.2),
        models.Product(sku="SEAL-PRO-10", name="Ремонтный набор «Герметик-Про»", name_mars="LeakStop Foam", brand="RegolithWorks", description="Экстренная заделка микропроколов купола и скафандра. Держит герметичность не менее 72 часов.", price_sols=56.0, price_credits=200.0, stock=63, category_id=1, image_emoji="🧴", rating=4.6),
        # Construction
        models.Product(sku="REG-BRK-100", name="Реголитовые кирпичи «Пылеблок» (100 шт)", name_mars="DustBrick Pack", brand="RegolithWorks", description="Прессованные блоки из марсианского реголита. Идеально для внутренних перегородок.", price_sols=95.0, price_credits=340.0, stock=500, category_id=2, image_emoji="🧱", rating=4.1, is_featured=True),
        models.Product(sku="DOM-PAN-05", name="Панель купола «Небощит» (1×1 м)", name_mars="SkyShell Panel", brand="OlympusForge", description="Прозрачная радиационно-защищённая панель для жилых куполов.", price_sols=420.0, price_credits=1520.0, stock=35, category_id=2, image_emoji="🔲", rating=4.8),
        # Food
        models.Product(sku="SEED-TOM-M", name="Терраформ-семена «Первый лист»", name_mars="RedFruit Seeds", brand="Hydro-Feast", description="Смесь семян, адаптированных для теплиц с пониженным давлением: салат, редис, шпинат. Всхожесть подтверждена на всех куполах колонии.", price_sols=22.9, price_credits=85.0, stock=140, category_id=3, image_emoji="🌱", rating=4.7, is_featured=True),
        models.Product(sku="RATION-ALG-12", name="Рацион из водорослей «Зелёный укус» (12 порций)", name_mars="GreenBite Pack", brand="Hydro-Feast", description="Сублимированный питательный рацион на основе спирулины. 2200 ккал/день.", price_sols=55.0, price_credits=200.0, stock=180, category_id=3, image_emoji="🥗", rating=3.9),
        # Gear
        models.Product(sku="SUIT-REG-09", name="Скафандр «Регол-Лайт»", name_mars="SunShell Lite", brand="DustGuard", description="Облегчённый скафандр для повседневных выходов: уборка солнечных панелей, мелкий ремонт, прогулки. Не предназначен для песчаных бурь категории 3+.", price_sols=2340.0, price_credits=8400.0, stock=12, category_id=4, image_emoji="🧑‍🚀", rating=4.5, is_featured=True),
        models.Product(sku="BOOT-RAD-42", name="Ботинки «Пылеход» с радиационной защитой", name_mars="DustWalkers Pro", brand="DustGuard", description="Усиленная подошва, защита от пыли и ионизирующего излучения. Размеры 38–46.", price_sols=310.0, price_credits=1120.0, stock=55, category_id=4, image_emoji="👢", rating=4.5),
        models.Product(sku="CAPE-DUST-05", name="Пылезащитная накидка «Барханка»", name_mars="DustCape", brand="DustGuard", description="Лёгкая накидка на скафандр из антистатической ткани. Не даёт мелкодисперсной пыли забивать сочленения после бурь.", price_sols=34.5, price_credits=125.0, stock=76, category_id=4, image_emoji="🧥", rating=4.1),
        models.Product(sku="HELM-HOR-02", name="Шлем обзорный «Горизонт-2»", name_mars="Horizon Helm", brand="DustGuard", description="Расширенный угол обзора и антибликовое покрытие. Совместим со скафандрами «Регол».", price_sols=780.0, price_credits=2800.0, stock=9, category_id=4, image_emoji="⛑️", rating=4.3),
        # Energy
        models.Product(sku="SOL-PANEL-MINI", name="Энергоблок «Сол-Заряд 400»", name_mars="SolPlate 400", brand="SolTech", description="Портативный накопитель энергии для модулей и роверов. Заряжается от солнечных панелей купола за один марсианский день.", price_sols=640.0, price_credits=2300.0, stock=21, category_id=5, image_emoji="🔋", rating=4.4, is_featured=True),
        models.Product(sku="BATT-LI-S20", name="Аккумулятор Li-S «Силовой 20»", name_mars="PowerCell 20", brand="SolTech", description="Лёгкий литий-серный аккумулятор для жилых модулей.", price_sols=1250.0, price_credits=4500.0, stock=12, category_id=5, image_emoji="⚡", rating=4.9),
        # Comm
        models.Product(sku="COMM-WRIST-01", name="Наручный комм-линк «Фобос-Бэнд»", name_mars="Phobos Band", brand="Phobos Link", description="Связь с орбитой и базой в радиусе 50 км. Голосовые и текстовые сообщения.", price_sols=195.0, price_credits=710.0, stock=85, category_id=6, image_emoji="⌚", rating=4.3),
        models.Product(sku="BEACON-EM-02", name="Аварийный маяк «Сигнал-Вспышка»", name_mars="SignalFlare X", brand="Phobos Link", description="Автоматический маяк с GPS-координатами и сигналом бедствия.", price_sols=88.0, price_credits=320.0, stock=60, category_id=6, image_emoji="🚨", rating=4.6),
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


# ==================== LOCALE ====================
# Martian locale is "conditionally working": returns 200 + broken strings
# (truncated labels, wrong placeholders). Legacy path /api/locale/mars/crash → 500.

MARTIAN_STRINGS = {
    "nav_home": "Главн",  # truncated
    "nav_catalog": "Катал",
    "nav_cart": "Корзин",
    "nav_orders": "Заказ",
    "nav_bugs": "Баг-реп",
    "nav_guide": "Как тест",
    "nav_feedback": "Обратн связь",
    "search_placeholder": "Type product name here...",  # wrong language placeholder
    "add_to_cart": "В корз",
    "price_label": "Цена от",
    "checkout": "Оформит заказ",
    "login": "Вхо",
    "register": "Регистр",
    "hero_title": "AresMarket — колония",
    "hero_subtitle": "Всё для жизни на Красной планете...",
    "empty_cart": "Корзина пуст",
    "feedback_name": "Your full name",  # wrong locale
    "feedback_email": "email@example.com",
    "feedback_message": "Опишите проблему кратко...",  # truncated hint
    "footer": "AresMarket © 2019",  # outdated year remains
}


@app.get("/api/locale/{lang}", tags=["Locale"])
def switch_locale(lang: str):
    """
    Locale switch.
    Earth: ru, en — full OK.
    Martian: mars / mrt / arean — HTTP 200 with incomplete/wrong UI strings (subtle bugs).
    """
    code = lang.lower()
    if code in ("mars", "mrt", "arean", "martian"):
        return {
            "locale": "mars",
            "status": "partial",
            "message": "Martian locale loaded with limited dictionary",
            "strings": MARTIAN_STRINGS,
        }
    if code in ("ru", "en", "earth"):
        return {"locale": code if code != "earth" else "ru", "status": "ok", "message": f"Locale set to {lang}", "strings": {}}
    raise HTTPException(status_code=400, detail="Unsupported locale")


@app.get("/api/locale/mars/crash", tags=["Locale"])
def locale_mars_crash():
    """Legacy endpoint kept for API explorers — still returns 500 (intentional)."""
    raise HTTPException(
        status_code=500,
        detail="Internal Server Error: Martian localization core dump in sector 7G.",
    )


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
        # INTENTIONAL BUG (B1): price_asc sorts DESC — same as Olympus Market draft
        q = q.order_by(models.Product.price_sols.desc())
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


# ==================== BUG REPORTS (студенты оформляют находки здесь) ====================
ALLOWED_SEVERITIES = {"blocker", "critical", "major", "minor", "trivial", "medium", "high", "low"}

@app.post("/api/bugreports", response_model=schemas.BugReportOut, status_code=201, tags=["Bug Reports"])
def create_bug_report(payload: schemas.BugReportCreate, db: Session = Depends(get_db)):
    # BUG: severity silently normalized to "medium" if unknown — no 422
    sev = payload.severity.lower() if payload.severity else "medium"
    if sev not in ALLOWED_SEVERITIES:
        sev = "medium"
    report = models.BugReport(
        title=payload.title,
        discipline=payload.discipline or "Не указана",
        steps=payload.steps,
        expected=payload.expected,
        actual=payload.actual,
        severity=sev,
        priority=(payload.priority or "medium").lower(),
        environment=payload.environment or "",
        reporter=payload.reporter or "Аноним",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@app.get("/api/bugreports", response_model=List[schemas.BugReportOut], tags=["Bug Reports"])
def list_bug_reports(
    discipline: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.BugReport).order_by(models.BugReport.created_at.desc())
    if discipline:
        q = q.filter(models.BugReport.discipline == discipline)
    if severity:
        # BUG: case-sensitive severity filter
        q = q.filter(models.BugReport.severity == severity)
    if search:
        # BUG: case-sensitive search only on title
        q = q.filter(models.BugReport.title.contains(search))
    return q.all()


@app.get("/api/bugreports/{report_id}", response_model=schemas.BugReportOut, tags=["Bug Reports"])
def get_bug_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(models.BugReport).filter(models.BugReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Bug report not found")
    return r


@app.delete("/api/bugreports/{report_id}", status_code=204, tags=["Bug Reports"])
def delete_bug_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")),
):
    """Only admin may delete bug reports. Colonist receives 403."""
    r = db.query(models.BugReport).filter(models.BugReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Bug report not found")
    db.delete(r)
    db.commit()
    return None


# ==================== STATS / SEARCH HELPERS ====================
# ==================== FEEDBACK (with attachment traps) ====================
UPLOAD_DIR = os.environ.get("ARES_UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Documented allowed types for students (UI text). Actual checks are intentionally inconsistent.
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".txt", ".doc", ".docx", ".csv", ".xlsx"}
# BUG: .exe and .zip not in public list but not blocked by extension check below in some paths
MAX_FILES_DOCUMENTED = 3
MAX_SIZE_MB_DOCUMENTED = 5


@app.post("/api/feedback", response_model=schemas.FeedbackOut, status_code=201, tags=["Feedback"])
async def create_feedback(
    name: str = Form(...),
    email: str = Form(...),
    category: str = Form("general"),
    subject: str = Form(...),
    message: str = Form(...),
    rating: int = Form(0),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_user),
):
    """
    Feedback form with file attachments.
    Guests and authenticated users may submit.
    Intentional traps for QA practice (size, type, count, validation).
    """
    # BUG: email format not validated on server (only non-empty via Form)
    # BUG: rating can be 0 or >5 without 422
    if rating < 0:
        rating = 0  # silent clamp instead of error

    saved_names = []
    file_list = files or []
    # BUG: documented max 3 files; code allows 4 (off-by-one)
    if len(file_list) > MAX_FILES_DOCUMENTED + 1:
        raise HTTPException(status_code=400, detail=f"Too many files (max {MAX_FILES_DOCUMENTED})")

    for f in file_list:
        if not f or not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        # BUG: only extension checked, not content-type; .pdf.exe style double extensions slip
        # BUG: empty extension allowed
        content = await f.read()
        size_mb = len(content) / (1024 * 1024)
        # BUG: documented 5MB limit, actual check uses 15MB
        if size_mb > 15:
            raise HTTPException(status_code=400, detail="File too large")
        # BUG: no reject for disallowed extensions — only warning path missing
        safe_name = f"{uuid.uuid4().hex[:10]}_{f.filename.replace(' ', '_')}"
        path = os.path.join(UPLOAD_DIR, safe_name)
        with open(path, "wb") as out:
            out.write(content)
        saved_names.append(safe_name)

    fb = models.Feedback(
        user_id=current_user.id if current_user else None,
        name=name,
        email=email,
        category=category or "general",
        subject=subject,
        message=message,  # stored as-is — XSS risk if rendered unescaped
        rating=rating,
        attachments=",".join(saved_names),
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@app.get("/api/feedback", response_model=List[schemas.FeedbackOut], tags=["Feedback"])
def list_feedback(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")),
):
    """Admin-only: full feedback inbox. Colonist → 403."""
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).all()


@app.get("/api/admin/orders", tags=["Admin"])
def admin_all_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")),
):
    """Admin can list orders of all colonists."""
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).limit(100).all()
    return [
        {
            "id": o.id,
            "user_id": o.user_id,
            "total_sols": o.total_sols,
            "status": o.status,
            "delivery_colony": o.delivery_colony,
            "created_at": o.created_at,
        }
        for o in orders
    ]


@app.get("/api/admin/users", tags=["Admin"])
def admin_list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_roles("admin")),
):
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "colony": u.colony,
            "is_active": u.is_active,
        }
        for u in users
    ]


@app.get("/api/stats", tags=["Misc"])
def stats(db: Session = Depends(get_db)):
    return {
        "products": db.query(models.Product).count(),
        "categories": db.query(models.Category).count(),
        "users": db.query(models.User).count(),
        "bug_reports": db.query(models.BugReport).count(),
        "feedback": db.query(models.Feedback).count(),
        "currency": "Sols (Ṡ)",
        "roles": ["guest", "colonist", "admin"],
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
