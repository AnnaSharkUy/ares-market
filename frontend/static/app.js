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
        area.innerHTML = `
            <li class="nav-item"><span class="nav-link text-warning">${currentUser.username}</span></li>
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
async function setLocale(lang) {
    try {
        const res = await fetch(API + '/locale/' + lang);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            // Show the 500 error clearly so students can report it
            toast(`Ошибка локали (${res.status}): ${data.detail || res.statusText}`, 'error');
            console.error('Locale switch failed', res.status, data);
            return;
        }
        const data = await res.json();
        document.getElementById('current-locale').textContent = lang.toUpperCase();
        toast(`Локаль: ${data.message}`, 'success');
    } catch (e) {
        toast('Сетевая ошибка при смене локали: ' + e.message, 'error');
    }
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
