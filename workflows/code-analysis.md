# Code Analysis Workflow

Analyze the project's top-level architecture before generating a diagram. Focus on the 2-3 main architectural layers and key boundaries — don't enumerate every file.

Look for:
- **Entry points**: `package.json` scripts, `main`/`module` fields, `index.ts`/`index.js`
- **Configuration**: `vite.config.ts`, `next.config.js`, `tsconfig.json`, `webpack.config.js`
- **Routing**: file-based routes, router definitions, API endpoints
- **Key dependencies**: frameworks, databases, messaging, external services
- **Module boundaries**: `src/` subdirectories, packages in monorepos, import patterns
- **Data flow**: API calls, state management, event systems

Once you have a clear picture of the architecture, proceed to **Write the JSON File** (back in the shared steps).
