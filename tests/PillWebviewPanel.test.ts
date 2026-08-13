import { PillWebviewPanel } from "../src/extension/PillWebviewPanel";
import * as vscode from "vscode";

jest.mock("vscode", () => {
    const original = jest.requireActual("./vscode-mock");
    return {
        ...original,
        window: {
            ...original.window,
            createWebviewPanel: jest.fn().mockReturnValue({
                reveal: jest.fn(),
                onDidDispose: jest.fn(),
                onDidChangeViewState: jest.fn(),
                webview: {
                    postMessage: jest.fn(),
                    html: "",
                },
                dispose: jest.fn(),
            }),
        },
        ViewColumn: {
            Active: 1,
            Beside: 2,
        },
    };
});

describe("PillWebviewPanel", () => {
    beforeEach(() => {
        PillWebviewPanel.currentPanel = undefined;
        jest.clearAllMocks();
    });

    it("should create and show a webview panel", () => {
        const dummyData: any = {
            filePath: "/path/to/pipeline.yml",
            framework: "GitHub Actions",
            nodes: [
                { id: "job1", label: "Job 1", status: "success" },
                { id: "job2", label: "Job 2", status: "idle" }
            ],
            edges: [
                { id: "e1", source: "job1", target: "job2" }
            ],
            category: "cicd"
        };

        const mockUri: any = { fsPath: "/dummy/path" };

        PillWebviewPanel.createOrShow(mockUri, dummyData);
        expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
        expect(PillWebviewPanel.currentPanel).toBeDefined();

        // Update panel on subsequent createOrShow calls
        const spyUpdate = jest.spyOn(PillWebviewPanel.currentPanel!, "update");
        PillWebviewPanel.createOrShow(mockUri, dummyData);
        expect(spyUpdate).toHaveBeenCalledWith(dummyData);

        // Clean up
        PillWebviewPanel.currentPanel!.dispose();
        expect(PillWebviewPanel.currentPanel).toBeUndefined();
    });
});
