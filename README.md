# MedTrust AI

**Reliability-aware clinical decision routing: a confident prediction is not the same as a reliable one.**

MedTrust AI is a research prototype that asks whether *explanation reliability* carries information beyond *calibrated confidence* for spotting unreliable clinical predictions, and whether that information can improve ACCEPT / REVIEW / DEFER routing.

> **Disclaimer:** This is a research prototype built for a hackathon. It is not a medical device, is not clinically validated, and must not be used for patient care or diagnosis.

## Project status

| Component | Status |
|---|---|
| Pipeline skeleton (data loading, cohort, 24h features, models, calibration, SHAP, ERS prototype, routing) | Run on the small MIMIC-IV Demo sample only. Demo numbers are **not** research results. |
| Full MIMIC-IV cohort experiments | Planned |
| Final ERS formulation and validation-selected thresholds | Planned |
| Imaging extension (TrustXAI-Med, chest X-ray) | Research prototype. Some demo values are simulated and are being replaced with real outputs. |
| MIMIC-CXR linkage, eICU external validation | Future work |

Update this table as results become real. No simulated number should be presented as a finding.

## The problem

Clinical models are judged on average accuracy, but a clinician decides about one patient. A calibrated probability says how often scores of that size are right. It does not say whether the evidence behind *this* prediction holds up. The dangerous case is a prediction that is both wrong and confident.

## The idea

Two evidence streams are combined into a routing decision:

- **Predictive confidence:** calibrated probability from the best validated model.
- **Explanation Reliability Score (ERS):** how stable and faithful the SHAP explanation is under small, plausible input perturbations (stability, feature-ranking consistency, sign consistency, faithfulness).

| Confidence | ERS | Route |
|---|---|---|
| High | High | ACCEPT |
| High | Low | REVIEW |
| Low | High | REVIEW |
| Low | Low | DEFER |

Thresholds are selected on validation data and frozen before test evaluation.

## Clinical task

24-hour early prediction of in-hospital mortality for adult ICU patients, using MIMIC-IV.

- Adults (18 or older), first ICU stay only, at least 24 hours of ICU data
- Index time: ICU admission + 24 hours; features from the first 24 hours only
- Patient-level split; no future information; patients who die at or before the index time are excluded
- Features: age; vitals (heart rate, respiratory rate, SpO2, temperature, systolic and diastolic BP); labs (creatinine, WBC, lactate, sodium, potassium, hemoglobin, platelets, glucose). Each vital or lab is represented by mean, minimum, maximum and a missingness indicator.

## Pipeline

```
MIMIC-IV -> cohort + 24h features -> LR / RF / XGBoost / LightGBM / CatBoost
         -> best validated model -> calibration -> predictive confidence
         -> SHAP -> ERS -> ACCEPT / REVIEW / DEFER
```

Models compete on validation using discrimination (AUROC, AUPRC) and calibration (Brier score, ECE), so the primary model is not predetermined.

## Experimental design

| System | Pipeline | Purpose |
|---|---|---|
| A | Prediction only | Baseline utility |
| B | + calibrated confidence | Confidence-only decision support |
| C | + SHAP | Explanation without a reliability check |
| D | + ERS | Does ERS add information? |
| E | + routing (full MedTrust) | Proposed system |

**Central experiment:** thresholds for high confidence and low ERS are fixed on validation data and frozen. On the untouched test set, high-confidence predictions are split by ERS, and error rates and error types (for example missed deaths) are compared. Confidence-only routing is then compared with ERS routing at matched coverage.

**Hypothesis, not a result:** high-confidence, low-ERS predictions are disproportionately error-prone. If ERS adds nothing beyond calibrated confidence, we report that negative result.

Reported metrics: AUROC, AUPRC, Brier, ECE, coverage, selective risk, accepted-case error, review and deferral rates, with bootstrap confidence intervals.

## Freeze protocol

Model selection, calibration choice, ERS formulation and routing thresholds are all chosen on validation data. Everything is then frozen and the test set is evaluated once. No test-set tuning.

## Imaging extension (TrustXAI-Med)

The same ACCEPT / REVIEW / DEFER router can sit on top of an imaging model. The TrustXAI-Med prototype scores chest X-ray reliability using heatmap stability under perturbation, agreement between Grad-CAM++ and Integrated Gradients, and a deletion test. Planned work links MIMIC-CXR to the same patients with the same patient-level split and only images taken before the index time. Open issues: data access and size, selection bias (who receives an X-ray), and possible overlap between pretrained weights and MIMIC data.

## Planned repository structure

```
medtrust_model1/
  configs/        task.yaml, features.yaml, routing.yaml
  data/           raw/, processed/, cohort/   (never commit patient data)
  src/            data/, preprocessing/, models/, calibration/,
                  explainability/, reliability/, routing/, evaluation/
  experiments/
  notebooks/
  reports/
  tests/
```

## Tech stack

Python, pandas, NumPy, scikit-learn, XGBoost, LightGBM, CatBoost, SHAP (TreeExplainer), SciPy, matplotlib / plotly. Git plus config files for tracking; MLflow optional.

## Getting started

MIMIC-IV requires credentialed access through PhysioNet and acceptance of its data use agreement. **Do not commit, upload or deploy row-level patient data**, and check PhysioNet's current rules before sending any patient-level data to an external service.

```bash
git clone <your-repo-url>
cd medtrust_model1
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt        # to be added to the repo
```

Place your credentialed MIMIC-IV extract under `data/raw/` locally, then run the pipeline steps in order: cohort, features, split, models, calibration, SHAP, ERS, routing, evaluation. (Scripts to be added as the repo is finalized.)

## Limitations

- Retrospective study on one US dataset; no external or prospective validation yet
- ERS may largely track confidence; this is tested directly rather than assumed
- Perturbations of correlated labs and vitals must stay physiologically plausible
- The high-confidence, low-ERS group may be small, so its size and bootstrap intervals are reported
- Novelty is limited to the routing formulation and evaluation protocol. Calibration, SHAP, selective prediction and explanation stability are established methods, and a full literature check on this exact formulation is still pending.

## Team

Replace the bracketed names. Roles are general, so adjust them to match how your team actually split the work.

| Member | Role | Responsibilities |
|---|---|---|
| [Name 1] | Project lead and research | Experimental design, freeze protocol, evaluation plan, documentation, pitch and presentation |
| [Name 2] | Frontend developer | User interface, ACCEPT / REVIEW / DEFER display, explanation and audit views, demo flow |
| [Name 3] | Backend developer | APIs and application logic, model serving, routing integration, logging, deployment |
| [Name 4] | Data engineer | MIMIC-IV cohort construction, 24-hour feature extraction, leakage audit, patient-level splits |
| [Name 5] | ML engineer | Model training and selection, calibration, SHAP, ERS and perturbation tests, evaluation, imaging module |

## License

[Choose a license, for example MIT or Apache-2.0, and add a LICENSE file.]

## Acknowledgements

Built on MIMIC-IV, provided through PhysioNet. Please cite the MIMIC-IV dataset and PhysioNet according to their current citation guidance.
