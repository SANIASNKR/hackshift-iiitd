# Dataset Description and Cohort Definition

## 1. Dataset: MIMIC-IV

This study uses **MIMIC-IV (Medical Information Mart for Intensive Care
IV)**, a de-identified electronic health record dataset containing
hospital and intensive-care data. It includes information such as
patient demographics, hospital admissions, ICU stays, diagnoses,
laboratory measurements, vital signs, medications, and clinical
outcomes.

MIMIC-IV is suitable for developing and evaluating clinical prediction
models because it contains longitudinal records from real-world hospital
care. Access to the underlying data is controlled and requires
completion of the applicable credentialing and data-use requirements.

> **Reproducibility note:** Report the exact MIMIC-IV release/version
> used in the experiments. Do not publish patient-level records or other
> restricted data in the GitHub repository.

## 2. Study Objective and Prediction Target

The modelling task is to estimate the risk of **in-hospital mortality**
using information available during the early part of an ICU stay. The
target must be defined consistently from the relevant admission/outcome
fields in the study code.

-   **Prediction unit:** one eligible ICU stay per included
    patient/admission, according to the implemented cohort logic.
-   **Input:** clinical features extracted from the first 24 hours of
    the eligible ICU stay.
-   **Target:** in-hospital mortality for the corresponding hospital
    admission.
-   **Output:** a predicted risk/probability, subsequently calibrated if
    calibration is part of the implemented pipeline.

This is a retrospective prediction experiment, not a prospective
clinical validation. Its output should be interpreted as decision
support for research, not as an autonomous diagnosis or treatment
recommendation.

## 3. Cohort Selection

The cohort should be built using explicit, reproducible inclusion and
exclusion rules. The intended cohort definition for this project is:

### Inclusion criteria

1.  **Adult patients:** age 18 years or older, based on the age
    definition implemented for the selected MIMIC-IV release.
2.  **ICU admission:** at least one eligible ICU stay linked to a
    hospital admission.
3.  **First eligible ICU stay:** retain the first ICU stay per patient
    for the primary analysis, if this is what the project code
    implements.
4.  **Available observation window:** sufficient records to construct
    the prespecified features from the first 24 hours after ICU
    admission.
5.  **Defined outcome:** the relevant hospital admission has an
    ascertainable in-hospital mortality outcome under the study's
    label-generation logic.

### Exclusion criteria and data-quality checks

-   Exclude records that do not satisfy the adult or eligible-ICU-stay
    criteria.
-   Exclude duplicate rows or repeated representations of the same
    prediction unit.
-   Exclude stays for which the required input window or target cannot
    be constructed, where the implementation requires both.
-   Check missingness, implausible values, timestamps, and join
    cardinality before generating the final modelling table.
-   Prevent information leakage by excluding variables recorded after
    the prediction time or variables that directly reveal the outcome.

**Important:** Keep only the criteria that are actually implemented in
the code. If the pipeline does not explicitly exclude readmissions, does
not require a complete 24-hour window, or uses a different definition of
"first ICU stay," revise this section to match the code. Do not report
cohort counts until they have been computed from the final pipeline.

## 4. Why Use the First 24 Hours?

The first 24 hours after ICU admission provide a prespecified
early-observation window in which initial physiology and laboratory
results can be summarized. This choice has several methodological
advantages:

1.  **Early risk assessment:** it focuses the model on information
    available relatively early in critical care, rather than on the
    patient's entire subsequent stay.
2.  **Consistent feature window:** a fixed window makes feature
    extraction more comparable across eligible ICU stays.
3.  **Reduced temporal leakage:** defining a clear prediction time helps
    prevent later measurements or events from inadvertently entering the
    input features.
4.  **Clinically interpretable timing:** the resulting estimate can be
    framed as risk assessment after the initial ICU observation period,
    provided the outcome and timestamps are implemented accordingly.
5.  **Practical feature aggregation:** repeated measurements can be
    summarized within the same window using prespecified statistics,
    such as the first, last, mean, minimum, maximum, or clinically
    justified trend features.

### Limitation of a 24-hour window

A 24-hour window does **not** represent prediction at the instant of ICU
admission. It means the model uses data collected during the first day
and, conceptually, produces an estimate after that window has elapsed.
It may also exclude patients who die or leave the ICU before a complete
24-hour window, depending on the cohort rules. Such exclusions can
introduce selection bias and must be described and quantified if they
occur.

For a fair comparison, all candidate models should use the same cohort,
feature window, target definition, data split strategy, and leakage
controls.

## 5. Feature Construction and Leakage Prevention

The analytical table should contain one row per prediction unit, with
features calculated only from records whose timestamps fall within the
prespecified first-24-hour window relative to ICU admission.

A reproducible pipeline should document:

-   the time origin and exact window boundaries;
-   how repeated measurements are aggregated;
-   units and plausibility checks for vital signs and laboratory values;
-   the strategy for missing values and outliers;
-   which variables are excluded because they occur after the prediction
    time or encode the outcome;
-   how train, validation, and test sets are separated, preferably at
    patient level where applicable;
-   how preprocessing is fitted on training data only and then applied
    to validation/test data.

Do not claim that a particular imputation method, aggregation statistic,
or split strategy was used unless it appears in the code or experiment
records.

## 6. Cohort Flow and Reporting

Report the number of records remaining after each cohort step,
calculated from the actual data-processing pipeline:

1.  Raw candidate ICU stays
2.  Stays satisfying the adult criterion
3.  Stays remaining after first-stay selection and other exclusions
4.  Stays with an eligible 24-hour feature window
5.  Stays with a valid mortality label
6.  Final cohort, including the number and percentage of positive
    mortality outcomes
7.  Final train, validation, and test sample counts

Do not insert estimated or illustrative counts into the paper. Generate
these values from the executed pipeline and ensure they reconcile across
the cohort table, results, and repository documentation.

## 7. Suggested Short Description for the Repository

> We use MIMIC-IV to study early prediction of in-hospital mortality
> among eligible adult ICU stays. Clinical features are derived from the
> first 24 hours after ICU admission, and the outcome is defined at the
> corresponding hospital-admission level. The cohort is constructed
> using explicit eligibility, first-stay, data-quality, and
> outcome-availability rules. A fixed observation window supports
> consistent feature extraction and helps define a clear prediction
> time, while leakage checks are used to prevent post-window information
> from entering the model. Exact cohort counts, the MIMIC-IV version,
> and implementation-specific exclusion rules should be reported from
> the executed pipeline.

## Before Publishing

-   [ ] Confirm the exact MIMIC-IV version/release.
-   [ ] Verify that adult age, first-ICU-stay, and 24-hour-window rules
    match the code.
-   [ ] Confirm the mortality label and its timestamp/administrative
    definition.
-   [ ] Check for leakage and patient overlap across data splits.
-   [ ] Generate real cohort counts and mortality prevalence from the
    final run.
-   [ ] Do not upload restricted patient-level data, credentials, or
    access-controlled extracts.
