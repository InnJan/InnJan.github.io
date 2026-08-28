(function(){
  "use strict";

  var display=document.getElementById("display");
  var expression=document.getElementById("expression");
  var keys=document.getElementById("keys");
  var scienceKeys=document.getElementById("scienceKeys");
  var angleMode=document.getElementById("angleMode");
  var historyList=document.getElementById("historyList");
  var clearHistory=document.getElementById("clearHistory");
  var replayButton=document.getElementById("replayButton");
  var recordButton=document.getElementById("recordButton");
  var processLabel=document.getElementById("processLabel");
  var processBar=document.getElementById("processBar");
  var visualCode=document.getElementById("visualCode");
  var canvas=document.getElementById("numberArt");
  var context=canvas.getContext&&canvas.getContext("2d");

  var current="0",stored=null,operator=null,waiting=false,lastFormula="",history=[];
  var angleUnit="DEG";
  var artValue=0,artTarget=0,frame=0;
  var lastScene=null,activeScene=null,sceneStart=0;
  var SCENE_DURATION=7200;
  var recording=false,recordTimer=0;
  var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cleanNumber(value){
    if(!isFinite(value))return null;
    var rounded=Math.round(value*1000000000000)/1000000000000;
    return rounded===0?0:rounded;
  }
  function format(value){
    if(value===null)return "不可定义";
    var text=String(value);
    if(text.length>14)text=value.toExponential(7).replace("e+","e");
    return text;
  }
  function numericCurrent(){var value=Number(current);return isFinite(value)?value:0}
  function codeFor(value){
    var source=String(Math.abs(value)).replace(/\D/g,"")||"0",sum=0;
    for(var i=0;i<source.length;i++)sum+=Number(source.charAt(i));
    return ("0000"+((sum*97+source.length*31)%10000)).slice(-4);
  }
  function updateDisplay(){
    display.textContent=current;artTarget=numericCurrent();visualCode.textContent="FORM · "+codeFor(artTarget);
  }
  function inputDigit(digit){
    if(waiting||current==="不可定义"){current=digit;waiting=false}
    else if(current==="0")current=digit;
    else if(current.length<14)current+=digit;
    updateDisplay();
  }
  function inputDecimal(){
    if(waiting||current==="不可定义"){current="0.";waiting=false}
    else if(current.indexOf(".")===-1)current+=".";
    updateDisplay();
  }
  function clearAll(){
    current="0";stored=null;operator=null;waiting=false;lastFormula="";
    expression.textContent="准备计算";activeScene=null;processLabel.textContent="等待演算";processBar.style.transform="scaleX(0)";updateDisplay();
  }
  function toggleSign(){
    if(current!=="0"&&current!=="不可定义")current=current.charAt(0)==="-"?current.slice(1):"-"+current;
    updateDisplay();
  }
  function percent(){
    if(current!=="不可定义")current=format(cleanNumber(numericCurrent()/100));
    updateDisplay();
  }
  function calculate(a,b,op){
    if(op==="+")return cleanNumber(a+b);
    if(op==="−")return cleanNumber(a-b);
    if(op==="×")return cleanNumber(a*b);
    if(op==="÷")return b===0?null:cleanNumber(a/b);
    if(op==="^")return cleanNumber(Math.pow(a,b));
    return b;
  }
  function chooseOperator(next){
    var input=numericCurrent();
    if(operator&&waiting){operator=next;expression.textContent=format(stored)+" "+operator;return}
    if(stored!==null&&operator){
      var result=calculate(stored,input,operator);
      current=format(result);stored=result===null?null:result;
      if(result===null){expression.textContent="此运算没有有限结果";operator=null;waiting=true;updateDisplay();return}
    }else stored=input;
    operator=next;waiting=true;expression.textContent=format(stored)+" "+operator;updateDisplay();
  }
  function equals(){
    if(stored===null||!operator)return;
    var left=stored,right=numericCurrent(),usedOperator=operator;
    var result=calculate(left,right,usedOperator);
    lastFormula=format(left)+" "+usedOperator+" "+format(right)+" =";
    expression.textContent=result===null?"此运算没有有限结果":lastFormula;
    current=format(result);
    if(result!==null){
      addHistory(lastFormula,current);
      launchScene({a:left,b:right,op:usedOperator,result:result,formula:lastFormula+" "+current});
    }
    stored=null;operator=null;waiting=true;updateDisplay();
  }
  function backspace(){
    if(waiting||current==="不可定义")return;
    current=current.length>1?current.slice(0,-1):"0";
    if(current==="-")current="0";updateDisplay();
  }
  function addHistory(formula,result){
    history.unshift({formula:formula,result:result});if(history.length>4)history.pop();renderHistory();
  }
  function renderHistory(){
    while(historyList.firstChild)historyList.removeChild(historyList.firstChild);
    if(!history.length){
      var empty=document.createElement("span");empty.className="history-empty";empty.textContent="计算痕迹将出现在这里";historyList.appendChild(empty);return;
    }
    for(var i=0;i<history.length;i++){
      (function(item){
        var button=document.createElement("button");button.type="button";button.className="history-item";button.textContent=item.result;button.title=item.formula+" "+item.result;
        button.addEventListener("click",function(){current=item.result;stored=null;operator=null;waiting=true;expression.textContent=item.formula;updateDisplay()});historyList.appendChild(button);
      })(history[i]);
    }
  }
  function scienceLabel(name){
    return {sin:"sin",cos:"cos",tan:"tan",ln:"ln",log:"log",sqrt:"√",square:"x²"}[name]||name;
  }
  function applyScience(name){
    if(name==="power"){chooseOperator("^");return}
    if(name==="pi"||name==="e"){
      current=format(cleanNumber(name==="pi"?Math.PI:Math.E));waiting=true;stored=null;operator=null;
      expression.textContent=name==="pi"?"圆周率 π":"自然常数 e";updateDisplay();return;
    }
    var input=numericCurrent(),raw=null,label=scienceLabel(name),angle=input;
    if(angleUnit==="DEG")angle=input*Math.PI/180;
    if(name==="sin")raw=Math.sin(angle);
    else if(name==="cos")raw=Math.cos(angle);
    else if(name==="tan")raw=Math.abs(Math.cos(angle))<1e-12?null:Math.tan(angle);
    else if(name==="ln")raw=input>0?Math.log(input):null;
    else if(name==="log")raw=input>0?Math.log(input)/Math.LN10:null;
    else if(name==="sqrt")raw=input>=0?Math.sqrt(input):null;
    else if(name==="square")raw=input*input;
    var result=raw===null?null:cleanNumber(raw);
    var unit=(name==="sin"||name==="cos"||name==="tan")?" "+angleUnit:"";
    var formula=name==="square"?format(input)+"² =":label+"("+format(input)+")"+unit+" =";
    current=format(result);expression.textContent=result===null?"此运算没有实数结果":formula;
    if(result!==null){addHistory(formula,current);launchScene({a:input,b:null,op:label,result:result,formula:formula+" "+current})}
    stored=null;operator=null;waiting=true;updateDisplay();
  }
  function act(button){
    var digit=button.getAttribute("data-digit"),op=button.getAttribute("data-operator"),action=button.getAttribute("data-action");
    if(digit!==null)inputDigit(digit);else if(op)chooseOperator(op);else if(action==="decimal")inputDecimal();else if(action==="clear")clearAll();else if(action==="sign")toggleSign();else if(action==="percent")percent();else if(action==="equals")equals();
  }

  keys.addEventListener("click",function(event){
    var button=event.target.closest?event.target.closest("button"):event.target;
    if(button&&keys.contains(button))act(button);
  });
  scienceKeys.addEventListener("click",function(event){
    var button=event.target.closest?event.target.closest("button"):event.target;
    if(button&&scienceKeys.contains(button))applyScience(button.getAttribute("data-science"));
  });
  angleMode.addEventListener("click",function(){angleUnit=angleUnit==="DEG"?"RAD":"DEG";angleMode.textContent=angleUnit});
  clearHistory.addEventListener("click",function(){history=[];renderHistory()});

  function keyboardButton(selector){
    var button=keys.querySelector(selector);if(button){button.classList.add("active");window.setTimeout(function(){button.classList.remove("active")},110)}
  }
  document.addEventListener("keydown",function(event){
    var key=event.key;
    if(key>="0"&&key<="9"){inputDigit(key);keyboardButton('[data-digit="'+key+'"]')}
    else if(key==="."){inputDecimal();keyboardButton('[data-action="decimal"]')}
    else if(key==="+"){chooseOperator("+");keyboardButton('[data-operator="+"]')}
    else if(key==="-"){chooseOperator("−");keyboardButton('[data-operator="−"]')}
    else if(key==="*"){chooseOperator("×");keyboardButton('[data-operator="×"]')}
    else if(key==="/"){event.preventDefault();chooseOperator("÷");keyboardButton('[data-operator="÷"]')}
    else if(key==="^"){chooseOperator("^")}
    else if(key==="Enter"||key==="="){event.preventDefault();equals();keyboardButton('[data-action="equals"]')}
    else if(key==="Escape"){clearAll();keyboardButton('[data-action="clear"]')}
    else if(key==="Backspace"){backspace()}
    else if(key==="%"){percent();keyboardButton('[data-action="percent"]')}
  });

  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function ease(value){value=clamp(value,0,1);return 1-Math.pow(1-value,3)}
  function mix(a,b,t){return a+(b-a)*t}
  function digitSum(value){
    var source=String(Math.abs(value)).replace(/\D/g,"")||"0",sum=0;
    for(var i=0;i<source.length;i++)sum+=Number(source.charAt(i));return sum;
  }
  function resizeCanvas(){
    if(!context)return;
    var rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));context.setTransform(ratio,0,0,ratio,0,0);
  }
  function drawBackground(w,h,time){
    context.globalCompositeOperation="source-over";context.fillStyle="#111714";context.fillRect(0,0,w,h);
    var wash=context.createRadialGradient(w*.5,h*.46,0,w*.5,h*.46,Math.max(w,h)*.72);
    wash.addColorStop(0,"rgba(64,94,77,.38)");wash.addColorStop(.58,"rgba(17,23,20,.25)");wash.addColorStop(1,"#0d100f");context.fillStyle=wash;context.fillRect(0,0,w,h);
    context.strokeStyle="rgba(244,237,223,.045)";context.lineWidth=1;
    for(var gx=34;gx<w;gx+=58){context.beginPath();context.moveTo(gx,0);context.lineTo(gx,h);context.stroke()}
    for(var gy=34;gy<h;gy+=58){context.beginPath();context.moveTo(0,gy);context.lineTo(w,gy);context.stroke()}
    var drift=reduced?0:time*.000025;
    context.strokeStyle="rgba(215,180,106,.09)";context.beginPath();context.arc(w*.5,h*.48,Math.min(w,h)*(.34+Math.sin(drift)*.012),0,Math.PI*2);context.stroke();
  }
  function drawToken(value,x,y,r,color,alpha,rotation){
    context.save();context.translate(x,y);context.rotate(rotation||0);context.globalAlpha=clamp(alpha,0,1);
    var halo=context.createRadialGradient(0,0,0,0,0,r*1.45);halo.addColorStop(0,color+"55");halo.addColorStop(.58,color+"14");halo.addColorStop(1,color+"00");context.fillStyle=halo;context.beginPath();context.arc(0,0,r*1.45,0,Math.PI*2);context.fill();
    context.strokeStyle=color;context.lineWidth=1.2;context.beginPath();context.arc(0,0,r,0,Math.PI*2);context.stroke();
    context.setLineDash([2,7]);context.beginPath();context.arc(0,0,r*.72,0,Math.PI*2);context.stroke();context.setLineDash([]);
    context.fillStyle="#f4eddf";context.textAlign="center";context.textBaseline="middle";context.font=Math.max(18,r*.42)+"px Georgia, serif";context.fillText(format(cleanNumber(value)),0,0);
    context.restore();
  }
  function drawResultForm(value,cx,cy,r,time,alpha,scale){
    var sum=digitSum(value),petals=5+(sum%12),direction=value<0?-1:1,rotation=(reduced?0:time*.00018*direction)+sum*.17;
    context.save();context.translate(cx,cy);context.scale(scale,scale);context.rotate(rotation);context.globalAlpha=clamp(alpha,0,1);
    for(var i=0;i<petals;i++){
      var angle=Math.PI*2*i/petals,outer=r*(.84+((i+sum)%3)*.1),inner=r*.24;
      context.strokeStyle=i%3===0?"rgba(255,113,79,.88)":i%3===1?"rgba(223,234,120,.72)":"rgba(215,180,106,.68)";context.lineWidth=i%2?1:1.7;
      context.beginPath();context.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner);
      context.bezierCurveTo(Math.cos(angle+.8)*outer*.45,Math.sin(angle+.8)*outer*.45,Math.cos(angle-.45)*outer*.78,Math.sin(angle-.45)*outer*.78,Math.cos(angle)*outer,Math.sin(angle)*outer);context.stroke();
      context.beginPath();context.arc(Math.cos(angle)*outer,Math.sin(angle)*outer,2.5+(i%3),0,Math.PI*2);context.fillStyle=i%2?"#dfea78":"#ff714f";context.fill();
    }
    context.strokeStyle="rgba(244,237,223,.34)";context.lineWidth=1;context.beginPath();context.arc(0,0,r*.5,0,Math.PI*2);context.stroke();
    context.setLineDash([3,7]);context.beginPath();context.arc(0,0,r*1.12,0,Math.PI*2);context.stroke();context.setLineDash([]);context.restore();
    context.save();context.globalAlpha=clamp(alpha,0,1);context.fillStyle="#f4eddf";context.textAlign="center";context.textBaseline="middle";context.font=Math.max(24,Math.min(54,r*.38))+"px Georgia, serif";context.fillText(format(cleanNumber(value)),cx,cy);context.restore();
  }
  function drawIdle(time){
    var rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w*.5,cy=h*.49;
    artValue+=(artTarget-artValue)*.07;if(Math.abs(artTarget-artValue)<.0000001)artValue=artTarget;
    drawBackground(w,h,time);var magnitude=Math.min(1,Math.log(Math.abs(artValue)+1)/12),radius=Math.min(w,h)*(.19+magnitude*.12);
    drawResultForm(artValue,cx,cy,radius,time,1,1);
    context.fillStyle="rgba(244,237,223,.12)";context.textAlign="center";context.font=Math.min(150,w*.2)+"px Georgia, serif";context.fillText(String(5+digitSum(artValue)%12),w*.82,h*.84);
  }
  function drawParticles(cx,cy,r,time,progress,count){
    context.save();
    for(var i=0;i<count;i++){
      var seed=i*2.399963,travel=ease(progress),orbit=r*(.35+(i%7)*.12)*travel;
      var x=cx+Math.cos(seed+time*.00022*(i%2?1:-1))*orbit,y=cy+Math.sin(seed+time*.00016)*orbit;
      context.globalAlpha=(1-progress)*.55+progress*.22;context.fillStyle=i%3===0?"#ff714f":i%3===1?"#dfea78":"#d7b46a";
      context.beginPath();context.arc(x,y,1.2+(i%3),0,Math.PI*2);context.fill();
    }
    context.restore();
  }
  function drawScene(time,progress){
    var scene=activeScene||lastScene,rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w*.5,cy=h*.49,min=Math.min(w,h),tokenR=min*.118;
    drawBackground(w,h,time);
    var entering=ease(progress/.27),acting=ease((progress-.24)/.38),resolving=ease((progress-.6)/.4),unary=scene.b===null;
    var leftStart=-tokenR*1.8,leftRest=unary?cx-tokenR*1.28:cx-tokenR*1.7;
    var rightStart=w+tokenR*1.8,rightRest=cx+tokenR*1.7;
    var leftX=mix(leftStart,leftRest,entering),rightX=mix(rightStart,rightRest,entering);
    var merge=acting*.82;leftX=mix(leftX,cx,merge);rightX=mix(rightX,cx,merge);
    var tokenAlpha=1-resolving;
    drawToken(scene.a,leftX,cy,tokenR,"#ff714f",tokenAlpha,acting*.65);
    if(!unary)drawToken(scene.b,rightX,cy,tokenR,"#dfea78",tokenAlpha,-acting*.65);
    context.save();context.globalAlpha=clamp((progress-.12)*6,0,1)*(1-resolving*.72);context.fillStyle="#f4eddf";context.textAlign="center";context.textBaseline="middle";context.font=Math.max(35,min*.1)+"px Georgia, serif";
    context.fillText(scene.op,cx,cy);context.restore();
    if(acting>0){
      var beamAlpha=Math.sin(clamp((progress-.24)/.38,0,1)*Math.PI);
      context.save();context.globalAlpha=beamAlpha*.6;context.strokeStyle=scene.op==="−"?"#ff714f":scene.op==="÷"?"#d7b46a":"#dfea78";context.lineWidth=1+beamAlpha*2;
      context.beginPath();
      if(scene.op==="÷"){context.arc(cx,cy,tokenR*(.4+acting),0,Math.PI*2)}
      else if(scene.op==="×"||scene.op==="^"){for(var ray=0;ray<8;ray++){var a=Math.PI*2*ray/8;context.moveTo(cx,cy);context.lineTo(cx+Math.cos(a)*tokenR*2.4,cy+Math.sin(a)*tokenR*2.4)}}
      else{context.moveTo(cx-tokenR*2.2,cy);context.lineTo(cx+tokenR*2.2,cy)}
      context.stroke();context.restore();
    }
    if(resolving>0){
      drawParticles(cx,cy,tokenR*2.5,time,resolving,30);
      drawResultForm(scene.result,cx,cy,min*.265,time,resolving,.64+resolving*.36);
    }
    context.fillStyle="rgba(244,237,223,.48)";context.textAlign="center";context.font="9px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";context.fillText(progress<.27?"ACT I · 数字入场":progress<.62?"ACT II · 运算发生":"ACT III · 结果凝结",cx,h*.15);
    context.fillStyle="rgba(244,237,223,.76)";context.font=Math.max(13,Math.min(22,w*.03))+"px Georgia, 'Songti SC', serif";context.fillText(scene.formula,cx,h*.84);
  }
  function launchScene(scene,forRecording){
    lastScene={a:scene.a,b:scene.b,op:scene.op,result:scene.result,formula:scene.formula};activeScene=lastScene;sceneStart=performance.now();
    processLabel.textContent="数字入场";processBar.style.transform="scaleX(0)";replayButton.disabled=false;recordButton.disabled=recording;
    if(reduced&&!forRecording)sceneStart-=SCENE_DURATION*.82;
  }
  function animate(time){
    if(activeScene){
      var progress=clamp((time-sceneStart)/SCENE_DURATION,0,1);drawScene(time,progress);processBar.style.transform="scaleX("+progress+")";
      processLabel.textContent=progress<.27?"数字入场":progress<.62?"运算发生":progress<1?"结果凝结":"演算完成";
      if(progress>=1){activeScene=null;artValue=lastScene.result;artTarget=lastScene.result;processLabel.textContent="演算完成"}
    }else drawIdle(time);
    frame=window.requestAnimationFrame(animate);
  }
  function replay(){if(lastScene&&!recording)launchScene(lastScene,false)}
  function preferredMime(){
    if(!window.MediaRecorder)return "";
    var types=["video/mp4;codecs=avc1.42E01E","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
    if(!MediaRecorder.isTypeSupported)return "";
    for(var i=0;i<types.length;i++)if(MediaRecorder.isTypeSupported(types[i]))return types[i];
    return "";
  }
  function recordingAvailable(){return !!(context&&window.MediaRecorder&&(canvas.captureStream||canvas.mozCaptureStream))}
  function setRecordMessage(message){recordButton.textContent=message;window.setTimeout(function(){if(!recording)recordButton.textContent="保存演算视频"},1600)}
  function saveVideo(){
    if(recording)return;
    if(!lastScene){setRecordMessage("请先完成一次运算");return}
    if(!recordingAvailable()){setRecordMessage("此浏览器不支持录制");return}
    var capture=canvas.captureStream||canvas.mozCaptureStream,stream=capture.call(canvas,30),mime=preferredMime(),recorder,chunks=[];
    try{recorder=mime?new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000}):new MediaRecorder(stream)}catch(error){setRecordMessage("此浏览器不支持录制");return}
    recording=true;recordButton.disabled=true;replayButton.disabled=true;recordButton.textContent="正在生成视频…";
    recorder.addEventListener("dataavailable",function(event){if(event.data&&event.data.size)chunks.push(event.data)});
    recorder.addEventListener("stop",function(){
      var actual=recorder.mimeType||mime||"video/webm",extension=actual.indexOf("mp4")!==-1?"mp4":"webm",blob=new Blob(chunks,{type:actual}),url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="inn-jan-calculation-"+codeFor(lastScene.result)+"."+extension;document.body.appendChild(link);link.click();document.body.removeChild(link);
      window.setTimeout(function(){URL.revokeObjectURL(url)},2000);var tracks=stream.getTracks();for(var i=0;i<tracks.length;i++)tracks[i].stop();
      recording=false;recordButton.disabled=false;replayButton.disabled=false;recordButton.textContent="视频已保存";window.setTimeout(function(){recordButton.textContent="保存演算视频"},1600);
    });
    recorder.addEventListener("error",function(){recording=false;recordButton.disabled=false;replayButton.disabled=false;setRecordMessage("生成失败，请重试")});
    recorder.start(250);launchScene(lastScene,true);window.clearTimeout(recordTimer);recordTimer=window.setTimeout(function(){if(recorder.state!=="inactive")recorder.stop()},SCENE_DURATION+450);
  }

  replayButton.addEventListener("click",replay);recordButton.addEventListener("click",saveVideo);
  window.addEventListener("resize",function(){window.clearTimeout(window.__ijCalcResize);window.__ijCalcResize=window.setTimeout(resizeCanvas,120)});
  if(context){resizeCanvas();frame=window.requestAnimationFrame(animate)}else{replayButton.disabled=true;recordButton.disabled=true;processLabel.textContent="画布不可用"}
  if(!recordingAvailable()){recordButton.title="此浏览器可使用计算与动画，但不支持直接录制画布"}
  document.addEventListener("visibilitychange",function(){if(document.hidden&&frame){window.cancelAnimationFrame(frame);frame=0}else if(!document.hidden&&!frame)frame=window.requestAnimationFrame(animate)});
  updateDisplay();
})();
