# Architecture rules

- Keep lineup voice and style definitions in a shared pure module used by the announcer and speech function so selection and synthesis stay consistent.
- Calculate live and saved playing time through the shared participation timeline, not current field slots; use prior goals to detect provably reversed legacy changes.