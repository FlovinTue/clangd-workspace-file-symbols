import * as vscode from 'vscode';
import * as vscodelc from 'vscode-languageclient';
import type { ClangdApiV1, ClangdExtension } from '@clangd/vscode-clangd';

declare type ProvideWorkspaceSymbolFn = (this: void, query: string, token: vscodelc.CancellationToken, next: vscodelc.ProvideWorkspaceSymbolsSignature) => vscode.ProviderResult<vscode.SymbolInformation[]>;

const CheckForClangdDelayMs = 1500;
const ClangdExtensionName = "llvm-vs-code-extensions.vscode-clangd";

let CachedOverrideFn: ProvideWorkspaceSymbolFn | undefined;
let ClangdTimedCheck: NodeJS.Timeout | undefined | null;
let ClangApi: ClangdApiV1 | undefined | null;

function populateTimedClangdCheck() {
	if (ClangdTimedCheck) {
		return;
	}

	console.log("Waiting for clangd extension..");

	// Watch for clangd start...
	ClangdTimedCheck = setInterval(async () => {
		if (await try_wrap_workspace_symbol_middleware()) {
			clearTimedClangdCheck();
		}
	}, CheckForClangdDelayMs);
}

function clearTimedClangdCheck() {
	if (!ClangdTimedCheck) {
		return;
	}

	clearInterval(ClangdTimedCheck);
	ClangdTimedCheck = null;

	// Watch for server stop..
	if (ClangApi?.languageClient) {
		ClangApi.languageClient.onDidChangeState(({ newState }) => {
			if (newState === vscodelc.State.Stopped) {
				populateTimedClangdCheck();
			}
		});
	}
}

async function get_files_as_symbols() {
	const config = vscode.workspace.getConfiguration("clangdWorkspaceFileSymbols");
	const inclusionFilter = config.get<string>("inclusionFilter") ?? "";
	const exclusionFilter = config.get<string>("exclusionFilter") ?? "";

	const files = await vscode.workspace.findFiles(inclusionFilter, exclusionFilter);

	let symbols = new Array<vscode.SymbolInformation>;

	files.forEach(file => {
		const location = new vscode.Location(file, new vscode.Range(0, 0, 0, 0));
		const fileName = file.path.split("/").reverse()[0];
		let symbolInfo = new vscode.SymbolInformation(fileName, vscodelc.SymbolKind.File, "", location);
		symbols.push(symbolInfo);
	});

	return symbols;
}

async function try_wrap_workspace_symbol_middleware(): Promise<boolean> {
	const clangdExtension = vscode.extensions.getExtension<ClangdExtension>(ClangdExtensionName);

	if (!clangdExtension) {
		return false;
	}

	ClangApi = (await clangdExtension.activate()).getApi(1);

	if (!ClangApi.languageClient) {
		return false;
	}

	let workspaceSymbolMiddleware = ClangApi.languageClient.middleware.provideWorkspaceSymbols;

	if (workspaceSymbolMiddleware !== CachedOverrideFn || !CachedOverrideFn) {
		const addFilesToWorkspaceSymbolMiddleware: ProvideWorkspaceSymbolFn = async (query, token, next) => {
			let symbolPromise: vscode.ProviderResult<vscode.SymbolInformation[]> = workspaceSymbolMiddleware?.(query, token, next);

			if (!workspaceSymbolMiddleware) {
				symbolPromise = next(query, token);
			}

			const fileSymbols = await get_files_as_symbols();

			let symbols = (await symbolPromise) ?? new Array<vscode.SymbolInformation>;

			return symbols.concat(fileSymbols);
		};

		ClangApi.languageClient.middleware.provideWorkspaceSymbols = addFilesToWorkspaceSymbolMiddleware;
		CachedOverrideFn = addFilesToWorkspaceSymbolMiddleware;

		console.log("Wrapped clangd workspace symbol request middleware with file list injection");
	}

	return true;
}

export function activate(context: vscode.ExtensionContext) {
	populateTimedClangdCheck();
}

export function deactivate() {
	if (ClangdTimedCheck) {
		clearInterval(ClangdTimedCheck);
	}
}

