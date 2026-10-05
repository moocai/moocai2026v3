**Actualitzat: 1 d'octubre de 2026** (la llista original és de juny; l'estat dels punts s'ha revisat)

- ✅ Enunciat exercici en el text itinerari abans d'apretar Començar exercici (com React.dev)
- ✅ Table of contentes amagada per definició → més net
- ✅ Login / registre canviar nom PIN → Contrassenya
- ✅ Navegació Usuari → Al triar Curs clicable directament sense sub-menú (extra: amb 2 buttons)
- ⏺ Sub-menú possible: llista d'exercicis (component reutilitzat Jordi?)
- ✅ Botó canviar nom a exercici, no challenge
- ✅ Exercici guardar progrés automàticament abans de tancar i sense botó (Isaac)
- ⏺ Editar codi / Executar / Temporitzador des que l'user comença a escriure codi i cada 10s? On es guarda? Local navegador…?
  - `handleRunTests` ara executa `submitChallenge()` via API real (`POST /api/v1/.../submissions/`) amb feedback de servidor
- ✅ Exercici feedback → donar botó tornar a teoria FLOW
- ✅ Tornar de exercici a Itinerari amb botó enrere guardar lloc on estaves de secció i de scroll
  - Millora: `mooc_last_session` a localStorage guarda courseId/lessonId per indicar "Última sessió" amb icona taronja a CourseExpandedContent
- ✅ Tornar de exercici completat amb exit a itinerari passar a següent secció (convertir botó existent 'següent' al botó figma Miquel)
- ⏺ Miquel s'ofereix a programar / investigar render React o Sandbox
- ✅ Finestra consola reutilitzable: `consoleWindowRef` + `useEffect` sincronització temps real + obertura automàtica en executar

---

## Estat dels punts oberts (revisió 1/10/2026)

| Punt | Estat |
|------|-------|
| ⏺ Sub-menú amb llista d'exercicis | ✅ **Fet.** `features/teacher/Sidebar.tsx` té submenú (`teacher_submenu` a localStorage) i hi ha la ruta `/teacher/exercises/list` → `ExerciseList.tsx`. |
| ⏺ Editar codi / Executar / Temporitzador des que l'user comença a escriure | ⚠️ **Parcial.** L'autoguardat del codi existeix a `LessonPage`. El **temporitzador no s'ha implementat** enlloc. |
| ⏺ Miquel s'ofereix a programar render React o Sandbox | ✅ **Fet i superat.** `components/ReactLivePreview.tsx` transpila el TSX amb el worker de TypeScript de Monaco i el renderitza amb `createRoot` real, amb `PreviewErrorBoundary` i debounce. |

---

## Pendents detectats en la revisió del codi (1/10/2026)

Nous, ordenats per impacte:

### Bloquejants / errors
- 🔴 **Sense guarda de ruta a `/teacher`.** `App.tsx` no valida el rol; qualsevol pot hi arribar amb la URL. `localStorage.mooc_role` és purament cosmètic.
- 🔴 **`Exercises`, `ExerciseList` i `Test` ignoren el curs seleccionat**: tots tres fixen `cursos[0].slug!`. Un professor amb més d'un curs treballa sempre sobre el primer.

### Dades falses o buides
- 🟠 **`RendimentDashboard` fabrica la mitjana** amb `Math.random()` (`RendimentDashboard.tsx:217,228`). Ha de venir d'un endpoint de notes o eliminar-se.
- 🟠 **`pages/teacher/Students.tsx`** té una llista d'alumnes buida hardcoded i no fa cap crida de servei. Cal connectar-lo a `getStudentsOverview`.
- 🟠 **`pages/teacher/Hackathon.tsx`** és un placeholder estàtic.
- 🟠 **"Crear curs" és un no-op**: `onSubmit = () => setOpen(false)` descarta el formulari.
- 🟠 **`getPeerSubmissions` retorna `[]` en silenci** si l'endpoint falla → la pestanya «Alumnes» apareix buida sense cap error visible.

### Deute tècnic
- 🟡 Fitxer buit (0 bytes): `services/teacherService.ts`. (`hooks/useTeacherData.ts` també era buit; ja s'ha esborrat.)
- 🟡 Fitxers orfes: `App.css`, `i18n/index.ts`, `utils/utils.ts`, `utils/validators.ts`, i 6 components de `features/student/` (`CourseCard`, `CourseExpandedContent`, `CourseIcon`, `ProgressOverview`, `RankingCard`, `ScrollIndicator`, `StudentCard`, `StudentProfileCard`).
- 🟡 `useAuth()` no es consumeix enlloc; `AuthContext.login` no actualitza `user` → `isAuthenticated` no funciona.
- 🟡 Dependències mortes a `package.json`: `babel-plugin-react-compiler` (no configurat), tot Tailwind/PostCSS (sense config ni classes), `clsx`, `tailwind-merge`.
- 🟡 Duplicació de tipus: `Course`/`Lesson`/`Student` a `types/index.ts` **i** `features/student/types.ts` (amb `title: any` a un costat i `title: string` a l'altre), més còpies a `useCourse.ts` i `components/CourseCard.tsx`.
- 🟡 Cache de curs duplicada: React Query + cache manual de `courseService`. `clearCache()` no invalida React Query i no neteja `publicCoursesCache`.
- 🟡 Dues claus d'idioma (`i18nextLng` vs `mooc-language`); `LanguageSwitcher` no sincronitza el context.

### Seguretat
- 🔴 `Test.tsx` renderitza HTML de l'API amb `dangerouslySetInnerHTML`.
- 🟠 `CodePreview` / `ExerciseEditor` executen codi amb `new Function` sense sandbox.
- 🟠 Sense normalització ni sanejament del codi de l'alumne abans d'enviar-lo a `submitChallenge`.

### i18n
- 🟡 `Footer.tsx` fa `t('Accedir')` (clau literal sense prefix) → es mostra buit/incorrecte.
- 🟡 Claus `dashboard.code_correct` / `tests_correct` usades a `StudentDashboard` però inexistents als tres fitxers d'idioma (es veu el valor per defecte).
- 🟡 `ca.ts` diu «Contrassenya (10 digits)» però `isValidPin` en exigeix 4.
- 🟡 Textos de professor en castellà dins `CourseForm`, `ChatWidget` i les alertes d'`InviteStudents`.
