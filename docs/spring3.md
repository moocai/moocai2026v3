# Proposta Sprint 3
**Última actualització: 16 de juny de 2026** (tarda)

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
