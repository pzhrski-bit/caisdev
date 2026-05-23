# Knowledge Base — cAIsdev

> Создана: 2026-05-16
> Назначение: база знаний проекта для передачи в новые сессии Claude Code

---

## Структура

```
knowledge_base/
├── 01_product/
│   ├── lean_canvas.md          — Lean Canvas + анализ пробелов
│   ├── brainstorm_session_1.md — Решения и открытые вопросы из сессии 1
│   └── validation_test_ipr.md  — Дизайн валидационного теста (ИПР)
│
├── 02_personas/
│   ├── hrm_brief_profiles.md   — 10 кратких профилей (текущий прототип)
│   ├── hrm_deep_profiles.md    — 10 углублённых профилей (следующая версия)
│   ├── kpi_personas.md         — 3 персоны для KPI-модуля
│   └── hireflow_personas.md    — 3 персоны для ATS/HireFlow
│
├── 03_ux_design/
│   ├── user_flows.md           — Сценарии: одиночный / коллективный / дискуссия
│   ├── google_sheets_export.md — Структура экспорта в Google Sheets
│   └── user_roles.md           — Роли пользователей и их влияние на персон
│
└── 04_architecture/
    ├── high_level_arch.md      — Архитектура MVP и приоритеты разработки
    └── auth_and_sessions.md    — Auth, модель данных, сессии, шеринг, план реализации
```

---

## Что сейчас в прототипе

- `hrm_review.html` — веб-приложение с 10 персонами (краткие профили)
- `project_context.md` — полный контекст продукта
- Прямые запросы к DeepSeek API (есть проблема CORS)

## Текущий приоритет разработки

1. Настроить Supabase + реализовать auth (username + password, JWT)
2. Сессии и история сообщений в PostgreSQL
3. Шеринг сессий по ссылке (read-only)
4. Экспорт в Google Sheets

Подробный план — `04_architecture/auth_and_sessions.md`
