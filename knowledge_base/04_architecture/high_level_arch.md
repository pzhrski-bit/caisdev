# Верхнеуровневая архитектура — cAIsdev

> Последнее обновление: 2026-06-22

---

## Текущая архитектура (MVP реализован)

```
Браузер (hrm_review.html — HTML/CSS/JS)
    ↓ JWT-авторизованные HTTP-запросы
Express Backend (server.js, Node.js 20+)
    ├── POST /api/auth/login|register  → bcrypt + JWT
    ├── POST /api/chat                 → Gemini 2.5 Flash API
    ├── POST /api/upload               → pdf-parse / mammoth / xlsx
    ├── GET|POST /api/sessions         → Supabase PostgreSQL
    └── GET /api/share/:token          → публичный доступ к сессии
```

## Компоненты

| Компонент | Технология | Статус |
|-----------|-----------|--------|
| Frontend | HTML/CSS/JS (без фреймворков) | ✅ |
| Backend | Node.js / Express | ✅ |
| Auth | Custom JWT + bcrypt | ✅ |
| AI-провайдер | Gemini 2.5 Flash (OpenAI-compatible) | ✅ |
| Файловый парсер | pdf-parse / mammoth / xlsx | ✅ (требует доработки) |
| Экспорт | CSV-скачивание на фронте | ✅ |
| БД | Supabase PostgreSQL | ✅ |
| Шеринг | По токену (`/api/share/:token`) | ✅ |
| Хостинг | VPS Beget, Docker | ✅ |
| CI/CD | GitHub Actions → ghcr.io → VPS | ✅ |

## Хранение данных

```
users     — id, username, password_hash, role, created_at, last_login
sessions  — id, user_id, phase, title, persona_set, created_at
messages  — id, session_id, persona_id, content, created_at
shares    — id, session_id, token, created_at
```

## AI-провайдер

| Провайдер | Статус |
|-----------|--------|
| Gemini 2.5 Flash (`generativelanguage.googleapis.com`) | **Текущий** |
| DeepSeek | Был, заменён |
| OpenRouter/Nemotron | Был, заменён |

Смена провайдера = изменить `hostname` + `path` в `routes/chat.js` и ключ в `.env`.

## Деплой

Push в `main` → GitHub Actions:
1. Собирает Docker-образ
2. Пушит в `ghcr.io/pzhrski-bit/caisdev:latest`
3. SSH на VPS → `docker pull` + `docker run --env-file /root/.env`

## Бэклог

### Следующий приоритет — улучшение парсинга документов
- PDF: убрать артефакты (page breaks, номера страниц)
- PPTX: заменить xlsx-парсер на ZIP+XML
- Обрезка текста: лимит ~12 000 символов

### Затем
- Режим дискуссии между персонами (опциональный переключатель)
- Выбор набора персон (HRM / KPI / HireFlow)
