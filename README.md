# Macro lab

A self-contained, interactive Solow dashboard for PSE Macro I. Static HTML, CSS and JavaScript, with locally bundled KaTeX. No package installation, build step, API key, or internet connection is needed after downloading.

## Run locally

1. Extract the ZIP. Open the `macro-lab` folder.
2. With Node.js 18 or later installed, double-click **start-local.bat** on Windows. On macOS/Linux, run `sh start-local.sh`.
3. Alternatively, open a terminal in that folder and run:

   ```sh
   npm start
   ```

4. Open **http://localhost:8001**. Keep the terminal open. Stop with Ctrl+C.

Python alternative: `python -m http.server 8001`, then open the same address. Open through a local server, not by double-clicking index.html: browsers restrict JavaScript modules on file:// URLs.

If port 8001 is already in use, stop the other server or use a different port. With Node, use `PORT=8002 npm start` on macOS/Linux, `$env:PORT=8002; npm start` in PowerShell, or `set PORT=8002` followed by `npm start` in Windows Command Prompt.

## Publish on GitHub Pages

This is ready for a normal GitHub Pages project repository.

1. Create a repository, for example `macro-lab`.
2. Upload the **contents** of this folder, with `index.html` at the repository root. Include the complete `vendor` folder and `.nojekyll` file.
3. In the repository, open **Settings → Pages**.
4. Select **Deploy from a branch**, then the **main** branch and **/(root)** folder, and save.
5. GitHub will provide the published URL, normally `https://YOUR-USERNAME.github.io/macro-lab/`.

All application asset links are relative, so repository subpaths work without configuration. No Node server runs on GitHub Pages; GitHub serves the static files. The project has not been published to your GitHub account.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## First experiment

Click **Higher saving**. With defaults, the saving rate rises from 20% to 30% at period 20. Animation begins two periods before the shock.

- The main diagram compares the original and new laws of motion, with a true 45-degree line and an amber cobweb trajectory.
- Consumption falls at the shock date, while the capital stock is unchanged on impact.
- Saving rises immediately. Capital begins rising the following period.
- Consumption recovers as the economy converges. With this calibration, its new steady-state level exceeds its original level.
- The small graphs show the full paths; dotted teal is the future, solid teal is the elapsed path, and dashed gray is the no-shock counterfactual.

Use **Initial** and **After shock** to edit the two parameter sets. Editing an After shock slider pauses at the shock date so its immediate effects are visible. Click Play or Replay to animate. Initial capital follows the initial steady state until you enter a custom value. “Set to initial steady state” restores that link. Presets replace the post-shock parameter set with the initial parameters plus the selected change. One permanent, potentially multiparameter shock is supported per experiment.

The time slider scrubs both forward and backward; the step button advances exactly one period. The finite horizon is 80, 160, or 320 periods. Slow economies need not converge within the selected horizon: steady-state markers are analytical limits, not the last simulated observation. The new law of motion appears faintly before the shock and becomes prominent at the shock date. Numeric readouts always show the exact observation at the integer period displayed. Motion between these dates is only a visual interpolation of the cobweb.

## Equations and notation

Time is discrete. Following Tobias Broer's **Key Facts and the Solow Model**, slides 30–44 and 50:

```math
Y_t=(\theta K_t)^\alpha(A_tN_t)^{1-\alpha},\qquad
k_t=\frac{K_t}{A_tN_t},\quad y_t=f(k_t)=(\theta k_t)^\alpha.
```

```math
K_{t+1}=(1-\delta)K_t+sY_t,\qquad
k_{t+1}=\frac{(1-\delta)k_t+s f(k_t)}{\gamma n}.
```

```math
c_t=(1-s)y_t,\quad i_t=s y_t,\qquad
\bar k=\left(\frac{s\theta^\alpha}{\gamma n-1+\delta}\right)^{1/(1-\alpha)}.
```

- **γ and n are gross growth factors**, not net growth rates. γ = 1.02 means 2% technology growth. n = 1.01 means 1% population growth. The dashboard also displays the net percentages.
- **A₀ = N₀ = 1**. Equivalently their initial log levels are zero. Zero levels would make production vanish and intensive units undefined. The initial growth rates are zero: γ = n = 1 by default.
- **θ = 1** by default. Optional θ is capital augmentation, entering as `(θ K)^α`, not a multiplier on output. Changing θ permanently changes a level, not the technology growth rate.
- The third time path is saving/investment **iₜ = s yₜ** per effective worker. The saving rate **s** is dimensionless and appears in the controls and live tracker.
- At a shock in period τ, **kτ, Aτ and Nτ are predetermined**. The new parameters apply to production, allocation and marginal products in τ, and to accumulation and factor growth from τ to τ+1. A γ or n shock causes no instantaneous jump in A or N.
- The model is deterministic. These are transition paths in levels, rather than stochastic impulse responses.

The live tracker reports marginal products of **physical capital** and **raw labor**:

```math
\mathrm{MPK}_t=\alpha\frac{y_t}{k_t},\qquad
\mathrm{MPL}_t=(1-\alpha)A_ty_t.
```

MPL is the competitive wage per worker, not per effective worker. A and N levels compound using the growth factor applicable to each dated transition. γ and n themselves remain constant within each regime. MPK is a gross production marginal product, before subtracting depreciation.

The golden-rule capital stock solves `f'(k) = γ n − 1 + δ`. For Cobb–Douglas, the golden-rule saving rate is **s = α**. A rise in saving always reduces current consumption at a fixed capital stock, but need not raise long-run consumption. The dashboard compares steady-state consumption explicitly and flags saving above the golden rule. A custom k₀ can introduce a preexisting transition, so the steady-state comparison is not necessarily a comparison with initial actual consumption.

## Layout and interaction

Desktop: one viewport with the main diagram on the left, three time paths in the middle, and parameter/live controls on the right. Designed for desktop viewports of at least 1024 × 660 CSS pixels. On narrower screens or with large browser zoom, the layout stacks vertically to preserve readability and access; scrolling is then intentional. Model notes open in a dismissible dialog. Range controls are keyboard accessible. Animation starts only when requested.

The model diagram keeps equal axis scaling. Both regime curves remain visible for comparison; the active regime badge changes at the shock date. Changing a slider redraws the curve immediately. Parameters do not gradually morph during an economically instantaneous shock. Small graphs are independently scaled and have labeled axes; their visual amplitudes should not be compared without reading those scales.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard structure and model notes |
| `styles.css` | Desktop canvas and responsive layouts |
| `model.js` | Pure model functions and dated simulation |
| `app.js` | Parameter state, chart drawing, and animation |
| `model.test.js` | Economic and numerical checks |
| `server.mjs` | Local static development server |
| `start-local.bat` / `start-local.sh` | Local launchers |
| `vendor/katex/` | Offline LaTeX rendering, fonts, and license |
| `.nojekyll` | Plain static GitHub Pages publishing |

The model is separated from presentation so Ramsey and other models can be added later. Ramsey is a future-model label, not a working model in this release.

## Validation

The six automated model tests pass. Browser preview was blocked in the build environment, so visual layout and browser interactions have not been visually verified. JavaScript syntax and all local asset references were checked.

Run `npm test`. Checks cover the exact steady state over several calibrations, shock timing, consumption impact and recovery, aggregate capital accounting, factor payments, numerical marginal products, the golden rule, positive boundary paths, and convergence from both sides.

Third-party KaTeX is provided under its bundled MIT license in `vendor/katex/LICENSE`. Lecture PDFs are not redistributed in this package.
