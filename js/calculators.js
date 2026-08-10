/**
 * MedCalc — calculator definitions
 * ---------------------------------
 * Every calculator is a plain object with:
 *   id, name, short, icon, category, description, keywords
 *   fields[]   — schema the UI turns into a form
 *   calculate(v) -> result object rendered by app.js
 *
 * Field types: "number" | "select" | "checkbox"
 * Result shape:
 *   { primary: {label, value, unit}, badge: {text, level}, interpretation,
 *     details: [{label, value}], note }
 * Badge levels: normal | info | caution | warning | danger
 */

/* ---------- small helpers ---------- */

const round = (n, d = 1) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};

const fmt = (n, d = 1) => round(n, d).toFixed(d);

// inches above 5 feet — used by every ideal-body-weight formula
const inchesOver5ft = (cm) => Math.max(0, cm / 2.54 - 60);

const CALCULATORS = [
  /* =======================================================================
     1. BMI
     ======================================================================= */
  {
    id: 'bmi',
    name: 'Body Mass Index',
    short: 'BMI',
    icon: '⚖️',
    category: 'Anthropometrics',
    description: 'Weight-for-height index used to screen for underweight and obesity.',
    keywords: ['bmi', 'obesity', 'overweight', 'underweight', 'quetelet', 'weight'],
    fields: [
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 1, max: 400, step: 0.1, placeholder: '70' },
      { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 50, max: 250, step: 0.5, placeholder: '175' }
    ],
    calculate(v) {
      const m = v.height / 100;
      const bmi = v.weight / (m * m);

      let text, level, interpretation;
      if (bmi < 16) {
        text = 'Severe thinness'; level = 'danger';
        interpretation = 'BMI below 16 kg/m² indicates severe undernutrition. Nutritional assessment is warranted.';
      } else if (bmi < 18.5) {
        text = 'Underweight'; level = 'caution';
        interpretation = 'BMI below 18.5 kg/m² is classified as underweight. Consider evaluating dietary intake and screening for underlying causes.';
      } else if (bmi < 25) {
        text = 'Normal weight'; level = 'normal';
        interpretation = 'BMI is within the range associated with the lowest weight-related health risk for most adults.';
      } else if (bmi < 30) {
        text = 'Overweight'; level = 'caution';
        interpretation = 'BMI 25–29.9 kg/m² is classified as overweight, with modestly increased cardiometabolic risk.';
      } else if (bmi < 35) {
        text = 'Obesity class I'; level = 'warning';
        interpretation = 'BMI 30–34.9 kg/m² is class I obesity. Risk of type 2 diabetes, hypertension and dyslipidaemia is increased.';
      } else if (bmi < 40) {
        text = 'Obesity class II'; level = 'warning';
        interpretation = 'BMI 35–39.9 kg/m² is class II obesity, associated with substantially increased morbidity.';
      } else {
        text = 'Obesity class III'; level = 'danger';
        interpretation = 'BMI ≥ 40 kg/m² is class III (severe) obesity, associated with the highest weight-related mortality risk.';
      }

      const lowKg = 18.5 * m * m;
      const highKg = 24.9 * m * m;
      const delta = v.weight < lowKg ? v.weight - lowKg : v.weight > highKg ? v.weight - highKg : 0;

      const details = [
        { label: 'Healthy weight range for this height', value: `${fmt(lowKg)} – ${fmt(highKg)} kg` },
        { label: 'Height', value: `${fmt(m, 2)} m` }
      ];
      if (delta !== 0) {
        details.push({
          label: delta > 0 ? 'Above healthy range by' : 'Below healthy range by',
          value: `${fmt(Math.abs(delta))} kg`
        });
      }

      return {
        primary: { label: 'BMI', value: fmt(bmi), unit: 'kg/m²' },
        badge: { text, level },
        interpretation:
          interpretation +
          ' BMI does not distinguish fat from lean mass and may misclassify athletes, older adults, pregnant patients and some ethnic groups.',
        details,
        note: 'BMI = weight (kg) ÷ height (m)². Categories follow WHO classification for adults.'
      };
    }
  },

  /* =======================================================================
     2. BSA
     ======================================================================= */
  {
    id: 'bsa',
    name: 'Body Surface Area',
    short: 'BSA',
    icon: '📐',
    category: 'Anthropometrics',
    description: 'Body surface area for chemotherapy dosing, cardiac index and renal indexing.',
    keywords: ['bsa', 'surface', 'mosteller', 'dubois', 'du bois', 'haycock', 'chemotherapy', 'dosing'],
    fields: [
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 0.5, max: 400, step: 0.1, placeholder: '70' },
      { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 20, max: 250, step: 0.5, placeholder: '175' }
    ],
    calculate(v) {
      const mosteller = Math.sqrt((v.height * v.weight) / 3600);
      const dubois = 0.007184 * Math.pow(v.height, 0.725) * Math.pow(v.weight, 0.425);
      const haycock = 0.024265 * Math.pow(v.height, 0.3964) * Math.pow(v.weight, 0.5378);

      return {
        primary: { label: 'BSA (Mosteller)', value: fmt(mosteller, 2), unit: 'm²' },
        badge: { text: 'Reference adult ≈ 1.7 m²', level: 'info' },
        interpretation:
          'Mosteller is the formula most widely used for cytotoxic drug dosing because it is simple and reproducible. ' +
          'Du Bois is the historical standard used in cardiac index and indexed renal function; Haycock performs better in neonates and infants. ' +
          'Differences between formulas are usually small but can matter for narrow-therapeutic-index drugs.',
        details: [
          { label: 'Du Bois & Du Bois', value: `${fmt(dubois, 2)} m²` },
          { label: 'Haycock (paediatric)', value: `${fmt(haycock, 2)} m²` },
          { label: 'Spread between formulas', value: `${fmt(Math.max(mosteller, dubois, haycock) - Math.min(mosteller, dubois, haycock), 3)} m²` },
          { label: 'Dose at 100 mg/m² (Mosteller)', value: `${fmt(mosteller * 100, 0)} mg` }
        ],
        note: 'Mosteller: √(height cm × weight kg ÷ 3600). Du Bois: 0.007184 × H^0.725 × W^0.425.'
      };
    }
  },

  /* =======================================================================
     3. BMR / TDEE
     ======================================================================= */
  {
    id: 'bmr',
    name: 'Basal Metabolic Rate',
    short: 'BMR',
    icon: '🔥',
    category: 'Metabolic',
    description: 'Resting energy expenditure and daily calorie needs (Mifflin-St Jeor).',
    keywords: ['bmr', 'tdee', 'calories', 'energy', 'metabolic', 'mifflin', 'nutrition', 'diet'],
    fields: [
      { id: 'sex', label: 'Sex', type: 'select', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
      ] },
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 1, max: 120, step: 1, placeholder: '35' },
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 1, max: 400, step: 0.1, placeholder: '70' },
      { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 50, max: 250, step: 0.5, placeholder: '175' },
      { id: 'activity', label: 'Activity level', type: 'select', options: [
        { value: '1.2', label: 'Sedentary — little or no exercise' },
        { value: '1.375', label: 'Lightly active — 1–3 days/week' },
        { value: '1.55', label: 'Moderately active — 3–5 days/week' },
        { value: '1.725', label: 'Very active — 6–7 days/week' },
        { value: '1.9', label: 'Extra active — physical job or 2× training' }
      ] }
    ],
    calculate(v) {
      const base = 10 * v.weight + 6.25 * v.height - 5 * v.age;
      const bmr = v.sex === 'male' ? base + 5 : base - 161;
      const factor = parseFloat(v.activity);
      const tdee = bmr * factor;
      const activityLabel = this.fields
        .find((f) => f.id === 'activity')
        .options.find((o) => o.value === v.activity).label.split(' — ')[0];

      return {
        primary: { label: 'BMR', value: fmt(bmr, 0), unit: 'kcal/day' },
        badge: { text: `TDEE ≈ ${fmt(tdee, 0)} kcal/day`, level: 'info' },
        interpretation:
          `BMR is the energy required at complete rest. Multiplied by the ${activityLabel.toLowerCase()} factor (×${factor}), ` +
          `estimated total daily energy expenditure is ${fmt(tdee, 0)} kcal/day. ` +
          'Predictive equations carry roughly ±10% error; indirect calorimetry remains the reference method in critical illness.',
        details: [
          { label: 'Total daily energy expenditure (TDEE)', value: `${fmt(tdee, 0)} kcal/day` },
          { label: 'Mild weight loss (−500 kcal/day)', value: `${fmt(tdee - 500, 0)} kcal/day` },
          { label: 'Mild weight gain (+500 kcal/day)', value: `${fmt(tdee + 500, 0)} kcal/day` },
          { label: 'Activity factor', value: `×${factor}` }
        ],
        note: 'Mifflin-St Jeor: (10 × kg) + (6.25 × cm) − (5 × age) + 5 for males, − 161 for females.'
      };
    }
  },

  /* =======================================================================
     4. Ideal Body Weight
     ======================================================================= */
  {
    id: 'ibw',
    name: 'Ideal Body Weight',
    short: 'IBW',
    icon: '🎯',
    category: 'Anthropometrics',
    description: 'Ideal and adjusted body weight for drug dosing and ventilator tidal volumes.',
    keywords: ['ibw', 'ideal', 'adjusted', 'devine', 'robinson', 'hamwi', 'tidal volume', 'dosing'],
    fields: [
      { id: 'sex', label: 'Sex', type: 'select', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' }
      ] },
      { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 100, max: 250, step: 0.5, placeholder: '175' },
      { id: 'weight', label: 'Actual body weight', type: 'number', unit: 'kg', min: 1, max: 400, step: 0.1,
        placeholder: 'optional', optional: true,
        help: 'Optional — needed for adjusted body weight and % of IBW.' }
    ],
    calculate(v) {
      const over = inchesOver5ft(v.height);
      const male = v.sex === 'male';

      const devine = (male ? 50 : 45.5) + 2.3 * over;
      const robinson = (male ? 52 : 49) + (male ? 1.9 : 1.7) * over;
      const miller = (male ? 56.2 : 53.1) + (male ? 1.41 : 1.36) * over;
      const hamwi = (male ? 48 : 45.5) + (male ? 2.7 : 2.2) * over;

      // ARDSNet lung-protective ventilation uses IBW, not actual weight
      const tv6 = devine * 6;
      const tv8 = devine * 8;

      const details = [
        { label: 'Robinson (1983)', value: `${fmt(robinson)} kg` },
        { label: 'Miller (1983)', value: `${fmt(miller)} kg` },
        { label: 'Hamwi (1964)', value: `${fmt(hamwi)} kg` },
        { label: 'Lung-protective tidal volume (6–8 mL/kg IBW)', value: `${fmt(tv6, 0)} – ${fmt(tv8, 0)} mL` }
      ];

      let text = 'Devine formula', level = 'info';
      let interpretation =
        'Ideal body weight is used for drug dosing (e.g. aminoglycosides), ventilator tidal volume settings and nutritional targets. ' +
        'It is a height-based construct, not a weight-loss target.';

      if (v.weight != null) {
        const pct = (v.weight / devine) * 100;
        const adjusted = devine + 0.4 * (v.weight - devine);

        details.unshift({ label: 'Actual body weight', value: `${fmt(v.weight)} kg` });
        details.splice(1, 0, { label: '% of ideal body weight', value: `${fmt(pct, 0)} %` });

        if (v.weight > 1.2 * devine) {
          details.splice(2, 0, { label: 'Adjusted body weight (ABW)', value: `${fmt(adjusted)} kg` });
          text = `${fmt(pct, 0)} % of IBW`;
          level = pct > 150 ? 'warning' : 'caution';
          interpretation =
            `Actual weight is ${fmt(pct, 0)} % of ideal body weight (> 120 %), so adjusted body weight (${fmt(adjusted)} kg) ` +
            'is generally preferred for dosing hydrophilic drugs in obesity. Tidal volume should still be set from ideal body weight.';
        } else if (v.weight < 0.9 * devine) {
          text = `${fmt(pct, 0)} % of IBW`;
          level = 'caution';
          interpretation =
            `Actual weight is ${fmt(pct, 0)} % of ideal body weight. When actual weight is below IBW, actual body weight is normally used for dosing.`;
        } else {
          text = `${fmt(pct, 0)} % of IBW`;
          level = 'normal';
          interpretation =
            'Actual weight is close to ideal body weight, so actual and ideal weight-based doses will be nearly identical.';
        }
      }

      return {
        primary: { label: 'IBW (Devine)', value: fmt(devine), unit: 'kg' },
        badge: { text, level },
        interpretation,
        details,
        note: 'Devine: 50 kg (male) / 45.5 kg (female) + 2.3 kg per inch over 5 feet. Adjusted BW = IBW + 0.4 × (actual − IBW).'
      };
    }
  },

  /* =======================================================================
     5. Creatinine Clearance
     ======================================================================= */
  {
    id: 'crcl',
    name: 'Creatinine Clearance',
    short: 'CrCl',
    icon: '🧪',
    category: 'Renal',
    description: 'Cockcroft-Gault estimate of creatinine clearance for renal drug dosing.',
    keywords: ['crcl', 'creatinine', 'clearance', 'cockcroft', 'gault', 'renal', 'kidney', 'gfr', 'dosing'],
    fields: [
      { id: 'sex', label: 'Sex', type: 'select', options: [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female (×0.85)' }
      ] },
      { id: 'age', label: 'Age', type: 'number', unit: 'years', min: 18, max: 120, step: 1, placeholder: '65',
        help: 'Cockcroft-Gault is validated in adults only.' },
      { id: 'weight', label: 'Weight', type: 'number', unit: 'kg', min: 1, max: 400, step: 0.1, placeholder: '70' },
      { id: 'creatinine', label: 'Serum creatinine', type: 'number', unit: 'mg/dL', min: 0.1, max: 25, step: 0.01,
        placeholder: '1.0', help: 'If your lab reports µmol/L, divide by 88.4 to get mg/dL.' }
    ],
    calculate(v) {
      let crcl = ((140 - v.age) * v.weight) / (72 * v.creatinine);
      if (v.sex === 'female') crcl *= 0.85;

      let text, level, interpretation;
      if (crcl >= 90) {
        text = 'Normal / high'; level = 'normal';
        interpretation = 'Creatinine clearance ≥ 90 mL/min. Standard dosing applies for most renally cleared drugs.';
      } else if (crcl >= 60) {
        text = 'Mildly decreased'; level = 'info';
        interpretation = 'Mild reduction (60–89 mL/min). Few drugs require adjustment, but check agents with a narrow therapeutic index.';
      } else if (crcl >= 30) {
        text = 'Moderately decreased'; level = 'caution';
        interpretation = 'Moderate reduction (30–59 mL/min). Many renally cleared drugs need dose or interval adjustment; avoid nephrotoxins where possible.';
      } else if (crcl >= 15) {
        text = 'Severely decreased'; level = 'warning';
        interpretation = 'Severe reduction (15–29 mL/min). Substantial dose adjustment is usually required; several agents (e.g. metformin, most DOACs at low thresholds) are contraindicated.';
      } else {
        text = 'Kidney failure'; level = 'danger';
        interpretation = 'CrCl < 15 mL/min indicates kidney failure. Specialist input and renal-replacement-aware dosing are required.';
      }

      const perMinL = crcl / 60;

      return {
        primary: { label: 'Creatinine clearance', value: fmt(crcl, 1), unit: 'mL/min' },
        badge: { text, level },
        interpretation:
          interpretation +
          ' Cockcroft-Gault assumes stable renal function — it is unreliable in acute kidney injury, extremes of body weight and low muscle mass.',
        details: [
          { label: 'Serum creatinine', value: `${fmt(v.creatinine, 2)} mg/dL (${fmt(v.creatinine * 88.4, 0)} µmol/L)` },
          { label: 'Age factor (140 − age)', value: `${140 - v.age}` },
          { label: 'Sex correction', value: v.sex === 'female' ? '×0.85' : 'none' },
          { label: 'Equivalent', value: `${fmt(perMinL, 2)} L/h` }
        ],
        note: 'Cockcroft-Gault: [(140 − age) × weight kg] ÷ (72 × SCr mg/dL), × 0.85 if female. Drug labels are still largely based on this equation rather than eGFR.'
      };
    }
  },

  /* =======================================================================
     6. Glasgow Coma Scale
     ======================================================================= */
  {
    id: 'gcs',
    name: 'Glasgow Coma Scale',
    short: 'GCS',
    icon: '🧠',
    category: 'Neurology',
    description: 'Standardised assessment of impaired consciousness after brain injury.',
    keywords: ['gcs', 'glasgow', 'coma', 'consciousness', 'head injury', 'trauma', 'neuro'],
    fields: [
      { id: 'eye', label: 'Eye opening (E)', type: 'select', options: [
        { value: '4', label: '4 — Spontaneous' },
        { value: '3', label: '3 — To sound' },
        { value: '2', label: '2 — To pressure' },
        { value: '1', label: '1 — None' }
      ] },
      { id: 'verbal', label: 'Verbal response (V)', type: 'select', options: [
        { value: '5', label: '5 — Orientated' },
        { value: '4', label: '4 — Confused' },
        { value: '3', label: '3 — Words, not coherent' },
        { value: '2', label: '2 — Sounds only' },
        { value: '1', label: '1 — None' }
      ] },
      { id: 'motor', label: 'Best motor response (M)', type: 'select', options: [
        { value: '6', label: '6 — Obeys commands' },
        { value: '5', label: '5 — Localising to pain' },
        { value: '4', label: '4 — Normal flexion (withdrawal)' },
        { value: '3', label: '3 — Abnormal flexion (decorticate)' },
        { value: '2', label: '2 — Extension (decerebrate)' },
        { value: '1', label: '1 — None' }
      ] }
    ],
    calculate(v) {
      const e = +v.eye, vb = +v.verbal, m = +v.motor;
      const total = e + vb + m;

      let text, level, interpretation;
      if (total >= 13) {
        text = 'Mild injury'; level = 'normal';
        interpretation = 'GCS 13–15 indicates mild impairment of consciousness. Serial reassessment is still required — deterioration can be rapid.';
      } else if (total >= 9) {
        text = 'Moderate injury'; level = 'warning';
        interpretation = 'GCS 9–12 indicates moderate impairment. Close neurological observation and imaging are generally indicated.';
      } else {
        text = 'Severe injury / coma'; level = 'danger';
        interpretation = 'GCS ≤ 8 defines coma. The airway is at risk — intubation for airway protection and urgent neurosurgical assessment should be considered.';
      }

      return {
        primary: { label: 'Total GCS', value: String(total), unit: '/ 15' },
        badge: { text, level },
        interpretation:
          interpretation +
          ' Always document the component scores (E, V, M) rather than the total alone, and record any untestable component (e.g. intubated: V = NT).',
        details: [
          { label: 'Eye opening (E)', value: `${e} / 4` },
          { label: 'Verbal response (V)', value: `${vb} / 5` },
          { label: 'Best motor response (M)', value: `${m} / 6` },
          { label: 'Notation', value: `E${e} V${vb} M${m} = ${total}` }
        ],
        note: 'Teasdale & Jennett (1974), updated GCS wording. Range 3–15. A score of 3 is the minimum possible, not zero.'
      };
    }
  },

  /* =======================================================================
     7. APGAR
     ======================================================================= */
  {
    id: 'apgar',
    name: 'APGAR Score',
    short: 'APGAR',
    icon: '👶',
    category: 'Paediatrics',
    description: 'Rapid assessment of the newborn at 1 and 5 minutes after birth.',
    keywords: ['apgar', 'newborn', 'neonate', 'birth', 'delivery', 'paediatric', 'pediatric', 'obstetric'],
    fields: [
      { id: 'appearance', label: 'Appearance — skin colour', type: 'select', options: [
        { value: '2', label: '2 — Completely pink' },
        { value: '1', label: '1 — Pink body, blue extremities' },
        { value: '0', label: '0 — Blue or pale all over' }
      ] },
      { id: 'pulse', label: 'Pulse — heart rate', type: 'select', options: [
        { value: '2', label: '2 — ≥ 100 bpm' },
        { value: '1', label: '1 — < 100 bpm' },
        { value: '0', label: '0 — Absent' }
      ] },
      { id: 'grimace', label: 'Grimace — reflex irritability', type: 'select', options: [
        { value: '2', label: '2 — Cry, cough or sneeze' },
        { value: '1', label: '1 — Grimace only' },
        { value: '0', label: '0 — No response' }
      ] },
      { id: 'activity', label: 'Activity — muscle tone', type: 'select', options: [
        { value: '2', label: '2 — Active movement' },
        { value: '1', label: '1 — Some flexion of limbs' },
        { value: '0', label: '0 — Limp' }
      ] },
      { id: 'respiration', label: 'Respiration — breathing effort', type: 'select', options: [
        { value: '2', label: '2 — Strong cry, regular breathing' },
        { value: '1', label: '1 — Slow, irregular, weak cry' },
        { value: '0', label: '0 — Absent' }
      ] }
    ],
    calculate(v) {
      const parts = [
        ['Appearance (colour)', +v.appearance],
        ['Pulse (heart rate)', +v.pulse],
        ['Grimace (reflex)', +v.grimace],
        ['Activity (tone)', +v.activity],
        ['Respiration (effort)', +v.respiration]
      ];
      const total = parts.reduce((s, p) => s + p[1], 0);

      let text, level, interpretation;
      if (total >= 7) {
        text = 'Reassuring'; level = 'normal';
        interpretation = 'A score of 7–10 is reassuring and requires routine post-natal care with ongoing observation.';
      } else if (total >= 4) {
        text = 'Moderately abnormal'; level = 'warning';
        interpretation = 'A score of 4–6 is moderately abnormal. Stimulation, airway support and supplemental oxygen or positive-pressure ventilation may be required.';
      } else {
        text = 'Low — resuscitate'; level = 'danger';
        interpretation = 'A score of 0–3 indicates a critically depressed newborn. Immediate resuscitation per neonatal life support guidance is required.';
      }

      return {
        primary: { label: 'APGAR score', value: String(total), unit: '/ 10' },
        badge: { text, level },
        interpretation:
          interpretation +
          ' Resuscitation must never be delayed for scoring. The APGAR score is a description of the infant’s condition, not a predictor of individual neurological outcome, and it is recorded at 1 and 5 minutes (then every 5 minutes up to 20 if < 7).',
        details: parts.map(([label, value]) => ({ label, value: `${value} / 2` })),
        note: 'Virginia Apgar (1953). Appearance · Pulse · Grimace · Activity · Respiration, each scored 0–2.'
      };
    }
  },

  /* =======================================================================
     8. Wells score for DVT
     ======================================================================= */
  {
    id: 'wells-dvt',
    name: 'Wells Score for DVT',
    short: 'Wells DVT',
    icon: '🩸',
    category: 'Cardiovascular',
    description: 'Pre-test probability of deep vein thrombosis in the symptomatic leg.',
    keywords: ['wells', 'dvt', 'thrombosis', 'clot', 'venous', 'd-dimer', 'leg', 'vte', 'probability'],
    fields: [
      {
        id: 'criteria',
        label: 'Clinical criteria',
        type: 'checkbox',
        help: 'Tick every criterion that is present. The last item subtracts 2 points.',
        options: [
          { value: 'cancer', label: 'Active cancer (treatment ongoing, within 6 months, or palliative)', points: 1 },
          { value: 'paralysis', label: 'Paralysis, paresis, or recent plaster immobilisation of the leg', points: 1 },
          { value: 'bedridden', label: 'Recently bedridden ≥ 3 days, or major surgery within 12 weeks', points: 1 },
          { value: 'tenderness', label: 'Localised tenderness along the deep venous system', points: 1 },
          { value: 'swollenLeg', label: 'Entire leg swollen', points: 1 },
          { value: 'calf', label: 'Calf swelling > 3 cm compared with the asymptomatic leg', points: 1 },
          { value: 'edema', label: 'Pitting oedema confined to the symptomatic leg', points: 1 },
          { value: 'veins', label: 'Collateral superficial veins (non-varicose)', points: 1 },
          { value: 'priorDvt', label: 'Previously documented DVT', points: 1 },
          { value: 'alternative', label: 'Alternative diagnosis at least as likely as DVT', points: -2 }
        ]
      }
    ],
    calculate(v) {
      const opts = this.fields[0].options;
      const selected = v.criteria || [];
      const score = opts
        .filter((o) => selected.includes(o.value))
        .reduce((s, o) => s + o.points, 0);

      let text, level, threeTier, prevalence;
      if (score >= 3) {
        text = 'High probability'; level = 'danger';
        threeTier = 'High risk (score ≥ 3)';
        prevalence = '≈ 53 % prevalence of DVT';
      } else if (score >= 1) {
        text = 'Moderate probability'; level = 'caution';
        threeTier = 'Moderate risk (score 1–2)';
        prevalence = '≈ 17 % prevalence of DVT';
      } else {
        text = 'Low probability'; level = 'normal';
        threeTier = 'Low risk (score ≤ 0)';
        prevalence = '≈ 5 % prevalence of DVT';
      }

      const likely = score >= 2;
      const interpretation = likely
        ? 'In the two-tier model a score ≥ 2 means DVT is "likely". Proceed directly to compression ultrasonography; a negative D-dimer alone does not reliably exclude DVT in this group.'
        : 'In the two-tier model a score < 2 means DVT is "unlikely". A negative high-sensitivity D-dimer safely excludes DVT without imaging in most patients; if D-dimer is positive, proceed to ultrasound.';

      const chosen = opts.filter((o) => selected.includes(o.value));

      return {
        primary: { label: 'Wells score', value: score > 0 ? `+${score}` : String(score), unit: 'points' },
        badge: { text, level },
        interpretation:
          interpretation +
          ' The score is not validated in pregnancy, in patients already on anticoagulation, or for suspected pulmonary embolism (use the Wells PE score instead).',
        details: [
          { label: 'Two-tier model', value: likely ? 'DVT likely (≥ 2)' : 'DVT unlikely (< 2)' },
          { label: 'Three-tier model', value: threeTier },
          { label: 'Expected prevalence', value: prevalence },
          { label: 'Criteria selected', value: chosen.length ? `${chosen.length} of ${opts.length}` : 'none' }
        ],
        note: 'Wells et al. (1997, modified 2003). Each criterion scores +1; an equally likely alternative diagnosis scores −2. Range −2 to +9.'
      };
    }
  }
];
