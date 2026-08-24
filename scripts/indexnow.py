#!/usr/bin/env python3
"""Sender sitets URL'er til IndexNow, saa Bing henter de aendrede sider med det
samme i stedet for at opdage dem uger senere.

IndexNow er en protokol, hvor man selv siger til. Bing, Yandex, Naver og
Seznam bruger den. Google goer ikke - der er sitemap og Search Console
stadig den eneste vej.

Noeglen laeses ud af den byggede noeglefil i stedet for at staa her. Saa er
der ét sted, den defineres (src/indexnow.njk), og scriptet foelger
automatisk med, hvis den nogensinde skiftes.

Koeres af .github/workflows/indexnow.yml efter hver aendring, men kan ogsaa
koeres i haanden:

    cd site && npx @11ty/eleventy && python scripts/indexnow.py
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

UD = "_site"
VAERT = "hesteassisteret-praksis.dk"
ENDPOINT = "https://api.indexnow.org/indexnow"


def find_noegle():
    """Noeglefilen hedder noeglen selv og indeholder noeglen selv."""
    for navn in os.listdir(UD):
        m = re.fullmatch(r"([0-9a-f]{8,128})\.txt", navn)
        if m:
            indhold = open(os.path.join(UD, navn), encoding="utf-8").read().strip()
            if indhold == m.group(1):
                return m.group(1)
            sys.exit(
                "%s indeholder ikke sin egen noegle. IndexNow svarer 403 paa "
                "det." % navn
            )
    sys.exit(
        "Fandt ingen IndexNow-noeglefil i %s/. Bygger src/indexnow.njk stadig?" % UD
    )


def find_urler():
    xml = open(os.path.join(UD, "sitemap.xml"), encoding="utf-8").read()
    urler = re.findall(r"<loc>([^<]+)</loc>", xml)
    if not urler:
        sys.exit("sitemap.xml indeholder ingen URL'er.")
    return sorted(urler)


def main():
    noegle = find_noegle()
    urler = find_urler()

    krop = json.dumps(
        {
            "host": VAERT,
            "key": noegle,
            "keyLocation": "https://%s/%s.txt" % (VAERT, noegle),
            "urlList": urler,
        }
    ).encode("utf-8")

    print("Sender %d URL'er til IndexNow:" % len(urler))
    for u in urler:
        print("  " + u)

    req = urllib.request.Request(
        ENDPOINT,
        data=krop,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as svar:
            kode = svar.status
    except urllib.error.HTTPError as fejl:
        kode = fejl.code

    # 200 = modtaget. 202 = modtaget, noeglen valideres. Begge er success.
    forklaring = {
        200: "OK",
        202: "Accepteret, noeglen valideres",
        400: "Ugyldigt format",
        403: "Noeglen kunne ikke valideres - ligger noeglefilen paa domaenet?",
        422: "URL'erne passer ikke til vaerten",
        429: "For mange indsendelser",
    }.get(kode, "Ukendt svar")

    print("\nHTTP %d - %s" % (kode, forklaring))
    sys.exit(0 if kode in (200, 202) else 1)


if __name__ == "__main__":
    main()
