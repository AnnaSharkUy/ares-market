const API = '/api';
let token = localStorage.getItem('ares_token') || null;
let currentUser = JSON.parse(localStorage.getItem('ares_user') || 'null');
let cartCount = 0;

// ==================== UTILS ====================
function toast(msg, type = 'info') {
    const el = document.getElementById('toast');
    const body = document.getElementById('toast-body');
    body.textContent = msg;
    el.classList.remove('text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-primary');
    if (type === 'success') el.classList.add('text-bg-success');
    else if (type === 'error') el.classList.add('text-bg-danger');
    else if (type === 'warning') el.classList.add('text-bg-warning');
    else el.classList.add('text-bg-primary');
    new bootstrap.Toast(el).show();
}

async function api(path, options = {}) {
    const headers = options.headers || {};
    if (!(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
        headers['Content-Type'] = 'application/json';
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(API + path, { ...options, headers });
    if (res.status === 401) {
        logout(false);
        showPage('login');
        toast('Сессия истекла. Войдите снова.', 'warning');
        throw new Error('Unauthorized');
    }
    if (res.status === 204) return null;
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) {
        const detail = data.detail || res.statusText || 'Ошибка';
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    }
    return data;
}

function updateAuthUI() {
    const area = document.getElementById('auth-area');
    if (currentUser) {
        const roleBadge = currentUser.role === 'admin'
            ? '<span class="badge bg-danger ms-1">admin</span>'
            : '<span class="badge bg-secondary ms-1">colonist</span>';
        const adminLink = currentUser.role === 'admin'
            ? '<li class="nav-item"><a class="nav-link" href="#" onclick="showPage(\'admin\')">Админ</a></li>'
            : '';
        area.innerHTML = `
            ${adminLink}
            <li class="nav-item"><span class="nav-link text-warning">${currentUser.username} ${roleBadge}</span></li>
            <li class="nav-item"><a class="nav-link" href="#" onclick="logout()">Выход</a></li>
        `;
    } else {
        area.innerHTML = `<li class="nav-item"><a class="nav-link" href="#" onclick="showPage('login')">Вход</a></li>
                          <li class="nav-item"><a class="nav-link" href="#" onclick="showPage('register')">Регистрация</a></li>`;
    }
}

async function refreshCartBadge() {
    if (!currentUser) {
        document.getElementById('cart-badge').textContent = '0';
        return;
    }
    try {
        const cart = await api('/cart');
        cartCount = cart.total_items || 0;
        document.getElementById('cart-badge').textContent = cartCount;
    } catch {
        document.getElementById('cart-badge').textContent = '0';
    }
}

function logout(show = true) {
    token = null;
    currentUser = null;
    localStorage.removeItem('ares_token');
    localStorage.removeItem('ares_user');
    updateAuthUI();
    if (show) toast('Вы вышли из системы', 'info');
    showPage('home');
}

// ==================== LOCALE (INTENTIONAL 500) ====================
let localeStrings = {};

async function setLocale(lang) {
    try {
        const res = await fetch(API + '/locale/' + lang);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            toast(`Ошибка локали (${res.status}): ${data.detail || res.statusText}`, 'error');
            console.error('Locale switch failed', res.status, data);
            return;
        }
        const data = await res.json();
        document.getElementById('current-locale').textContent = (data.locale || lang).toUpperCase();
        localeStrings = data.strings || {};
        applyLocaleStrings();
        toast(`Локаль: ${data.message}`, data.status === 'partial' ? 'warning' : 'success');

        // INTENTIONAL UI BUG: after loading partial Martian strings, UI also calls
        // the crash endpoint and surfaces HTTP 500 to the user (second independent defect).
        if ((data.locale || lang).toLowerCase() === 'mars') {
            try {
                const crash = await fetch(API + '/locale/mars/crash');
                if (!crash.ok) {
                    const errBody = await crash.json().catch(() => ({}));
                    toast(`Ошибка локали (${crash.status}): ${errBody.detail || crash.statusText}`, 'error');
                }
            } catch (e2) {
                toast('Сетевая ошибка crash-локали: ' + e2.message, 'error');
            }
        }
    } catch (e) {
        toast('Сетевая ошибка при смене локали: ' + e.message, 'error');
    }
}

