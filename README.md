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

Both model pages include animated transition paths and time graphs. Ramsey adds a transversality-condition diagnostic, nearby unstable paths, and foldable graph and control sections. The Solow tab includes aggregate series and a golden-rule benchmark.

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

## Separate model pages

The model links in the header retain the dashboard's original appearance, but open independent pages:

- [Solow](https://beredentod.github.io/macro-lab/solow/)
- [Ramsey](https://beredentod.github.io/macro-lab/ramsey/)

The original `/macro-lab/` address redirects to Solow. Each page loads only its own model, controls, graphs, and animation loop. Both pages share the stylesheet, KaTeX, and a small session-state helper. No backend or build step is required.

When you leave a model, playback pauses and its parameters, current period, speed, and panel settings are saved in this browser tab's session storage. Returning to the model restores those settings with playback paused. Ramsey also remembers expanded sections. State is scoped to the site's path and the model; closing the browser tab ends the session. If browser storage is unavailable, the pages still work with default settings on return. This also works with browser Back and Forward.

## Project files

| File or folder | Purpose |
| --- | --- |
| `index.html` | Redirects the original home address to `solow/` |
| `solow/index.html` | Solow dashboard, navigation, and model notes |
| `ramsey/index.html` | Ramsey dashboard, navigation, and model notes |
| `styles.css` | Shared layout and responsive styling |
| `solow-model.js`, `solow-app.js` | Solow equations, graphs, controls, and animation |
| `ramsey-model.js`, `ramsey-ui.js` | Ramsey equations, graphs, controls, and animation |
| `ramsey-app.js` | Small module entry point that loads the Ramsey UI |
| `session-state.js` | Saves and restores model settings when navigating between pages |
| `solow-model.test.js`, `ramsey-model-test.js` | Economic model tests |
| `server.mjs`, `start-local.bat` | Local development server and Windows launcher |
| `vendor/katex/` | Local LaTeX rendering library, fonts, and license |
| `.nojekyll` | Keeps GitHub Pages publishing the static files directly |

## Run locally

**Requirements:** Node.js 18 or newer. No `npm install` is required.

1. Open a terminal in this project folder.
2. Start the local server:

   ```sh
   npm start
   ```

3. Visit <http://localhost:8001>. Keep the terminal open while using the dashboard. Stop the server with `Ctrl+C`.

You can also double-click `start-local.bat` on Windows. The launcher works without modification. Alternatively, Python can serve the folder with `python -m http.server 8001`. Use a local server rather than opening `index.html` directly, because browsers restrict JavaScript modules on `file://` URLs.

To use a different port, set `PORT` before starting the Node server. For example, on macOS or Linux:

```sh
PORT=8002 npm start
```

In PowerShell, use `$env:PORT=8002; npm start`.

## Develop and test

The browser loads the checked-in source files directly. Edit `model.js` or `solow-app.js` for Solow; edit `ramsey-model.js` or `ramsey-ui.js` for Ramsey. There is no generated Ramsey bundle to rebuild.

```sh
npm test
```

The tests cover both economic models. The saving-shock test uses an explicit initial saving rate so its assumptions do not depend on the dashboard's default.

To add another model:

1. Create a directory such as `olg/` containing its own `index.html`.
2. Reuse the existing header and shared styles, with asset paths starting with `../`.
3. Load only the new model's entry script on that page.
4. Add the model link to each page's header, marking the current page with `active` and `aria-current="page"`.
5. Add its page and scripts to the local server's `allowed` map and its directory redirect list. GitHub Pages discovers the new directory automatically.
6. If the model should remember settings, use `connectSessionState` with a unique model name.

Publish by committing the changed files and new model directories to the existing GitHub Pages source branch. Keep all unchanged root files and `vendor/` in place. Real directory pages make direct visits and refreshes work without a single-page routing fallback.

## Acknowledgments

The model notation and lecture-level treatment follow Tobias Broer's Macro I materials on the Solow and Ramsey models. KaTeX is distributed under the MIT license; see `vendor/katex/LICENSE`.
