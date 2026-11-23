// Tiny stack VM, make.fun tiny-stack-vm-01, ISA v1. Faithful port of the kit
// reference VM (generator/subject/vm.mjs): all 37 opcodes, all 10 traps,
// 32-bit wrapping arithmetic, unsigned DIVU/MODU/LTU. Deterministic: no
// clock, no randomness, no network; answers every instance in one run.
// node main.ts: /input/<id>/{program,input}.bin in, /output/<id>/ out.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// [immediate bytes, pops, pushes] per opcode byte.
const O = new Map([[0, [0, 0, 0]], [1, [1, 0, 1]], [2, [4, 0, 1]], [3, [0, 1, 0]], [4, [0, 1, 2]], [5, [0, 2, 2]], [6, [0, 2, 3]], [7, [0, 3, 3]], [16, [0, 2, 1]], [17, [0, 2, 1]], [18, [0, 2, 1]], [19, [0, 2, 1]], [20, [0, 2, 1]], [21, [0, 2, 1]], [22, [0, 2, 1]], [23, [0, 1, 1]], [24, [0, 2, 1]], [25, [0, 2, 1]], [26, [0, 2, 1]], [27, [0, 1, 1]], [28, [0, 2, 1]], [29, [0, 2, 1]], [30, [0, 2, 1]], [32, [0, 2, 1]], [33, [0, 2, 1]], [34, [0, 2, 1]], [48, [2, 0, 0]], [49, [2, 1, 0]], [50, [2, 1, 0]], [51, [2, 0, 0]], [52, [0, 0, 0]], [64, [0, 1, 1]], [65, [0, 2, 0]], [80, [0, 1, 0]], [81, [0, 1, 0]], [82, [0, 0, 1]], [83, [0, 1, 0]]]);
const enc = new TextEncoder();

function run(p, q) {
  const D = new Int32Array(256);
  let s = 0;
  const C = new Int32Array(64);
  let c = 0;
  const M = new Int32Array(256), o = new Uint8Array(65536);
  let l = 0, i = 0, pc = 0, n = 0;
  const done = (e) => ({ o: o.slice(0, l), e });
  for (;;) {
    if (n === 1e6) return done(10); // trap 10: step limit
    if (pc < 0 || pc >= p.length) return done(9); // trap 9: pc outside program
    const op = p[pc], t = O.get(op);
    if (!t) return done(5); // trap 5: unknown opcode
    const m = t[0];
    if (pc + m >= p.length) return done(9); // trap 9: cut-off immediate
    n++;
    const x = pc + 1 + m;
    if (s < t[1]) return done(2); // trap 2: stack underflow
    if (s - t[1] + t[2] > 256) return done(3); // trap 3: stack overflow
    pc = x;
    switch (op) {
      case 0: return done(0); // HALT
      case 1: D[s++] = (p[x - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: D[s++] = p[x - 4] | p[x - 3] << 8 | p[x - 2] << 16 | p[x - 1] << 24; break; // PUSH32
      case 3: s--; break; // POP
      case 4: D[s] = D[s - 1]; s++; break; // DUP
      case 5: { const v = D[s - 1]; D[s - 1] = D[s - 2]; D[s - 2] = v; break; } // SWAP
      case 6: D[s] = D[s - 2]; s++; break; // OVER
      case 7: { const a = D[s - 3]; D[s - 3] = D[s - 2]; D[s - 2] = D[s - 1]; D[s - 1] = a; break; } // ROT
      case 23: D[s - 1] = -D[s - 1] | 0; break; // NEG, wraps at INT_MIN
      case 27: D[s - 1] = ~D[s - 1]; break; // NOT
      case 16: case 17: case 18: case 19: case 20: case 21: case 22:
      case 24: case 25: case 26: case 28: case 29: case 30: case 32: case 33: case 34: {
        const b = D[s - 1], a = D[s - 2];
        let r;
        if (op === 16) r = a + b | 0; // ADD
        else if (op === 17) r = a - b | 0; // SUB
        else if (op === 18) r = Math.imul(a, b); // MUL, low 32 bits of exact product
        else if (op === 19) { if (!b) return done(4); r = a === -2147483648 && b === -1 ? a : a / b | 0; } // DIV
        else if (op === 20) { if (!b) return done(4); r = b === -1 ? 0 : a % b | 0; } // MOD
        else if (op === 21) { if (!b) return done(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; } // DIVU
        else if (op === 22) { if (!b) return done(4); r = (a >>> 0) % (b >>> 0) | 0; } // MODU
        else if (op === 24) r = a & b; // AND
        else if (op === 25) r = a | b; // OR
        else if (op === 26) r = a ^ b; // XOR
        else if (op === 28) r = a << (b & 31); // SHL
        else if (op === 29) r = a >> (b & 31); // SHR, arithmetic
        else if (op === 30) r = a >>> (b & 31) | 0; // SHRU, logical
        else if (op === 32) r = a === b ? 1 : 0; // EQ
        else if (op === 33) r = a < b ? 1 : 0; // LT, signed
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // LTU, unsigned
        s -= 2;
        D[s++] = r;
        break;
      }
      case 48: case 49: case 50: { // JMP / JZ / JNZ, signed 16-bit relative
        const rel = (p[x - 2] | p[x - 1] << 8) << 16 >> 16;
        let take = true;
        if (op !== 48) { const v = D[--s]; take = op === 49 ? v === 0 : v !== 0; }
        if (take) pc = x + rel;
        break;
      }
      case 51: // CALL, unsigned 16-bit absolute
        if (c === 64) return done(7); // trap 7: call stack overflow
        C[c++] = x;
        pc = p[x - 2] | p[x - 1] << 8;
        break;
      case 52: // RET
        if (!c) return done(8); // trap 8: RET on empty call stack
        pc = C[--c];
        break;
      case 64: { // LOAD
        const a = D[s - 1];
        if (a < 0 || a > 255) return done(6); // trap 6: bad address
        D[s - 1] = M[a];
        break;
      }
      case 65: { // STORE ( v addr -- )
        const a = D[s - 1], v = D[s - 2];
        if (a < 0 || a > 255) return done(6); // trap 6: bad address
        s -= 2;
        M[a] = v;
        break;
      }
      case 80: { // PRINT decimal ASCII, no newline
        const g = enc.encode(String(D[s - 1]));
        if (l + g.length > 65536) return done(11); // trap 11: output limit
        s--;
        o.set(g, l);
        l += g.length;
        break;
      }
      case 81: // PUTC, low byte
        if (l + 1 > 65536) return done(11); // trap 11: output limit
        o[l++] = D[--s] & 255;
        break;
      case 82: D[s++] = i < q.length ? q[i++] : -1; break; // IN, -1 at EOF
      case 83: return done(D[--s] & 255); // EXIT with the low byte
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O2 = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const d = join(I, id);
  const p = existsSync(join(d, 'program.bin')) ? new Uint8Array(readFileSync(join(d, 'program.bin'))) : new Uint8Array(0);
  const q = existsSync(join(d, 'input.bin')) ? new Uint8Array(readFileSync(join(d, 'input.bin'))) : new Uint8Array(0);
  const r = run(p, q);
  mkdirSync(join(O2, id), { recursive: true });
  writeFileSync(join(O2, id, 'stdout.bin'), r.o);
  writeFileSync(join(O2, id, 'exit.txt'), r.e + '\n');
}
