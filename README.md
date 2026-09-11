# Projekt C — Kanban

Persönlicher Kanban-Planer für Arbeit und Privat. Eine einzelne HTML-Datei,
Vanilla-JavaScript, keine externen Abhängigkeiten, deutschsprachig.

## Die Dateien

| Datei | Wofür |
|---|---|
| `kanban.html` | Die Anwendung. Einzeldatei, direkt im Browser zu öffnen oder auf einen Webserver/NAS zu legen. **Hier wird entwickelt.** |
| `dist/kanban-artifact.html` | Abgeleitete Fassung für die Veröffentlichung als Website. Nicht von Hand bearbeiten. |
| `build-artifact.js` | Erzeugt die abgeleitete Fassung. |
| `test/` | Testsuite, zwei Stufen: Logik in Node, Verhalten im echten Browser. |
| `docs/` | Handover-Dokumente je Version. |

## Zwei Betriebsarten

**Als Einzeldatei** (lokal geöffnet oder selbst gehostet): Daten liegen im
`localStorage` dieses Browsers. Übertragung zwischen Geräten über
Exportieren → Importieren → *Zusammenführen*. Anmeldung aktiv.

**Als Website** (veröffentlicht): Daten liegen beim Claude-Konto, alle Geräte
sehen denselben Stand. Keine Anmeldung — die Adresse ist bereits geschützt.

Die Datei erkennt selbst, worin sie läuft.

## Entwickeln

```sh
node build-artifact.js   # abgeleitete Fassung erzeugen
./test/run-all.sh        # alles prüfen (Node + Chromium)
```

Änderungen immer in `kanban.html`, danach bauen und testen. Die Versionsnummer
steht an zwei Stellen (`#lgVer` im Login, `viewSettings()`) — beide mitziehen.
