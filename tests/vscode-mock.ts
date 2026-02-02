
export const workspace = {
    getWorkspaceFolder: jest.fn(),
    workspaceFolders: [],
};

export const window = {
    showWarningMessage: jest.fn(),
    showErrorMessage: jest.fn(),
};

export const Uri = {
    file: (path: string) => ({ fsPath: path, scheme: 'file' }),
    parse: (path: string) => ({ fsPath: path, scheme: 'file' }),
};

export enum ExtensionMode {
    Production = 1,
    Development = 2,
    Test = 3,
}
