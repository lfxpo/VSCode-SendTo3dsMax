var exports = module.exports = {};

const MAX_TITLE = "Autodesk 3ds Max";
const LISTENER_CLS_NAME = "MXS_Scintilla";

// load koffi and user32
const koffi = require('koffi');
const lib = koffi.load('user32.dll');

// define types & aliases
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
koffi.alias('HWND', HANDLE);
koffi.alias('LPSTR', 'uint8_t*')
koffi.alias('LPARAM', 'long')
koffi.alias('WPARAM', 'uint')
koffi.alias('LRESULT', 'long')
koffi.alias('UINT', 'uint')

// Create functions & callbacks for window enumeration
const cEnumWindowsProc = koffi.proto('bool EnumWindowsProc (HWND hwnd, long lParam)');
const fEnumWindows = lib.func("__stdcall", "EnumWindows", 'bool', [koffi.pointer(cEnumWindowsProc), 'LPARAM'])
const cEnumChildWindowsProc = koffi.proto('bool EnumChildProc(HWND hwnd, LPARAM lParam)');
const fEnumChildWindows = lib.func("__stdcall", "EnumChildWindows", 'bool', ['HWND', koffi.pointer(cEnumChildWindowsProc), 'LPARAM'])

// Create other helper functions
const fGetClassNameA = lib.func("int __stdcall GetClassNameA(HWND hWnd, _Out_ LPSTR lpClassName, int nMaxCount)")
const fGetWindowTextA = lib.func("int __stdcall GetWindowTextA(HWND hWnd, _Out_ LPSTR lpString, int nMaxCount)")
const fSendMessageA = lib.func("LRESULT __stdcall SendMessageA(HWND hWnd, UINT Msg, WPARAM wParam, LPSTR lParam)")


// return a buffer from a string converted as Cstring
function makeLPARAM(string) {
    if (string !== null) {
        return Buffer.from(string, 'utf-8');
    }
    return null;
}

// magic numbers for message types
exports.WM_SETTEXT = 0x000C;
exports.WM_CHAR = 0x0102;
exports.VK_RETURN = 0x0D;

exports.get3dsMaxWindowHwnds = function () {
    const windowItems = []
    // build callback for enum func
    const windowProc = (hwnd, lParam) => {
        let buf = Buffer.allocUnsafe(255)
        const ret = fGetWindowTextA(hwnd, buf, buf.length)
        if (ret > 0) {
            const name = koffi.decode(buf, 'char', ret)
            if (name.includes(MAX_TITLE)) {
                // create a vscode pickable item for showQuickPick
                const item = {
                    label: name,
                    hwnd: hwnd,
                };
                windowItems.push(item);
            }
        }
        return true;
    }

    const success = fEnumWindows(windowProc, 0)
    if (success && windowItems.length > 0) {
        return windowItems;
    }

    return null;
}


exports.get3dsMaxListener = function (maxHwnd) {
    const listeners = []
    // build callback for enum func
    const enumChildProc = (hwnd, lParam) => {
        let buf = Buffer.allocUnsafe(255)
        const ret = fGetClassNameA(hwnd, buf, buf.length)
        if (ret > 0) {
            const childClassName = koffi.decode(buf, 'char', ret)
            if (childClassName.includes(LISTENER_CLS_NAME)) {
                listeners.push(hwnd);
            }
        }
        return true
    }

    // we are only interested in the first result
    //const success = user32.EnumChildWindows(maxHwnd, enumChildProc, null);
    const success = fEnumChildWindows(maxHwnd, enumChildProc, 0)
    if (success && listeners.length > 0) {
        return listeners[0];
    }

    return null;
}


exports.sendMessageA = function (hwnd, msg, wparam, lparam) {
    fSendMessageA(hwnd, msg, wparam, lparam)
}

exports.sendMessage = function (hwnd, msg, wparam, text) {
    fSendMessageA(hwnd, msg, wparam, makeLPARAM(text))
}