# Авторизация, сессии и шеринг — cAIsdev

> Принято: 2026-05-23

---

## Контекст решения

Переход от «нет авторизации» к полноценному продукту с пользователями. Причина: нужны личные сессии, история и шеринг результатов.

---

## Auth

**Решение:** Custom JWT + bcrypt на Node.js. Supabase Auth не используем — он требует email, а email пользователям не нужен.

- Регистрация: только **username + password**
- Пароли хранятся как bcrypt-хэш
- После логина выдаётся JWT, хранится в `localStorage` на фронте
- JWT уходит в заголовке `Authorization: Bearer <token>` с каждым запросом

---

## База данных

**Решение:** Supabase PostgreSQL.

Используется только как хранилище — не как auth-провайдер. Admin-статистика смотрится через Supabase Dashboard без написания своей admin-страницы.

### Модель данных

```sql
users
  id            uuid PRIMARY KEY
  username      text UNIQUE NOT NULL
  password_hash text NOT NULL
  created_at    timestamptz DEFAULT now()
  last_login    timestamptz

sessions
  id          uuid PRIMARY KEY
  user_id     uuid REFERENCES users(id)
  phase       text         -- concept / req / ready
  title       text         -- автогенерируется из первого сообщения
  created_at  timestamptz DEFAULT now()

messages
  id          uuid PRIMARY KEY
  session_id  uuid REFERENCES sessions(id)
  persona_id  text         -- id персоны или 'user'
  content     text
  created_at  timestamptz DEFAULT now()

shares
  id          uuid PRIMARY KEY
  session_id  uuid REFERENCES sessions(id)
  token       text UNIQUE NOT NULL
  created_at  timestamptz DEFAULT now()
```

---

## Сессии

- При старте нового диалога создаётся запись в `sessions`
- Каждое сообщение (и пользователя, и персон) сохраняется в `messages`
- Пользователь видит только свои сессии
- Можно вернуться к сессии и продолжить диалог

---

## Шеринг

- Владелец нажимает «Поделиться» → генерируется уникальный `token`, создаётся запись в `shares`
- Ссылка вида: `https://app.url/?share=<token>`
- Другой **авторизованный** пользователь открывает ссылку → видит историю сессии в режиме **только чтение**
- Продолжить чужую сессию нельзя (не в MVP)

---

## Отслеживаемые метрики (через Supabase Dashboard)

| Метрика | Откуда |
|---|---|
| Логины | `users.last_login` |
| Количество сессий | таблица `sessions` |
| Использованные персоны | таблица `messages`, поле `persona_id` |

---

## Plan реализации

### Итерация 1 — Backend + DB
1. Создать Supabase проект → получить `DATABASE_URL`
2. Выполнить SQL-миграцию: создать таблицы
3. В `server.js`: добавить зависимости `pg`, `bcrypt`, `jsonwebtoken`
4. Эндпоинты:
   - `POST /api/register` — создать пользователя
   - `POST /api/login` — вернуть JWT
   - middleware `requireAuth` — проверка JWT на защищённых маршрутах

### Итерация 2 — Frontend auth
5. Экран логина/регистрации (поверх текущего UI, если нет JWT)
6. JWT хранится в `localStorage`, уходит в каждый запрос к `/api/*`

### Итерация 3 — Сессии
7. При старте диалога: `POST /api/sessions` → получаем `session_id`
8. Каждое сообщение: `POST /api/sessions/:id/messages`
9. Экран «Мои сессии»: `GET /api/sessions` → список с датой и фазой
10. Открыть старую сессию → загрузить `GET /api/sessions/:id/messages`

### Итерация 4 — Шеринг
11. Кнопка «Поделиться»: `POST /api/sessions/:id/share` → возвращает URL
12. Открытие по `?share=<token>`: `GET /api/share/:token` → история сессии, read-only режим

### Итерация 5 — Экспорт в Google Sheets
13. После завершения сессии: кнопка «Экспорт»
14. `POST /api/export` → создаёт новую Google Таблицу через Service Account
15. Возвращает ссылку на таблицу

---

## Зависимости для установки

```bash
npm install pg bcrypt jsonwebtoken googleapis
```

## Переменные окружения (.env)

```
DATABASE_URL=postgresql://...  # из Supabase
JWT_SECRET=...                 # любая длинная строка
GOOGLE_CREDENTIALS_PATH=./google-credentials.json  # для экспорта
```
