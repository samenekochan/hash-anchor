import * as vscode from 'vscode';

type Anchor = {
  label: string;
  line: number;
  column: number;
  fileName: string;
  uri: string;
};

let anchorDecorationType: vscode.TextEditorDecorationType | undefined;

function createAnchorDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    after: {
      margin: '0 0 0 2rem',
      color: 'rgba(127, 127, 127, 0.35)',
      fontWeight: '700',
      fontStyle: 'normal',
      textDecoration: 'none; font-size: 1.4em'
    }
  });
}

function getDecorationEnabled(): boolean {
  return vscode.workspace.getConfiguration('hashAnchor').get<boolean>('largeLabel.enabled', true);
}

function getDecorationPrefix(): string {
  return vscode.workspace.getConfiguration('hashAnchor').get<string>('largeLabel.prefix', '  # ');
}

function updateAnchorDecorations(editor?: vscode.TextEditor): void {
  const targetEditor = editor ?? vscode.window.activeTextEditor;
  if (!anchorDecorationType || !targetEditor) {
    return;
  }

  if (!getDecorationEnabled()) {
    targetEditor.setDecorations(anchorDecorationType, []);
    return;
  }

  const anchors = findAnchors(targetEditor.document);
  const decorations: vscode.DecorationOptions[] = anchors.map(anchor => {
    const line = targetEditor.document.lineAt(anchor.line);
    return {
      range: new vscode.Range(line.range.end, line.range.end),
      renderOptions: {
        after: {
          contentText: `${getDecorationPrefix()}${anchor.label}`
        }
      }
    };
  });

  targetEditor.setDecorations(anchorDecorationType, decorations);
}

function clearAnchorDecorations(editor?: vscode.TextEditor): void {
  if (!anchorDecorationType || !editor) {
    return;
  }

  editor.setDecorations(anchorDecorationType, []);
}


function getCompletionTokenText(): string {
  const prefix = getPrefix();
  const hashIndex = prefix.lastIndexOf('#');
  if (hashIndex >= 0) {
    return prefix.slice(hashIndex);
  }
  return '#anchor';
}

function createAnchorCompletionProvider(): vscode.CompletionItemProvider {
  return {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
      const linePrefix = document.lineAt(position.line).text.slice(0, position.character);
      const hashIndex = linePrefix.lastIndexOf('#');
      if (hashIndex < 0) {
        return undefined;
      }

      const typed = linePrefix.slice(hashIndex);
      if (!/^#[A-Za-z_-]*$/.test(typed)) {
        return undefined;
      }

      const completionToken = getCompletionTokenText();
      if (!completionToken.startsWith(typed)) {
        return undefined;
      }

      const fullPrefix = getPrefix();
      const beforeHash = linePrefix.slice(0, hashIndex);
      const alreadyHasLineComment = /\/\/\s*$/.test(beforeHash);
      const insertPrefix = alreadyHasLineComment ? completionToken : fullPrefix;

      const item = new vscode.CompletionItem(completionToken, vscode.CompletionItemKind.Snippet);
      item.detail = 'Hash Anchor';
      item.documentation = new vscode.MarkdownString('Insert a Hash Anchor marker for the current file anchor list.');
      item.range = new vscode.Range(position.line, hashIndex, position.line, position.character);
      item.insertText = new vscode.SnippetString(`${insertPrefix} \${1:}`);
      item.sortText = '0000_hash_anchor';
      item.filterText = completionToken;
      return [item];
    }
  };
}

class AnchorItem extends vscode.TreeItem {
  constructor(public readonly anchor: Anchor) {
    super(anchor.label, vscode.TreeItemCollapsibleState.None);
    this.description = `${anchor.fileName}:${anchor.line + 1}`;
    this.tooltip = `${anchor.label}\nLine ${anchor.line + 1}`;
    this.contextValue = 'hashAnchorItem';
    this.iconPath = new vscode.ThemeIcon('symbol-event');
    this.command = {
      command: 'hashAnchor.openAnchor',
      title: 'Open Anchor',
      arguments: [anchor]
    };
  }
}

