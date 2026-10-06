## Why

A review of how the app talks to the API found three problems in login, logout and session handling. One of them is a security issue. This PR fixes only those three; the other failing requests are handled in a follow-up PR that builds on this one.

There is one commit per fix, so each can be reviewed (or reverted) on its own.

## Changes

### 1. Stop storing the user's password in localStorage (security)
`StudentDashboard`'s login handler saved the **plaintext password** as `currentStudent.code` in localStorage. Any script on the page, or anyone with access to the browser, could read it, and nothing used it: the API token is what authenticates requests.
- `code: password` is no longer saved, and `Student.code` is now optional.

### 2. Single API client + handling of expired tokens
Each service built its own axios instance, or used bare axios with a hand-built header. None of them handled a 401. Once the token stopped being valid, the UI kept showing the user as logged in while every request failed.
- New `src/services/httpClient.ts`:
  - `apiClient` adds `Authorization: Token <token>`. On a 401 caused by the **current** token, it clears the local session and fires `auth-state-change`. A late 401 from an older token is ignored, so it can't end a newer session.
  - `publicClient` sends no token and is used for login and registration. With a stale token stored, those requests would fail with 401.
- `api.ts`, `courseService.ts`, `profileService.ts`, `register.ts` and login now use these clients. Endpoints and payloads are unchanged.
- The global `Content-Type: application/json` is dropped. axios already sets JSON for objects and multipart for `FormData`.

### 3. Revoke the token on logout
Logout removed the token from localStorage *before* calling `POST /users/auth/logout/`, and sent that request without an `Authorization` header. The request failed on **every logout** and the token was never revoked, so it kept working afterwards.
- The token is now read first. The local session is cleared immediately, and the logout request is sent with that token so it gets revoked.

## How it was tested
- `npm run build` (includes `tsc -b`) passes.
- Script check against the real modules with a stubbed browser and HTTP adapter (9/9 pass):
  - login sends no stale token and stores the new one;
  - requests carry the current token;
  - a 401 clears the session and fires `auth-state-change`;
  - a late 401 from an old token is ignored;
  - logout sends the token and clears the session;
  - logout never throws.
- End-to-end in Chromium against a local test instance of the API: on `main`, the old token still works after logout (`GET /courses/` → 200). With this branch it is revoked (→ 401), and the logout request no longer fails.

## Not in this PR
The failing requests (404/401/403) on the home page, dashboard, profile and lesson pages are fixed in the follow-up PR, moocai/moocai2026v3#37, which is stacked on this branch.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01KhVCnDCVAnv5dWpxYdfSTt

---

## Estat de la implementació sobre aquest repo

Data: 2026-10-06. Els tres canvis de «Changes» s'han aplicat sobre el codi actual (`moocai2026v3 - copia`). `npm run build` (`tsc -b` + `vite build`) passa sense errors.

### Fet ✅

| Fix | Què s'ha canviat |
|---|---|
| 1. No desar la contrasenya | `src/pages/dashboards/StudentDashboard.tsx`: `handleLogin` ja no escriu `code` a `currentStudent`. `src/features/student/types.ts`: `Student.code` → `code?: string`. ⚠️ En aquest repo el valor desat era `'***'` (mascareta), no la contrasenya en clar. |
| 2. Client únic + 401 | Nou `src/services/httpClient.ts`: `apiClient` (interceptor de `Token` + 401 del token actual → neteja sessió i `auth-state-change`; 401 tard d'un token antic s'ignora) i `publicClient` (sense token, per a login/registre). Refactoritzats `api.ts`, `courseService.ts`, `profileService.ts`, `register.ts` i `authService.login`. Eliminat el `Content-Type: application/json` global. |
| 3. Revocar token al sortir | `src/services/authService.ts`: `logout()` llegeix el token primer, neteja `token` + `currentStudent` de seguida i envia `POST /users/auth/logout/` amb `Authorization` explícit (`timeout 5000 ms`); mai no llança. |

