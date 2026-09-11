# Handover – Kanban-App (Stand: Version 1.4)

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

## Tests (111, alle grün)
| Datei | Umfang | Prüft |
|---|---|---|
| `test/outlook.test.js` | 41 | Zeiträume, Dauer-Vorrang, URL-Kodierung, Altdaten |
| `test/sync.test.js` | 16 | Zwei „Geräte" an einer nachgebauten Datenbank: Übernahme, Konflikt, Pingpong, Schreibfehler |
| `test/browser.test.js` | 28 | Echter Chromium: Klicks, Drag&Drop, Sandbox-Frame, stille JS-Fehler |
| `test/mobile.test.js` | 10 | 390 px Breite, Touch, Trefferflächen |
| `test/import.test.js` | 16 | Backup einlesen Ende zu Ende, Fehlerfälle, keine Doppelten |

`test/harness.js` lädt die Script-Blöcke in einen `vm`-Kontext. Die Brücke
`__T` reicht die `let`-Variablen heraus (`state`, `ui`, `syncTxt`, `cloudDoc`,
`cloudRev`) – ohne sie sind sie von außen unsichtbar.

## v1.4 – Bestehende Aufgaben übernehmen

Die veröffentlichte Website startet leer: `kanban.html` enthält nur den Code,
die Aufgaben liegen im `localStorage` des jeweiligen Browsers. Der Weg herüber
führt also über Export und Import – und der musste sichtbar und sicher sein.

- **Erststart-Dialog** bietet jetzt als dritte Möglichkeit *Aufgaben übernehmen*
  (`#frImport` → `importChooser()`), nicht mehr nur „leer" oder „Beispieldaten".
- **`importChooser()`** stellt beide Wege zur Wahl: Datei oder eingefügter Text.
- **`importTextDialog()`** liest ein Backup aus eingefügtem JSON. Dieser Weg
  funktioniert überall – auch dort, wo ein Dateiauswahl-Dialog nicht aufgeht,
  und vom Handy aus, wo selten eine Datei zur Hand ist. Fehlermeldungen benennen
  die Ursache (leer / kein JSON / falsche Struktur).
- Zweiter Knopf in den Einstellungen: *Backup-Text einfügen* (`#btnImportText`).

**Geprüft:** Ein `<input type="file">` geht in einem `<iframe sandbox>` in allen
getesteten Flag-Kombinationen auf – der Dateiweg funktioniert also. Der
Textweg ist die Rückfallebene, falls der echte Host enger ist.

**Portal:** `Vladis Portal` hat einen Navigationspunkt *Aufgaben* bekommen, der
auf das Board zeigt (Artifact `4b0e03f3-880a-49dd-9ccf-c44eebe476f1`). Als
einziger Eintrag, der die Seite verlässt, mit Pfeilsymbol markiert. Der Stand,
auf dem diese Änderung aufsetzt, liegt als `docs/portal-stand.html` bei – beim
Zurückschreiben eines gelesenen Artifacts muss das Plattform-Gerüst
(`<!doctype>/<html>/<head>/<body>`) abgestreift werden, sonst steckt es doppelt.

## Offene Punkte
1. **Outlook-Deeplink im Echtbetrieb bestätigen** – Variante (geschäftlich/privat)
   und Uhrzeit. Einstellung: *Einstellungen › Termine & Outlook*.
2. Aus v1.2 offen geblieben: Checklisten einklappbar, WIP-Limit pro Spalte,
   Dunkelmodus.
