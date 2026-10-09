# Macro lab

**An interactive browser dashboard for the Solow and Ramsey growth models.**

Please visit: https://beredentod.github.io/macro-lab/

Explore how saving, growth, depreciation, preferences, and policy shape an economy's transition over time. Macro lab is a static website built with HTML, CSS, and JavaScript. It runs locally without a package install and can be hosted on GitHub Pages.

> An educational companion to PSE Macro I lecture material. It is not an official Paris School of Economics product.

## What you can explore

| Model | Main diagram | Experiments |
| --- | --- | --- |
| **Solow** | The law of motion for capital per effective worker, the 45-degree line, steady states, and the golden rule | Saving, depreciation, capital-share, technology-growth, and population-growth changes |
| **Ramsey** | The $(k_t,c_t)$ phase diagram, nullclines, steady state, and stable saddle path | CRRA utility, capital-income taxes, announced and surprise policy changes, and off-saddle initial consumption |

Both tabs include animated transition paths and time graphs. Ramsey adds a transversality-condition diagnostic, nearby unstable paths, and foldable graph and control sections. The Solow tab includes aggregate series and a golden-rule benchmark.

## Model notes

### Solow

Time is discrete. Production is Cobb–Douglas:

$$
Y_t=(\theta K_t)^\alpha(A_tN_t)^{1-\alpha},\qquad
k_t=\frac{K_t}{A_tN_t},\qquad y_t=(\theta k_t)^\alpha.
$$

Capital per effective worker follows

$$
k_{t+1}=\frac{(1-\delta)k_t+s y_t}{\gamma n}.
$$

Here, $\gamma=A_{t+1}/A_t$ and $n=N_{t+1}/N_t$ are **gross growth factors**. For example, $\gamma=1.02$ means 2% technology growth per period. The defaults set $A_0=N_0=1$ and $\theta=1$. The optional $\theta$ parameter is a capital-augmenting level.

At the shock date, capital, technology, and labor are predetermined. The new parameters affect production and factor prices immediately, while capital changes through accumulation. A change in $\gamma$ or $n$ changes subsequent growth, not the current level.

### Ramsey

The Ramsey tab uses CRRA utility, with logarithmic utility at $\sigma=1$, and a central-planner resource constraint. Its Cobb–Douglas production function and growth notation match the Solow tab. The main diagram displays consumption against capital, including the capital and consumption nullclines, steady state, and stable saddle path.

Capital-income tax experiments use the after-tax return in the Euler equation, with tax receipts returned as lump-sum transfers. With a positive tax, the resulting steady state is a taxed equilibrium rather than the undistorted planner optimum. Anticipated changes are announced at $t=0$; unanticipated changes take effect at the selected shock date. The transversality indicator diagnoses whether the selected path follows the stable saddle path or diverges from it.

## Project files

| File or folder | Purpose |
| --- | --- |
| `index.html`, `styles.css` | Page structure, equations, layout, and responsive styling |
| `model.js`, `solow-app.js` | Solow model logic, graphs, controls, and animation |
| `ramsey-model.js`, `ramsey-ui.js` | Ramsey equations, phase diagram, controls, and animation source |
| `ramsey-app.js` | Generated standalone Ramsey script used by the page |
| `build-ramsey.mjs` | Rebuilds `ramsey-app.js` after Ramsey source changes |
| `model.test.js`, `ramsey-model.test.js`, `qa/` | Economic and runtime checks |
| `server.mjs`, `start-local.*` | Local development server and launch scripts |
| `vendor/katex/` | Local LaTeX rendering library, fonts, and license |
| `.nojekyll` | Keeps GitHub Pages publishing the static files directly |

The `*-js.txt` files are optional text copies for convenience. They are not loaded by the dashboard.

## Run locally

**Requirements:** Node.js 18 or newer. No `npm install` is required.

1. Open a terminal in this project folder.
2. Start the local server:

   ```sh
   npm start
   ```

3. Visit <http://localhost:8001>. Keep the terminal open while using the dashboard. Stop the server with `Ctrl+C`.

You can also double-click `start-local.bat` on Windows, or run `sh start-local.sh` on macOS or Linux. Alternatively, Python can serve the folder with `python -m http.server 8001`. Use a local server rather than opening `index.html` directly, because browsers restrict JavaScript modules on `file://` URLs.

To use a different port, set `PORT` before starting the Node server. For example, on macOS or Linux:

```sh
PORT=8002 npm start
```

In PowerShell, use `$env:PORT=8002; npm start`.

## Develop and test

The checked-in browser scripts run as-is. When changing the Ramsey model source, rebuild the standalone browser script and run the tests:

```sh
npm run build
npm test
```

`npm run build` combines `ramsey-model.js` and `ramsey-ui.js` into `ramsey-app.js`. Commit the regenerated `ramsey-app.js` along with source changes so GitHub Pages serves the updated model. `npm test` runs the economic model tests and a local server/runtime integration check.

## Acknowledgments

The model notation and lecture-level treatment follow Tobias Broer's Macro I materials on the Solow and Ramsey models. KaTeX is distributed under the MIT license; see `vendor/katex/LICENSE`.
