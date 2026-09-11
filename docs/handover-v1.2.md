# Chat-Handover – Kanban-App (Stand: Version 1.2)

## Kontext & Aufgabe
Selbst gehostete **Kanban-Aufgaben-App** als einzelne, in sich geschlossene HTML-Datei (`kanban.html`) mit Vanilla-JavaScript, ohne externe Abhängigkeiten, offline- und PWA-fähig, komplett auf Deutsch. Zweck: berufliche und private Aufgaben planen und strukturieren. Läuft auf PC, Laptop und Smartphone (responsiv + touch).

## Aktueller Stand
- **Datei:** `kanban.html`, ca. 2160 Zeilen, 13 `<script>`-Blöcke (gemeinsamer globaler Scope; erster Block hat `"use strict"`).
- v1 vollständig: Boards mit Drag-and-drop (Pointer Events) und Verschieben per Spaltenmenü; Aufgaben mit allen Feldern; wiederkehrende Aufgaben; Prioritäten; Überfällig-/Bald-fällig-Markierung; Filter + Volltextsuche + Sortierung + gespeicherte Ansichten; Ansichten Dashboard/Heute/Woche/Alle-Aufgaben/Kalender/Überfällig/Archiv/Papierkorb/Einstellungen; Benachrichtigungscenter + Tageszusammenfassung; Detail-Seitenpanel mit Live-Speichern und Änderungsverlauf; Schnellanlage; Tastenkürzel; Export/Import (JSON); Beispieldaten optional beim Erststart.
- v1.1: Unteraufgaben als Checkliste direkt auf den Karten abhakbar; Pro-Spalte-Scrolling repariert.
- v1.2: **Anmeldung** und **Import mit Zusammenführen** (siehe unten).

### Änderungen in diesem Chat (erledigt und getestet)

**1. Import: Zusammenführen statt nur Ersetzen**
Ausgangsproblem des Users: private Aufgaben liegen im Heim-Browser, berufliche im Arbeits-Browser – beide sollten zusammen nutzbar sein. Der alte Import hat den gesamten Bestand überschrieben, Zusammenführen war unmöglich.

Beim Import erscheint nun ein Dialog mit der Wahl *Zusammenführen* oder *Ersetzen*.
- Neue Funktionen: `mergeImport(data)`, `importChoiceDialog(data,fileName)`, `importReport(rep)`, `taskLastChange(t)`, `normalizeTask(t)`, `repairTaskRefs()`.
- Abgleich erfolgt über die IDs. Bereiche und Boards mit bekannter ID werden nicht dupliziert; bei bekannten Boards werden nur fehlende **Spalten** ergänzt.
- Aufgabenkonflikt (gleiche ID, unterschiedlicher Inhalt): die **zuletzt geänderte** Fassung gewinnt, ermittelt über `taskLastChange()` aus `createdAt`, `history[].t` und `completedAt`.
- `repairTaskRefs()` hängt Aufgaben mit unbekanntem Board/unbekannter Spalte an ein gültiges Board um und korrigiert `areaId` – verhindert unsichtbare Geisteraufgaben. Läuft auch beim normalen Laden.
- Danach zeigt `importReport()` eine Bilanz (neu/aktualisiert/Bereiche/Boards/Spalten/Ansichten/Papierkorb).
- Mehrfacher Import derselben Datei erzeugt nachweislich keine Duplikate.

