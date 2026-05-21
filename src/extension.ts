import * as vscode from 'vscode';

//#anchor DEF
//#region DEF

type Anchor = {
  label: string;
  line: number;
  column: number;
  fileName: string;
  uri: string;
};

type HashAnchorMode = 'language' | 'pattern' | 'auto';

let anchorDecorationType: vscode.TextEditorDecorationType | undefined;

const DEFAULT_LANGUAGE_PATTERNS: Record<string, string> = {
  javascript: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  typescript: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  javascriptreact: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  typescriptreact: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  java: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  c: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  cpp: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  csharp: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  rust: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  go: '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',

  python: '^\\s*#\\s*anchor\\s*(.*?)\\s*$',
  shellscript: '^\\s*#\\s*anchor\\s*(.*?)\\s*$',
  ruby: '^\\s*#\\s*anchor\\s*(.*?)\\s*$',
  yaml: '^\\s*#\\s*anchor\\s*(.*?)\\s*$',

  html: '^\\s*<!--\\s*#anchor\\s*(.*?)\\s*-->\\s*$',
  xml: '^\\s*<!--\\s*#anchor\\s*(.*?)\\s*-->\\s*$',
  markdown: '^\\s*<!--\\s*#anchor\\s*(.*?)\\s*-->\\s*$',

  css: '^\\s*/\\*\\s*#anchor\\s*(.*?)\\s*\\*/\\s*$',
  scss: '^\\s*/\\*\\s*#anchor\\s*(.*?)\\s*\\*/\\s*$',
  less: '^\\s*/\\*\\s*#anchor\\s*(.*?)\\s*\\*/\\s*$',

  lua: '^\\s*--\\s*#anchor\\s*(.*?)\\s*$',
  sql: '^\\s*--\\s*#anchor\\s*(.*?)\\s*$',

  ini: '^\\s*;\\s*#anchor\\s*(.*?)\\s*$'
};

const DEFAULT_LANGUAGE_SNIPPETS: Record<string, string> = {
  javascript: '//#anchor ${1:}',
  typescript: '//#anchor ${1:}',
  javascriptreact: '//#anchor ${1:}',
  typescriptreact: '//#anchor ${1:}',
  java: '//#anchor ${1:}',
  c: '//#anchor ${1:}',
  cpp: '//#anchor ${1:}',
  csharp: '//#anchor ${1:}',
  rust: '//#anchor ${1:}',
  go: '//#anchor ${1:}',

  python: '#anchor ${1:}',
  shellscript: '#anchor ${1:}',
  ruby: '#anchor ${1:}',
  yaml: '#anchor ${1:}',

  html: '<!-- #anchor ${1:} -->',
  xml: '<!-- #anchor ${1:} -->',
  markdown: '<!-- #anchor ${1:} -->',

  css: '/* #anchor ${1:} */',
  scss: '/* #anchor ${1:} */',
  less: '/* #anchor ${1:} */',

  lua: '--#anchor ${1:}',
  sql: '--#anchor ${1:}',

  ini: ';#anchor ${1:}'
};

const DEFAULT_PATTERNS: string[] = [
  '^\\s*//\\s*#anchor\\s*(.*?)\\s*$',
  '^\\s*#\\s*anchor\\s*(.*?)\\s*$',
  '^\\s*--\\s*#anchor\\s*(.*?)\\s*$',
  '^\\s*;\\s*#anchor\\s*(.*?)\\s*$',
  '^\\s*<!--\\s*#anchor\\s*(.*?)\\s*-->\\s*$',
  '^\\s*/\\*\\s*#anchor\\s*(.*?)\\s*\\*/\\s*$'
];

//#endregion

function createAnchorDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    after: {
      margin: '0 0 0 2rem',
      color: 'rgba(127, 127, 127, 0.35)',
      fontWeight: '700',
      fontStyle: 'normal',
      // textDecoration: 'none; font-size: 1.4em'
      textDecoration: 'none; letter-spacing: 0.04em;'
    }
  });
}

function getConfiguration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('hashAnchor');
}

function getMode(): HashAnchorMode {
  const value = getConfiguration().get<string>('mode', 'auto');
  if (value === 'language' || value === 'pattern' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function getDecorationEnabled(): boolean {
  return getConfiguration().get<boolean>('largeLabel.enabled', true);
}

function getDecorationPrefix(): string {
  return getConfiguration().get<string>('largeLabel.prefix', '  # ');
}

function getConfiguredRecord(section: string, fallback: Record<string, string>): Record<string, string> {
  const value = getConfiguration().get<Record<string, unknown>>(section, fallback);
  const result: Record<string, string> = { ...fallback };

  if (!value || typeof value !== 'object') {
    return result;
  }

  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') {
      result[key] = item;
    }
  }

  return result;
}

function getConfiguredPatterns(): string[] {
  const value = getConfiguration().get<unknown[]>('patterns', DEFAULT_PATTERNS);
  if (!Array.isArray(value)) {
    return DEFAULT_PATTERNS;
  }

  const patterns = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return patterns.length > 0 ? patterns : DEFAULT_PATTERNS;
}

function isPatternPrefixLimitEnabled(): boolean {
  return getConfiguration().get<boolean>('pattern.limitPrefixLength.enabled', true);
}

