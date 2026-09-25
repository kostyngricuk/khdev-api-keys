import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import base from "./base.js";

export default [
  ...base,
  {
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