**2. Anmeldung („billiger Login")**
Zugangsdaten im Standard: `Vladi` / `12345` (Konstante `AUTH_DEFAULT`), änderbar unter **Einstellungen › Zugang**.
- Schlüssel: `AUTH_CFG_KEY='kanban_auth_cfg_v1'` (localStorage), `AUTH_SESSION_KEY='kanban_auth_session_v1'` (session- oder localStorage, je nach „angemeldet bleiben").
- Funktionen: `authCfg()`, `setAuthCfg(u,p)`, `isLoggedIn()`, `setLoggedIn(remember)`, `logout()`, `showLogin(onOk)`, `loginTry()`, `loginSkip()`, `lgStart()`, `lgFail()`, `lgKey()`; Speicherhelfer `lsGet/lsSet/lsDel`, `ssGet/ssSet/ssDel` mit Fallback auf `memoryStore`.
- Globale Variablen `LOGIN_CB`, `LOGIN_DONE` (bewusst `var`).
- Abmelden: Button unten in der Seitenleiste (`data-logout`, gebunden in `bindSidebar()`) und in den Einstellungen (`#btnLogout`).
- **Klartext, keine Verschlüsselung.** Das ist Sichtschutz, kein Schutz. Der User ist darüber informiert; entsprechender Hinweistext steht im Login und in den Einstellungen. Für echten Schutz wäre Basic-Auth auf Webserver-Ebene nötig.

### Drei Fehlerrunden beim Login – Ursachen und Lehren
Der Login ging dreimal „nicht", jedes Mal aus einem anderen Grund. Wichtig für künftige Änderungen:

1. **`<form>` + submit wird in Sandbox-Frames blockiert.** Chrome meldet *„Blocked form submission … frame is sandboxed and the 'allow-forms' permission is not set"* – der Klick verpufft ohne sichtbaren Fehler. → Kein `<form>` mehr im Login.
2. **Bindung per `addEventListener` kann fehlen.** → Der Anmelden-Button trägt seinen Handler **inline im Markup** (`onclick="loginTry()"`, `onkeydown="lgKey(event)"`). Die zusätzliche `addEventListener`-Bindung ist nur Redundanz. Diese Inline-Handler **nicht entfernen**.
3. **Eigentliche Ursache:** Der User öffnete die App über den **„Veröffentlichen"-Link**. Dort ist der Browser-Speicher gesperrt – und damit war die Anmeldung ohnehin sinnlos (nichts wäre gespeichert worden). → `init()` prüft jetzt `persistent` und überspringt die Anmeldung, wenn nicht gespeichert werden kann.

Zusätzliche Härtung: try/catch um die gesamte Prüfung mit sichtbarer Fehlermeldung im roten Kasten statt stiller Wirkungslosigkeit; Groß-/Kleinschreibung und umgebende Leerzeichen werden ignoriert; Notausgang-Link „Anmeldung überspringen" (`loginSkip()`); Versionsanzeige „Version 1.2" unten im Login, damit erkennbar ist, ob eine alte Datei im Cache liegt. **Diese Versionsnummer bei künftigen Änderungen mitziehen** (`#lgVer` im Login und die Zeile in `viewSettings()`).

## Wichtige Entscheidungen & Constraints
- **Ein einzelnes HTML-File**, kein Build-Step, keine externen CDNs/Fonts (system-ui-Fontstack).
- **Speicherung:** `localStorage` pro Browser, Key `kanban_app_v1`; `save()` ist debounced. `persistent=false` + `memoryStore` als Fallback, wenn der Speicher blockiert ist.
- **Kein Auto-Sync** zwischen Geräten (würde ein Backend brauchen) → Übertragung via Export → Import → Zusammenführen, in beide Richtungen.
- **Browser-Benachrichtigungen** nur „best effort" (zuverlässig, solange die App offen ist). Kein Push-Server.
- **Anhänge** = Links/Dateiverweise.
- Design: modern, ruhig, professionell, nicht verspielt. Standardsprache Deutsch.
- Grundbereiche „Arbeit" und „Privat" + eigene Bereiche/Boards; Standardspalten: Eingang, Geplant, In Bearbeitung, Wartet, Erledigt.

## Artefakte / Code / Daten

**Datenmodell (persistiert in `state`):**
`state = { areas[], boards[], tasks[], savedViews[], notifications[], notifiedKeys{}, trash[], settings{}, meta{} }`
- `area = {id, name, icon, color}`
- `board = {id, areaId, name, columns:[{id, name, done?}]}`
- `task` (via `makeTask()`): `id, boardId, areaId, columnId, title, description, priority('low'|'normal'|'high'|'urgent'), createdAt, startDate, dueDate, dueTime, category, tags[], subtasks[{id,text,done}], notes, links[], attachments[], recurrence{type,interval?,days?}, reminder{type,minutes?}, estimate, completedAt, archived, history[{t,type,detail?}]`
- `settings`: `dateFormat, timezone, defaultAreaId, defaultBoardId, defaultPriority, dueSoonDays, dailySummary, dailySummaryTime, completedBehavior('show'|'hide'|'archive'), autoArchiveDays, notificationsEnabled, firstRun`

**Laufzeit-UI (nicht persistiert):** `ui = {view, boardId, savedViewId, filters, sortBy, sortDir, calMonth, sidebarOpen, detailId}`

**CSS-Höhen-Kette für Board-Scrolling (NICHT wieder brechen):**
```css
.main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
#viewHost{flex:1;display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden}
.content{flex:1;overflow:auto;position:relative;min-height:0}
.board{display:flex;gap:14px;padding:18px;height:100%;align-items:stretch;overflow-x:auto;overflow-y:hidden}
.column{width:290px;flex-shrink:0;...;display:flex;flex-direction:column;height:100%;max-height:100%;min-height:0}
.col-cards{padding:2px 10px 12px;overflow-y:auto;flex:1 1 0;display:flex;flex-direction:column;gap:8px;min-height:0}
```

**Wichtige Funktionsnamen zum Wiederfinden:** `init()`/`startApp()`, `render()`, `renderView()`, `renderSidebar()`/`bindSidebar()`, `renderTopbar()`, `mountBoard()`, `bindBoard()`, `setupDnD()`/`onCardDown()`, `renderCard()`, `cardChecklist()`, `cardClickSub()`, `openDetail()`/`renderDetail()`, `openTaskModal()`, `taskFormFields()`, `matchTask()`, `sortTasks()`, `completeTask()`/`spawnRecurrence()`, `checkReminders()`, `exportData()`/`importData()`/`mergeImport()`, `viewDashboard/viewList/viewCalendar/viewAgenda/viewArchive/viewTrash/viewSettings`.

## Test-Vorgehen (bewährt, bitte beibehalten)
Zwei Stufen, beide in diesem Chat verwendet und aussagekräftig:

1. **Logiktests mit Node + DOM-Stubs.** `<script>`-Blöcke per Regex aus der HTML extrahieren, in einem `vm`-Kontext zusammenführen, `init()` am Ende abschneiden. Da `state` und `ui` mit `let`/`const` deklariert sind, landen sie **nicht** auf dem globalen Objekt – Brücke anhängen: `code += ";globalThis.__T={getState:()=>state,setState:v=>{state=v},getUi:()=>ui};"`. Stubs nötig für `document`, `localStorage`, `sessionStorage`, `window.addEventListener`. Damit getestet: Merge-Szenarien, doppelter Import, Konflikte, kaputte Referenzen, Render-Rauchtests.
2. **Echter Browser via Playwright.** Vorhanden unter `/home/claude/.npm-global/lib/node_modules/playwright`, **nur Chromium** ist installiert (Firefox/WebKit nicht). Damit lässt sich das Verhalten prüfen, das Stubs nicht zeigen: blockierte Formulare, echte Klicks, Sandbox-Frames (`<iframe sandbox="allow-scripts">` als Nachbau der Vorschau), blockierter `localStorage` (per `addInitScript` einen werfenden Getter setzen), `pageerror`-Listener für stille JS-Fehler. **Diese Stufe war entscheidend** – die Stub-Tests waren alle grün, während der Login im echten Browser nicht ging.

## Offene Punkte / nächste Schritte
Nichts blockiert. Denkbar:
1. **Echte Geräte-Synchronisation.** Der Export/Import-Weg funktioniert, ist aber manuell. Optionen wären ein kleines Backend (würde den Single-File-Ansatz aufgeben) oder eine Ablage in einem Cloud-Ordner. Der User hat dazu noch nicht entschieden.
2. **Hosting.** Der User wurde gefragt, ob er die Datei lokal öffnet oder auf einen Webserver/NAS legt; bei Variante Server wurde eine passende Konfiguration (inkl. Basic-Auth als echter Zugangsschutz) angeboten. Antwort steht aus.
3. Checklisten auf Karten optional einklappbar (Standard: nur Fortschritt).
4. WIP-Limit pro Spalte.
5. Dunkelmodus.

## Bevorzugte Arbeitsweise des Users
Deutsch, knapp und konkret. Iterative Verbesserungen an der bestehenden Datei. Legt Wert auf tatsächlich funktionierende, getestete Änderungen und auf den Single-File-/Selbst-Host-Ansatz. Meldet Fehler kurz und ohne Details („passiert nichts") – gezieltes Nachfragen nach Umgebung, Browser und beobachtetem Verhalten lohnt sich früh, das hätte hier zwei Runden gespart.

## Erste Aktion im neuen Chat
Der neue Chat hat die Datei NICHT im Kontext. Zuerst den User bitten, die **aktuelle `kanban.html` hochzuladen**, damit exakt auf dem letzten Stand weitergearbeitet wird. Erst danach die gewünschte Änderung umsetzen: bearbeiten, mit beiden Teststufen prüfen, als Datei zurückgeben.
