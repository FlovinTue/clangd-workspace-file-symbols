import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient';
import type { ClangdExtension } from '@clangd/vscode-clangd';

async function get_files_as_symbols() {
	const files = await vscode.workspace.findFiles("", `**/*.{idx,bin,vcxproj,filters,sln}`);
  
	let symbols = new Array<vscode.SymbolInformation>;
  
	files.forEach(file => {
	  const location = new vscode.Location(file, new vscode.Range(0, 0, 0, 0));
	  const fileName = file.path.split("/").reverse()[0];
	  let symbolInfo = new vscode.SymbolInformation(fileName, vscodelc.SymbolKind.File, "", location);
	  symbols.push(symbolInfo);
	});
  
	return symbols;
  }
  
  declare type ProvideWorkspaceSymbolFn = (this: void, query: string, token: vscodelc.CancellationToken, next: vscodelc.ProvideWorkspaceSymbolsSignature) => vscode.ProviderResult<vscode.SymbolInformation[]>;
  
  let CachedOverrideFn : ProvideWorkspaceSymbolFn | undefined;
  
  async function inject() {
	const clangdExtension = vscode.extensions.getExtension<ClangdExtension>("llvm-vs-code-extensions.vscode-clangd");
  
	if (clangdExtension) {
	  let api = (await clangdExtension.activate()).getApi(1);
  
	  // Extension may be disabled or have failed to initialize
	  if (!api.languageClient) {
		return;
	  }
  
	  let workspaceSymbolMiddleware = api.languageClient.middleware.provideWorkspaceSymbols;
  
	  const addFilesToWorkspaceSymbolMiddleware : ProvideWorkspaceSymbolFn = async (query, token, next) => {
		let symbolPromise: vscode.ProviderResult<vscode.SymbolInformation[]> = workspaceSymbolMiddleware?.(query, token, next);
  
		if (!workspaceSymbolMiddleware) {
		  symbolPromise = next(query, token);
		}
  
		const fileSymbols = await get_files_as_symbols();
  
		let symbols = await symbolPromise;
  
		return symbols?.concat(fileSymbols);
	  };
  
	  if (workspaceSymbolMiddleware !== CachedOverrideFn || !CachedOverrideFn){
		api.languageClient.middleware.provideWorkspaceSymbols = addFilesToWorkspaceSymbolMiddleware;
		CachedOverrideFn = addFilesToWorkspaceSymbolMiddleware;
  
		console.log("Wrapped workspace symbol request middleware with file list injection");
	  }
	}
  }
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "clangd-workspace-files-list" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('clangd-workspace-files-list.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ClangdWorkspaceFilesList!');
	});

	vscode.commands.registerCommand("test_inject", () =>{
		inject();
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
