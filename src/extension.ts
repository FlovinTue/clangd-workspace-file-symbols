import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient';
import type { ClangdExtension } from '@clangd/vscode-clangd';

declare type ProvideWorkspaceSymbolFn = (this: void, query: string, token: vscodelc.CancellationToken, next: vscodelc.ProvideWorkspaceSymbolsSignature) => vscode.ProviderResult<vscode.SymbolInformation[]>;

let CachedOverrideFn: ProvideWorkspaceSymbolFn | undefined;
let ClangdTimedCheck: NodeJS.Timeout | undefined | null;
const CheckDelayMs = 1000;

function populateTimedClangdCheck() {
	if (ClangdTimedCheck) {
		return;
	}

	console.log("Looking for clangd extension..");
}

function clearTimedClangdCheck() {
	if (ClangdTimedCheck) {
		clearInterval(ClangdTimedCheck);
	}

	ClangdTimedCheck = null;
}

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

async function inject() {
	const clangdExtension = vscode.extensions.getExtension<ClangdExtension>("llvm-vs-code-extensions.vscode-clangd");

	if (clangdExtension) {
		let api = (await clangdExtension.activate()).getApi(1);

		//clearTimedClangdCheck();

		if (!api.languageClient) {
			return;
		}

		let workspaceSymbolMiddleware = api.languageClient.middleware.provideWorkspaceSymbols;

		if (workspaceSymbolMiddleware !== CachedOverrideFn || !CachedOverrideFn) {
			const addFilesToWorkspaceSymbolMiddleware: ProvideWorkspaceSymbolFn = async (query, token, next) => {
				let symbolPromise: vscode.ProviderResult<vscode.SymbolInformation[]> = workspaceSymbolMiddleware?.(query, token, next);

				if (!workspaceSymbolMiddleware) {
					symbolPromise = next(query, token);
				}

				const fileSymbols = await get_files_as_symbols();

				let symbols = await symbolPromise;

				return symbols?.concat(fileSymbols);
			};

			api.languageClient.middleware.provideWorkspaceSymbols = addFilesToWorkspaceSymbolMiddleware;
			CachedOverrideFn = addFilesToWorkspaceSymbolMiddleware;

			console.log("Wrapped clangd workspace symbol request middleware with file list injection");

			// Watch for server stop..
			api.languageClient.onDidChangeState(({ newState }) => {
				if (newState === vscodelc.State.Stopped) {
					//populateTimedClangdCheck();
				}
			});
		}
	}
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("test_inject", () => {
		inject();
	}));

	vscode.extensions.onDidChange(() => {
		vscode.window.showInformationMessage('extensions changed!');
	});
}

export function deactivate() { }

