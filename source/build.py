"""Build both versions from one source:
   neraca-kalori.html  -> Claude artifact (page fragment; the host adds <html>/<head>)
   pwa/index.html      -> offline web app for GitHub Pages (full document + manifest + service worker)
"""
import glob, re, subprocess, os, json, hashlib

CLAUDE_URL = 'https://claude.ai/artifact/2MXYqDfn8A3EBG4rj16goj'
page = open('page.html').read()
calc = open('calc.js').read()
src = ''.join(open(f).read() + '\n' for f in sorted(glob.glob('src/*.js')))


def app(standalone):
    head = "(function () {\n'use strict';\nconst STANDALONE = %s;\nconst CLAUDE_URL = %s;\n" % (
        'true' if standalone else 'false', json.dumps(CLAUDE_URL))
    return head + src + "})();\n"


def check(html, label):
    sc = re.findall(r'<script>(.*?)</script>', html, re.S)
    path = '/tmp/claude-0/chk-%s.js' % label
    open(path, 'w').write('\n'.join(sc))
    r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
    print('SYNTAX', label, 'OK' if r.returncode == 0 else r.stderr[:2000])


# ---- 1. Claude artifact
a = app(False)
open('app.js', 'w').write(a)
art = page.replace('/*CALC*/', calc).replace('/*APP*/', a)
open('neraca-kalori.html', 'w').write(art)
check(art, 'artifact')

# ---- 2. Offline web app (PWA)
os.makedirs('pwa', exist_ok=True)
body = page.replace('/*CALC*/', calc).replace('/*APP*/', app(True))
body = body.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '')
title = re.search(r'<title>.*?</title>\n?', body).group(0)
body = body.replace(title, '')
head = '''<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Fuel Log</title>
<meta name="description" content="Pencatat kalori, olahraga, air, dan puasa. Bisa dipakai tanpa sinyal.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="theme-color" content="#EDF0EB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111613" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fuel Log">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<style>body{margin:0}</style>
</head>
<body>
'''
pwa = head + body + '\n</body>\n</html>\n'
open('pwa/index.html', 'w').write(pwa)
check(pwa, 'pwa')

# service worker: cache name follows the content so every new build replaces the old cache
ver = hashlib.sha1((pwa + open('pwa_sw.js').read()).encode()).hexdigest()[:10]
open('pwa/sw.js', 'w').write(open('pwa_sw.js').read().replace('__VERSION__', ver))
print('PWA cache version', ver)
