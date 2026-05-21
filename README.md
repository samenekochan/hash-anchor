<p align="center">
  <img src="https://github.com/samenekochan/hash-anchor/blob/main/resources/AHash.png?raw=true" width="128">
</p>

<p align="center">
  lightweight current-file anchor navigator
</p>

---

# Hash Anchor

![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Version](https://img.shields.io/github/package-json/v/samenekochan/hash-anchor?style=flat-square)
![Release](https://img.shields.io/github/v/release/samenekochan/hash-anchor?style=flat-square)
![License](https://img.shields.io/github/license/samenekochan/hash-anchor?style=flat-square)
![Downloads](https://img.shields.io/github/downloads/samenekochan/hash-anchor/total?style=flat-square)

Lightweight current-file anchor navigator for VS Code.

Hash Anchor only scans the file currently opened in the active editor.

It does NOT:

- scan the workspace
- scan all project files
- scan VS Code's Open Editors list

The extension only reads:

```ts
vscode.window.activeTextEditor.document
```

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
1 - 16
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

# Screenshots

<img width="874" height="135" alt="image" src="https://github.com/user-attachments/assets/73c07a11-475f-48d6-91f0-b98cd8af6c03" /><br>
<sub><i>Auto-complete support for `#anchor` markers.</i></sub>

<img width="1431" height="578" alt="image" src="https://github.com/user-attachments/assets/af3c76bc-49e3-42dd-8660-5978c3cd8908" /><br>
<sub><i>Navigate between anchors quickly using the sidebar and quick picker.</i></sub>



