#!/usr/bin/env bash
# Fetch every bundled gen 1–2 game asset from the PokeAPI mirrors into
# public/assets/. Idempotent — safe to re-run; overwrites what's there.
#
# Uses git sparse checkout (partial clone) instead of raw.githubusercontent.com:
# the git protocol is not subject to the per-IP rate limit that motivated
# bundling these assets in the first place, and everything arrives in a few
# batched packs instead of ~1,750 HTTP requests.
#
# Bundled per Pokémon id 1–251:
#   public/assets/sprites/{id}.png            static front
#   public/assets/sprites/back/{id}.png       static back
#   public/assets/sprites/anim/{id}.gif       showdown animated front
#   public/assets/sprites/anim/back/{id}.gif  showdown animated back
#   public/assets/sprites/anim/shiny/…        shiny variants of both
#   public/assets/artwork/{id}.png            official artwork (avatars/intro)
#   public/assets/cries/{id}.ogg              cry audio
set -euo pipefail

# Keep in sync with SPRITES_SHA in src/utils/spriteSources.ts
SPRITES_SHA="b70e1604eb94d37d9040d661dff952caecf93d78"
MAX_ID=251

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

sparse_fetch() { # <repo-url> <ref> <clone-dir> <patterns-file>
    local url="$1" ref="$2" dir="$3" patterns="$4"
    git init -q "$dir"
    git -C "$dir" remote add origin "$url"
    git -C "$dir" fetch -q --depth 1 --filter=blob:none origin "$ref"
    git -C "$dir" sparse-checkout init --no-cone
    cp "$patterns" "$dir/.git/info/sparse-checkout"
    git -C "$dir" checkout -q FETCH_HEAD
}

# ---- sprites repo (pinned SHA) ---------------------------------------------
SPRITES_PATTERNS="$TMP/sprites-patterns"
for id in $(seq 1 "$MAX_ID"); do
    cat >> "$SPRITES_PATTERNS" <<EOF
/sprites/pokemon/${id}.png
/sprites/pokemon/back/${id}.png
/sprites/pokemon/other/official-artwork/${id}.png
/sprites/pokemon/other/showdown/${id}.gif
/sprites/pokemon/other/showdown/back/${id}.gif
/sprites/pokemon/other/showdown/shiny/${id}.gif
/sprites/pokemon/other/showdown/back/shiny/${id}.gif
EOF
done
echo "Fetching sprites @ ${SPRITES_SHA:0:12} (static + animated + artwork)…"
sparse_fetch https://github.com/PokeAPI/sprites.git "$SPRITES_SHA" "$TMP/sprites" "$SPRITES_PATTERNS"

# ---- cries repo -------------------------------------------------------------
CRIES_PATTERNS="$TMP/cries-patterns"
for id in $(seq 1 "$MAX_ID"); do
    echo "/cries/pokemon/latest/${id}.ogg" >> "$CRIES_PATTERNS"
done
echo "Fetching cries @ main…"
sparse_fetch https://github.com/PokeAPI/cries.git main "$TMP/cries" "$CRIES_PATTERNS"

# ---- copy into public/assets ------------------------------------------------
SP="$TMP/sprites/sprites/pokemon"
OUT="$ROOT/public/assets"
mkdir -p "$OUT/sprites/back" "$OUT/sprites/anim/back/shiny" "$OUT/sprites/anim/shiny" \
         "$OUT/artwork" "$OUT/cries"

missing=0
copy() { # <src> <dst>
    if [ -f "$1" ]; then cp "$1" "$2"; else echo "  MISSING: ${1#"$TMP"/}"; missing=$((missing + 1)); fi
}
for id in $(seq 1 "$MAX_ID"); do
    copy "$SP/${id}.png"                        "$OUT/sprites/${id}.png"
    copy "$SP/back/${id}.png"                   "$OUT/sprites/back/${id}.png"
    copy "$SP/other/official-artwork/${id}.png" "$OUT/artwork/${id}.png"
    copy "$SP/other/showdown/${id}.gif"         "$OUT/sprites/anim/${id}.gif"
    copy "$SP/other/showdown/back/${id}.gif"    "$OUT/sprites/anim/back/${id}.gif"
    copy "$SP/other/showdown/shiny/${id}.gif"   "$OUT/sprites/anim/shiny/${id}.gif"
    copy "$SP/other/showdown/back/shiny/${id}.gif" "$OUT/sprites/anim/back/shiny/${id}.gif"
    copy "$TMP/cries/cries/pokemon/latest/${id}.ogg" "$OUT/cries/${id}.ogg"
done

echo
echo "Done. $missing missing upstream (fallback ladder handles those)."
for d in sprites artwork cries; do du -sh "$OUT/$d"; done
