import * as vscode from 'vscode';

let isAutoSuggestEnabled = true;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let previousCursorPosition: vscode.Position | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('InstaIntellisense is now active');
    outputChannel = vscode.window.createOutputChannel("InstaIntellisense");
    outputChannel.show();

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "AutoSuggest: ON";
    statusBarItem.command = 'extension.toggleAutoSuggest';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Register the toggle command
    let toggleDisposable = vscode.commands.registerCommand('extension.toggleAutoSuggest', () => {
        isAutoSuggestEnabled = !isAutoSuggestEnabled;
        statusBarItem.text = `AutoSuggest: ${isAutoSuggestEnabled ? 'ON' : 'OFF'}`;
        vscode.window.showInformationMessage(`AutoSuggest is now ${isAutoSuggestEnabled ? 'enabled' : 'disabled'}`);
        outputChannel.appendLine(`AutoSuggest toggled: ${isAutoSuggestEnabled}`);
    });

    context.subscriptions.push(toggleDisposable);

    // Register the original command
    let suggestDisposable = vscode.commands.registerCommand('extension.acceptSelectedSuggestionAndTrigger', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        previousCursorPosition = editor.selection.active;

        await vscode.commands.executeCommand('acceptSelectedSuggestion');
        outputChannel.appendLine('acceptSelectedSuggestionAndTrigger executed');

        // Wait for a short time to ensure the cursor has moved if it's going to
        await new Promise(resolve => setTimeout(resolve, 50));

        const newCursorPosition = editor.selection.active;
        if (!newCursorPosition.isEqual(previousCursorPosition)) {
            outputChannel.appendLine('Cursor moved, triggering suggest');
            await vscode.commands.executeCommand('editor.action.triggerSuggest');
            outputChannel.appendLine('Suggest triggered');
        } else {
            outputChannel.appendLine('Cursor did not move, suggest not triggered');
        }
    });

    context.subscriptions.push(suggestDisposable);

    // Listen for text changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(handleTextChange)
    );
}

function handleTextChange(event: vscode.TextDocumentChangeEvent) {
    if (!isAutoSuggestEnabled) {
        outputChannel.appendLine('AutoSuggest is disabled, ignoring text change');
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document !== event.document) {
        return;
    }

    for (const change of event.contentChanges) {
        const triggerPairs = ['{}', '()', '[]', '<>'];
        const triggerChars = [':', '.', ',', ' '];

        if (triggerPairs.includes(change.text) || triggerChars.includes(change.text)) {
            outputChannel.appendLine(`Trigger detected: ${change.text}`);
            setTimeout(() => {
                vscode.commands.executeCommand('editor.action.triggerSuggest');
                outputChannel.appendLine('Suggest triggered');
            }, 100);
        }
    }
}

export function deactivate() {
    console.log('InstaIntellisense is now deactivated');
    outputChannel.appendLine('InstaIntellisense deactivated');
}