class MessageItem extends vscode.TreeItem {
  constructor(message: string) {
    super(message, vscode.TreeItemCollapsibleState.None);
    this.contextValue = 'hashAnchorMessage';
  }
}

class AnchorProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.ProviderResult<vscode.TreeItem[]> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return [new MessageItem('No active editor')];
    }

    const anchors = findAnchors(editor.document);
    if (anchors.length === 0) {
      return [new MessageItem('No anchors in current file')];
    }

    return anchors.map(anchor => new AnchorItem(anchor));
  }
}

function getPrefix(): string {
  return vscode.workspace.getConfiguration('hashAnchor').get<string>('anchorPrefix', '//#anchor');
}

function findAnchors(document: vscode.TextDocument): Anchor[] {
  const prefix = getPrefix();
  const fileName = document.fileName.split(/[\\/]/).pop() ?? document.fileName;
  const anchors: Anchor[] = [];

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
    const line = document.lineAt(lineNumber);
    if (!line.text.startsWith(prefix)) {
      continue;
    }

    const name = line.text.slice(prefix.length).trim();
    anchors.push({
      label: name.length > 0 ? name : `(line ${lineNumber + 1})`,
      line: lineNumber,
      column: 0,
      fileName,
      uri: document.uri.toString()
    });
  }

  return anchors;
}

async function openAnchor(anchor: Anchor): Promise<void> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || activeEditor.document.uri.toString() !== anchor.uri) {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(anchor.uri));
    const editor = await vscode.window.showTextDocument(document);
    revealAnchor(editor, anchor);
    return;
  }

  revealAnchor(activeEditor, anchor);
}

async function showAnchorQuickPick(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('Hash Anchor: No active editor.');
    return;
  }

  const anchors = findAnchors(editor.document);
  if (anchors.length === 0) {
    vscode.window.showInformationMessage('Hash Anchor: No anchors in current file.');
    return;
  }

  const selected = await vscode.window.showQuickPick(
    anchors.map(anchor => ({
      label: anchor.label,
      description: `Line ${anchor.line + 1}`,
      detail: anchor.fileName,
      anchor
    })),
    {
      title: 'Hash Anchor',
      placeHolder: 'Select an anchor in the current file'
    }
  );

  if (selected) {
    await openAnchor(selected.anchor);
  }
}

function revealAnchor(editor: vscode.TextEditor, anchor: Anchor): void {
  const position = new vscode.Position(anchor.line, anchor.column);
  editor.selection = new vscode.Selection(position, position);
  editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
}

export function activate(context: vscode.ExtensionContext): void {
  const provider = new AnchorProvider();
  const treeView = vscode.window.createTreeView('hashAnchor.lister', { treeDataProvider: provider });
  anchorDecorationType = createAnchorDecorationType();
  updateAnchorDecorations();

  context.subscriptions.push(
    treeView,
    anchorDecorationType,
    vscode.commands.registerCommand('hashAnchor.openAnchor', openAnchor),
    vscode.languages.registerCompletionItemProvider(
      [{ scheme: 'file' }, { scheme: 'untitled' }],
      createAnchorCompletionProvider(),
      '#'
    ),
    vscode.commands.registerCommand('hashAnchor.refresh', () => {
      provider.refresh();
      updateAnchorDecorations();
    }),
    vscode.commands.registerCommand('hashAnchor.lister.keybind', async () => {
      provider.refresh();
      updateAnchorDecorations();
      await showAnchorQuickPick();
    }),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      provider.refresh();
      updateAnchorDecorations(editor);
    }),
    vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document === vscode.window.activeTextEditor?.document) {
        provider.refresh();
        updateAnchorDecorations();
      }
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('hashAnchor')) {
        anchorDecorationType?.dispose();
        anchorDecorationType = createAnchorDecorationType();
        provider.refresh();
        updateAnchorDecorations();
      }
    })
  );
}

export function deactivate(): void {
  clearAnchorDecorations(vscode.window.activeTextEditor);
  anchorDecorationType?.dispose();
}
