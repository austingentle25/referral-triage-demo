# Diagnosis matching - measured before building anything

Run `probe-diagnosis-matching.js` in the browser console on a diagnosis screen
to reproduce. Measured 8 September 2026 against the live build.

## The corpus problem, first

The plan was to run the free-text diagnosis strings from real feedback reports
and exported session logs through the matcher, and report the change in
unmatched rate. **There is no corpus.** Across all thirteen feedback issues
there is exactly one diagnosis string - "Atrial Fibrillation (AFib)" - and it is
canonical. No session logs have been exported at all.

So the before/after measurement the synonym work is supposed to justify cannot
be run yet. Log format 2 now records what is needed; the measurement becomes
possible once operators have exported some.

What follows is a constructed probe instead. It sizes the gap in principle. It
is not evidence about the real referral mix and should not be quoted as if it
were.

## What was measured

| Input | Matched |
|---|---|
| Canonical names (control) | 4/4 |
| Abbreviations | 16/20 |
| ICD-10 codes | 4/10 |
| Plain English | 2/8 |
| Fax shorthand | 0/10 |
| Misspellings | 0/8 |

## The finding that matters is not the misses

**Seven of the sixteen abbreviation "matches" are wrong**, and they are silent:

| Typed | Offered | Actually means |
|---|---|---|
| `AS` | Coronary Artery Di**se**ase | Aortic stenosis |
| `AR` | Coronary **Ar**tery Disease | Aortic regurgitation |
| `PE` | Angina **Pe**ctoris | Pulmonary embolism |
| `VT` | Blood Clot / D**VT** | Ventricular tachycardia |
| `MI` | Hyperlipide**mi**a | Myocardial infarction |
| `HTN` | Chest Tig**htn**ess | Hypertension |
| `ACS` | Premature Atrial Contractions (P**ACs**) | Acute coronary syndrome |

The operator types two letters and is offered a plausible, unrelated cardiac
diagnosis at the top of the list.

## Why

There are two matchers and only one of them is careful.

`specialtiesForDiagnosis()` is sound. Keywords of four characters or fewer take
a word-boundary regex, and span containment discards a hit that sits inside a
longer one. The prompt is right that it should not be changed.

The **diagnosis picker's search** is a different function, and it is a bare
substring test:

```js
CANONICAL_DIAGNOSES.filter(d => d.toLowerCase().indexOf(q) !== -1)
```

No word boundary, no minimum length. Every false match above is that line.

It also explains the other direction: a query longer than the canonical name can
never match, so `SOB` matches "Shortness of Breath (SOB)" and `SOB on exertion`
matches nothing at all. Ten of ten fax-shorthand strings fail for this reason,
not for want of vocabulary.

## What this means for the synonym work

**Adding abbreviations to a substring picker would make precision worse, not
better.** Each new short canonical entry is a new substring that will appear
inside unrelated diagnosis names. The vocabulary gap is real, but it is second
in line behind the picker.

Suggested order, for a decision rather than as a plan:

1. Give the picker the same discipline the specialty matcher already has - word
   boundaries for short queries, and token-wise matching so a longer query can
   match a shorter name. Behaviour change on the diagnosis screen; needs sign-off.
2. Collect real strings. Format 2 logs make this possible.
3. Then generate synonyms, measured against the real corpus, with the review step
   the prompt describes.

Doing 3 before 1 spends review effort on a component that will mis-serve it.
