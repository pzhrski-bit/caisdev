# cAIsdev — инструкции для Claude Code

## Что это за проект

Внутренний инструмент команды: симулятор обратной связи от стейкхолдеров для продуктовых команд. Аналитик загружает документ (ЧТЗ, user story, концепцию) — 10 ИИ-персон, симулирующих HRM-заказчиков, дают структурированную обратную связь.

## Структура проекта

```
cAIsdev/
├── server.js                — Express сервер
├── hrm_review.html          — весь фронтенд (HTML/CSS/JS, без фреймворков)
├── routes/
│   ├── auth.js              — POST /api/auth/login, /api/auth/register
│   ├── chat.js              — POST /api/chat → Gemini 2.5 Flash
│   ├── sessions.js          — CRUD сессий + шеринг по токену
│   └── upload.js            — POST /api/upload (PDF, DOCX, XLSX, MD, TXT)
├── middleware/auth.js        — JWT-проверка (requireAuth)
├── db/index.js              — pg Pool (Supabase PostgreSQL)
├── .env                     — секреты (не в git)
├── DEPLOY.md                — VPS-данные (не в git, в .gitignore)
└── knowledge_base/          — контекст продукта, персоны, UX-дизайн
```

## Технический стек

- **Frontend**: один HTML-файл, чистый JS, без фреймворков
- **Backend**: Node.js 20+ / Express
- **AI**: Google Gemma 4 31B (`google/gemma-4-31b-it:free`) через OpenRouter — мультимодальная (текст + картинки), бесплатный tier
- **БД**: Supabase PostgreSQL (проект `xpnchrjgetjusrtrilmv`, регион eu-central-1)
- **Деплой**: Docker → ghcr.io/pzhrski-bit/caisdev, VPS Beget (159.194.220.35)
- **CI/CD**: GitHub Actions — push в main → сборка образа → автодеплой на VPS

## Переменные окружения (.env)

```
AI_MODEL=google/gemma-4-31b-it:free   # менять только здесь — фронтенд читает через GET /api/model
AI_API_URL=https://openrouter.ai/api/v1/chat/completions
AI_PROXY_KEY=<openrouter key>          # см. DEPLOY.md
DATABASE_URL=postgresql://...supabase.com.../postgres
JWT_SECRET=...
PORT=3000
```

**Почему не Gemini напрямую**: Google free API даёт limit=0 для РФ-аккаунтов. Groq гео-блокирует РФ-серверы. OpenRouter доступен с РФ-VPS через Cloudflare.

## Авторизация

Custom JWT + bcrypt. Только username + password. Два уровня:
- `user` — обычный пользователь
- `admin` — видит шестерёнку (настройки) и mock-режим

Тестовые аккаунты на VPS: `admin` / password, обычные через регистрацию.

## Схема БД (Supabase)

```sql
users     — id, username, password_hash, role, created_at, last_login
sessions  — id, user_id, phase, title, persona_set, created_at
messages  — id, session_id, persona_id ('user' | persona_id), content, created_at
shares    — id, session_id, token, created_at
```

## Персоны (10 штук, id → label)

| id | label |
|----|-------|
| hrd_l | HRD, крупный бизнес |
| hrd_s | HRD, малый бизнес |
| cb | Специалист C&B |
| ceo | Генеральный директор |
| corp | Директор по обучению |
| ciso | Руководитель СБ |
| dept | Руководитель подразделения |
| cfo | CFO |
| cio | CIO |
| emp | Сотрудник |

## Фазы проекта (id → label)

| id | label |
|----|-------|
| concept | Концепция |
| req | Требования |
| ready | Готовая функциональность |

## Что уже сделано

- ✅ Backend Express + auth (JWT/bcrypt)
- ✅ Сессии + шеринг по ссылке (`/api/share/:token`)
- ✅ Загрузка файлов (PDF, DOCX, XLSX, PPTX, MD, TXT) — есть, но качество парсинга требует доработки
- ✅ Gemma 4 31B через OpenRouter (бесплатно, мультимодально, заменил Gemini из-за гео-блока)
- ✅ Экспорт сессии как CSV (UTF-8 BOM, кнопка в хедере)
- ✅ Автодеплой: push в main → CI → VPS
- ✅ Docker + CI/CD (GitHub Actions → ghcr.io)
- ✅ Resume last session при логине
- ✅ Мультитёрн контекст: `conversationHistory[personaId]` — история накапливается и восстанавливается при открытии сессии
- ✅ Очистка диалога без восстановления при перезагрузке (`localStorage.sessionCleared`)
- ✅ Динамическое отображение модели в хедере (GET `/api/model`)
- ✅ Контекст продукта: пользователь задаёт описание своей системы в сайдбаре, оно вставляется первым блоком во все системные промпты (`КОНТЕКСТ СУЩЕСТВУЮЩЕГО ПРОДУКТА У КЛИЕНТА`). Хранится как `persona_id = '_context'` в таблицах `prompt_overrides` / `prompt_defaults`. Admin публикует K-Team дефолт через prompts.html.

## Бэклог (приоритет по порядку)

### 1. Улучшение парсинга документов
- PDF: постобработка — убрать артефакты (page breaks, номера страниц, лишние переносы)
- PPTX: текущий парсер через xlsx — мусор. Нужен ZIP+XML парсер (pptx — архив)
- Обрезка: лимит ~12 000 символов с пометкой об обрезке

### 2. Режим дискуссии между персонами
- Опциональный переключатель (не дефолт)
- Персоны реагируют на ответы друг друга

### 3. Выбор набора персон
- HRM general (текущий, 10 персон)
- KPI module (3 персоны, в knowledge_base/02_personas/)
- HireFlow/ATS (3 персоны, в knowledge_base/02_personas/)

### 4. Наполнить K-Team контекст по умолчанию
- Admin логинится → prompts.html → карточка «Контекст продукта» уже есть
- Вставить готовый текст из DEPLOY.md или плана и нажать «Сохранить» → «Опубликовать для всех»
- Готовый текст: см. константу `KTEAM_DEFAULT` в prompts.html

## Деплой

Push в `main` → CI автоматически собирает образ и деплоит на VPS.

Ручной передеплой (если нужен):
```bash
# см. DEPLOY.md
sshpass -p '...' ssh root@159.194.220.35 "docker pull ghcr.io/pzhrski-bit/caisdev:latest && docker stop caisdev && docker rm caisdev && docker run -d --name caisdev --restart unless-stopped --env-file /root/.env -p 80:3000 ghcr.io/pzhrski-bit/caisdev:latest"
```

## Чего не делать

- Не предлагать React/Vue/фреймворки — сознательный выбор чистого JS
- Не трогать структуру персон без запроса — промпты тщательно выверены
- Не добавлять монетизацию и аналитику использования без явного запроса
- Не переключать AI-провайдера без запроса (сейчас Gemma 4 31B через OpenRouter — Google direct и Groq недоступны с РФ-сервера, Google free API даёт limit=0 для РФ-аккаунтов)
