#!/usr/bin/env bash
# Import Claude Code skills and plugins into Cursor.
# Run from repo root: bash scripts/import-claude-to-cursor.sh

set -e
CLAUDE="${HOME}/.claude"
CURSOR="${HOME}/.cursor"

echo "=== Importing Claude Code → Cursor ==="

# 1. Standalone skills: copy ~/.claude/skills/* to ~/.cursor/skills-cursor/
echo ""
echo "1. Copying standalone skills..."
mkdir -p "${CURSOR}/skills-cursor"
for item in "${CLAUDE}/skills"/*; do
  [ -e "$item" ] || continue
  name=$(basename "$item")
  if [ -d "$item" ] && [ -f "$item/SKILL.md" ] 2>/dev/null; then
    echo "   skills-cursor: $name (directory with SKILL.md)"
    cp -R "$item" "${CURSOR}/skills-cursor/"
  elif [ -d "$item" ]; then
    echo "   skills-cursor: $name (directory)"
    cp -R "$item" "${CURSOR}/skills-cursor/"
  elif [ "$name" = "SKILL.md" ] || [ "${name%.md}" != "$name" ]; then
    echo "   skills-cursor: $name (file)"
    cp "$item" "${CURSOR}/skills-cursor/"
  fi
done

# 2. Plugins with skills: copy from Claude plugin cache to Cursor under claude-imported
echo ""
echo "2. Copying plugins (with skills) into Cursor cache..."
IMPORTED="${CURSOR}/plugins/cache/claude-imported"
mkdir -p "$IMPORTED"

# Scan both official and thedotmack (and other) plugin sources
for cache_dir in "${CLAUDE}/plugins/cache/claude-plugins-official" "${CLAUDE}/plugins/cache/thedotmack"; do
  [ ! -d "$cache_dir" ] && continue
  for plugin_dir in "${cache_dir}"/*/; do
  [ -d "$plugin_dir" ] || continue
  plugin_name=$(basename "$plugin_dir")
  # Use latest version by modification time (or first dir if multiple)
  for version_dir in "$plugin_dir"*/; do
    [ -d "$version_dir" ] || continue
    [ -d "${version_dir}skills" ] || continue
    version=$(basename "$version_dir")
    dest="${IMPORTED}/${plugin_name}/${version}"
    if [ -d "$dest" ]; then
      echo "   skip (exists): ${plugin_name}/${version}"
      continue
    fi
    echo "   importing: ${plugin_name}/${version}"
    mkdir -p "$(dirname "$dest")"
    cp -R "$version_dir" "$dest"
    # Ensure Cursor sees it: add or keep .cursor-plugin/plugin.json with skills path
    cursor_plugin="${dest}/.cursor-plugin"
    mkdir -p "$cursor_plugin"
    if [ ! -f "${cursor_plugin}/plugin.json" ]; then
      claude_plugin="${dest}/.claude-plugin/plugin.json"
      if [ -f "$claude_plugin" ]; then
        name=$(grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' "$claude_plugin" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
        desc=$(grep -o '"description"[[:space:]]*:[[:space:]]*"[^"]*"' "$claude_plugin" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')
        [ -z "$name" ] && name="$plugin_name"
        printf '{"name":"%s","description":"%s","skills":"./skills/"}\n' "$name" "$desc" > "${cursor_plugin}/plugin.json"
      else
        printf '{"name":"%s","skills":"./skills/"}\n' "$plugin_name" > "${cursor_plugin}/plugin.json"
      fi
    fi
    # Only import one version per plugin (latest by dir order)
    break
  done
  done
done

echo ""
echo "Done. Restart Cursor or reload the window so it picks up new skills and plugins."
echo "Skills are in: ${CURSOR}/skills-cursor/"
echo "Imported plugins are in: ${IMPORTED}/"
