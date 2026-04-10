# Mobile App Plan (React Native + Expo)

## Цель
Перенести ключевой функционал из `frontend/` (React + Vite) в полноценное мобильное приложение на **React Native + Expo** с интуитивным UX/UI, прагматичным интерфейсом и гармоничной цветовой системой.

---

## 1) Предлагаемая структура директории `mobile/`

```txt
mobile/
  app/                          # Expo Router: маршруты и экраны
    (auth)/
      sign-in.tsx
      sign-up.tsx
    (tabs)/
      home.tsx
      sessions.tsx
      profile.tsx
    presentation/
      [id].tsx
    _layout.tsx
    +not-found.tsx

  src/
    api/                        # клиент API, адаптеры, interceptors
      client.ts
      auth.ts
      sessions.ts

    components/                 # переиспользуемые UI-компоненты
      ui/
        Button.tsx
        Input.tsx
        Card.tsx
        Badge.tsx
      feature/
        SessionCard.tsx
        UploadPanel.tsx

    features/                   # feature-first модули
      auth/
      presentations/
      uploads/
      settings/

    hooks/                      # кастомные React hooks
      useAuth.ts
      useNetwork.ts
      useTheme.ts

    lib/
      constants/
      utils/
      validators/

    state/                      # глобальное состояние (Zustand/Redux Toolkit)
      auth.store.ts
      session.store.ts

    theme/                      # дизайн-система
      colors.ts
      spacing.ts
      typography.ts
      radii.ts
      shadows.ts

    i18n/
      ru.json
      en.json
      index.ts

    types/
      api.ts
      domain.ts

  assets/
    icons/
    images/
    illustrations/
    fonts/

  tests/
    unit/
    integration/

  app.config.ts
  babel.config.js
  tsconfig.json
  package.json
  README.md
```

---

## 2) Этапы миграции

### Этап 0 — Discovery и аудит текущего `frontend`
- Провести инвентаризацию модулей: экраны, API-методы, состояния, бизнес-правила.
- Разделить функциональность на:
  1. **MVP для mobile** (критично для релиза),
  2. **Phase 2** (улучшения после запуска).
- Зафиксировать карту соответствия: `frontend/src/*` → `mobile/src/*`.

### Этап 1 — Инициализация mobile-проекта
- Создать Expo-приложение (TypeScript + Expo Router).
- Подключить базовые зависимости:
  - навигация (Expo Router),
  - серверные запросы (Axios/React Query),
  - формы (React Hook Form + zod),
  - состояние (Zustand/Redux Toolkit).
- Настроить линтинг, форматирование, alias imports.

### Этап 2 — Core-архитектура и инфраструктура
- Реализовать `src/api/client.ts` с единым API-клиентом и обработкой токена.
- Вынести в `src/types` типы домена и API-контрактов.
- Поднять базовую дизайн-систему в `src/theme` и `src/components/ui`.
- Подключить i18n (RU/EN), подготовить масштабирование текстов.

### Этап 3 — UX/UI и прототипирование экранов
- Спроектировать пользовательские сценарии:
  - онбординг/авторизация,
  - главный экран,
  - список и просмотр сессий/презентаций,
  - профиль и настройки.
- Сделать low-fidelity и затем high-fidelity макеты.
- Утвердить состояние пустых экранов, ошибок, загрузки и offline.

### Этап 4 — Реализация MVP-функционала
- Авторизация и хранение сессии.
- Просмотр основных данных и действий пользователя.
- Базовая работа с API существующего backend.
- Минимально необходимая аналитика событий UX.

### Этап 5 — Стабилизация и подготовка к релизу
- Поведенческие тесты критичных сценариев.
- Проверка производительности (время первого экрана, плавность списков).
- Accessibility-проверка: контраст, hit-area, динамический размер шрифта.
- Подготовка релизной сборки и checklist для App Store/Google Play.

---

## 3) UX/UI-концепция (простой и прагматичный интерфейс)

### UX-принципы
1. **One primary action per screen** — на каждом экране один доминирующий CTA.
2. **Минимум когнитивной нагрузки** — короткие заголовки, ясные подписи, предсказуемая навигация.
3. **Progressive disclosure** — сложные настройки скрыты в деталях, а не на главном экране.
4. **Мягкие состояния ошибок** — понятные тексты + действие исправления (“Повторить”, “Проверить сеть”).
5. **Быстрый first-use** — пользователь выполняет ключевое действие менее чем за 60 секунд.

### UI-направление
- Визуальный стиль: **clean + functional** (минимализм, понятные карточки, аккуратные отступы).
- Базовый grid: 8pt spacing system.
- Радиусы: 10–14 для карточек/инпутов, 999 для чипов.
- Иконки: простые stroke-иконки (24px), единый визуальный вес.

### Гармоничная палитра
- `Primary`: #3B82F6 (действия, активные элементы)
- `Primary Dark`: #2563EB
- `Accent`: #14B8A6 (успешные статусы, вторичный акцент)
- `Background`: #F8FAFC
- `Surface`: #FFFFFF
- `Text Primary`: #0F172A
- `Text Secondary`: #475569
- `Border`: #E2E8F0
- `Error`: #EF4444
- `Warning`: #F59E0B
- `Success`: #22C55E

### Типографика
- Заголовки: Semibold/Bold, 20–28.
- Основной текст: Regular 15–16.
- Подписи/мета: 12–13.
- Межстрочный интервал: 130–145%.

### Ключевые мобильные шаблоны экранов
- **Home**: статус + 1–2 приоритетных действия.
- **List**: карточки с компактной информацией и быстрой фильтрацией.
- **Details**: заголовок, ключевые метрики, секции по приоритету.
- **Form**: пошаговый ввод, валидаторы рядом с полем.

---

## 4) Соответствие текущему `frontend/`

Рекомендуется переносить по маппингу:
- `frontend/src/api/*` → `mobile/src/api/*`
- `frontend/src/components/*` → `mobile/src/components/*`
- `frontend/src/lib/*` → `mobile/src/lib/*`
- функциональные блоки из `frontend/src/*` → `mobile/src/features/*`

При переносе веб-специфичные зависимости (DOM, браузерные API) заменять на React Native/Expo эквиваленты.

---

## 5) Definition of Done для первой мобильной итерации
- Есть рабочий Expo-проект в `mobile/`.
- Реализованы базовые пользовательские потоки MVP.
- Дизайн-система и темы используются во всех экранах.
- UI консистентен и доступен (контраст, размеры tappable area, поддержка маленьких экранов).
- Подготовлена документация запуска и структура для дальнейшего масштабирования.
