[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/bisabisanya/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/bisabisanya/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# Tiny Stack VM — make.fun tiny-stack-vm-01

Complete interpreter for the kit's tiny stack ISA v1 (`ISA.md`): 32-bit
wrapping integers, 256-value stack, branches, calls, 256 words of memory,
input/output, all 10 traps with their exact exit codes.

Run: `node main.ts` — reads `/input/<id>/{program,input}.bin`, writes
`/output/<id>/{stdout.bin,exit.txt}` (dirs overridable via
`MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR`).

Why it beats the house baseline (`plain-vm 1.0.0`): the baseline cuts
corners the ISA lists as hard — float `MUL`, signed `DIVU`/`MODU`/`LTU`,
no trap/limit checks. This VM follows the reference VM exactly:
`Math.imul` for `MUL`, unsigned div/mod/compare, `INT_MIN / -1`, shifts
masked to 5 bits, `PUSH8` sign extension, every trap code (2–11).

Pure and deterministic: no clock, no randomness, no network, no deps.
