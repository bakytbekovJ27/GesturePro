# Desktop

## Что изменилось

Раньше desktop-часть проекта была полностью на Python/OpenCV:

- `main.py` управлял переходами между экранами;
- `screens/` рисовали весь интерфейс прямо в OpenCV-окне;
- `core/` сразу был связан и с жестами, и с отображением, и с логикой загрузки.

Сейчас появился **новый отдельный mini-project `desktop/` на Tauri**.

Новая идея такая:

- **Tauri + React** отвечают только за desktop GUI;
- будущая логика из `core/` должна подключаться позже через bridge/sidecar;
- интерфейс больше не зависит от OpenCV-рендеринга;
- мы уже разделили **UI слой** и **логический слой**, что важно для скорости, масштабирования и дальнейшей оптимизации.

То есть новый `desktop/` сейчас представляет собой **новую desktop оболочку приложения**, которая готова стать основным GUI вместо старого Python-окна.

---

## Что сейчас из себя представляет новый desktop

На данный момент `desktop/` — это:

- отдельное desktop-приложение на `Tauri + React + Vite + TypeScript`;
- нативная оболочка через `src-tauri/`;
- GUI-first реализация без реальной камеры и без реальной gesture-логики;
- mock desktop runtime, чтобы можно было тестировать интерфейс до подключения Python core.

По сути это **новый интерфейсный каркас GesturePro Desktop**, который уже можно запускать, собирать в `.app`/`.dmg` и развивать дальше.

---

## Что у него уже есть

### 1. Отдельный desktop shell

Есть отдельная папка:

- `desktop/`

Внутри уже настроены:

- `package.json`
- `vite.config.ts`
- `src-tauri/`
- `README.md`
- React frontend
- Tauri native shell

То есть это уже не заготовка "на словах", а реально рабочий новый mini-project.

### 2. Перенесён GUI из старых screen flow

В новом desktop уже есть 4 основных экрана:

- `Menu`
- `Settings`
- `Load`
- `Presentation`

Они повторяют старую логику переходов из `main.py`:

- menu -> load
- menu -> settings
- load -> presentation
- presentation -> menu / load

### 3. Есть новый state-driven подход

Теперь приложение работает не через бесконечный OpenCV loop для интерфейса, а через React state.

Главный orchestration слой сейчас находится здесь:

- `desktop/src/App.tsx`

Там уже есть:

- текущий экран `menu/settings/load/presentation`;
- язык `ru/en`;
- PIN / session state;
- состояние загрузки;
- mock slides;
- current slide index;
- mock gesture state;
- HUD state для presentation screen.

### 4. Есть typed bridge слой

Уже создан интерфейс desktop bridge:

- `DesktopCoreBridge`

И есть его текущая mock-реализация:

- `desktop/src/bridge/mockDesktopCoreBridge.ts`

Сейчас bridge умеет:

- стартовать mock session;
- останавливать session;
- открыть локальный файл через dialog/fallback;
- загрузить demo slides;
- запускать mock gesture stream;
- останавливать mock gesture stream;
- отправлять события в UI.

### 5. Есть mock функциональность для разработки

Сейчас в desktop уже есть:

- mock PIN;
- mock mobile/remote presentation;
- mock error state;
- mock gesture states;
- mock slide deck generator;
- dev panel для симуляции событий;
- клавиатурная навигация.

Это нужно для того, чтобы GUI уже можно было тестировать **до** интеграции настоящей камеры и `core/`.

### 6. Есть локализация

Перенесены строки интерфейса:

- `ru`
- `en`

Файл:

- `desktop/src/i18n.ts`

### 7. Есть presentation viewer

В presentation screen уже есть:

- показ mock slides;
- навигация по слайдам;
- HUD снизу;
- статус текущего gesture/mode;
- mock PIP-панель;
- меню / возврат / переход назад в загрузку.

### 8. Есть Tauri build

Новый desktop уже собирается:

- frontend build проходит;
- Tauri build проходит;
- `.app` и `.dmg` уже собираются.

---

## Что сейчас у него есть по функциям

На данный момент новый desktop умеет:

1. Запускаться как отдельное desktop приложение.
2. Показывать новый GUI в Tauri.
3. Переключать экраны между `Menu / Settings / Load / Presentation`.
4. Переключать язык.
5. Генерировать mock PIN-сессию.
6. Открывать локальный файл через desktop dialog, но пока только как UI-flow, без реального PDF рендера.
7. Загружать demo deck.
8. Симулировать remote/mobile deck.
9. Показывать mock gesture states.
10. Показывать mock presentation HUD.
11. Закрываться как desktop app.

---

## Чего сейчас НЕ хватает

Вот самое важное: **новый desktop пока ещё не подключён к реальной логике**.

### 1. Нет реальной камеры

Да, ты правильно заметил: **камера сейчас ещё не подключена**.

Именно поэтому приложение **не спрашивает доступ к камере**.

Почему:

- в новом `desktop/` пока нет `getUserMedia`;
- нет Tauri-side camera bridge;
- нет Python sidecar процесса, который бы работал с камерой;
- нет связки с текущим `core/gesture.py`.

То есть отсутствие запроса камеры сейчас — это **нормально**, потому что camera layer просто ещё не внедрён.

### 2. Нет реальной gesture-логики

Сейчас gestures только mock.

Пока не подключено:

- реальное распознавание руки;
- реальные landmark-ы;
- реальные gesture event-ы;
- реальный streaming input в GUI.

### 3. Нет real-time связи с `core/`

Пока ещё не подключены:

- `core/gesture.py`
- `core/slide_loader.py`
- `core/renderer.py`
- старые жестовые механики из `screens/`

