import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export type DetectorMessage =
  | { type: 'pitch'; frequency: number; level: number }
  | { type: 'silence'; level: number }
  | { type: 'ready'; sampleRate: number }
  | { type: 'error'; error: string };

type Props = {
  onMessage: (msg: DetectorMessage) => void;
};

const HTML = `<!DOCTYPE html>
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
  var audioCtx,analyser,sourceNode,buffer,intervalId,running=false;

  function autoCorrelate(buf,sampleRate){
    var SIZE=buf.length,sum=0;
    for(var i=0;i<SIZE;i++){var v=buf[i];sum+=v*v;}
    var rms=Math.sqrt(sum/SIZE);
    if(rms<0.01)return{freq:-1,rms:rms};
    var r1=0,r2=SIZE-1,thres=0.2;
    for(var i=0;i<SIZE/2;i++)if(Math.abs(buf[i])<thres){r1=i;break;}
    for(var i=1;i<SIZE/2;i++)if(Math.abs(buf[SIZE-i])<thres){r2=SIZE-i;break;}
    var slice=buf.subarray(r1,r2);
    var SIZE2=slice.length;
    var c=new Float32Array(SIZE2);
    for(var i=0;i<SIZE2;i++){var s=0;for(var j=0;j<SIZE2-i;j++)s+=slice[j]*slice[j+i];c[i]=s;}
    var d=0;while(d<SIZE2-1&&c[d]>c[d+1])d++;
    var maxval=-1,maxpos=-1;
    for(var i=d;i<SIZE2;i++)if(c[i]>maxval){maxval=c[i];maxpos=i;}
    if(maxpos<=0||maxval<=0)return{freq:-1,rms:rms};
    var thr=maxval*0.9;
    var T0=maxpos;
    for(var i=d+1;i<SIZE2-1;i++){
      if(c[i]>=thr&&c[i]>=c[i-1]&&c[i]>c[i+1]){T0=i;break;}
    }
    var x1=c[T0-1]||0,x2=c[T0]||0,x3=c[T0+1]||0;
    var a=(x1+x3-2*x2)/2,b=(x3-x1)/2;
    if(a)T0=T0-b/(2*a);
    if(T0<=0)return{freq:-1,rms:rms};
    return{freq:sampleRate/T0,rms:rms};
  }

  function tick(){
    if(!running||!analyser)return;
    analyser.getFloatTimeDomainData(buffer);
    var r=autoCorrelate(buffer,audioCtx.sampleRate);
    if(r.freq>50&&r.freq<2000){
      send({type:'pitch',frequency:r.freq,level:r.rms});
    }else{
      send({type:'silence',level:r.rms});
    }
  }

  async function start(){
    try{
      var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,autoGainControl:false,noiseSuppression:false}});
      audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      analyser=audioCtx.createAnalyser();
      analyser.fftSize=2048;
      sourceNode=audioCtx.createMediaStreamSource(stream);
      sourceNode.connect(analyser);
      buffer=new Float32Array(analyser.fftSize);
      running=true;
      send({type:'ready',sampleRate:audioCtx.sampleRate});
      intervalId=setInterval(tick,90);
    }catch(e){
      var name=(e&&e.name)?e.name:'Error';
      var msg=(e&&e.message)?e.message:String(e);
      var has=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
      send({type:'error',error:name+': '+msg+' (gUM='+has+', secure='+window.isSecureContext+')'});
    }
  }

  start();
})();
</script>
</body>
</html>`;

export function PitchDetectorWebView({ onMessage }: Props) {
  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as DetectorMessage;
        onMessage(msg);
      } catch {
        /* ignore malformed payloads */
      }
    },
    [onMessage],
  );

  return (
    <WebView
      source={{ html: HTML, baseUrl: 'https://localhost' }}
      style={styles.hidden}
      containerStyle={styles.hidden}
      mediaPlaybackRequiresUserAction={false}
      mediaCapturePermissionGrantType="grant"
      allowsInlineMediaPlayback
      allowsProtectedMedia
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      onMessage={handleMessage}
      onPermissionRequest={(event: any) => {
        const ne = event?.nativeEvent;
        if (ne && typeof ne.grant === 'function') {
          ne.grant(ne.resources ?? ['android.webkit.resource.AUDIO_CAPTURE']);
        }
      }}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    opacity: 0,
    position: 'absolute',
    top: -1000,
    left: -1000,
    backgroundColor: 'transparent',
  },
});
