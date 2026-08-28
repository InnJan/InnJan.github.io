(function(){
  "use strict";

  var clockMain=document.getElementById("clockMain");
  var clockMs=document.getElementById("clockMs");
  var clockDate=document.getElementById("clockDate");
  var clockState=document.getElementById("clockState");
  var liveLabel=document.getElementById("liveLabel");
  var momentCode=document.getElementById("momentCode");
  var dayProgress=document.getElementById("dayProgress");
  var unixTime=document.getElementById("unixTime");
  var timezone=document.getElementById("timezone");
  var offset=document.getElementById("offset");
  var dayRemaining=document.getElementById("dayRemaining");
  var freezeButton=document.getElementById("freezeButton");
  var saveButton=document.getElementById("saveButton");
  var stopwatchMain=document.getElementById("stopwatchMain");
  var stopwatchMs=document.getElementById("stopwatchMs");
  var stopwatchToggle=document.getElementById("stopwatchToggle");
  var lapButton=document.getElementById("lapButton");
  var resetWatch=document.getElementById("resetWatch");
  var laps=document.getElementById("laps");
  var worldNodes=document.querySelectorAll("[data-zone]");
  var canvas=document.getElementById("timeArt");
  var chronograph=document.getElementById("chronograph");
  var context=canvas.getContext&&canvas.getContext("2d");

  var frozenTimestamp=null,frame=0,lastClockValue=-1,lastWorldSecond=-1;
  var watchRunning=false,watchStarted=0,watchStored=0,lapCount=0;
  var reduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var weekdays=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];

  function pad(value,length){var text=String(Math.floor(Math.abs(value)));while(text.length<(length||2))text="0"+text;return text}
  function timeText(milliseconds){
    var total=Math.max(0,Math.floor(milliseconds)),ms=total%1000,seconds=Math.floor(total/1000)%60,minutes=Math.floor(total/60000)%60,hours=Math.floor(total/3600000);
    return {main:pad(hours)+":"+pad(minutes)+":"+pad(seconds),ms:pad(ms,3)};
  }
  function momentId(timestamp){return pad(timestamp%1000000,6)}
  function localOffset(date){var minutes=-date.getTimezoneOffset(),sign=minutes>=0?"+":"−",absolute=Math.abs(minutes);return "UTC "+sign+pad(Math.floor(absolute/60))+":"+pad(absolute%60)}
  function localZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||"Local"}catch(error){return "Local"}}
  function resizeCanvas(){
    if(!context)return;var rect=chronograph.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));context.setTransform(ratio,0,0,ratio,0,0);
  }
  function drawRing(cx,cy,radius,fraction,color,ticks,width){
    var start=-Math.PI/2,end=start+Math.PI*2*fraction;
    context.strokeStyle="rgba(238,230,216,.09)";context.lineWidth=1;context.beginPath();context.arc(cx,cy,radius,0,Math.PI*2);context.stroke();
    context.strokeStyle=color;context.lineWidth=width;context.lineCap="round";context.beginPath();context.arc(cx,cy,radius,start,end);context.stroke();context.lineCap="butt";
    context.save();context.translate(cx,cy);context.strokeStyle="rgba(238,230,216,.16)";context.lineWidth=1;
    for(var i=0;i<ticks;i++){var angle=Math.PI*2*i/ticks,major=i%(ticks===60?5:1)===0,inside=radius-(major?8:4);context.beginPath();context.moveTo(Math.cos(angle)*inside,Math.sin(angle)*inside);context.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);context.stroke()}
    context.restore();
    var dotX=cx+Math.cos(end)*radius,dotY=cy+Math.sin(end)*radius;context.fillStyle=color;context.shadowColor=color;context.shadowBlur=15;context.beginPath();context.arc(dotX,dotY,3.4,0,Math.PI*2);context.fill();context.shadowBlur=0;
  }
  function drawArt(timestamp,isFrozen){
    if(!context)return;var rect=chronograph.getBoundingClientRect(),w=rect.width,h=rect.height,cx=w*.5,cy=h*.49,min=Math.min(w,h),date=new Date(timestamp),ms=date.getMilliseconds();
    var msFraction=ms/1000,secondFraction=(date.getSeconds()+msFraction)/60,minuteFraction=(date.getMinutes()+date.getSeconds()/60)/60,hourFraction=((date.getHours()%12)+date.getMinutes()/60)/12;
    context.globalCompositeOperation="source-over";context.fillStyle="#101a20";context.fillRect(0,0,w,h);
    var wash=context.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.72);wash.addColorStop(0,isFrozen?"rgba(255,101,79,.15)":"rgba(64,121,128,.2)");wash.addColorStop(.6,"rgba(16,26,32,.22)");wash.addColorStop(1,"#0c1418");context.fillStyle=wash;context.fillRect(0,0,w,h);
    context.strokeStyle="rgba(238,230,216,.035)";context.lineWidth=1;var drift=reduced?0:(timestamp%120000)/120000*54;
    for(var x=-54+drift;x<w+54;x+=54){context.beginPath();context.moveTo(x,0);context.lineTo(x,h);context.stroke()}
    for(var y=-54+drift;y<h+54;y+=54){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke()}
    var outer=min*.39,middle=min*.31,inner=min*.225,heart=min*.145;
    drawRing(cx,cy,outer,msFraction,"rgba(255,101,79,.9)",60,2.2);
    drawRing(cx,cy,middle,secondFraction,"rgba(220,233,123,.78)",60,1.7);
    drawRing(cx,cy,inner,minuteFraction,"rgba(119,184,192,.76)",60,1.45);
    drawRing(cx,cy,heart,hourFraction,"rgba(215,180,108,.68)",12,1.25);
    context.save();context.translate(cx,cy);context.rotate(msFraction*Math.PI*2);context.globalAlpha=isFrozen ? .78 : .34;context.strokeStyle=isFrozen?"#ff654f":"#77b8c0";
    for(var ray=0;ray<12;ray++){context.rotate(Math.PI*2/12);context.beginPath();context.moveTo(heart*.12,0);context.bezierCurveTo(heart*.55,-heart*.13,heart*.7,heart*.13,heart*.98,0);context.stroke()}
    context.restore();
    for(var i=0;i<24;i++){var seed=i*2.399963,orbit=inner+(i%5)*(outer-inner)/5,spin=(reduced?0:timestamp*.000018*(i%2?1:-1))+seed,px=cx+Math.cos(spin)*orbit,py=cy+Math.sin(spin)*orbit;context.globalAlpha=.18+(i%4)*.07;context.fillStyle=i%3===0?"#ff654f":i%3===1?"#dce97b":"#77b8c0";context.beginPath();context.arc(px,py,1+(i%3)*.65,0,Math.PI*2);context.fill()}
    context.globalAlpha=1;context.textAlign="center";context.fillStyle="rgba(238,230,216,.18)";context.font=Math.min(130,w*.1)+"px Georgia, serif";context.fillText(pad(ms,3),w*.84,h*.84);
    var stamp=date.getFullYear()+"."+pad(date.getMonth()+1)+"."+pad(date.getDate())+"  "+pad(date.getHours())+":"+pad(date.getMinutes())+":"+pad(date.getSeconds())+"."+pad(ms,3);context.textAlign="left";context.fillStyle=isFrozen?"rgba(255,101,79,.72)":"rgba(238,230,216,.24)";context.font="9px Georgia, serif";context.fillText(stamp,28,h-28);
    if(isFrozen){context.strokeStyle="rgba(255,101,79,.24)";context.setLineDash([2,8]);context.beginPath();context.arc(cx,cy,outer+16,0,Math.PI*2);context.stroke();context.setLineDash([])}
  }
  function updateClock(timestamp){
    if(timestamp===lastClockValue)return;lastClockValue=timestamp;var date=new Date(timestamp),main=pad(date.getHours())+":"+pad(date.getMinutes())+":"+pad(date.getSeconds()),ms=pad(date.getMilliseconds(),3);
    clockMain.textContent=main;clockMs.textContent=ms;clockDate.textContent=date.getFullYear()+" 年 "+pad(date.getMonth()+1)+" 月 "+pad(date.getDate())+" 日 · "+weekdays[date.getDay()];momentCode.textContent="MOMENT · "+momentId(timestamp);
    var start=new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime(),elapsed=timestamp-start,day=86400000,remaining=Math.max(0,day-elapsed),remain=timeText(remaining);
    dayProgress.textContent=(elapsed/day*100).toFixed(6)+"%";unixTime.textContent=String(timestamp);dayRemaining.textContent=remain.main;offset.textContent=localOffset(date);
  }
  function updateWorld(timestamp){
    var second=Math.floor(timestamp/1000);if(second===lastWorldSecond)return;lastWorldSecond=second;var date=new Date(timestamp);
    for(var i=0;i<worldNodes.length;i++){
      var node=worldNodes[i],zone=node.getAttribute("data-zone"),time="--:--:--",day="----";
      try{time=new Intl.DateTimeFormat("en-GB",{timeZone:zone,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(date);day=new Intl.DateTimeFormat("zh-CN",{timeZone:zone,month:"2-digit",day:"2-digit",weekday:"short"}).format(date)}catch(error){}
      while(node.firstChild)node.removeChild(node.firstChild);node.appendChild(document.createTextNode(time));var small=document.createElement("small");small.textContent=day;node.appendChild(small);
    }
  }
  function watchElapsed(){return watchStored+(watchRunning?performance.now()-watchStarted:0)}
  function updateStopwatch(){var value=timeText(watchElapsed());stopwatchMain.textContent=value.main;stopwatchMs.textContent=value.ms}
  function animate(){
    var timestamp=frozenTimestamp===null?Date.now():frozenTimestamp;updateClock(timestamp);updateWorld(timestamp);updateStopwatch();drawArt(timestamp,frozenTimestamp!==null);frame=window.requestAnimationFrame(animate);
  }
  function toggleFreeze(){
    if(frozenTimestamp===null){frozenTimestamp=Date.now();freezeButton.textContent="回到现在";saveButton.disabled=false;clockState.textContent="这一毫秒已经封存";liveLabel.textContent="Sealed temporal specimen";liveLabel.classList.remove("live-dot")}
    else{frozenTimestamp=null;lastClockValue=-1;freezeButton.textContent="封存此刻";saveButton.disabled=true;clockState.textContent="时间正在流动";liveLabel.textContent="Live local time";liveLabel.classList.add("live-dot")}
  }
  function saveMoment(){
    if(frozenTimestamp===null||!context)return;drawArt(frozenTimestamp,true);var finish=function(url){var link=document.createElement("a");link.href=url;link.download="inn-jan-moment-"+frozenTimestamp+".png";document.body.appendChild(link);link.click();document.body.removeChild(link)};
    if(canvas.toBlob)canvas.toBlob(function(blob){if(!blob)return;var url=URL.createObjectURL(blob);finish(url);window.setTimeout(function(){URL.revokeObjectURL(url)},2000)},"image/png");else finish(canvas.toDataURL("image/png"));
  }
  function toggleStopwatch(){
    if(watchRunning){watchStored+=performance.now()-watchStarted;watchRunning=false;stopwatchToggle.textContent="继续";lapButton.disabled=true}
    else{watchStarted=performance.now();watchRunning=true;stopwatchToggle.textContent="暂停";lapButton.disabled=false}
  }
  function addLap(){
    if(!watchRunning)return;lapCount++;if(lapCount===1)while(laps.firstChild)laps.removeChild(laps.firstChild);var value=timeText(watchElapsed()),row=document.createElement("div");row.className="lap";var label=document.createElement("span"),time=document.createElement("b");label.textContent="切片 "+pad(lapCount);time.textContent=value.main+"."+value.ms;row.appendChild(label);row.appendChild(time);laps.insertBefore(row,laps.firstChild);
  }
  function resetStopwatch(){
    watchRunning=false;watchStarted=0;watchStored=0;lapCount=0;stopwatchToggle.textContent="开始";lapButton.disabled=true;while(laps.firstChild)laps.removeChild(laps.firstChild);var empty=document.createElement("div");empty.className="lap-empty";empty.textContent="计次会在这里留下时间切片";laps.appendChild(empty);updateStopwatch();
  }

  freezeButton.addEventListener("click",toggleFreeze);saveButton.addEventListener("click",saveMoment);stopwatchToggle.addEventListener("click",toggleStopwatch);lapButton.addEventListener("click",addLap);resetWatch.addEventListener("click",resetStopwatch);
  window.addEventListener("resize",function(){window.clearTimeout(window.__ijClockResize);window.__ijClockResize=window.setTimeout(resizeCanvas,120)});
  document.addEventListener("visibilitychange",function(){if(document.hidden&&frame){window.cancelAnimationFrame(frame);frame=0}else if(!document.hidden&&!frame)frame=window.requestAnimationFrame(animate)});
  timezone.textContent=localZone();if(context)resizeCanvas();else{freezeButton.disabled=true;saveButton.disabled=true}frame=window.requestAnimationFrame(animate);
})();
