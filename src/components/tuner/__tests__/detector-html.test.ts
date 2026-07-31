import { buildDetectorHtml } from '../detector-html';

// O script injetado no WebView é montado por interpolação. Um erro aqui só se
// manifestaria no dispositivo — foi assim que o "[bytecode]" do Hermes passou
// despercebido até ao teste com o telemóvel.
const html = buildDetectorHtml(65, 450);

function extractScript(source: string): string {
  const match = /<script>([\s\S]*?)<\/script>/.exec(source);
  if (!match) throw new Error('bloco <script> não encontrado no HTML');
  return match[1];
}

describe('buildDetectorHtml', () => {
  it('produz um bloco script sintaticamente válido', () => {
    const script = extractScript(html);
    expect(() => new Function(script)).not.toThrow();
  });

  it('inclui o algoritmo de deteção', () => {
    expect(html).toContain('function detectPitchYin');
  });

  it('não contém bytecode do Hermes', () => {
    expect(html).not.toContain('[bytecode]');
  });

  it('não deixa interpolações por resolver', () => {
    const script = extractScript(html);
    expect(script).not.toContain('${');
    expect(script).not.toMatch(/\bundefined\b/);
    expect(script).not.toContain('NaN');
  });

  it('aplica a gama de procura recebida', () => {
    expect(extractScript(buildDetectorHtml(70, 400))).toContain('var minHz=70,maxHz=400');
  });

  it('expõe o gancho que muda a gama sem recarregar a página', () => {
    // É por aqui que o modo "Por corda" restringe a deteção.
    expect(html).toContain('window.__setRange');
  });

  it('monta a cadeia de filtros antes do analisador', () => {
    const script = extractScript(html);
    expect(script).toContain("hp1.type='highpass'");
    expect(script).toContain("lp.type='lowpass'");
    expect(script).toContain('lp.connect(analyser)');
  });

  it('corre o auto-teste antes de pedir o microfone', () => {
    // Se o detetor estiver partido, não vale a pena incomodar o utilizador
    // com o pedido de permissão. (`getUserMedia` sem await também aparece na
    // deteção de suporte, por isso ancoramos na chamada real.)
    const script = extractScript(html);
    const selfTestAt = script.indexOf('var failure=selfTest()');
    const micAt = script.indexOf('await navigator.mediaDevices.getUserMedia');
    expect(selfTestAt).toBeGreaterThan(-1);
    expect(micAt).toBeGreaterThan(-1);
    expect(selfTestAt).toBeLessThan(micAt);
  });
});
