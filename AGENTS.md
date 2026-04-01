# Repository Guidelines

## Project Structure & Module Organization
`GesturePro` is split by runtime. `backend/` contains the Django API (`api/` for app logic, `server/` for settings and entrypoints). `frontend/` is the React + Vite mobile/PWA client, with feature code under `src/`, shared UI in `src/components/`, API calls in `src/api/`, and helpers in `src/lib/`. `desktop/` is the Tauri-based desktop shell with React screens in `src/screens/` and platform bridge code in `src/bridge/` and `src/lib/`. Legacy Python desktop logic still lives in `core/`, `screens/`, and `main.py`.

## Build, Test, and Development Commands
Backend:
`python -m venv .venv && source .venv/bin/activate`
`pip install -r backend/requirements.txt`
`python backend/manage.py migrate`
`python backend/manage.py runserver`

Frontend:
`cd frontend && npm install`
`npm run dev` starts Vite locally.
`npm run build` runs TypeScript build checks and produces a production bundle.
`npm run lint` runs ESLint.

Desktop:
`cd desktop && npm install`
`npm run tauri dev` starts the Tauri shell.
`npm run build` and `npm run lint` mirror the frontend workflow.

## Coding Style & Naming Conventions
Use 4 spaces in Python and standard TypeScript/React formatting in the Node apps. Follow existing naming patterns: `PascalCase` for React components and screen files (`PresentationScreen.tsx`), `camelCase` for helpers (`mockDesktopCoreBridge.ts`), and short, descriptive module names in Python (`slide_loader.py`). ESLint is configured in both `frontend/eslint.config.js` and `desktop/eslint.config.js`; run lint before opening a PR.

## Testing Guidelines
Automated tests are currently minimal. Backend tests live in `backend/api/tests.py` and run with `python backend/manage.py test`. No enforced coverage threshold is configured, so contributors should add focused tests for new API endpoints, serializers, and service logic. For frontend and desktop changes, at minimum verify `npm run build` and `npm run lint` pass.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects such as `Reorganize project structure` and `Add web upload stack and clean project docs`. Keep commit messages concise, capitalized, and action-oriented. Pull requests should describe the affected area (`backend`, `frontend`, `desktop`, or `core`), list local verification steps, and include screenshots for UI changes.

## Configuration Tips
Copy `backend/.env.example` to `backend/.env` before running the server. Frontend expects the backend at `http://127.0.0.1:8000/api/v1` unless overridden in its local environment file.
