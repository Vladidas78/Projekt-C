# Handover – Kanban-App (Stand: Version 1.3)

Fortschreibung von `handover-v1.2.md`. Alles dort Beschriebene gilt weiter,
sofern hier nichts anderes steht.

## Was in v1.3 dazugekommen ist

### 1. Termin in Outlook per Knopfdruck
An jeder **offenen Aufgabe mit Zieltermin** erscheint ein Outlook-Knopf – auf der
Karte (`cardCalBtn()`) und im Detailfenster (`calSection()`). Er öffnet ein
vorausgefülltes Terminfenster; gespeichert wird erst in Outlook selbst.

**Kein Extra-Schalter pro Aufgabe.** Das Vorhandensein eines Zieltermins *ist*
das Signal – ohne Datum gibt es nichts in den Kalender zu legen. Das war eine
bewusste Entscheidung gegen ein zusätzliches Feld, das bei jeder Neuanlage
Aufmerksamkeit kostet.

- Ohne Uhrzeit → ganztägiger Termin (`allday=true`, Ende = Folgetag).
- Mit Uhrzeit → Start plus Dauer. Vorrang: `task.cal.dur` → `task.estimate` →
  `settings.calDefaultMin` (Standard 30).
- Termintext enthält Beschreibung, Unteraufgaben mit Haken, Notizen, Links und
  eine Herkunftszeile (Bereich · Board · Kategorie · Priorität · Tags).
- Neue Task-Felder: `cal:{dur,loc}`. `normalizeTask()` rüstet sie bei Altdaten
  nach und verwirft unsinnige Werte.
- Neue Einstellungen: `outlookHost` (`office` | `live`), `calDefaultMin`.

**Warum kein .ics:** Als Artifact läuft die Seite in einer Sandbox, die von der
Seite ausgelöste Downloads wirkungslos macht – und `.ics` steht nicht auf der
erlaubten Endungs-Liste der `downloads`-Fähigkeit. Der Deeplink ist eine normale
Verlinkung und kommt durch.

**Zeitzone:** Start und Ende werden als **lokale** Zeitangabe ohne `Z`-Suffix
übergeben (`2026-09-15T09:00:00`). Mit `Z` wäre der Termin um den UTC-Versatz
verschoben – in der deutschen Sommerzeit um zwei Stunden. Ein Test wacht
darüber (`kein Z-Suffix`).

**Ungeprüft geblieben:** Die genaue Deeplink-Syntax stammt aus Modellwissen, nicht
aus einem Test gegen ein angemeldetes Outlook. Der erste echte Klick ist die
Probe. Falls die Uhrzeit verrutscht, sitzt die Stellschraube in `calRange()`.

### 2. Geräteübergreifende Speicherung
Als Artifact liegt der Stand serverseitig (`db`-Fähigkeit, Dokument
`state/board`), damit PC, Laptop und Handy denselben Bestand sehen. Als lokal
geöffnete Datei existiert `window.claude` nicht – dort bleibt alles wie bisher
im `localStorage`, und Export/Import/Zusammenführen ist weiter der Weg.

Der Browser-Test belegt, warum das nötig war: In einem `<iframe sandbox>` ist
`localStorage` **gesperrt** – genau der Fall, an dem in v1.2 die Anmeldung
scheiterte.

- **Zusammenführen statt überschreiben.** Fremde Stände laufen durch das schon
  getestete `mergeImport()`. Damit geht nichts verloren.
  **Preis dieser Richtung:** Eine auf Gerät A gelöschte Aufgabe kann von Gerät B
  zurückkommen, solange B sie noch kennt. Bewusst so gewählt – nichts zu
  verlieren wiegt schwerer als nichts zurückzubekommen.
- Schleifenschutz über `writer`-Kennung (`CLIENT_ID`) und `rev`-Zähler.
- Schreibfehler werden in der Seitenleiste sichtbar (`setSync`), statt still zu
  verpuffen.
- Frischer, unberührter Stand übernimmt den Fernstand ganz (`adoptRemote`),
  statt Beispieldaten hineinzumischen.
- Im Artifact entfällt die **Anmeldung** – die Adresse ist bereits durch den
  Claude-Zugang geschützt, eine zweite unverschlüsselte Sperre wäre nur Reibung.

### 3. Export repariert
`exportData()` benutzte einen `<a download>`-Link. Im Artifact tut der nichts –
ohne Fehlermeldung. Jetzt: `downloads`-Fähigkeit mit Nutzerbestätigung, bei
Ablehnung oder Fehlen Rückfall auf die Zwischenablage. Als Einzeldatei
unverändert der Download-Link.

### 4. Kleinigkeiten
- Outlook-Knopf auf Touch-Geräten von 20 px auf 36 px Höhe vergrößert
  (`@media (pointer:coarse)`).
- `storageInfoText()` sagt in den Einstellungen im Klartext, wo die Daten liegen.
- Erststart-Dialog formuliert im Artifact korrekt (nicht mehr „bleiben lokal").

## Wichtige Dateien
- `kanban.html` – **die eine Quelle**, weiterhin Einzeldatei ohne Build-Schritt.
- `build-artifact.js` – leitet `dist/kanban-artifact.html` daraus ab (streift
  `<!DOCTYPE>/<html>/<head>/<body>` ab, weil das Artifact sein eigenes Gerüst
  mitbringt). Prüft dabei gegen, dass keine Script-Blöcke verloren gehen.
- `test/run-all.sh` – beide Teststufen aus v1.2, ausgebaut.

## Tests (95, alle grün)
| Datei | Umfang | Prüft |
|---|---|---|
| `test/outlook.test.js` | 41 | Zeiträume, Dauer-Vorrang, URL-Kodierung, Altdaten |
| `test/sync.test.js` | 16 | Zwei „Geräte" an einer nachgebauten Datenbank: Übernahme, Konflikt, Pingpong, Schreibfehler |
| `test/browser.test.js` | 28 | Echter Chromium: Klicks, Drag&Drop, Sandbox-Frame, stille JS-Fehler |
| `test/mobile.test.js` | 10 | 390 px Breite, Touch, Trefferflächen |

`test/harness.js` lädt die Script-Blöcke in einen `vm`-Kontext. Die Brücke
`__T` reicht die `let`-Variablen heraus (`state`, `ui`, `syncTxt`, `cloudDoc`,
`cloudRev`) – ohne sie sind sie von außen unsichtbar.

## Offene Punkte
1. **Outlook-Deeplink im Echtbetrieb bestätigen** – Variante (geschäftlich/privat)
   und Uhrzeit. Einstellung: *Einstellungen › Termine & Outlook*.
2. **Import im Artifact** – `importData()` öffnet einen Dateiauswahl-Dialog.
   Ob der in der Sandbox aufgeht, ist ungeprüft. Im Cloud-Betrieb braucht man
   ihn seltener, weil die Geräte sich von selbst abgleichen.
3. Aus v1.2 offen geblieben: Checklisten einklappbar, WIP-Limit pro Spalte,
   Dunkelmodus.
