import { PillBreadcrumbDecorator, createPillSvgDataUri } from "../src/extension/PillBreadcrumbDecorator";

const mockEditor = {
    setDecorations: jest.fn(),
    visibleRanges: [{ start: { line: 0 }, end: { line: 20 } }],
};

jest.mock("vscode", () => {
    const original = jest.requireActual("./vscode-mock");
    return {
        ...original,
        window: {
            ...original.window,
            createTextEditorDecorationType: jest.fn().mockReturnValue({
                dispose: jest.fn(),
            }),
        },
        MarkdownString: jest.fn().mockImplementation((str) => ({
            value: str,
            isTrusted: false,
        })),
        Range: jest.fn().mockImplementation((r1, c1, r2, c2) => ({ r1, c1, r2, c2 })),
        Uri: {
            parse: jest.fn().mockImplementation((str) => ({ fsPath: str })),
        },
    };
});

describe("PillBreadcrumbDecorator", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should generate valid pink SVG data URI for pill badge", () => {
        const uri = createPillSvgDataUri(1, "Requirements", false);
        expect(uri).toContain("data:image/svg+xml;utf8,");
        expect(uri).toContain("%23f20d63"); // Pink color (#f20d63) URL encoded
        expect(uri).toContain("Requirements");
    });

    it("should update decorations on editor for pipeline nodes", () => {
        const dummyData: any = {
            filePath: "/path/to/pipeline.yml",
            framework: "GitHub Actions",
            nodes: [
                { id: "job1", label: "Requirements", status: "success" },
                { id: "job2", label: "Build", status: "idle" }
            ],
            edges: [
                { id: "e1", source: "job1", target: "job2" }
            ],
            category: "cicd"
        };

        PillBreadcrumbDecorator.updateDecorations(mockEditor as any, dummyData);
        expect(mockEditor.setDecorations).toHaveBeenCalledTimes(2);
    });

    it("should clear decorations when clearDecorations is called", () => {
        PillBreadcrumbDecorator.clearDecorations(mockEditor as any);
        expect(mockEditor.setDecorations).toHaveBeenCalled();
    });
});
