#!/usr/bin/env bash
# Tell Bing and the other IndexNow search engines (Yandex, Seznam, Naver...) about every page in
# the live sitemap, so new and changed pages are crawled within days rather than weeks. Bing's
# index also feeds ChatGPT search, DuckDuckGo and Yahoo. Run it after a release that adds pages.
# Google does not take part: submit the sitemap in Google Search Console instead.
#
#   bash deploy/indexnow.sh [https://signaturemile.com]
set -euo pipefail
site=${1:-https://signaturemile.com}
site=${site%/}
host=${site#*://}
# Served from frontend/public at $site/$key.txt, which proves the site is ours.
key=47230c209506683428bef4ad1d2550b7

curl -fsS "$site/$key.txt" | grep -qx "$key" || { echo "$site/$key.txt does not serve the key yet: deploy first."; exit 1; }

urls=$(curl -fsS "$site/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed -e 's/<loc>//' -e 's/<\/loc>//')
count=$(echo "$urls" | grep -c .)
[[ $count -gt 0 ]] || { echo "No pages found in $site/sitemap.xml."; exit 1; }
list=$(echo "$urls" | sed 's/.*/"&"/' | paste -sd, -)

status=$(curl -sS -o /dev/null -w '%{http_code}' -X POST 'https://api.indexnow.org/indexnow' \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data "{\"host\":\"$host\",\"key\":\"$key\",\"keyLocation\":\"$site/$key.txt\",\"urlList\":[$list]}")

case $status in
  200 | 202) echo "IndexNow accepted $count pages from $site (HTTP $status)." ;;
  *) echo "IndexNow refused the submission (HTTP $status)."; exit 1 ;;
esac
