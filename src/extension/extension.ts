import * as vscode from "vscode";
import { PipelineWebviewProvider } from "./WebviewProvider";

import { IPipeline } from "./pipelines/IPipeline";
import { ParserWithPatterns } from "./pipelines/IPipeline";
import { CICDPipeline } from "./pipelines/CICDPipeline";
import { DataProcessingPipeline } from "./pipelines/DataProcessingPipeline";
import { AIAgentPipeline } from "./pipelines/AIAgentPipeline";
import { RPAPipeline } from "./pipelines/RPAPipeline";
import { PipelinePatternType } from "../shared/types";
import { LOG_PREFIX } from "./constants";
import { PillBreadcrumbDecorator } from "./PillBreadcrumbDecorator";
import { PillPopupProvider } from "./PillPopupProvider";

type MatchedPipelineParser = {
    pipeline: IPipeline | Omit<IPipeline, "patterns">;
    parser: any;
};

type PillCacheEntry = {
    documentVersion: number;
    data: any;
};

export function activate(context: vscode.ExtensionContext) {
    console.log(`${LOG_PREFIX} 🚀 Extension is activating...`);

    const provider = new PipelineWebviewProvider(context.extensionUri);
    // Allow DataProcessingPipeline to omit "patterns" property
    const pipelines: (IPipeline | Omit<IPipeline, "patterns">)[] = [
        new CICDPipeline(),
        new DataProcessingPipeline(),
        new AIAgentPipeline(),
        new RPAPipeline(),
    ];

    const pillCache = new Map<string, PillCacheEntry>();
    let pillParseRequestId = 0;

    const getDocumentCacheKey = (document: vscode.TextDocument) => {
        return document.uri?.toString() || document.fileName;
    };

    const findMatchingPipelineParser = (fileName: string, content: string): MatchedPipelineParser | undefined => {
        for (const pipeline of pipelines) {
            const parser = pipeline.parsers.find((p: any) => p.canParse(fileName, content));
            if (parser) {
                return { pipeline, parser };
            }
        }

        return undefined;
    };

    const renderPillsFromCache = (editor: vscode.TextEditor, allowStale = false): boolean => {
        const cached = pillCache.get(getDocumentCacheKey(editor.document));
        if (!cached || (!allowStale && cached.documentVersion !== editor.document.version)) {
            return false;
        }

        PillBreadcrumbDecorator.updateDecorations(editor, cached.data);
        PillPopupProvider.updateStatusBarItem(cached.data);
        return true;
    };

    const updatePillsForEditor = async (editor: vscode.TextEditor, shouldParse: boolean) => {
        if (renderPillsFromCache(editor, !shouldParse)) {
            return;
        }

        if (!shouldParse) {
            return;
        }

        const document = editor.document;
        const fileName = document.fileName;
        const content = document.getText();
        const matched = findMatchingPipelineParser(fileName, content);

        if (!matched) {
            pillCache.delete(getDocumentCacheKey(document));
            PillBreadcrumbDecorator.clearDecorations(editor);
            PillPopupProvider.updateStatusBarItem(undefined);
            return;
        }

        const requestId = ++pillParseRequestId;
        const documentVersion = document.version;

        try {
            const data = await matched.parser.parse(content, fileName);
            if (
                requestId !== pillParseRequestId ||
                document.version !== documentVersion ||
                vscode.window.activeTextEditor?.document !== document
            ) {
                return;
            }

            const finalData = { ...data, category: matched.pipeline.type };
            pillCache.set(getDocumentCacheKey(document), {
                documentVersion,
                data: finalData,
            });
            PillBreadcrumbDecorator.updateDecorations(editor, finalData);
            PillPopupProvider.updateStatusBarItem(finalData);
        } catch {
            pillCache.delete(getDocumentCacheKey(document));
            PillBreadcrumbDecorator.clearDecorations(editor);
            PillPopupProvider.updateStatusBarItem(undefined);
        }
    };

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(PipelineWebviewProvider.viewType, provider)
    );
    console.log(`${LOG_PREFIX} ✅ Webview provider registered`);

    const watchFiles = (shouldParsePills: boolean) => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileName = activeEditor.document.fileName;
                const content = activeEditor.document.getText();
                const pipeline = pipelines.find(p => p.type === provider.pipelineType);
                if (pipeline) {
                    const parser = pipeline.parsers.find((p: any) => p.canParse(fileName, content));
                    if (parser) {
                        // Trigger discovery if the file can be parsed
                        discoverPipelines(provider, pipeline as any, fileName);
                    }
                }

                updatePillsForEditor(activeEditor, shouldParsePills);
            } else {
                PillBreadcrumbDecorator.clearDecorations();
                PillPopupProvider.updateStatusBarItem(undefined);
            }
        } catch (error) {
            console.error(`${LOG_PREFIX} ❌ Error in watchFiles:`, error);
        }
    };

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(() => watchFiles(true)),
        vscode.window.onDidChangeActiveTextEditor(() => watchFiles(true)),
        vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && event.textEditor.document === activeEditor.document) {
                updatePillsForEditor(event.textEditor, false);
            }
        })
    );

    const discover = (targetFile?: string) => {
        const pipeline = pipelines.find(p => p.type === provider.pipelineType);
        if (pipeline) {
            discoverPipelines(provider, pipeline as any, targetFile).catch(error => {
                console.error(`${LOG_PREFIX} ❌ Error during pipeline discovery:`, error);
                provider.setLoading(false);
            });
        }
    };

    context.subscriptions.push(
        vscode.commands.registerCommand("caldera.visualizePipeline", (filePath: string) => {
            discover(filePath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("caldera.selectCategory", (category: string) => {
            if (Object.values(PipelinePatternType).includes(category as PipelinePatternType)) {
                provider.pipelineType = category as PipelinePatternType;
                discover();
            } else {
                console.error(`${LOG_PREFIX} ❌ Invalid category received: ${category}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("caldera.jumpToNode", (nodeId: string, nodeLabel: string) => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) return;

            const text = activeEditor.document.getText();
            const lines = text.split("\n");
            const targetLabel = (nodeLabel || "").toLowerCase();
            const targetId = (nodeId || "").toLowerCase();

            let foundLine = -1;
            for (let i = 0; i < lines.length; i++) {
                const l = lines[i].toLowerCase();
                if (l.includes(targetLabel) || l.includes(targetId)) {
                    foundLine = i;
                    break;
                }
            }

            if (foundLine !== -1) {
                const position = new vscode.Position(foundLine, 0);
                activeEditor.selection = new vscode.Selection(position, position);
                activeEditor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand("caldera.showPipelinePillView", async () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                vscode.window.showErrorMessage("No active editor open.");
                return;
            }

            const fileName = activeEditor.document.fileName;
            const content = activeEditor.document.getText();

            // Find matching pipeline parser
            let matchedParser: any = null;
            let matchedPipeline: any = null;
            for (const pipeline of pipelines) {
                const parser = pipeline.parsers.find((p: any) => p.canParse(fileName, content));
                if (parser) {
                    matchedParser = parser;
                    matchedPipeline = pipeline;
                    break;
                }
            }

            if (!matchedParser) {
                vscode.window.showWarningMessage("The active file is not a supported pipeline configuration.");
                return;
            }

            try {
                const cached = pillCache.get(getDocumentCacheKey(activeEditor.document));
                const finalData = cached && cached.documentVersion === activeEditor.document.version
                    ? cached.data
                    : { ...(await matchedParser.parse(content, fileName)), category: matchedPipeline.type };

                pillCache.set(getDocumentCacheKey(activeEditor.document), {
                    documentVersion: activeEditor.document.version,
                    data: finalData,
                });
                PillBreadcrumbDecorator.updateDecorations(activeEditor, finalData);
                PillPopupProvider.updateStatusBarItem(finalData);
                await PillPopupProvider.showQuickPickPopup(finalData);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to parse pipeline file: ${error.message || error}`);
            }
        })
    );

    console.log(`${LOG_PREFIX} 🔍 Starting pipeline discovery...`);
    watchFiles(true);
    console.log(`${LOG_PREFIX} ✅ Extension activated successfully!`);
}

async function discoverPipelines(provider: PipelineWebviewProvider, pipeline: IPipeline, targetFile?: string) {
    provider.setLoading(true);
    console.log(`${LOG_PREFIX} 🔍 Discovering pipelines for category ${pipeline.type}. Target: ${targetFile || "All"}`);

    const parserFiles: { parser: ParserWithPatterns, files: vscode.Uri[] }[] = [];
    for (const parser of (pipeline.parsers as ParserWithPatterns[])) {
        const foundArrays = await Promise.all(
            parser.patterns.map(pattern => vscode.workspace.findFiles(pattern, "**/node_modules/**"))
        );
        const foundFiles = foundArrays.flat();
        parserFiles.push({ parser, files: foundFiles });
    }

    const allPipelineFiles: string[] = Array.from(new Set(parserFiles.flatMap(pf => pf.files.map(f => f.fsPath))));

    if (allPipelineFiles.length === 0) {
        console.log(`${LOG_PREFIX} ⚠️ No pipeline files found for category ${pipeline.type}.`);
        provider.updatePipeline({
            filePath: "",
            framework: "",
            nodes: [],
            edges: [],
            category: pipeline.type,
            tools: pipeline.parsers.map(p => p.name),
        }, []);
        provider.setLoading(false);
        return;
    }

    let fileToParseUri: vscode.Uri | undefined;
    if (targetFile && allPipelineFiles.includes(targetFile)) {
        fileToParseUri = vscode.Uri.file(targetFile);
    } else {
        fileToParseUri = parserFiles.find(pf => pf.files.length > 0)?.files[0];
    }

    if (!fileToParseUri) {
        provider.setLoading(false);
        return;
    }

    try {
        const document = await vscode.workspace.openTextDocument(fileToParseUri);
        const content = document.getText();
        const parser = parserFiles.find(pf => pf.files.some(f => f.fsPath === fileToParseUri!.fsPath))?.parser;

        if (parser) {
            console.log(`${LOG_PREFIX} ✅ Parsing ${fileToParseUri.fsPath} with ${parser.name}`);
            const data = await parser.parse(content, fileToParseUri.fsPath);
            provider.updatePipeline({ ...data, category: pipeline.type }, allPipelineFiles);
        } else {
            console.log(`${LOG_PREFIX} ❓ No suitable parser for ${fileToParseUri.fsPath}`);
        }
    } catch (error) {
        console.error(`${LOG_PREFIX} ❌ Error parsing ${fileToParseUri.fsPath}:`, error);
    } finally {
        provider.setLoading(false);
    }
}

export function deactivate() { }
