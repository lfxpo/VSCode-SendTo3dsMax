// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as winapi from './winapi';
import { extname } from 'path';

const extensionName = "Send to 3dsMax";
const maxTitle = "Autodesk 3ds Max";
const listenerClassName = "MXS_Scintilla";
const notSupported = "File type not supported, must be of: *.ms, *.mcr, *.mse, *.mzp,*.py";

enum FileType {
	maxscript,
	python,
	unsupported,
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let maxWindow: winapi.Window | undefined = undefined;

	function getFileType(file:string): FileType {
		const ext = extname(file);
		if ([".ms", ".mcr", ".mse", ".mzp"].includes(ext)) {
			return FileType.maxscript;
		}
		if (ext === ".py") {
			return FileType.python;
		}
		return FileType.unsupported;
	}

	async function get3dsmaxWindow(): Promise<winapi.Window | null> {
		const windows = winapi.getWindowsByTitle(maxTitle);
		if (windows === null) {
			vscode.window.showInformationMessage(`${extensionName}: No instance found`);
			return null;
		}

		if (windows.length > 1){
			const pickedWindow = await vscode.window.showQuickPick(windows, { placeHolder: 'Select a 3dsMax instance' });
			if (pickedWindow === undefined) {
				vscode.window.showInformationMessage(`${extensionName}: No instance selected`);
				return null;
			}

			vscode.window.showInformationMessage(`${extensionName}: selected "${pickedWindow.label}"`);
			return pickedWindow;
		}

		return windows[0];
	}

	async function send(cmd: string) {
		// make sure that we have a 3ds max instance
		if (maxWindow === undefined) {
			const window = await get3dsmaxWindow();
			if (window === null) {
				return;
			}

			maxWindow = window;
		}

		try {
			const listener = maxWindow.findChild(listenerClassName);

			// the 3dsmax instance may have been close. Try again and refetch maxWindow
			if (listener === null) {
				throw new Error();
			}

			listener.sendMessage(winapi.WM_SETTEXT, 0, cmd);
			listener.sendMessage(winapi.WM_CHAR, winapi.VK_RETURN, null);
		}
		catch(e) {
			maxWindow = undefined;
			await send(cmd);
			return;
		}
	}

	let selectInstanceCommand = vscode.commands.registerCommand('send-to-3dsmax.select', async () => {
		const window = await get3dsmaxWindow();
		if (window !== null) {
			maxWindow = window;
		}
	});

	let sendCommand = vscode.commands.registerCommand('send-to-3dsmax.send', async () => {
		if(vscode.window.activeTextEditor!== undefined)
		{
			let doc = vscode.window.activeTextEditor.document;
			if(doc.isUntitled)
			{
				const currentText = doc.getText();
				const languageId = doc.languageId;
				vscode.window.showInformationMessage(`${languageId}: ${currentText}`);
			}
			else
			{
				const filetype = getFileType(doc.fileName);
				let cmd: string;
				switch (filetype) {
					case FileType.maxscript:
						cmd = `fileIn @"${doc.fileName}"\r\n`;
						break;
					case FileType.python:
						cmd = `python.executeFile @"${doc.fileName}"\r\n`;
						break;
					case FileType.unsupported:
					default:
						vscode.window.showInformationMessage(`${extensionName}: ${notSupported}`);
						return;
				  }
				await send(cmd);
			}
		}
	});

	context.subscriptions.push(sendCommand);
	context.subscriptions.push(selectInstanceCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {}
