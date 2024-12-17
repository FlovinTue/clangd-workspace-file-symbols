// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


function paste_dump(){
	if (apiInstance.client){
		if (apiInstance.client.middleware){
		  let existingFunctor = apiInstance.client.middleware.provideWorkspaceSymbols
	
		  apiInstance.client.middleware.provideWorkspaceSymbols = async (query, token, next) => {
			let symbols = await existingFunctor?.(query, token, next);
	
			if (symbols){
			  let files = await vscode.workspace.findFiles("",`**/*.{idx,bin,vcxproj,filters,sln}`);
			  
			  files.forEach( file =>{
				let location =  new vscode.Location(file, new vscode.Range(0, 0, 0, 0));
				let fileName = file.path.split("/").reverse()[0];
				let symbolInfo = new vscode.SymbolInformation(fileName, vscodelc.SymbolKind.File, "", location);
				symbols.push(symbolInfo);
			  });
			}
	
			return symbols;
		  };
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

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
