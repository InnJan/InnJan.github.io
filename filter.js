(function(){
  "use strict";

  var presets={
    nc:{label:"NC / Natural Cinema",strength:88,exposure:35,contrast:-15,highlights:-32,shadows:28,warmth:4,tint:2,saturation:-12,fade:16,grain:15,vignette:8,softness:8,yellow:-28,green:-34,blue:-24,shadowCyan:8,highlightWarm:7,yellowHue:-9,greenHue:16,blueHue:-6},
    cc:{label:"CC / Classic Chrome",strength:90,exposure:10,contrast:10,highlights:-28,shadows:12,warmth:-4,tint:3,saturation:-15,fade:6,grain:14,vignette:8,softness:0,yellow:-34,green:-40,blue:-34,shadowCyan:7,highlightWarm:4,yellowHue:-8,greenHue:-8,blueHue:-6},
    flash:{label:"FLASH / 夜色闪光",strength:86,exposure:22,contrast:24,highlights:14,shadows:-24,warmth:-8,tint:4,saturation:4,fade:1,grain:10,vignette:17,softness:0,yellow:-10,green:-22,blue:-12,shadowCyan:18,highlightWarm:5,yellowHue:-4,greenHue:10,blueHue:-8},
    mist:{label:"MIST GOLD / 金雾",strength:84,exposure:30,contrast:-22,highlights:-18,shadows:28,warmth:15,tint:3,saturation:-8,fade:18,grain:12,vignette:6,softness:18,yellow:-14,green:-24,blue:-18,shadowCyan:4,highlightWarm:17,yellowHue:-8,greenHue:10,blueHue:-4},
    disposable:{label:"FLASH 2004 / 直闪",strength:91,exposure:45,contrast:18,highlights:20,shadows:-15,warmth:-2,tint:6,saturation:8,fade:5,grain:24,vignette:18,softness:3,yellow:-8,green:-16,blue:-8,shadowCyan:6,highlightWarm:8,yellowHue:-6,greenHue:8,blueHue:-4},
    revival:{label:"REVIVAL 2016 / 回潮",strength:78,exposure:25,contrast:-6,highlights:8,shadows:14,warmth:8,tint:5,saturation:14,fade:10,grain:8,vignette:5,softness:10,yellow:4,green:-8,blue:3,shadowCyan:2,highlightWarm:10,yellowHue:-4,greenHue:5,blueHue:-3},
    silver:{label:"SILVER / 银盐杂志",strength:100,exposure:8,contrast:18,highlights:-15,shadows:8,warmth:0,tint:0,saturation:-100,fade:9,grain:26,vignette:13,softness:2,yellow:0,green:0,blue:0,shadowCyan:0,highlightWarm:0,yellowHue:0,greenHue:0,blueHue:0},
    nocturne:{label:"NOCTURNE / 蓝调夜航",strength:88,exposure:-15,contrast:13,highlights:-24,shadows:10,warmth:-14,tint:2,saturation:-14,fade:8,grain:13,vignette:20,softness:4,yellow:-26,green:-30,blue:-16,shadowCyan:20,highlightWarm:3,yellowHue:-8,greenHue:18,blueHue:-10}
  };

  var fileInput=document.getElementById("fileInput");
  var uploadZone=document.getElementById("uploadZone");
  var editor=document.getElementById("editor");
  var beforeCanvas=document.getElementById("beforeCanvas");
  var afterCanvas=document.getElementById("afterCanvas");
  var presetGrid=document.getElementById("presetGrid");
  var compareRange=document.getElementById("compareRange");
  var beforeLayer=document.getElementById("beforeLayer");
  var splitLine=document.getElementById("splitLine");
  var chooseButton=document.getElementById("chooseButton");
  var resetButton=document.getElementById("resetButton");
  var exportButton=document.getElementById("exportButton");
  var fileName=document.getElementById("fileName");
  var imageInfo=document.getElementById("imageInfo");
  var activeName=document.getElementById("activeName");
  var status=document.getElementById("status");
  var uploadHint=document.getElementById("uploadHint");
  var controls=document.querySelectorAll("[data-control]");
  var sourceImage=null,sourceFile=null,activePreset="nc",params=copyPreset(presets.nc),renderTimer=0,rendering=false;

  function copyPreset(source){var result={};for(var key in source)if(Object.prototype.hasOwnProperty.call(source,key))result[key]=source[key];return result}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function signed(value){return value>0?"+"+value:String(value)}
  function outputText(name,value){if(name==="exposure")return (value>0?"+":"")+(value/100).toFixed(2);return name==="strength"||name==="fade"||name==="grain"||name==="vignette"?String(value):signed(value)}
  function syncControls(){
    for(var i=0;i<controls.length;i++){
      var input=controls[i],name=input.getAttribute("data-control");input.value=params[name];
      var output=input.parentNode.querySelector("output");if(output)output.textContent=outputText(name,Number(input.value));
    }
    activeName.textContent=presets[activePreset].label;
  }
  function setActiveButton(){
    var buttons=presetGrid.querySelectorAll(".preset");for(var i=0;i<buttons.length;i++)buttons[i].classList.toggle("active",buttons[i].getAttribute("data-preset")===activePreset);
  }
  function calibrateForImage(values,name){
    if(!sourceImage)return values;
    try{
      var sample=document.createElement("canvas"),ctx=sample.getContext("2d"),width=64,height=Math.max(1,Math.round(64*(sourceImage.naturalHeight||sourceImage.height)/(sourceImage.naturalWidth||sourceImage.width)));
      sample.width=width;sample.height=height;ctx.drawImage(sourceImage,0,0,width,height);var data=ctx.getImageData(0,0,width,height).data,total=0,count=0;
      for(var i=0;i<data.length;i+=16){var light=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;if(light>.025&&light<.975){total+=light;count++}}
      if(count){var average=total/count,target=name==="nocturne" ? .39 : (name==="flash"||name==="disposable" ? .52 : .47),correction=Math.log(target/Math.max(.04,average))/Math.LN2*35;values.exposure=clamp(Math.round(values.exposure+clamp(correction,-28,28)),-100,100)}
    }catch(error){}
    return values;
  }
  function applyPreset(name){
    if(!presets[name])return;activePreset=name;params=calibrateForImage(copyPreset(presets[name]),name);setActiveButton();syncControls();status.textContent=presets[name].label+(sourceImage?" · 已按照片光线自动校准":" 处方已应用");scheduleRender();
  }
  function fitDimensions(width,height,maxDimension){
    var scale=Math.min(1,maxDimension/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
  }
  function drawOriginal(canvas,maxDimension){
    var size=fitDimensions(sourceImage.naturalWidth||sourceImage.width,sourceImage.naturalHeight||sourceImage.height,maxDimension),ctx=canvas.getContext("2d");
    canvas.width=size.width;canvas.height=size.height;ctx.clearRect(0,0,size.width,size.height);ctx.drawImage(sourceImage,0,0,size.width,size.height);return size;
  }
  function hueToRgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p}
  function processCanvas(target,maxDimension){
    var size=fitDimensions(sourceImage.naturalWidth||sourceImage.width,sourceImage.naturalHeight||sourceImage.height,maxDimension);
    var work=document.createElement("canvas"),workContext=work.getContext("2d"),targetContext=target.getContext("2d");
    work.width=size.width;work.height=size.height;target.width=size.width;target.height=size.height;
    if("filter" in workContext&&params.softness>0)workContext.filter="blur("+(params.softness*.045).toFixed(2)+"px)";
    workContext.drawImage(sourceImage,0,0,size.width,size.height);workContext.filter="none";
    var imageData=workContext.getImageData(0,0,size.width,size.height),data=imageData.data,strength=params.strength/100;
    var exposure=Math.pow(2,params.exposure/100),contrast=1+params.contrast/100,saturation=1+params.saturation/100,fade=params.fade/100;
    var warmth=params.warmth/1000,tint=params.tint/1200,shadowCyan=params.shadowCyan/100,highlightWarm=params.highlightWarm/100;
    var centerX=(size.width-1)/2,centerY=(size.height-1)/2,maxDistance=Math.sqrt(centerX*centerX+centerY*centerY),vignette=params.vignette/100;
    for(var i=0,pixel=0;i<data.length;i+=4,pixel++){
      var originalR=data[i]/255,originalG=data[i+1]/255,originalB=data[i+2]/255;
      var r=originalR*exposure,g=originalG*exposure,b=originalB*exposure;
      var luminance=.2126*r+.7152*g+.0722*b;
      if(luminance<.5){var shadowWeight=(.5-luminance)*2,shadowLift=params.shadows/100*shadowWeight*.24;r+=shadowLift;g+=shadowLift;b+=shadowLift}
      else{var highWeight=(luminance-.5)*2,highShift=params.highlights/100*highWeight*.2;r+=highShift;g+=highShift;b+=highShift}
      r=(r-.5)*contrast+.5;g=(g-.5)*contrast+.5;b=(b-.5)*contrast+.5;
      var grey=.2126*r+.7152*g+.0722*b;r=grey+(r-grey)*saturation;g=grey+(g-grey)*saturation;b=grey+(b-grey)*saturation;
      r=clamp(r,0,1);g=clamp(g,0,1);b=clamp(b,0,1);
      var maximum=Math.max(r,g,b),minimum=Math.min(r,g,b),hue=0,sat=0,lightness=(maximum+minimum)/2,difference=maximum-minimum;
      if(difference!==0){sat=lightness>.5?difference/(2-maximum-minimum):difference/(maximum+minimum);if(maximum===r)hue=(g-b)/difference+(g<b?6:0);else if(maximum===g)hue=(b-r)/difference+2;else hue=(r-g)/difference+4;hue*=60}
      var selectiveSat=0,hueShift=0;if(hue>=35&&hue<82){selectiveSat=params.yellow;hueShift=params.yellowHue}else if(hue>=82&&hue<175){selectiveSat=params.green;hueShift=params.greenHue}else if(hue>=175&&hue<275){selectiveSat=params.blue;hueShift=params.blueHue}
      sat=clamp(sat*(1+selectiveSat/100),0,1);hue=((hue+hueShift)%360+360)%360/360;
      if(sat===0){r=lightness;g=lightness;b=lightness}else{var q=lightness<.5?lightness*(1+sat):lightness+sat-lightness*sat,p=2*lightness-q;r=hueToRgb(p,q,hue+1/3);g=hueToRgb(p,q,hue);b=hueToRgb(p,q,hue-1/3)}
      r+=warmth+tint*.5;g-=tint;b-=warmth+tint*.5;
      luminance=.2126*r+.7152*g+.0722*b;var dark=clamp((.58-luminance)/.58,0,1),light=clamp((luminance-.42)/.58,0,1);
      r-=shadowCyan*dark*.035;g+=shadowCyan*dark*.045;b+=shadowCyan*dark*.065;r+=highlightWarm*light*.065;g+=highlightWarm*light*.035;b-=highlightWarm*light*.035;
      r=fade*.13+r*(1-fade*.18);g=fade*.13+g*(1-fade*.18);b=fade*.13+b*(1-fade*.18);
      var x=pixel%size.width,y=(pixel/size.width)|0,distance=Math.sqrt((x-centerX)*(x-centerX)+(y-centerY)*(y-centerY))/maxDistance,edge=Math.pow(clamp((distance-.35)/.65,0,1),1.7),shade=1-vignette*edge*.72;
      r*=shade;g*=shade;b*=shade;
      var noise=((((pixel*1664525+1013904223)>>>16)&255)/255-.5)*(params.grain/100)*.18;r+=noise;g+=noise;b+=noise;
      r=originalR+(r-originalR)*strength;g=originalG+(g-originalG)*strength;b=originalB+(b-originalB)*strength;
      data[i]=Math.round(clamp(r,0,1)*255);data[i+1]=Math.round(clamp(g,0,1)*255);data[i+2]=Math.round(clamp(b,0,1)*255);
    }
    targetContext.putImageData(imageData,0,0);
  }
  function renderPreview(){
    if(!sourceImage||rendering)return;rendering=true;status.textContent="正在显影 · "+presets[activePreset].label;
    window.setTimeout(function(){try{processCanvas(afterCanvas,1500);status.textContent=presets[activePreset].label+" · 预览已更新"}catch(error){status.textContent="这张照片暂时无法处理，请换一张试试"}rendering=false},16);
  }
  function scheduleRender(){window.clearTimeout(renderTimer);renderTimer=window.setTimeout(renderPreview,90)}
  function loadFile(file){
    if(!file)return;if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){uploadHint.textContent="请选择 JPG、PNG 或 WebP 图片";return}
    if(file.size>30*1024*1024){uploadHint.textContent="图片超过 30MB，请先压缩后再试";return}
    var url=URL.createObjectURL(file),image=new Image();status.textContent="正在读取照片…";
    image.onload=function(){
      URL.revokeObjectURL(url);sourceImage=image;sourceFile=file;fileName.textContent=file.name;imageInfo.textContent=(image.naturalWidth||image.width)+" × "+(image.naturalHeight||image.height);
      uploadZone.hidden=true;editor.hidden=false;drawOriginal(beforeCanvas,1500);applyPreset(activePreset);compareRange.value="50";updateCompare();
    };
    image.onerror=function(){URL.revokeObjectURL(url);uploadHint.textContent="无法读取这张照片，请换一张试试"};image.src=url;
  }
  function updateCompare(){var value=Number(compareRange.value),right=100-value;beforeLayer.style.clipPath="inset(0 "+right+"% 0 0)";beforeLayer.style.webkitClipPath="inset(0 "+right+"% 0 0)";splitLine.style.left=value+"%"}
  function exportImage(){
    if(!sourceImage||rendering)return;rendering=true;exportButton.disabled=true;status.textContent="正在显影高清成片，请稍候…";
    window.setTimeout(function(){
      try{
        var exportCanvas=document.createElement("canvas");processCanvas(exportCanvas,3200);
        var finish=function(blob){
          if(!blob){status.textContent="导出失败：请尝试尺寸更小的照片";rendering=false;exportButton.disabled=false;return}var url=URL.createObjectURL(blob),link=document.createElement("a"),base=(sourceFile&&sourceFile.name?sourceFile.name:"inn-jan-photo").replace(/\.[^.]+$/,"").replace(/[^\w\u4e00-\u9fa5-]+/g,"-");
          link.href=url;link.download=base+"-"+activePreset+".jpg";document.body.appendChild(link);link.click();document.body.removeChild(link);window.setTimeout(function(){URL.revokeObjectURL(url)},2000);
          status.textContent="高清成片已导出";rendering=false;exportButton.disabled=false;
        };
        if(exportCanvas.toBlob)exportCanvas.toBlob(finish,"image/jpeg",.94);else{var data=exportCanvas.toDataURL("image/jpeg",.94),binary=atob(data.split(",")[1]),bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);finish(new Blob([bytes],{type:"image/jpeg"}))}
      }catch(error){status.textContent="导出失败：请尝试尺寸更小的照片";rendering=false;exportButton.disabled=false}
    },30);
  }

  fileInput.addEventListener("change",function(){loadFile(fileInput.files&&fileInput.files[0])});
  uploadZone.addEventListener("dragover",function(event){event.preventDefault();uploadZone.classList.add("drag")});
  uploadZone.addEventListener("dragleave",function(){uploadZone.classList.remove("drag")});
  uploadZone.addEventListener("drop",function(event){event.preventDefault();uploadZone.classList.remove("drag");loadFile(event.dataTransfer&&event.dataTransfer.files&&event.dataTransfer.files[0])});
  presetGrid.addEventListener("click",function(event){var button=event.target.closest?event.target.closest("button"):event.target;if(button&&presetGrid.contains(button))applyPreset(button.getAttribute("data-preset"))});
  for(var i=0;i<controls.length;i++)controls[i].addEventListener("input",function(){var name=this.getAttribute("data-control"),value=Number(this.value),output=this.parentNode.querySelector("output");params[name]=value;if(output)output.textContent=outputText(name,value);activeName.textContent="CUSTOM / 手工微调";scheduleRender()});
  compareRange.addEventListener("input",updateCompare);chooseButton.addEventListener("click",function(){fileInput.click()});resetButton.addEventListener("click",function(){applyPreset(activePreset)});exportButton.addEventListener("click",exportImage);
  syncControls();updateCompare();
})();
