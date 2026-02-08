import { createRoot } from 'react-dom/client';
import { act } from 'react';

/**
 * A simple implementation of renderHook for testing React hooks
 * without external testing libraries.
 */
export async function renderHookManual<T>(hookFn: () => T) {
    let result: { current: T } = { current: null as any };

    function TestComponent() {
        result.current = hookFn();
        return null;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
        root.render(<TestComponent />);
    });

    return {
        result,
        unmount: () => {
            act(() => {
                root.unmount();
                document.body.removeChild(container);
            });
        }
    };
}
