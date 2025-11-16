import { importShared } from './__federation_fn_import-CdDicdX8.js';
import { b as ReactDOM, j as jsxRuntimeExports, R as Recoil_index_5, A as AuthProvider, a as App } from './AuthProvider-Dv93Vk_I.js';

const React = await importShared('react');
const {StrictMode} = React;
const {MemoryRouter} = await importShared('react-router-dom');

let root = null;
function mount(container, props) {
  const initialPath = props?.basePath || "/";
  if (!root) {
    root = ReactDOM.createRoot(container);
  }
  root.render(
    /* @__PURE__ */ jsxRuntimeExports.jsx(StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(Recoil_index_5, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(AuthProvider, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(MemoryRouter, { initialEntries: [initialPath], children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) }) }) }) })
  );
}
function unmount() {
  if (root) {
    root.unmount();
    root = null;
  }
}

export { mount, unmount };
