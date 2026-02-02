![Logo]()

# Caldera: Pipeline Visualizer 🌋

Like the center of an **active volcano**, Caldera centralizes complex flows in an intuitive graphical interface by transforming your static configuration files into clear, interactive visualizations directly within VS Code. Monitor and design all your pipelines and complex flows without leaving your favorite editor.

## **Demo**

![App Screenshot]()

## **✨ Current Features**

*   **📌 Automatic Layout**: Interactive webview with draggable and zoomable pipeline graphs.
*   **⚡ Instant Visualization**: Opens automatically when you view a supported pipeline file.
*   **🔄 Hot-Reload**: The graph updates in real-time as you modify your configuration files.
*   **🔀 Multiple Orientations**: Toggle between top-to-bottom (TB) and left-to-right (LR) layouts.
*   **✅ Node Status Indicators**: Visual indicators for success, failure, and running states.
*   **🗺️ Mini-map**: Overview of the entire pipeline for easier navigation.
*   **📝 Annotations & Selection**: Create visual annotations to highlight patterns and group related nodes.
*   **📷 Image Export**: Export your pipeline visualizations as PNG images.
*   **🔍 Auto-Detection**: Automatically detects supported pipeline files across your workspace.

## **🛠️ Supported Frameworks**

### CI/CD

| Name | Pattern | Category |
|------|--------|----------------------|
| **GitHub Actions** | https://www.github.com |`.github/workflows/*.yml`, `.github/workflows/*.yaml` |
| **GitLab CI** | https://about.gitlab.com |`.gitlab-ci.yml`, `.gitlab-ci.yaml`, `*.gitlab-ci.yml`, `*.gitlab-ci.yaml`, `.gitlab/ci/*.yml`, `.gitlab/ci/*.yaml`


### Data Processing

| Name | URL | Pattern
|------|--------|----------------------|
| **Apache Airflow** | https://www.airflow.apache.org | `dags/*.py`
| **Kedro** | https://www.kedro.org | `src/**/pipeline.py`, `src/**/pipelines/**/pipeline.py`
| **DVC** |  https://www.dvc.org | `dvc.yaml`, `dvc.yml`

### AI Agent

| Name | URL | Pattern |
|------|--------|----------------------|
| **LangChain/Langgraph** | https://www.langchain.com| `chain.py` |


### Automation

| Name | URL | Pattern
|------|--------|----------------------|
| **UiPath** | https://www.uipath.com |`*.xaml` |

## **🎨 Theme & Colors**

Caldera's visual identity is designed to be both modern and functional, ensuring optimal readability and visual appeal during extended development sessions. The color palette is carefully chosen to provide clear contrast and intuitive status recognition. 

> [!INFO]
> Currently, the extension theme is based on the Lucid Volcano theme.

| Color | Hex Code | Usage |
|-------|----------|-------|
| **Primary Blue** | `#2563eb` | Main interface elements, active states, and primary actions |
| **Success Green** | `#10b981` | Node success states and positive feedback indicators |
| **Error Red** | `#ef4444` | Error states, failed nodes, and critical warnings |
| **Warning Orange** | `#f59e0b` | Warning states and pending operations |
| **Background Gray** | `#f8fafc` | Main background for the visualization canvas |
| **Canvas Dark** | `#1e293b` | Dark mode background for enhanced focus |
| **Node Border** | `#cbd5e1` | Node border outlines in light mode |
| **Text Primary** | `#0f172a` | Main text content and labels |
| **Text Secondary** | `#64748b` | Secondary information and muted text |

These colors are used consistently throughout the extension to maintain visual coherence and provide intuitive status feedback during pipeline monitoring.

## **🏗️ Architecture**

*   **Modular Parser System**: Designed with a modular parser system to easily add support for new tools. All parsers implement the `IParser` interface for consistent integration.
*   **Pipeline Categories**: Organized by type (CI/CD, Data Processing, AI Agent, RPA) with dedicated pipeline classes.
*   **Extension Host**: Handles file watching (`vscode.workspace.onDidSaveTextDocument`) and auto-discovery.
*   **Webview**: React application using `React Flow` for rendering and `dagre` for graph layout logic.
*   **State Management**: Caches pipeline data to ensure the visualization is always ready, even if the webview is closed and reopened.
*   **Shared Types**: Common types and interfaces in the `shared` directory for consistent communication between extension and webview.

## **👨‍💻 Development Setup**

If you want to contribute or build the project locally:

1.  **Install dependencies**:
    This is a necessity to install all the project dependencies.

    ```bash
    npm install
    ```

2.  **Compile Extension**:

    This is a necessity to compile the Backend code.

    ```bash
    npm run compile
    ```

3.  **Build Webview**:
    
    This is a necessity to build the Webview UI (Vite - Frontend).
    
    ```bash
    npm run build-webview
    ```

4.  **Run the Extension**:

    Press `F5` in VS Code to launch the **Extension Development Host**.   
