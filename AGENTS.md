## Command Hygiene

Validation commands must be non-emitting unless the user explicitly approves an emitting build or generation step.

Run these validation commands in parallel:
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm exec lint`

Do not use build, watch, clean, or test tasks as validation unless the user has explicitly approved files being emitted or regenerated.
