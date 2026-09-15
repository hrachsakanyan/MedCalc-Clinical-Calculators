# 🏥 MedCalc — Clinical Calculators 

A single-page web app with eight bedside clinical calculators. Pick a calculator, enter the
values, and get the result together with a plain-language interpretation.

🔗 [View Live Website](https://hrachsakanyan.github.io/MedCalc-Clinical-Calculators/)

> ## ⚠️ Educational use only
> MedCalc is a **learning and portfolio project**. It is **not a medical device**, has not been
> clinically validated, and must **not** be used for diagnosis, treatment, or any patient-care
> decision. Always verify every calculation against your local protocols and primary sources.
> The author accepts no liability for any use of this tool.

---

## Calculators

| Calculator | Formula / source | Typical use |
|---|---|---|
| **BMI** — Body Mass Index | weight ÷ height², WHO categories | Nutritional screening |
| **BSA** — Body Surface Area | Mosteller, Du Bois, Haycock | Chemotherapy dosing, cardiac index |
| **BMR / TDEE** | Mifflin-St Jeor + activity factor | Nutrition planning |
| **IBW** — Ideal Body Weight | Devine, Robinson, Miller, Hamwi | Drug dosing, ventilator tidal volume |
| **CrCl** — Creatinine Clearance | Cockcroft-Gault | Renal dose adjustment |
| **GCS** — Glasgow Coma Scale | Teasdale & Jennett | Level of consciousness |
| **APGAR** | Virginia Apgar (1953) | Newborn assessment at 1 and 5 min |
| **Wells score for DVT** | Wells et al. (1997, mod. 2003) | Pre-test probability of DVT |

Each result includes the category/interpretation, supporting values (e.g. alternative formulas,
healthy ranges, component scores) and the formula used.

## Features

- **Schema-driven forms** — every calculator declares its fields; the UI builds itself
- **Input validation** — required fields, numeric ranges, inline error messages
- **Live recalculation** — after the first result, edits update it instantly
- **Search** — filter calculators by name, category or keyword (`/` focuses the search box)
- **Dark mode** — follows the OS by default, manual toggle persists in `localStorage`
- **Inputs remembered** — the last values per calculator are restored on your next visit
- **Responsive** — sidebar navigation on desktop, card grid on mobile
- **Accessible** — semantic HTML, labelled controls, `aria-live` results, keyboard navigation
- **Print-friendly** — chrome is hidden so a result can be printed or saved as PDF

## Tech stack

Plain **HTML5**, **CSS3** and **JavaScript (ES2020)**. No frameworks, no libraries, no build
step — the repository *is* the deployed site.

## Project structure

```
medcalc/
├── index.html            # app shell: top bar, sidebar, home view, calculator view
├── css/
│   └── style.css         # design tokens, layout, components, light/dark themes
├── js/
│   ├── calculators.js    # the 8 calculators: field schemas + formulas + interpretation
│   └── app.js            # routing, form building, validation, rendering, theme, search
├── assets/
└── README.md
```

The split is deliberate: [`calculators.js`](js/calculators.js) holds *medical* knowledge and
[`app.js`](js/app.js) holds *application* logic. Adding a calculator means adding one object
to the array — no changes to the UI code.

## Adding a calculator

```js
{
  id: 'map',                       // becomes the URL hash: #/map
  name: 'Mean Arterial Pressure',
  short: 'MAP',
  icon: '🫀',
  category: 'Cardiovascular',      // groups it in the sidebar
  description: 'Average arterial pressure over one cardiac cycle.',
  keywords: ['map', 'blood pressure', 'perfusion'],
  fields: [
    { id: 'sbp', label: 'Systolic BP',  type: 'number', unit: 'mmHg', min: 40, max: 300, step: 1 },
    { id: 'dbp', label: 'Diastolic BP', type: 'number', unit: 'mmHg', min: 20, max: 200, step: 1 }
  ],
  calculate(v) {
    const map = (v.sbp + 2 * v.dbp) / 3;
    return {
      primary: { label: 'MAP', value: map.toFixed(0), unit: 'mmHg' },
      badge: { text: map < 65 ? 'Low' : 'Adequate', level: map < 65 ? 'danger' : 'normal' },
      interpretation: 'A MAP of at least 65 mmHg is the usual target for organ perfusion.',
      details: [{ label: 'Pulse pressure', value: `${v.sbp - v.dbp} mmHg` }],
      note: 'MAP ≈ (SBP + 2 × DBP) ÷ 3'
    };
  }
}
```

Field types: `number` (with `min`, `max`, `step`, optional `optional: true` and `help`),
`select` (with `options[]`), and `checkbox` (with `options[]`, each optionally carrying `points`).
Badge levels: `normal`, `info`, `caution`, `warning`, `danger`.

## Running locally 

No build step — double-click `index.html` and it works. To serve it over HTTP instead
(closer to how GitHub Pages will run it), use whichever you have installed:

```bash
npx serve .                 # Node
python -m http.server 8000  # Python
```

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Wait for the build, then open `https://YOUR-USERNAME.github.io/medcalc/`.
4. Update the live-demo link at the top of this README.

## Sources 

- WHO — BMI classification for adults
- Mosteller RD. *Simplified calculation of body-surface area.* N Engl J Med. 1987
- Mifflin MD et al. *A new predictive equation for resting energy expenditure.* Am J Clin Nutr. 1990
- Devine BJ. *Gentamicin therapy.* Drug Intell Clin Pharm. 1974
- Cockcroft DW, Gault MH. *Prediction of creatinine clearance from serum creatinine.* Nephron. 1976
- Teasdale G, Jennett B. *Assessment of coma and impaired consciousness.* Lancet. 1974
- Apgar V. *A proposal for a new method of evaluation of the newborn infant.* Anesth Analg. 1953
- Wells PS et al. *Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis.* N Engl J Med. 2003

## License

MIT — see [LICENSE](LICENSE).