Сейчас новый desktop знает только про **mock bridge**, а не про настоящий core runtime.

### 4. Нет реального PDF/PPTX пайплайна

Сейчас локальный файл:

- выбирается;
- отображается как выбранный;
- после этого подставляется mock slide deck.

Но пока нет:

- настоящего чтения PDF;
- настоящей конвертации PPTX;
- настоящей подготовки слайдов;
- настоящей связки с backend upload/download flow.

### 5. Нет backend pairing/sync

В старом Python desktop на экране загрузки уже есть backend sync логика.

В новом desktop пока **нет реального подключения** к:

- backend session create;
- latest presentation polling;
- desktop-event update;
- реальному PIN-pairing с телефоном.

PIN сейчас только mock.

### 6. Нет drawing/erase/annotation логики

В старом presentation режиме были:

- рисование;
- ластик;
- очистка;
- свайп по слайдам;
- реальная привязка жестов к действиям.

В новом desktop сейчас это только UI/HUD слой, без реального canvas/annotation behavior.

---

## Что нужно добавить дальше

Ниже список по приоритету.

### 1. Подключить реальный core bridge

Нужно сделать bridge между новым `desktop/` и существующим Python core.

Наиболее логичный вариант:

- Tauri запускает Python sidecar;
- sidecar получает команды;
- sidecar отправляет события обратно в desktop UI;
- UI реагирует на эти события, но сам не занимается gesture detection.

То есть нужно реализовать:

- запуск Python процесса из Tauri;
- протокол общения;
- формат событий;
- lifecycle start/stop.

### 2. Подключить камеру

Есть два варианта:

- камера читается через Python sidecar;
- камера читается через web/Tauri frontend.

Для текущей архитектуры логичнее:

- **камеру обрабатывать через Python sidecar**, а не во frontend.

Тогда новый desktop будет получать уже готовые события:

- gesture;
- state;
- maybe preview frame;
- status.

### 3. Подключить `core/gesture.py`

Нужно совместить:

- `desktop/src/bridge/mockDesktopCoreBridge.ts`
- `core/gesture.py`

Сейчас mock bridge имитирует события.

Нужно заменить mock на real bridge, который:

- стартует gesture detector;
- получает реальные gesture states;
- шлёт их в Tauri frontend.

### 4. Подключить `core/slide_loader.py`

Нужно совместить:

- новый load flow в `desktop/src/screens/LoadScreen.tsx`
- старую логику подготовки слайдов из `core/slide_loader.py`

Чтобы после выбора файла происходило:

- реальное открытие файла;
- реальный PDF load;
- конвертация/подготовка слайдов;
- передача уже готового массива/набора страниц в новый desktop viewer.

### 5. Подключить backend sync из старого load screen

Нужно перенести и совместить:

- старую backend sync логику из `screens/load_screen.py`
- новый Tauri load screen

То есть новый desktop должен уметь:

- создавать реальную session;
- получать PIN;
- слушать новые презентации;
- скачивать файл;
- переключать presentation state.

### 6. Подключить реальный presentation control

Нужно совместить:

- `desktop/src/screens/PresentationScreen.tsx`
- старую presentation logic из `screens/presentation_screen.py`

Что сюда входит:

- реальные gestures;
- реальное переключение слайдов;
- реальное рисование;
- реальный eraser;
- очистка аннотаций;
- сохранение скриншотов;
- синхронизация состояния presentation.

---

## Какие места нужно совместить

Вот самые важные точки стыковки.

### UI orchestration

Новый слой:

- `desktop/src/App.tsx`

Старый слой:

- `main.py`

Нужно перенести orchestration логики из старого Python flow в новый Tauri flow полностью.

### Load flow

Новый слой:

- `desktop/src/screens/LoadScreen.tsx`

Старый слой:

- `screens/load_screen.py`
- `core/slide_loader.py`

Нужно объединить UI и реальную загрузку.

### Gesture runtime

Новый слой:

- `desktop/src/bridge/mockDesktopCoreBridge.ts`

Старый слой:

- `core/gesture.py`

Нужно заменить mock события реальными.

### Presentation runtime

Новый слой:

- `desktop/src/screens/PresentationScreen.tsx`

Старый слой:

- `screens/presentation_screen.py`

Нужно перенести действия, а не только внешний вид.

### Localization

Новый слой:

- `desktop/src/i18n.ts`

Старый слой:

- `core/localization.py`

Сейчас это уже частично перенесено, но потом нужно следить, чтобы строки не расходились.

### Native shell

Новый слой:

- `desktop/src-tauri/`

Именно здесь потом нужно будет:

- запускать Python sidecar;
- настраивать permissions;
- добавлять native команды;
- решать lifecycle desktop runtime.

---

## Самое главное в одном блоке

Если коротко:

- новый `desktop/` **уже есть и уже рабочий как GUI shell**;
- он **уже собирается как desktop приложение**;
- он **уже повторяет основные экраны и flow**;
- но он **ещё не подключён к реальной камере, жестам, backend и core**;
- поэтому **камера сейчас действительно не спрашивается**, и это ожидаемо;
- сейчас это **не финальный desktop runtime**, а **новая интерфейсная основа**, на которую дальше нужно аккуратно насадить старую Python-логику через bridge.

---

## Что я бы делал следующим шагом

Лучший следующий этап:

1. Сделать реальный Python sidecar bridge.
2. Подключить камеру и `core/gesture.py`.
3. Подключить `core/slide_loader.py`.
4. Перенести backend sync из старого load screen.
5. После этого переносить drawing / annotation / presentation actions.

Итог:

сейчас `desktop/` — это уже **новый красивый и рабочий GUI-фундамент**, но ещё не полноценная замена старому Python desktop по логике.
