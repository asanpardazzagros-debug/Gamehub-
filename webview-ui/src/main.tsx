import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from "./App.tsx";

import { Provider } from "react-redux";
import { store } from "./store/store.ts";
import SecondApp from "./SecondApp.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      {/* <App /> */}
      <SecondApp />
    </Provider>
  </StrictMode>
);
