import * as fs from 'fs';
import * as path from 'path';

import * as babel from '@babel/core';

/**
 * Regressão do crash "change in the order of Hooks" ao abrir uma música.
 *
 * A `createPreference` expunha um método `use()` que por dentro chamava
 * `useSyncExternalStore`, e os hooks faziam `pref.use()`. O React Compiler
 * (ligado em `app.json` → `experiments.reactCompiler`) identifica hooks pelo
 * nome do identificador chamado: `pref.use()` é um acesso a propriedade, não um
 * identificador, por isso ele tomou-o por uma chamada normal e memoizou-a. O
 * resultado compilado era
 *
 *     if ($[1] === Symbol.for("react.memo_cache_sentinel")) { t0 = pref.use(); ... }
 *     else { t0 = $[1]; }
 *
 * — o hook só corria no primeiro render, e a lista de hooks do `SongScreen`
 * encolhia a meio da vida dele.
 *
 * Isto testa-se ao nível do Babel e não com um render, porque é uma
 * transformação de build: o caller do Babel debaixo do jest não liga o
 * compilador (`supportsReactCompiler`), por isso um teste de renderização
 * passaria com o código partido e com o corrigido, sem distinguir os dois.
 */

/** O mesmo caller que o Metro usa a construir a app, com o compilador ligado. */
const CALLER = {
  name: 'metro',
  bundler: 'metro',
  platform: 'android',
  isDev: true,
  supportsReactCompiler: true,
};

function compilar(code: string, filename: string): string {
  const out = babel.transformSync(code, {
    filename,
    presets: [['babel-preset-expo', {}]],
    caller: CALLER,
    babelrc: false,
    configFile: false,
  });
  if (!out?.code) throw new Error(`Babel não devolveu código para ${filename}`);
  return out.code;
}

function compilarFicheiro(relativo: string): string {
  const absoluto = path.join(__dirname, '..', relativo);
  return compilar(fs.readFileSync(absoluto, 'utf8'), absoluto);
}

/** Nome do que está a ser chamado, atravessando o `(0, mod.fn)(...)` do interop CJS. */
function nomeDoCallee(node: babel.types.Node): string | null {
  const t = babel.types;
  let callee = node;
  if (t.isSequenceExpression(callee)) callee = callee.expressions[callee.expressions.length - 1];
  if (t.isIdentifier(callee)) return callee.name;
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) return callee.property.name;
  return null;
}

interface Chamada {
  condicional: boolean;
}

/** Procura as chamadas a `nomeAlvo` dentro da função `nomeFuncao` do código compilado. */
function chamadasDentroDe(codigo: string, nomeFuncao: string, nomeAlvo: string): Chamada[] {
  const ast = babel.parseSync(codigo, {
    babelrc: false,
    configFile: false,
    sourceType: 'unambiguous',
  });
  if (!ast) throw new Error('Não foi possível fazer parse do código compilado');

  const encontradas: Chamada[] = [];
  let viFuncao = false;

  babel.traverse(ast, {
    Function(fnPath) {
      const id = 'id' in fnPath.node ? fnPath.node.id : null;
      if (!id || id.name !== nomeFuncao) return;
      viFuncao = true;

      fnPath.traverse({
        CallExpression(callPath) {
          if (nomeDoCallee(callPath.node.callee) !== nomeAlvo) return;

          // Subimos até à fronteira da função: se encontrarmos um ramo pelo
          // caminho, o compilador memoizou a chamada e ela deixa de correr em
          // todos os renders.
          let p: typeof callPath.parentPath | null = callPath.parentPath;
          let condicional = false;
          while (p && !p.isFunction()) {
            if (p.isIfStatement() || p.isConditionalExpression() || p.isLogicalExpression()) {
              condicional = true;
              break;
            }
            p = p.parentPath;
          }
          encontradas.push({ condicional });
        },
      });
    },
  });

  if (!viFuncao) throw new Error(`Função ${nomeFuncao} não encontrada no código compilado`);
  return encontradas;
}

// O compilador é pesado; cada ficheiro é compilado uma vez só.
jest.setTimeout(60_000);

describe('React Compiler', () => {
  it('está mesmo ligado neste caller — senão o resto do ficheiro não prova nada', () => {
    const compilado = compilarFicheiro('useFontSize.ts');

    // Marca do runtime do compilador; sem ela os testes abaixo passavam por
    // omissão, sem transformação nenhuma a acontecer.
    expect(compilado).toMatch(/_compilerRuntime|react\/compiler-runtime/);
  });

  describe.each([
    ['useFontSize.ts', 'useFontSize'],
    ['useChordDictionaryCollapsed.ts', 'useChordDictionaryCollapsed'],
    ['useDefaultInstrument.ts', 'useDefaultInstrument'],
  ])('%s', (ficheiro, nomeHook) => {
    it(`${nomeHook} chama usePreference, e sem ficar dentro de um ramo`, () => {
      const chamadas = chamadasDentroDe(compilarFicheiro(ficheiro), nomeHook, 'usePreference');

      // Tem de aparecer: se alguém voltar a passar por um método (`pref.use()`),
      // o nome desaparece do output e esta expectativa falha.
      expect(chamadas).toHaveLength(1);
      expect(chamadas[0].condicional).toBe(false);
    });
  });

  it('usePreference chama useSyncExternalStore sem ficar dentro de um ramo', () => {
    const chamadas = chamadasDentroDe(
      compilarFicheiro('createPreference.ts'),
      'usePreference',
      'useSyncExternalStore',
    );

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].condicional).toBe(false);
  });

  it('confirma o perigo: um hook chamado por método de objecto é memoizado para dentro de um if', () => {
    // Controlo negativo — sem isto, os testes acima podiam estar a passar por o
    // detector não detectar nada. Esta é a forma exacta que rebentava.
    const antigo = `
      import { useCallback, useSyncExternalStore } from 'react';
      export const pref = {
        subscribe(listener) { return () => {}; },
        get() { return 19; },
        use() { return useSyncExternalStore(this.subscribe, this.get, this.get); },
      };
      export function useFontSize() {
        const fontSize = pref.use();
        const changeFont = useCallback((delta) => void 0, []);
        return { fontSize, changeFont };
      }
    `;
    const chamadas = chamadasDentroDe(
      compilar(antigo, path.join(__dirname, '..', 'useFontSize.ts')),
      'useFontSize',
      'use',
    );

    expect(chamadas).toHaveLength(1);
    expect(chamadas[0].condicional).toBe(true);
  });
});
