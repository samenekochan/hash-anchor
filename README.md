# Hash Anchor

Lightweight current-file anchor navigator for VS Code.

Hash Anchor only scans the file currently opened in the active editor.

It does NOT:

- scan the workspace
- scan all project files
- scan VS Code's Open Editors list

The extension only reads:

```ts
vscode.window.activeTextEditor.document
````

---

# Features

* Current-file-only anchor navigation
* Sidebar anchor list
* Quick Pick anchor list
* Multi-language anchor support
* Configurable parsing modes
* Large semi-transparent anchor decorations
* Lightweight and fast
* No workspace indexing

---

# Supported Anchor Styles

Hash Anchor supports multiple comment styles.

Examples:

```ts
//#anchor render
```

```py
#anchor init
```

```lua
--#anchor player
```

```html
<!-- #anchor ui -->
```

```css
/* #anchor theme */
```

Empty anchors are also supported:

```ts
//#anchor
```

```html
<!-- #anchor -->
```

Unnamed anchors will display as:

```txt
(line X)
```

---

# Parsing Rules

Anchors are only matched when the line begins with:

* optional whitespace
* comment prefix or anchor token
* `#anchor`

Examples:

```ts
//#anchor valid
```

```ts
    //#anchor valid
```

```html
<!-- #anchor valid -->
```

These will NOT match:

```ts
let a = 0; //#anchor invalid
```

```html
<div> <!-- #anchor invalid -->
```

---

# Modes

## Auto Mode (default)

Tries:

1. language-based parsing
2. pattern-based parsing
3. bare `#anchor`

---

## Language Mode

Uses configured language-specific anchor formats.

Example:

```json
"javascript": "//#anchor ${1:}"
```

---

## Pattern Mode

Matches generic comment-like prefixes before `#anchor`.

Useful for unknown or extension-provided languages.

---

# Commands

## Open Current File Anchor List

Command:

```txt
hashAnchor.lister.keybind
```

Opens a Quick Pick list of anchors from the current file.

---

## Refresh Anchors

Command:

```txt
hashAnchor.refresh
```

Refreshes the anchor list and decorations.

---

# Keybindings

No default keybinding is registered.

Example:

```json
{
  "key": "ctrl+alt+a",
  "command": "hashAnchor.lister.keybind"
}
```

---

# Configuration

## Parsing Mode

```json
"hashAnchor.mode": "auto"
```

Available values:

* `auto`
* `language`
* `pattern`

---

## Pattern Prefix Limit

```json
"hashAnchor.pattern.maxPrefixLength": 4
```

Limits how many non-whitespace characters are allowed before `#anchor` in pattern mode.

Range:

```txt
1 - 32
```

---

# Example

```ts
//#anchor init

function initialize() {

}
```

```html
<!-- #anchor ui -->

<div class="container"></div>
```

```py
#anchor setup

def setup():
    pass
```