function getPatternMaxPrefixLength(): number {
  const value = getConfiguration().get<number>('pattern.maxPrefixLength', 4);

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 4;
  }

  return Math.min(16, Math.max(1, Math.floor(value)));
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

function cleanAnchorLabel(label: string): string {
  return label
    .replace(/\s*-->\s*$/, '')
    .replace(/\s*\*\/\s*$/, '')
    .trim();
}

function normalizeAnchorLabel(label: string | undefined, lineNumber: number): string {
  const cleaned = cleanAnchorLabel(label ?? '');
  return cleaned.length > 0 ? cleaned : `(line ${lineNumber + 1})`;
}

function matchPattern(lineText: string, pattern: string): string | undefined {
  try {
    const regex = new RegExp(pattern);
    const match = lineText.match(regex);

    if (!match) {
      return undefined;
    }

    return cleanAnchorLabel(match[1] ?? '');
  } catch {
    return undefined;
  }
}

function parseBareAnchor(lineText: string): string | undefined {
  const match = lineText.match(/^\s*#anchor\s*(.*?)\s*$/);
  if (!match) {
    return undefined;
  }

  return cleanAnchorLabel(match[1] ?? '');
}

function parseByLanguage(lineText: string, languageId: string): string | undefined {
  const languagePatterns = getConfiguredRecord('languagePatterns', DEFAULT_LANGUAGE_PATTERNS);
  const pattern = languagePatterns[languageId];

  if (!pattern) {
    return undefined;
  }

  return matchPattern(lineText, pattern);
}

function parseByConfiguredPatterns(lineText: string): string | undefined {
  for (const pattern of getConfiguredPatterns()) {
    const label = matchPattern(lineText, pattern);
    if (label !== undefined) {
      return label;
    }
  }

  return undefined;
}

function parseByShortPrefixPattern(lineText: string): string | undefined {
  const trimmedStart = lineText.trimStart();
  const match = trimmedStart.match(/^(.*?)#anchor\s*(.*?)\s*$/);

  if (!match) {
    return undefined;
  }

  const beforeAnchor = match[1].trim();
  const rawLabel = match[2] ?? '';

  if (beforeAnchor.length === 0) {
    return cleanAnchorLabel(rawLabel);
  }

  if (!/^[^\w\s]+$/.test(beforeAnchor)) {
    return undefined;
  }

  if (isPatternPrefixLimitEnabled() && beforeAnchor.length > getPatternMaxPrefixLength()) {
    return undefined;
  }

  return cleanAnchorLabel(rawLabel);
}

function parseAnchorLine(lineText: string, languageId: string): string | undefined {
  const mode = getMode();

  if (mode === 'language') {
    return parseByLanguage(lineText, languageId) ?? parseBareAnchor(lineText);
  }

  if (mode === 'pattern') {
    return parseByConfiguredPatterns(lineText) ?? parseByShortPrefixPattern(lineText) ?? parseBareAnchor(lineText);
  }

  return (
    parseByLanguage(lineText, languageId) ??
    parseByConfiguredPatterns(lineText) ??
    parseByShortPrefixPattern(lineText) ??
    parseBareAnchor(lineText)
  );
}

function getAnchorSnippet(document: vscode.TextDocument): string {
  const mode = getMode();
  const languageSnippets = getConfiguredRecord('languageSnippets', DEFAULT_LANGUAGE_SNIPPETS);

  if (mode === 'pattern') {
    return '#anchor ${1:}';
  }

  return languageSnippets[document.languageId] ?? '#anchor ${1:}';
}

function adaptSnippetToCurrentLine(snippet: string, linePrefix: string, hashIndex: number): string {
  const snippetHashIndex = snippet.indexOf('#');

  if (snippetHashIndex <= 0) {
    return snippet;
  }

  const snippetPrefixBeforeHash = snippet.slice(0, snippetHashIndex);
  const actualPrefixBeforeHash = linePrefix.slice(0, hashIndex);

  if (actualPrefixBeforeHash.endsWith(snippetPrefixBeforeHash)) {
    return snippet.slice(snippetHashIndex);
  }

  return snippet;
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

      if (!'#anchor'.startsWith(typed)) {
        return undefined;
      }

      const snippet = adaptSnippetToCurrentLine(getAnchorSnippet(document), linePrefix, hashIndex);

      const item = new vscode.CompletionItem('#anchor', vscode.CompletionItemKind.Snippet);

      item.detail = 'Hash Anchor';
      item.documentation = new vscode.MarkdownString('Insert a Hash Anchor marker for the current file anchor list.');
      item.range = new vscode.Range(position.line, hashIndex, position.line, position.character);
      item.insertText = new vscode.SnippetString(snippet);
      item.sortText = '0000_hash_anchor';
      item.filterText = '#anchor';

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

//#anchor Finder

function findAnchors(document: vscode.TextDocument): Anchor[] {
  const fileName = document.fileName.split(/[\\/]/).pop() ?? document.fileName;
  const anchors: Anchor[] = [];

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber += 1) {
    const line = document.lineAt(lineNumber);
    const label = parseAnchorLine(line.text, document.languageId);

    if (label === undefined) {
      continue;
    }

    anchors.push({
      label: normalizeAnchorLabel(label, lineNumber),
      line: lineNumber,
      column: line.firstNonWhitespaceCharacterIndex,
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
