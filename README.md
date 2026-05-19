# Hash Anchor

Lists anchors from the file currently shown in the active editor.

This extension does **not** scan the workspace and does **not** scan VS Code's Open Editors list. It only reads `vscode.window.activeTextEditor.document`.

## Anchor format

A line is treated as an anchor only when the line itself starts with:

```ts
//#anchor
```

Examples:

```ts
//#anchor init
//#anchor render loop
```

Leading spaces are not matched. For example, this will not be listed:

```ts
  //#anchor ignored
```

## Commands

- `Hash Anchor: Open Current File Anchor List`
  - command id: `hashAnchor.lister.keybind`
- `Hash Anchor: Refresh Anchors`
  - command id: `hashAnchor.refresh`

## Keybinding

No default keybinding is registered. Add your own in `keybindings.json`:

```json
{
  "key": "ctrl+alt+a",
  "command": "hashAnchor.lister.keybind"
}
```


## Keybind list

The command `hashAnchor.lister.keybind` opens a Quick Pick list of anchors from the current active file. No default keybinding is registered.
