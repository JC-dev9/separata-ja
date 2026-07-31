import { GUITAR_MAX_HZ, GUITAR_MIN_HZ } from '@/src/utils/pitch';
import { YIN_SOURCE } from '@/src/utils/pitch-detect';

export type DetectorMessage =
  | { type: 'pitch'; frequency: number; confidence: number; level: number }
  | { type: 'silence'; level: number }
  | { type: 'ready'; sampleRate: number }
  | { type: 'error'; error: string; code: string };

// Abaixo deste limiar do YIN o período é aceite como periódico.
// 0.12 é conservador: prefere não mostrar nota a mostrar uma nota errada.
const YIN_THRESHOLD = 0.12;
const RMS_THRESHOLD = 0.008;

// Janela de análise. 4096 amostras (~93 ms a 44.1 kHz) dão margem suficiente
// para as cordas graves: em E2 (82 Hz) 2048 só continham ~3,8 períodos, o que
// tornava a leitura instável.
export const FFT_SIZE = 4096;
const TICK_MS = 80;

/**
 * Página que corre dentro do WebView do afinador.
 *
 * Vive à parte do componente para poder ser testada sem arrastar o módulo
 * nativo do react-native-webview — e porque um erro de sintaxe aqui só se
 * manifestaria no dispositivo.
 */
export function buildDetectorHtml(minHz: number, maxHz: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>html,body{margin:0;padding:0;background:transparent;}</style>
</head>
<body>
<script>
(function(){
  var send=function(m){try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));}catch(e){}};

  // Algoritmo YIN vindo de src/utils/pitch-detect.ts, onde vive em texto —
  // o Hermes descarta o código-fonte das funções, por isso injetá-lo com
  // toString() dava "bytecode is not defined". É este mesmo texto que os
  // testes exercitam, portanto não há duas versões a divergir.
  ${YIN_SOURCE}

  var audioCtx,analyser,sourceNode,buffer,intervalId,running=false;
  var minHz=${minHz},maxHz=${maxHz};

  // A gama de procura muda quando o utilizador escolhe outra corda.
  window.__setRange=function(lo,hi){minHz=lo;maxHz=hi;};

  function tick(){
    if(!running||!analyser)return;
    analyser.getFloatTimeDomainData(buffer);
    var sr=audioCtx.sampleRate;
    var result=detectPitchYin(buffer,sr,{
      minLag:Math.floor(sr/maxHz),
      maxLag:Math.ceil(sr/minHz),
      threshold:${YIN_THRESHOLD},
      rmsThreshold:${RMS_THRESHOLD}
    });
    if(result){
      send({type:'pitch',frequency:result.frequency,confidence:result.confidence,level:result.rms});
    }else{
      // Nível só para o indicador visual; não implica que haja nota.
      var sum=0;
      for(var i=0;i<buffer.length;i++){sum+=buffer[i]*buffer[i];}
      send({type:'silence',level:Math.sqrt(sum/buffer.length)});
    }
  }

  // Confirma no arranque que o algoritmo injetado funciona mesmo neste
  // dispositivo. Sem isto, uma falha de injeção matava o afinador em silêncio.
  // Devolve '' quando está tudo bem, ou a razão da falha.
  function selfTest(){
    if(typeof detectPitchYin!=='function'){
      return 'detectPitchYin e '+(typeof detectPitchYin);
    }
    var sr=44100,n=${FFT_SIZE},buf=new Float32Array(n);
    for(var i=0;i<n;i++){buf[i]=0.5*Math.sin(2*Math.PI*196*i/sr);}
    try{
      var r=detectPitchYin(buf,sr,{
        minLag:Math.floor(sr/${GUITAR_MAX_HZ}),
        maxLag:Math.ceil(sr/${GUITAR_MIN_HZ}),
        threshold:${YIN_THRESHOLD},
        rmsThreshold:${RMS_THRESHOLD}
      });
      if(!r)return 'devolveu null (esperado ~196Hz)';
      if(typeof r.frequency!=='number')return 'frequency e '+(typeof r.frequency);
      if(Math.abs(r.frequency-196)>=2)return 'leu '+r.frequency.toFixed(2)+'Hz em vez de 196Hz';
      return '';
    }catch(e){
      return 'excecao: '+((e&&e.message)?e.message:String(e));
    }
  }

  function classify(e){
    var name=(e&&e.name)?e.name:'Error';
    if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia))return 'unsupported';
    if(name==='NotAllowedError'||name==='SecurityError')return 'denied';
    if(name==='NotFoundError'||name==='DevicesNotFoundError')return 'no-device';
    if(name==='NotReadableError'||name==='TrackStartError')return 'busy';
    return 'unknown';
  }

  async function start(){
    var failure=selfTest();
    if(failure){
      send({type:'error',code:'detector-broken',error:'Auto-teste falhou - '+failure});
      return;
    }
    try{
      var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,autoGainControl:false,noiseSuppression:false}});
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      sourceNode=audioCtx.createMediaStreamSource(stream);

      // Passa-banda: corta zumbido da rede, vento e ruído de manuseamento em
      // baixo; chia e consoantes em cima. As fundamentais do violão
      // (82-330 Hz) e os primeiros harmónicos passam intactos.
      var hp1=audioCtx.createBiquadFilter();
      hp1.type='highpass';hp1.frequency.value=60;hp1.Q.value=0.707;
      var hp2=audioCtx.createBiquadFilter();
      hp2.type='highpass';hp2.frequency.value=60;hp2.Q.value=0.707;
      var lp=audioCtx.createBiquadFilter();
      lp.type='lowpass';lp.frequency.value=1200;lp.Q.value=0.707;

      analyser=audioCtx.createAnalyser();
      analyser.fftSize=${FFT_SIZE};

      sourceNode.connect(hp1);hp1.connect(hp2);hp2.connect(lp);lp.connect(analyser);

      buffer=new Float32Array(analyser.fftSize);
      running=true;
      send({type:'ready',sampleRate:audioCtx.sampleRate});
      intervalId=setInterval(tick,${TICK_MS});
    }catch(e){
      var msg=(e&&e.message)?e.message:String(e);
      var name=(e&&e.name)?e.name:'Error';
      send({type:'error',code:classify(e),error:name+': '+msg});
    }
  }

  start();
})();
</script>
</body>
</html>`;
}
