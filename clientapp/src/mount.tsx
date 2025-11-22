import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthProvider';
import { RecoilRoot } from 'recoil';
import { MemoryRouter } from 'react-router-dom';

let root: ReactDOM.Root | null = null;

export function mount(container: HTMLElement, props?: { basePath?: string; user?: unknown }) {
  const initialPath = props?.basePath || '/';

  if (!root) {
    root = ReactDOM.createRoot(container);
  }

  root.render(
    <StrictMode>
      <RecoilRoot>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <App />
          </MemoryRouter>
        </AuthProvider>
      </RecoilRoot>
    </StrictMode>
  );
}

export function unmount() {
  if (root) {
    root.unmount();
    root = null;
  }
}

// Standalone dev mode when running this app directly
if (import.meta.env.DEV && document.getElementById('root')) {
  mount(document.getElementById('root')!);
}
