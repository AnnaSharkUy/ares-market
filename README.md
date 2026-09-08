# AresMarket 🔴

**Межпланетный маркетплейс колонии Марса** — учебное кроссплатформенное веб-приложение с намеренно внедрёнными дефектами для практики функционального, UI, API и exploratory тестирования.

Подходит для:
- стажировки full-stack тестировщиков
- конкурсного отбора кандидатов
- самостоятельной практики Bug Report’ов

Аналоги (для контекста): AcademyBugs, SauceDemo / Swag Labs, Sweet Shop, Practice Software Testing (Toolshop), Realbugz, SpaceDucking.  
Уникальность AresMarket — марсианская тематика, валюта Sols, колонии, «ломающаяся» марсианская локаль и богатый e-commerce флоу.

## Возможности

- Адаптивный UI (mobile + desktop)
- Каталог с категориями, поиском, фильтрами, сортировкой
- **Встроенные баг-репорты** — студенты оформляют находки прямо в приложении
- Страница «Как тестировать» (дисциплины + справочник API)
- Карточки товаров с вымышленными, но логичными марсианскими названиями
- Корзина, изменение количества, оформление заказа
- Регистрация / вход (JWT)
- Отзывы
- Баг-репорты (форма + доска)
- Страница «Как тестировать»
- Переключатель локали (RU / EN / **Марсианский** → 500)
- REST API + Swagger (`/api/docs`)
- SQLite

## Быстрый старт

```bash
cd ares-market
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Открыть: **http://localhost:8000**  
Swagger: **http://localhost:8000/api/docs**

### Демо-аккаунты

| Логин  | Пароль   | Роль      |
|--------|----------|-----------|
| nova   | nova123  | colonist  |
| admin  | admin123 | admin     |

## Структура

```
ares-market/
├── backend/
│   ├── main.py          # FastAPI + seed + intentional bugs
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   └── database.py
├── frontend/
│   ├── index.html
│   └── static/
│       ├── styles.css   # Mars theme + responsive
│       └── app.js
├── requirements.txt
├── README.md
├── INTENTIONAL_BUGS.md  # только для тренера
└── .gitignore
```

## Валюта и мир

- **Sols (Ṡ)** — основная валюта колонии
- **Credits (₡)** — земные кредиты (справочно)
- Колонии: Olympus City, Valles Base, Phobos Dock, Hellas Outpost
- Бренды: SolTech, RegolithWorks, DustGuard, Hydro-Feast, Phobos Link, OlympusForge, HeliumLabs

## Что тестировать студентам

1. UI/UX и адаптивность (мобильные + десктоп)
2. Фильтры, поиск, сортировка, пагинация
3. Корзина и расчёт итогов
4. Оформление заказа и остатки на складе
5. Регистрация / авторизация
6. Отзывы
7. **Переключение на марсианскую локаль** (ожидаемый 500)
8. REST API через Swagger / Postman
9. Граничные значения количества, цен, пустых полей

Оформляйте Bug Reports с шагами, ожидаемым и фактическим результатом, severity.

## Git

```bash
git init
git add .
git commit -m "Initial commit: AresMarket — Martian marketplace for testing practice"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

---

Сделано для программы стажировки по функциональному / full-stack тестированию.  
Находите баги — это и есть главная практика. 🐛🔴