function applyLocaleStrings() {
    // Apply partial Martian dictionary to nav (truncated / wrong strings = intentional subtle bugs)
    const map = [
        ['a[onclick*="showPage(\'home\')"]', 'nav_home'],
        ['a[onclick*="showPage(\'catalog\')"]', 'nav_catalog'],
        ['a[onclick*="showPage(\'cart\')"]', 'nav_cart'],
        ['a[onclick*="showPage(\'orders\')"]', 'nav_orders'],
        ['a[onclick*="showPage(\'bugs\')"]', 'nav_bugs'],
        ['a[onclick*="showPage(\'guide\')"]', 'nav_guide'],
        ['a[onclick*="showPage(\'feedback\')"]', 'nav_feedback'],
    ];
    if (!localeStrings || !Object.keys(localeStrings).length) {
        // reset to Russian defaults
        const defaults = {
            nav_home: 'Главная', nav_catalog: 'Каталог', nav_cart: 'Корзина',
            nav_orders: 'Заказы', nav_bugs: 'Баг-репорты', nav_guide: 'Как тестировать',
            nav_feedback: 'Обратная связь'
        };
        map.forEach(([sel, key]) => {
            const el = document.querySelector(sel);
            if (el && defaults[key]) {
                if (key === 'nav_cart') {
                    const badge = el.querySelector('#cart-badge');
                    el.childNodes[0].textContent = defaults[key] + ' ';
                    if (badge) el.appendChild(badge);
                } else el.textContent = defaults[key];
            }
        });
        return;
    }
    map.forEach(([sel, key]) => {
        const el = document.querySelector(sel);
        if (el && localeStrings[key]) {
            if (key === 'nav_cart') {
                const badge = el.querySelector('#cart-badge');
                el.childNodes[0].textContent = localeStrings[key] + ' ';
                if (badge) el.appendChild(badge);
            } else {
                el.textContent = localeStrings[key];
            }
        }
    });
}

// ==================== PAGES ====================
function showPage(page, param) {
    updateAuthUI();
    refreshCartBadge();
    const app = document.getElementById('app');
    switch (page) {
        case 'home': renderHome(app); break;
        case 'catalog': renderCatalog(app); break;
        case 'product': renderProduct(app, param); break;
        case 'cart': renderCart(app); break;
        case 'orders': renderOrders(app); break;
        case 'bugs': renderBugs(app); break;
        case 'report-bug': renderReportBug(app); break;
        case 'guide': renderGuide(app); break;
        case 'feedback': renderFeedback(app); break;
        case 'admin': renderAdmin(app); break;
        case 'login': renderLogin(app); break;
        case 'register': renderRegister(app); break;
        default: renderHome(app);
    }
}

