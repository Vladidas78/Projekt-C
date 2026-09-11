#!/usr/bin/env node
/* Erzeugt aus kanban.html die Artifact-Fassung.
   kanban.html bleibt die eine Quelle und weiter als Einzeldatei nutzbar.
   Das Artifact bekommt beim Veroeffentlichen ein eigenes
   <!doctype>/<head>/<body>-Geruest, deshalb liefern wir hier nur den Inhalt:
   <title> und <style> aus dem Kopf, danach der Koerper. */
const fs=require('fs'),path=require('path');
const SRC=path.join(__dirname,'kanban.html');
const OUT=path.join(__dirname,'dist','kanban-artifact.html');
const TITLE='Vladis Kanban';

const html=fs.readFileSync(SRC,'utf8');
const head=/<head>([\s\S]*?)<\/head>/.exec(html);
const body=/<body>([\s\S]*?)<\/body>/.exec(html);
if(!head||!body){console.error('Kopf oder Koerper nicht gefunden');process.exit(1);}

// Aus dem Kopf nur behalten, was das Geruest nicht schon mitbringt.
let headKeep=head[1]
  .replace(/<meta[^>]*>\s*/gi,'')          // charset/viewport/theme-color liefert das Geruest
  .replace(/<title>[\s\S]*?<\/title>/i,'') // eigener Titel unten
  .trim();

const out='<title>'+TITLE+'</title>\n'+headKeep+'\n'+body[1].trim()+'\n';
fs.mkdirSync(path.dirname(OUT),{recursive:true});
fs.writeFileSync(OUT,out);

// Gegenproben, damit kein halber Build durchrutscht
const must=[['outlookUrl','Outlook-Logik'],['cloudInit','Sync-Logik'],['syncRowHtml','Sync-Anzeige'],['init();','Startaufruf']];
let bad=0;
must.forEach(([n,l])=>{if(!out.includes(n)){console.error('FEHLT: '+l+' ('+n+')');bad++;}});
[['<!DOCTYPE','Doctype'],['<html','html-Tag'],['<head>','head-Tag'],['<body>','body-Tag']]
  .forEach(([n,l])=>{if(out.includes(n)){console.error('DARF NICHT DRIN SEIN: '+l);bad++;}});
const nSrc=(html.match(/<script>/g)||[]).length, nOut=(out.match(/<script>/g)||[]).length;
if(nSrc!==nOut){console.error('Script-Bloecke verloren: '+nOut+' statt '+nSrc);bad++;}
if(bad)process.exit(1);
console.log('dist/kanban-artifact.html · '+(out.length/1024).toFixed(0)+' KB · '+nOut+' Script-Bloecke');
