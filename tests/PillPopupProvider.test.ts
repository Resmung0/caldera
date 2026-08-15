import { PillPopupProvider } from "../src/extension/PillPopupProvider";
import * as vscode from "vscode";

jest.mock("vscode", () => {
    const original = jest.requireActual("./vscode-mock");
    return {
        ...original,
        window: {
            ...original.window,
            createStatusBarItem: jest.fn().mockReturnValue({
                text: "",
                tooltip: "",
                command: "",
                show: jest.fn(),
                hide: jest.fn(),
            }),
            createQuickPick: jest.fn().mockReturnValue({
                title: "",
                placeholder: "",
                items: [],
                onDidAccept: jest.fn(),
                onDidHide: jest.fn(),
                show: jest.fn(),
                hide: jest.fn(),
                dispose: jest.fn(),
            }),
            activeTextEditor: undefined,
        },
        StatusBarAlignment: {
            Right: 2,
        },
    };
});

describe("PillPopupProvider", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should update status bar item with pipeline data", () => {
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

        PillPopupProvider.updateStatusBarItem(dummyData);
        expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
    });

    it("should show QuickPick popup with pipeline items", async () => {
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

        await PillPopupProvider.showQuickPickPopup(dummyData);
        expect(vscode.window.createQuickPick).toHaveBeenCalled();
    });
});