// ==================== HOME ====================
async function renderHome(app) {
    app.innerHTML = `
        <div class="hero-mars mb-4">
            <h1 class="display-5 fw-bold mb-2">AresMarket</h1>
            <p class="lead mb-3">Официальный маркетплейс колонии Марса.<br>
            Всё необходимое для жизни на Красной планете — от кислорода до реголитовых кирпичей.</p>
            <button class="btn btn-mars btn-lg me-2" onclick="showPage('catalog')">Открыть каталог</button>
            ${!currentUser ? `<button class="btn btn-outline-mars btn-lg" onclick="showPage('register')">Стать колонистом</button>` : ''}
        </div>
        <h4 class="mb-3">🔥 Рекомендуем колонистам</h4>
        <div class="row g-3" id="featured-list">
            <div class="col-12 text-center py-5"><div class="spinner-border text-warning"></div></div>
        </div>
        <div class="alert alert-dark border-warning mt-4">
            <strong>Для студентов-тестировщиков:</strong> это учебное приложение с намеренно внедрёнными дефектами.
            Исследуйте UI, корзину, фильтры, API (<a href="/api/docs" target="_blank" class="link-warning">/api/docs</a>),
            переключение локали и оформляйте Bug Reports.
        </div>
    `;
    try {
        const products = await api('/products?featured=true&limit=8');
        document.getElementById('featured-list').innerHTML = products.map(p => productCard(p)).join('') ||
            '<div class="col-12"><p class="text-muted">Нет рекомендуемых товаров</p></div>';
    } catch (e) {
        document.getElementById('featured-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

function productCard(p) {
    return `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="product-card" onclick="showPage('product', ${p.id})" style="cursor:pointer">
                <div class="product-emoji">${p.image_emoji || '📦'}</div>
                <div class="p-3">
                    ${p.is_featured ? '<span class="badge badge-featured mb-1">Хит</span>' : ''}
                    <div class="product-title small fw-semibold mb-1">${p.name}</div>
                    <div class="text-muted" style="font-size:0.75rem">${p.brand || ''}</div>
                    <div class="price-sols mt-2">${p.price_sols.toFixed(1)} Ṡ</div>
                    <div class="price-credits">≈ ${p.price_credits ? p.price_credits.toFixed(0) : '—'} ₡</div>
                    <button class="btn btn-sm btn-mars w-100 mt-2 filter-btn-inconsistent"
                            onclick="event.stopPropagation(); addToCart(${p.id})">В корзину</button>
                </div>
            </div>
        </div>
    `;
}

// ==================== CATALOG ====================
async function renderCatalog(app) {
    app.innerHTML = `
        <h2 class="mb-3">Каталог</h2>
        <div class="filters-bar mb-4">
            <div class="row g-2 align-items-end">
                <div class="col-md-3">
                    <label class="form-label small">Категория</label>
                    <select class="form-select form-select-sm" id="filter-cat">
                        <option value="">Все</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label small">Цена от</label>
                    <input type="number" class="form-control form-control-sm" id="filter-min" placeholder="0">
                </div>
                <div class="col-md-2">
                    <label class="form-label small">Цена до</label>
                    <input type="number" class="form-control form-control-sm" id="filter-max" placeholder="9999">
                </div>
                <div class="col-md-2">
                    <label class="form-label small">Сортировка</label>
                    <select class="form-select form-select-sm" id="filter-sort">
                        <option value="">По умолчанию</option>
                        <option value="price_asc">Цена ↑</option>
                        <option value="price_desc">Цена ↓</option>
                        <option value="rating">Рейтинг</option>
                        <option value="name">Название</option>
                    </select>
                </div>
                <div class="col-md-2">
                    <label class="form-label small">Поиск</label>
                    <input type="text" class="form-control form-control-sm" id="filter-search" placeholder="Название...">
                </div>
                <div class="col-md-1">
                    <button class="btn btn-mars btn-sm w-100" onclick="loadCatalog()">OK</button>
                </div>
            </div>
        </div>
        <div class="row g-3" id="catalog-list">
            <div class="col-12 text-center py-5"><div class="spinner-border text-warning"></div></div>
        </div>
    `;
    try {
        const cats = await api('/categories');
        const sel = document.getElementById('filter-cat');
        cats.forEach(c => {
            const o = document.createElement('option');
            o.value = c.code;
            o.textContent = `${c.icon || ''} ${c.name}`;
            sel.appendChild(o);
        });
    } catch {}
    await loadCatalog();
}

async function loadCatalog() {
    const cat = document.getElementById('filter-cat')?.value || '';
    const min = document.getElementById('filter-min')?.value || '';
    const max = document.getElementById('filter-max')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || '';
    const search = document.getElementById('filter-search')?.value || '';
    let q = [];
    if (cat) q.push('category=' + encodeURIComponent(cat));
    if (min) q.push('min_price=' + min);
    if (max) q.push('max_price=' + max);
    if (sort) q.push('sort=' + sort);
    if (search) q.push('search=' + encodeURIComponent(search));
    q.push('limit=50');
    try {
        const products = await api('/products?' + q.join('&'));
        const el = document.getElementById('catalog-list');
        if (!products.length) {
            el.innerHTML = '<div class="col-12"><div class="alert alert-secondary">Ничего не найдено</div></div>';
            return;
        }
        el.innerHTML = products.map(p => productCard(p)).join('');
    } catch (e) {
        document.getElementById('catalog-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

// ==================== PRODUCT DETAIL ====================
async function renderProduct(app, id) {
    app.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>`;
    try {
        const p = await api('/products/' + id);
        const reviews = await api('/products/' + id + '/reviews').catch(() => []);
        app.innerHTML = `
            <button class="btn btn-sm btn-outline-mars mb-3" onclick="showPage('catalog')">← Каталог</button>
            <div class="row g-4">
                <div class="col-md-5">
                    <div class="product-card">
                        <div class="product-emoji" style="font-size:6rem;padding:2rem 0">${p.image_emoji || '📦'}</div>
                    </div>
                </div>
                <div class="col-md-7">
                    <div class="card-mars p-4 rounded">
                        <span class="badge bg-secondary mb-2">${p.brand || '—'}</span>
                        ${p.is_featured ? '<span class="badge badge-featured mb-2">Хит продаж</span>' : ''}
                        <h2>${p.name}</h2>
                        <p class="text-muted mb-1"><em>${p.name_mars || ''}</em></p>
                        <p>${p.description || ''}</p>
                        <div class="d-flex align-items-baseline gap-3 mb-3">
                            <span class="price-sols fs-3">${p.price_sols.toFixed(1)} Ṡ</span>
                            <span class="price-credits">≈ ${p.price_credits ? p.price_credits.toFixed(0) : '—'} кредитов Земли</span>
                        </div>
                        <p class="small">Остаток на складе: <strong>${p.stock}</strong> • Рейтинг: ${p.rating} ★</p>
                        <div class="d-flex gap-2">
                            <input type="number" class="form-control form-control-sm" id="qty" value="1" min="1" max="99" style="width:80px">
                            <button class="btn btn-mars" onclick="addToCart(${p.id}, document.getElementById('qty').value)">Добавить в корзину</button>
                        </div>
                    </div>
                    <div class="card-mars p-3 rounded mt-3">
                        <h5>Отзывы колонистов (${reviews.length})</h5>
                        ${reviews.length ? reviews.map(r => `
                            <div class="border-bottom border-secondary py-2">
                                <strong>${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</strong> ${r.title}
                                <p class="small mb-0 text-muted">${r.body || ''}</p>
                            </div>
                        `).join('') : '<p class="text-muted small">Пока нет отзывов</p>'}
                        ${currentUser ? `
                            <hr>
                            <h6>Оставить отзыв</h6>
                            <input class="form-control form-control-sm mb-2" id="rev-title" placeholder="Заголовок">
                            <textarea class="form-control form-control-sm mb-2" id="rev-body" rows="2" placeholder="Текст"></textarea>
                            <select class="form-select form-select-sm mb-2" id="rev-rating" style="width:100px">
                                <option value="5">5 ★</option><option value="4">4 ★</option>
                                <option value="3">3 ★</option><option value="2">2 ★</option><option value="1">1 ★</option>
                            </select>
                            <button class="btn btn-sm btn-mars" onclick="submitReview(${p.id})">Отправить</button>
                        ` : '<p class="small text-muted">Войдите, чтобы оставить отзыв</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        app.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

async function submitReview(productId) {
    const title = document.getElementById('rev-title').value.trim();
    const body = document.getElementById('rev-body').value.trim();
    const rating = parseInt(document.getElementById('rev-rating').value);
    if (!title) { toast('Укажите заголовок', 'warning'); return; }
    try {
        await api('/reviews', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, rating, title, body })
        });
        toast('Отзыв добавлен', 'success');
        showPage('product', productId);
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ==================== CART ====================
async function addToCart(productId, qty = 1) {
    if (!currentUser) {
        toast('Сначала войдите в систему', 'warning');
        showPage('login');
        return;
    }
    try {
        await api('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId, quantity: parseInt(qty) || 1 })
        });
        toast('Добавлено в корзину', 'success');
        refreshCartBadge();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function renderCart(app) {
    if (!currentUser) {
        app.innerHTML = `<div class="alert alert-warning">Для просмотра корзины <a href="#" onclick="showPage('login')" class="alert-link">войдите</a>.</div>`;
        return;
    }
    app.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>`;
    try {
        const cart = await api('/cart');
        if (!cart.items.length) {
            app.innerHTML = `
                <h2>Корзина</h2>
                <p class="text-muted">Корзина пуста. <a href="#" onclick="showPage('catalog')" class="link-warning">Перейти в каталог</a></p>
            `;
            return;
        }
        app.innerHTML = `
            <h2 class="mb-4">Корзина</h2>
            <div class="table-responsive">
                <table class="table table-dark table-hover align-middle">
                    <thead><tr><th></th><th>Товар</th><th>Цена</th><th>Кол-во</th><th>Сумма</th><th></th></tr></thead>
                    <tbody>
                        ${cart.items.map(it => `
                            <tr>
                                <td style="font-size:1.5rem">${it.product?.image_emoji || '📦'}</td>
                                <td>${it.product?.name || 'Товар #' + it.product_id}</td>
                                <td>${it.product ? it.product.price_sols.toFixed(1) : '—'} Ṡ</td>
                                <td>
                                    <input type="number" class="form-control form-control-sm" style="width:70px"
                                           value="${it.quantity}" min="0"
                                           onchange="updateCartItem(${it.id}, this.value)">
                                </td>
                                <td>${it.product ? (it.product.price_sols * it.quantity).toFixed(1) : '—'} Ṡ</td>
                                <td><button class="btn btn-sm btn-outline-danger" onclick="removeCartItem(${it.id})">×</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-3">
                <div class="fs-4">Итого: <strong class="price-sols">${cart.total_sols} Ṡ</strong></div>
                <div>
                    <input class="form-control form-control-sm d-inline-block me-2" id="delivery-colony"
                           value="${currentUser.colony || 'Olympus City'}" style="width:180px" placeholder="Колония доставки">
                    <button class="btn btn-mars" onclick="checkout()">Оформить заказ</button>
                </div>
            </div>
            <!-- BUG: total_sols shown without .toFixed → long floats possible -->
        `;
    } catch (e) {
        app.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

async function updateCartItem(id, qty) {
    try {
        await api(`/cart/items/${id}?quantity=${qty}`, { method: 'PATCH' });
        renderCart(document.getElementById('app'));
        refreshCartBadge();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function removeCartItem(id) {
    try {
        await api('/cart/items/' + id, { method: 'DELETE' });
        toast('Удалено', 'success');
        renderCart(document.getElementById('app'));
        refreshCartBadge();
    } catch (e) {
        toast(e.message, 'error');
    }
}

async function checkout() {
    const colony = document.getElementById('delivery-colony')?.value || 'Olympus City';
    try {
        const order = await api('/orders', {
            method: 'POST',
            body: JSON.stringify({ delivery_colony: colony })
        });
        toast(`Заказ #${order.id} оформлен! Статус: ${order.status}`, 'success');
        refreshCartBadge();
        showPage('orders');
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ==================== ORDERS ====================
async function renderOrders(app) {
    if (!currentUser) {
        app.innerHTML = `<div class="alert alert-warning">Войдите, чтобы видеть заказы.</div>`;
        return;
    }
    app.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>`;
    try {
        const orders = await api('/orders');
        if (!orders.length) {
            app.innerHTML = `<h2>Мои заказы</h2><p class="text-muted">Заказов пока нет.</p>`;
            return;
        }
        app.innerHTML = `
            <h2 class="mb-4">Мои заказы</h2>
            <div class="list-group">
                ${orders.map(o => `
                    <div class="list-group-item list-group-item-dark d-flex justify-content-between">
                        <div>
                            <strong>Заказ #${o.id}</strong>
                            <span class="badge bg-secondary ms-2">${o.status}</span>
                            <div class="small text-muted">${new Date(o.created_at).toLocaleString('ru')} → ${o.delivery_colony}</div>
                        </div>
                        <div class="price-sols">${o.total_sols.toFixed ? o.total_sols.toFixed(1) : o.total_sols} Ṡ</div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        app.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

// ==================== BUG REPORTS ====================
async function renderBugs(app) {
    app.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <h2 class="mb-0">Баг-репорты</h2>
            <button class="btn btn-mars" onclick="showPage('report-bug')">+ Оформить баг-репорт</button>
        </div>
        <p class="text-muted">Студенты оформляют найденные дефекты прямо здесь. Это основная практика стенда.</p>
        <div class="filters-bar mb-3">
            <div class="row g-2">
                <div class="col-md-3">
                    <select class="form-select form-select-sm" id="bug-discipline">
                        <option value="">Все дисциплины</option>
                        <option>UI</option>
                        <option>API</option>
                        <option>SQL / данные</option>
                        <option>Локализация</option>
                        <option>Валидация</option>
                        <option>Безопасность</option>
                        <option>Адаптив / кроссбраузерность</option>
                        <option>Прочее</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <select class="form-select form-select-sm" id="bug-severity">
                        <option value="">Любая severity</option>
                        <option value="blocker">blocker</option>
                        <option value="critical">critical</option>
                        <option value="major">major</option>
                        <option value="minor">minor</option>
                        <option value="trivial">trivial</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm" id="bug-search" placeholder="Поиск по заголовку...">
                </div>
                <div class="col-md-2">
                    <button class="btn btn-mars btn-sm w-100" onclick="loadBugs()">Фильтр</button>
                </div>
            </div>
        </div>
        <div id="bugs-list"><div class="text-center py-4"><div class="spinner-border text-warning"></div></div></div>
    `;
    await loadBugs();
}

async function loadBugs() {
    const d = document.getElementById('bug-discipline')?.value || '';
    const s = document.getElementById('bug-severity')?.value || '';
    const q = document.getElementById('bug-search')?.value || '';
    let params = [];
    if (d) params.push('discipline=' + encodeURIComponent(d));
    if (s) params.push('severity=' + encodeURIComponent(s));
    if (q) params.push('search=' + encodeURIComponent(q));
    try {
        const list = await api('/bugreports' + (params.length ? '?' + params.join('&') : ''));
        const el = document.getElementById('bugs-list');
        if (!list.length) {
            el.innerHTML = '<div class="alert alert-secondary">Пока нет баг-репортов. Станьте первым — <a href="#" onclick="showPage(\'report-bug\')" class="alert-link">оформите находку</a>.</div>';
            return;
        }
        el.innerHTML = list.map(r => `
            <div class="card-mars p-3 rounded mb-3">
                <div class="d-flex justify-content-between flex-wrap gap-2">
                    <div>
                        <span class="badge bg-secondary me-1">${r.discipline || '—'}</span>
                        <span class="badge ${sevClass(r.severity)} me-1">${r.severity}</span>
                        <span class="badge bg-dark">${r.priority}</span>
                        <h5 class="mt-2 mb-1">#${r.id} ${escapeHtml(r.title)}</h5>
                        <div class="small text-muted">${r.reporter || 'Аноним'} · ${new Date(r.created_at).toLocaleString('ru')} · ${r.status}</div>
                    </div>
                    ${currentUser && currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteBug(${r.id})" title="Удалить (admin)">×</button>` : ''}
                </div>
                <div class="row mt-3 small">
                    <div class="col-md-4"><strong>Шаги:</strong><pre class="mb-0 text-wrap">${escapeHtml(r.steps)}</pre></div>
                    <div class="col-md-4"><strong>Ожидалось:</strong><pre class="mb-0 text-wrap">${escapeHtml(r.expected)}</pre></div>
                    <div class="col-md-4"><strong>Фактически:</strong><pre class="mb-0 text-wrap">${escapeHtml(r.actual)}</pre></div>
                </div>
                ${r.environment ? `<div class="small text-muted mt-2">Окружение: ${escapeHtml(r.environment)}</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('bugs-list').innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

function sevClass(s) {
    const m = { blocker: 'bg-danger', critical: 'bg-danger', major: 'bg-warning text-dark', minor: 'bg-info text-dark', trivial: 'bg-secondary' };
    return m[(s || '').toLowerCase()] || 'bg-secondary';
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderReportBug(app) {
    app.innerHTML = `
        <button class="btn btn-sm btn-outline-mars mb-3" onclick="showPage('bugs')">← К списку</button>
        <div class="card-mars p-4 rounded">
            <h3 class="mb-3">Оформить баг-репорт</h3>
            <p class="text-muted small">Заполните все поля так, как на реальном проекте. Куратор оценит качество оформления.</p>
            <form id="bug-form">
                <div class="mb-3">
                    <label class="form-label">Заголовок *</label>
                    <input class="form-control" name="title" required minlength="5" placeholder="Кратко: что сломано и где">
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label class="form-label">Дисциплина</label>
                        <select class="form-select" name="discipline">
                            <option>UI</option>
                            <option>API</option>
                            <option>SQL / данные</option>
                            <option>Локализация</option>
                            <option>Валидация</option>
                            <option>Безопасность</option>
                            <option>Адаптив / кроссбраузерность</option>
                            <option>Прочее</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Severity *</label>
                        <select class="form-select" name="severity">
                            <option value="blocker">Blocker</option>
                            <option value="critical">Critical</option>
                            <option value="major" selected>Major</option>
                            <option value="minor">Minor</option>
                            <option value="trivial">Trivial</option>
                        </select>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label">Priority</label>
                        <select class="form-select" name="priority">
                            <option value="high">High</option>
                            <option value="medium" selected>Medium</option>
                            <option value="low">Low</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Шаги воспроизведения *</label>
                    <textarea class="form-control" name="steps" rows="3" required minlength="5" placeholder="1. Открыть...&#10;2. Нажать...&#10;3. ..."></textarea>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Ожидаемый результат *</label>
                        <textarea class="form-control" name="expected" rows="2" required></textarea>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Фактический результат *</label>
                        <textarea class="form-control" name="actual" rows="2" required></textarea>
                    </div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Окружение</label>
                        <input class="form-control" name="environment" placeholder="Chrome 128 / Windows 11 / iPhone Safari">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Автор (ник / ФИО)</label>
                        <input class="form-control" name="reporter" placeholder="nova / Иван И.">
                    </div>
                </div>
                <button class="btn btn-mars">Отправить баг-репорт</button>
            </form>
        </div>
    `;
    document.getElementById('bug-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            await api('/bugreports', {
                method: 'POST',
                body: JSON.stringify({
                    title: fd.get('title'),
                    discipline: fd.get('discipline'),
                    steps: fd.get('steps'),
                    expected: fd.get('expected'),
                    actual: fd.get('actual'),
                    severity: fd.get('severity'),
                    priority: fd.get('priority'),
                    environment: fd.get('environment'),
                    reporter: fd.get('reporter') || 'Аноним'
                })
            });
            toast('Баг-репорт отправлен', 'success');
            showPage('bugs');
        } catch (err) {
            toast(err.message, 'error');
        }
    };
}

async function deleteBug(id) {
    if (!confirm('Удалить баг-репорт #' + id + '?')) return;
    try {
        await api('/bugreports/' + id, { method: 'DELETE' });
        toast('Удалено', 'success');
        loadBugs();
    } catch (e) {
        toast(e.message, 'error');
    }
}

// ==================== ADMIN ====================
async function renderAdmin(app) {
    if (!currentUser || currentUser.role !== 'admin') {
        app.innerHTML = `<div class="alert alert-warning">Раздел только для роли <strong>admin</strong>. Войдите как <code>admin / admin123</code>.</div>`;
        return;
    }
    app.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>`;
    try {
        const [users, orders, feedback] = await Promise.all([
            api('/admin/users'),
            api('/admin/orders'),
            api('/feedback'),
        ]);
        app.innerHTML = `
            <h2 class="mb-3">Панель администратора</h2>
            <p class="text-muted">Доступно только роли <span class="badge bg-danger">admin</span>. Colonist получит 403 на этих API.</p>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="card-mars p-3 h-100">
                        <h5>Пользователи (${users.length})</h5>
                        <ul class="small mb-0 list-unstyled">
                            ${users.map(u => `<li><strong>${u.username}</strong> — ${u.role} · ${u.colony || '—'}</li>`).join('')}
                        </ul>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card-mars p-3 h-100">
                        <h5>Все заказы (${orders.length})</h5>
                        <ul class="small mb-0 list-unstyled">
                            ${orders.slice(0, 15).map(o => `<li>#${o.id} user=${o.user_id} · ${o.total_sols} Ṡ · ${o.status}</li>`).join('') || '<li class="text-muted">Пусто</li>'}
                        </ul>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card-mars p-3 h-100">
                        <h5>Обратная связь (${feedback.length})</h5>
                        <ul class="small mb-0 list-unstyled">
                            ${feedback.slice(0, 15).map(f => `<li>#${f.id} ${escapeHtml(f.subject)} · ${f.category}</li>`).join('') || '<li class="text-muted">Пусто</li>'}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        app.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
    }
}

// ==================== FEEDBACK ====================
function renderFeedback(app) {
    const phName = localeStrings.feedback_name || 'Имя / позывной';
    const phEmail = localeStrings.feedback_email || 'email@colony.mars';
    const phMsg = localeStrings.feedback_message || 'Опишите предложение или проблему подробно';
    app.innerHTML = `
        <h2 class="mb-3">Обратная связь</h2>
        <p class="text-muted">Гость и зарегистрированный колонист могут отправить сообщение. Можно прикрепить документы (PDF, изображения, Office, CSV…).</p>
        <div class="card-mars p-4 rounded">
            <form id="feedback-form">
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Имя *</label>
                        <input class="form-control" name="name" required placeholder="${phName}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Email *</label>
                        <input class="form-control" name="email" required placeholder="${phEmail}">
                        <!-- BUG: type="text" instead of email — weak client validation -->
                    </div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Категория</label>
                        <select class="form-select" name="category">
                            <option value="general">Общее</option>
                            <option value="bug">Сообщение об ошибке</option>
                            <option value="idea">Идея</option>
                            <option value="complaint">Жалоба</option>
                            <!-- BUG: category "urgent" documented in guide text but missing in dropdown -->
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Оценка сервиса (1–5)</label>
                        <input type="number" class="form-control" name="rating" min="0" max="10" value="0">
                        <!-- BUG: max=10 while label says 1–5 -->
                    </div>
                </div>
                <div class="mb-3">
                    <label class="form-label">Тема *</label>
                    <input class="form-control" name="subject" required minlength="3">
                </div>
                <div class="mb-3">
                    <label class="form-label">Сообщение *</label>
                    <textarea class="form-control" name="message" rows="4" required placeholder="${phMsg}"></textarea>
                </div>
                <div class="mb-3">
                    <label class="form-label">Вложения</label>
                    <input type="file" class="form-control" name="files" multiple
                           accept=".pdf,.png,.jpg,.jpeg,.gif,.txt,.doc,.docx,.csv,.xlsx">
                    <div class="form-text">До 3 файлов, до 5 МБ каждый. PDF, изображения, DOC/DOCX, CSV, XLSX, TXT.</div>
                </div>
                <button class="btn btn-mars" type="submit">Отправить</button>
            </form>
        </div>
        <div id="feedback-result" class="mt-3"></div>
    `;
    document.getElementById('feedback-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const fileInput = e.target.querySelector('input[name="files"]');
        const body = new FormData();
        body.append('name', fd.get('name'));
        body.append('email', fd.get('email'));
        body.append('category', fd.get('category'));
        body.append('subject', fd.get('subject'));
        body.append('message', fd.get('message'));
        body.append('rating', fd.get('rating') || '0');
        if (fileInput && fileInput.files) {
            for (const f of fileInput.files) body.append('files', f);
        }
        try {
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;
            // do not set Content-Type — browser sets multipart boundary
            const res = await fetch(API + '/feedback', { method: 'POST', headers, body });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.detail || res.statusText);
            document.getElementById('feedback-result').innerHTML =
                `<div class="alert alert-success">Отправлено (#${data.id}). Вложений: ${(data.attachments || '').split(',').filter(Boolean).length}</div>`;
            // BUG: message HTML not escaped if later listed — stored raw
            toast('Обратная связь отправлена', 'success');
            e.target.reset();
        } catch (err) {
            toast(err.message, 'error');
            document.getElementById('feedback-result').innerHTML =
                `<div class="alert alert-danger">${err.message}</div>`;
        }
    };
}

// ==================== GUIDE ====================
function renderGuide(app) {
    app.innerHTML = `
        <h2 class="mb-3">Как тестировать AresMarket</h2>
        <div class="card-mars p-4 rounded mb-4">
            <p>Это учебный стенд для стажировки full-stack тестировщика. Приложение намеренно содержит дефекты.
            Ваша задача — найти их, воспроизвести и <strong>оформить баг-репорты</strong> на странице
            <a href="#" onclick="showPage('bugs')" class="link-warning">«Баг-репорты»</a>.</p>
            <p class="mb-0">Не чините код — фиксируйте находки. Качество оформления репортов оценивается отдельно.</p>
        </div>

        <h4 class="mb-3">Дисциплины стенда</h4>
        <div class="row g-3 mb-4">
            <div class="col-md-6">
                <div class="card-mars p-3 h-100">
                    <h6>🖥 UI / ручное тестирование</h6>
                    <ul class="small mb-0">
                        <li>Каталог, карточки, фильтры, сортировка</li>
                        <li>Корзина, оформление заказа</li>
                        <li>Формы регистрации / входа</li>
                        <li>Адаптив (mobile / desktop)</li>
                    </ul>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card-mars p-3 h-100">
                    <h6>🔌 API-тестирование</h6>
                    <ul class="small mb-0">
                        <li>Swagger: <a href="/api/docs" target="_blank" class="link-warning">/api/docs</a></li>
                        <li>Продукты, корзина, заказы, баг-репорты</li>
                        <li>Коды ответов, валидация, границы</li>
                    </ul>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card-mars p-3 h-100">
                    <h6>🗄 SQL / данные</h6>
                    <ul class="small mb-0">
                        <li>SQLite: остатки, заказы, отзывы</li>
                        <li>Целостность после оформления заказа</li>
                    </ul>
                </div>
            </div>
            <div class="col-md-6">
                <div class="card-mars p-3 h-100">
                    <h6>🌐 Локализация</h6>
                    <ul class="small mb-0">
                        <li>Переключатель 🌐 в шапке</li>
                        <li>RU / EN / <strong>Марсианский</strong></li>
                    </ul>
                </div>
            </div>
        </div>

        <h4 class="mb-3">Ключевые API</h4>
        <div class="table-responsive mb-4">
            <table class="table table-dark table-sm">
                <thead><tr><th>Метод</th><th>Путь</th><th>Назначение</th></tr></thead>
                <tbody>
                    <tr><td>GET</td><td>/api/products</td><td>Каталог (?search, ?sort, ?min_price, ?max_price, ?category)</td></tr>
                    <tr><td>GET</td><td>/api/products/{id}</td><td>Карточка товара</td></tr>
                    <tr><td>POST</td><td>/api/cart/items</td><td>Добавить в корзину</td></tr>
                    <tr><td>POST</td><td>/api/orders</td><td>Оформить заказ</td></tr>
                    <tr><td>GET/POST</td><td>/api/locale/{lang}</td><td>Локаль (mars → 500)</td></tr>
                    <tr><td>GET/POST</td><td>/api/bugreports</td><td>Список / создание баг-репортов</td></tr>
                    <tr><td>POST</td><td>/api/auth/login</td><td>Вход (form-urlencoded)</td></tr>
                </tbody>
            </table>
        </div>

        <h4 class="mb-3">Что обязательно проверить</h4>
        <ol>
            <li>Сортировку «Цена ↑» и «Цена ↓»</li>
            <li>Поиск (разный регистр, кириллица)</li>
            <li>Границы количества в корзине и остаток на складе после заказа</li>
            <li>Переключение локали на «Марсианский»</li>
            <li>Оформление заказа с пустой / полной корзиной</li>
            <li>API через Swagger или Postman</li>
            <li>Регистрацию и вход</li>
        </ol>
        <p class="text-muted">Демо-аккаунты: <code>nova / nova123</code>, <code>admin / admin123</code></p>
        <button class="btn btn-mars" onclick="showPage('report-bug')">Оформить первый баг-репорт</button>
    `;
}

// ==================== AUTH ====================
function renderLogin(app) {
    app.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-5">
                <div class="card-mars p-4 rounded">
                    <h3 class="mb-4 text-center">Вход колониста</h3>
                    <form id="login-form">
                        <div class="mb-3">
                            <label class="form-label">Логин</label>
                            <input type="text" class="form-control" name="username" required placeholder="nova">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Пароль</label>
                            <input type="password" class="form-control" name="password" required>
                        </div>
                        <button class="btn btn-mars w-100">Войти</button>
                    </form>
                    <p class="text-center mt-3 mb-0 small">
                        Нет аккаунта? <a href="#" onclick="showPage('register')" class="link-warning">Регистрация</a>
                    </p>
                    <hr class="border-secondary">
                    <p class="small text-muted mb-0">Демо: <code>nova / nova123</code> или <code>admin / admin123</code></p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = new URLSearchParams();
        body.append('username', fd.get('username'));
        body.append('password', fd.get('password'));
        try {
            const res = await fetch(API + '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Ошибка входа');
            token = data.access_token;
            currentUser = data.user;
            localStorage.setItem('ares_token', token);
            localStorage.setItem('ares_user', JSON.stringify(currentUser));
            toast(`Добро пожаловать, ${currentUser.username}!`, 'success');
            showPage('home');
        } catch (err) {
            toast(err.message, 'error');
        }
    };
}

function renderRegister(app) {
    app.innerHTML = `
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card-mars p-4 rounded">
                    <h3 class="mb-4 text-center">Регистрация колониста</h3>
                    <form id="reg-form">
                        <div class="mb-3">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-control" name="email" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Логин</label>
                            <input type="text" class="form-control" name="username" required minlength="3">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">ФИО / позывной</label>
                            <input type="text" class="form-control" name="full_name">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Колония</label>
                            <select class="form-select" name="colony">
                                <option>Olympus City</option>
                                <option>Valles Base</option>
                                <option>Phobos Dock</option>
                                <option>Hellas Outpost</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Пароль</label>
                            <input type="password" class="form-control" name="password" required minlength="4">
                            <!-- BUG: no password confirmation field -->
                        </div>
                        <button class="btn btn-mars w-100">Зарегистрироваться</button>
                    </form>
                    <p class="text-center mt-3 mb-0 small">
                        Уже есть аккаунт? <a href="#" onclick="showPage('login')" class="link-warning">Войти</a>
                    </p>
                </div>
            </div>
        </div>
    `;
    document.getElementById('reg-form').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
            await api('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email: fd.get('email'),
                    username: fd.get('username'),
                    full_name: fd.get('full_name') || null,
                    password: fd.get('password'),
                    colony: fd.get('colony')
                })
            });
            toast('Регистрация успешна! Теперь войдите.', 'success');
            showPage('login');
        } catch (err) {
            toast(err.message, 'error');
        }
    };
}

// ==================== INIT ====================
updateAuthUI();
showPage('home');
