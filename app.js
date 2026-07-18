const $=id=>document.getElementById(id);
const state={
 unit:localStorage.getItem("wai-unit")||"c",
 loc:{name:"서울",latitude:37.5665,longitude:126.9780,country:"대한민국"},
 favs:JSON.parse(localStorage.getItem("wai-favs")||"[]"),
 weather:null,air:null,chart:null,map:null,radarFrames:[],radarIndex:0,radarLayer:null,radarTimer:null,
 globe:null,cyclones:[],deferredPrompt:null,audio:null
};
const codes={
0:["맑음","☀️","clear"],1:["대체로 맑음","🌤️","clear"],2:["부분 흐림","⛅","cloud"],3:["흐림","☁️","cloud"],
45:["안개","🌫️","cloud"],48:["서리 안개","🌫️","cloud"],51:["약한 이슬비","🌦️","rain"],53:["이슬비","🌦️","rain"],
55:["강한 이슬비","🌧️","rain"],61:["약한 비","🌦️","rain"],63:["비","🌧️","rain"],65:["강한 비","🌧️","rain"],
71:["약한 눈","🌨️","snow"],73:["눈","❄️","snow"],75:["강한 눈","❄️","snow"],80:["소나기","🌦️","rain"],
81:["소나기","🌧️","rain"],82:["강한 소나기","⛈️","storm"],95:["뇌우","⛈️","storm"],96:["우박 뇌우","⛈️","storm"],99:["강한 우박 뇌우","⛈️","storm"]
};
const info=c=>codes[c]||["날씨","🌡️","cloud"];
const tc=c=>state.unit==="c"?Math.round(c):Math.round(c*9/5+32);
const fmt=t=>new Date(t).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit",hour12:false});
function toast(m){$("toast").textContent=m;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
async function geocode(q){const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=ko&format=json`);const d=await r.json();if(!d.results?.length)throw Error("도시를 찾지 못했습니다.");return d.results[0]}
async function fetchAll(loc){
 const base=new URLSearchParams({latitude:loc.latitude,longitude:loc.longitude,current:"temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m",hourly:"temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_gusts_10m",daily:"weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max",timezone:"auto",forecast_days:"7"});
 const air=new URLSearchParams({latitude:loc.latitude,longitude:loc.longitude,hourly:"pm10,pm2_5,us_aqi",timezone:"auto",forecast_days:"3"});
 const [wr,ar]=await Promise.all([fetch(`https://api.open-meteo.com/v1/forecast?${base}`),fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${air}`)]);
 if(!wr.ok)throw Error("날씨 데이터를 불러오지 못했습니다.");return {weather:await wr.json(),air:ar.ok?await ar.json():null}
}
async function load(loc){
 try{toast("날씨 불러오는 중...");state.loc=loc;const d=await fetchAll(loc);state.weather=d.weather;state.air=d.air;
 renderAll();updateMap();updateGlobe();checkRainNotification();syncFavoritesToCloud();}catch(e){console.error(e);toast(e.message)}
}
function renderAll(){renderCurrent();renderHourly();renderDaily();renderChart();renderAlerts();renderFavs()}
function renderCurrent(){
 const w=state.weather,c=w.current,[desc,icon,theme]=info(c.weather_code);document.body.classList.remove("clear","cloud","rain","snow","storm");document.body.classList.add(theme);
 $("place").textContent=`${state.loc.name}${state.loc.admin1?`, ${state.loc.admin1}`:""}`;$("clock").textContent=new Date(c.time).toLocaleString("ko-KR",{month:"long",day:"numeric",weekday:"long",hour:"2-digit",minute:"2-digit"});
 $("temp").textContent=`${tc(c.temperature_2m)}°`;$("icon").textContent=icon;$("desc").textContent=desc;$("feels").textContent=`체감 ${tc(c.apparent_temperature)}°`;
 $("humidity").textContent=`${c.relative_humidity_2m}%`;$("wind").textContent=`${Math.round(c.wind_speed_10m)} km/h`;$("pressure").textContent=`${Math.round(c.surface_pressure)} hPa`;
 $("uv").textContent=w.daily.uv_index_max[0].toFixed(1);$("sunrise").textContent=fmt(w.daily.sunrise[0]);$("sunset").textContent=fmt(w.daily.sunset[0]);
 localBriefing();animateWeather(theme);setTimeBackground(new Date(c.time),new Date(w.daily.sunrise[0]),new Date(w.daily.sunset[0]))
}
function localBriefing(){
 const w=state.weather,c=w.current,d=w.daily,[desc]=info(c.weather_code);let advice="야외 활동하기 무난합니다.";
 const probs=w.hourly.precipitation_probability.slice(0,12),maxRain=Math.max(...probs);
 if(maxRain>=60)advice="몇 시간 안에 비 가능성이 높으니 우산을 챙기세요.";if(c.temperature_2m>=30)advice+=" 폭염과 탈수에 주의하세요.";
 if(c.temperature_2m<=0)advice+=" 노면 결빙과 보온에 주의하세요.";if(d.uv_index_max[0]>=6)advice+=" 자외선 차단제를 사용하세요.";
 $("briefingText").textContent=`현재 ${desc}, 오늘 ${tc(d.temperature_2m_min[0])}°~${tc(d.temperature_2m_max[0])}°입니다. ${advice}`
}
function renderHourly(){
 const w=state.weather,idx=Math.max(0,w.hourly.time.findIndex(t=>new Date(t)>=new Date(w.current.time)));
 $("hourly").innerHTML=w.hourly.time.slice(idx,idx+24).map((t,o)=>{let i=idx+o,[,ic]=info(w.hourly.weather_code[i]);return `<div class="hour"><small>${o?"": "지금"}${o?fmt(t):""}</small><div class="wi">${ic}</div><strong>${tc(w.hourly.temperature_2m[i])}°</strong><small>☔ ${w.hourly.precipitation_probability[i]??0}%</small></div>`}).join("")
}
function renderDaily(){const w=state.weather;$("daily").innerHTML=w.daily.time.map((t,i)=>{let [,ic]=info(w.daily.weather_code[i]);let name=i===0?"오늘":new Date(t+"T12:00").toLocaleDateString("ko-KR",{weekday:"long",month:"numeric",day:"numeric"});return `<div class="day"><strong>${name}</strong><div class="day-icon">${ic}</div><div class="temps"><span>${tc(w.daily.temperature_2m_min[i])}°</span><strong>${tc(w.daily.temperature_2m_max[i])}°</strong></div></div>`}).join("")}
function renderChart(){
 const w=state.weather,idx=Math.max(0,w.hourly.time.findIndex(t=>new Date(t)>=new Date(w.current.time))),labels=w.hourly.time.slice(idx,idx+24).map(fmt),temps=w.hourly.temperature_2m.slice(idx,idx+24).map(tc),rain=w.hourly.precipitation_probability.slice(idx,idx+24);
 state.chart?.destroy();state.chart=new Chart($("tempChart"),{type:"line",data:{labels,datasets:[{label:`온도 °${state.unit.toUpperCase()}`,data:temps,tension:.35,fill:true},{label:"강수확률 %",data:rain,tension:.3,yAxisID:"y1"}]},options:{responsive:true,interaction:{mode:"index",intersect:false},plugins:{legend:{labels:{color:getComputedStyle(document.body).color}}},scales:{x:{ticks:{color:getComputedStyle(document.body).color,maxTicksLimit:8},grid:{color:"rgba(255,255,255,.08)"}},y:{ticks:{color:getComputedStyle(document.body).color},grid:{color:"rgba(255,255,255,.08)"}},y1:{position:"right",min:0,max:100,ticks:{color:getComputedStyle(document.body).color},grid:{drawOnChartArea:false}}}}});
 const first=rain.findIndex(v=>v>=50);$("rainSoon").textContent=first>=0?`${first}시간 후 비 가능성 ${rain[first]}%`:"12시간 내 큰 비 가능성 낮음"
}
function renderAlerts(){
 const w=state.weather,c=w.current,d=w.daily,alerts=[];const maxP=Math.max(...w.hourly.precipitation_probability.slice(0,24)),maxG=Math.max(...w.hourly.wind_gusts_10m.slice(0,24));
 if(d.temperature_2m_max[0]>=33)alerts.push(["danger","폭염 주의",`오늘 최고 ${Math.round(d.temperature_2m_max[0])}°C`]);
 if(d.temperature_2m_min[0]<=-10)alerts.push(["danger","한파 주의",`오늘 최저 ${Math.round(d.temperature_2m_min[0])}°C`]);
 if(maxP>=70)alerts.push(["warn","강수 가능성 높음",`24시간 내 최대 강수확률 ${maxP}%`]);
 if(maxG>=70)alerts.push(["danger","강풍 가능성",`예상 최대 돌풍 ${Math.round(maxG)} km/h`]);
 if([95,96,99].includes(c.weather_code)||w.hourly.weather_code.slice(0,24).some(x=>[95,96,99].includes(x)))alerts.push(["danger","뇌우 가능성","번개와 돌풍에 주의하세요."]);
 if(d.uv_index_max[0]>=8)alerts.push(["warn","자외선 매우 높음",`UV 최대 ${d.uv_index_max[0].toFixed(1)}`]);
 if(!alerts.length)alerts.push(["ok","특별한 위험 신호 없음","현재 예보 기준으로 큰 위험 요소가 감지되지 않았습니다."]);
 $("alerts").innerHTML=alerts.map(a=>`<div class="alert ${a[0]}"><strong>${a[1]}</strong><small>${a[2]}</small></div>`).join("")
}
function renderFavs(){
 const exists=state.favs.some(f=>Math.abs(f.latitude-state.loc.latitude)<.001&&Math.abs(f.longitude-state.loc.longitude)<.001);$("favBtn").textContent=exists?"★ 즐겨찾기됨":"☆ 즐겨찾기";
 $("favorites").innerHTML=state.favs.map((f,i)=>`<button data-fav="${i}">${f.name}</button>`).join("")
}
function animateWeather(theme){
 const box=$("sky");box.innerHTML="";if(!["rain","snow","storm"].includes(theme))return;for(let i=0;i<(theme==="snow"?40:65);i++){let e=document.createElement("span");e.className=theme==="snow"?"snow-flake":"rain-drop";if(theme==="snow")e.textContent="❄";e.style.left=Math.random()*100+"%";e.style.animationDuration=(theme==="snow"?6+Math.random()*7:1+Math.random()*1.4)+"s";e.style.animationDelay=-(Math.random()*10)+"s";box.appendChild(e)}
 try{lottie.destroy("weather");lottie.loadAnimation({container:$("lottieBg"),renderer:"svg",loop:true,autoplay:true,name:"weather",path:theme==="rain"||theme==="storm"?"https://assets10.lottiefiles.com/packages/lf20_xr1nkmkk.json":"https://assets2.lottiefiles.com/packages/lf20_Stdaec.json"})}catch{}
}
function setTimeBackground(now,sunrise,sunset){const h=now.getHours();document.documentElement.style.setProperty("--time",(h<6||h>=20)?"night":h<9?"dawn":h<17?"day":"sunset")}
function initMap(){
 state.map=L.map("radarMap",{zoomControl:true}).setView([state.loc.latitude,state.loc.longitude],7);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}).addTo(state.map);loadRadar()
}
async function loadRadar(){
 try{const d=await fetch("https://api.rainviewer.com/public/weather-maps.json").then(r=>r.json());state.radarFrames=d.radar?.past||[];state.radarIndex=Math.max(0,state.radarFrames.length-1);showRadarFrame()}catch(e){$("radarTime").textContent="레이더 API 연결 실패"}
}
function showRadarFrame(){
 if(!state.radarFrames.length)return;state.radarLayer&&state.map.removeLayer(state.radarLayer);const f=state.radarFrames[state.radarIndex];
 state.radarLayer=L.tileLayer(`https://tilecache.rainviewer.com${f.path}/256/{z}/{x}/{y}/2/1_1.png`,{opacity:.66,zIndex:10,maxZoom:7}).addTo(state.map);
 $("radarTime").textContent=new Date(f.time*1000).toLocaleString("ko-KR")
}
function updateMap(){state.map?.setView([state.loc.latitude,state.loc.longitude],7)}
function toggleRadar(){if(state.radarTimer){clearInterval(state.radarTimer);state.radarTimer=null;$("radarPlay").textContent="▶ 재생"}else{state.radarTimer=setInterval(()=>{state.radarIndex=(state.radarIndex+1)%state.radarFrames.length;showRadarFrame()},700);$("radarPlay").textContent="⏸ 정지"}}
async function loadCyclones(){
 $("cyclones").textContent="태풍 정보를 불러오는 중...";try{
  const url="https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC&alertlevel=Green;Orange;Red&fromDate="+new Date(Date.now()-14*864e5).toISOString().slice(0,10);
  const d=await fetch(url).then(r=>{if(!r.ok)throw Error();return r.json()});const feats=d.features||d||[];
  state.cyclones=Array.isArray(feats)?feats.filter(x=>(x.properties?.eventtype||x.eventtype)==="TC").slice(0,12):[];
  if(!state.cyclones.length){$("cyclones").innerHTML="<div class='cyclone'><h3>활성 태풍 없음 또는 API 응답 없음</h3><p>GDACS 연결 상태에 따라 잠시 뒤 다시 시도하세요.</p></div>";updateGlobe();return}
  $("cyclones").innerHTML=state.cyclones.map(x=>{let p=x.properties||x,g=x.geometry?.coordinates||[p.longitude,p.latitude];return `<div class="cyclone"><h3>🌀 ${p.name||p.eventname||"Tropical Cyclone"}</h3><p>경보: ${p.alertlevel||p.alertLevel||"확인 중"}</p><p>위치: ${Number(g[1]||p.latitude).toFixed(2)}, ${Number(g[0]||p.longitude).toFixed(2)}</p><p>${p.description||p.country||""}</p></div>`}).join("");updateGlobe()
 }catch(e){$("cyclones").innerHTML="<div class='cyclone'><h3>GDACS 연결 제한</h3><p>브라우저 CORS 또는 일시적인 API 제한일 수 있습니다. 새로고침을 눌러 다시 시도하세요.</p></div>"}
}
function initGlobe(){
 state.globe=Globe()($("globe")).globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg").bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png").backgroundColor("rgba(0,0,0,0)").pointAltitude(.03).pointRadius(.35);
 state.globe.controls().autoRotate=true;state.globe.controls().autoRotateSpeed=.5;updateGlobe()
}
function updateGlobe(){
 if(!state.globe)return;const pts=[{lat:state.loc.latitude,lng:state.loc.longitude,size:.6,color:"#38bdf8",name:state.loc.name},...state.cyclones.map(x=>{let p=x.properties||x,g=x.geometry?.coordinates||[p.longitude,p.latitude];return {lat:Number(g[1]||p.latitude),lng:Number(g[0]||p.longitude),size:.8,color:"#fb7185",name:p.name||p.eventname||"Cyclone"}})];
 state.globe.pointsData(pts).pointLat("lat").pointLng("lng").pointRadius("size").pointColor("color").pointLabel("name");state.globe.pointOfView({lat:state.loc.latitude,lng:state.loc.longitude,altitude:1.8},900)
}
async function gptBriefing(){
 $("briefingText").textContent="GPT가 브리핑을 작성하고 있습니다...";
 try{const w=state.weather,p={location:state.loc,current:w.current,daily:{max:w.daily.temperature_2m_max[0],min:w.daily.temperature_2m_min[0],uv:w.daily.uv_index_max[0]},next12:{rain:w.hourly.precipitation_probability.slice(0,12),codes:w.hourly.weather_code.slice(0,12)}};
 const r=await fetch("/api/briefing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!r.ok)throw Error();const d=await r.json();$("briefingText").textContent=d.text||"브리핑 응답이 없습니다."
 }catch{localBriefing();toast("GPT 서버가 실행되지 않아 기본 AI 브리핑을 사용합니다.")}
}
function rainAudio(){
 if(state.audio){state.audio.close();state.audio=null;$("soundBtn").textContent="🔊 비 소리";return}
 const C=window.AudioContext||window.webkitAudioContext,ctx=new C(),buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 const src=ctx.createBufferSource();src.buffer=buffer;src.loop=true;const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.value=1600;const gain=ctx.createGain();gain.gain.value=.12;src.connect(filter).connect(gain).connect(ctx.destination);src.start();state.audio=ctx;$("soundBtn").textContent="🔇 소리 끄기"
}
async function enableNotifications(){
 if(!("Notification"in window))return toast("알림을 지원하지 않는 브라우저입니다.");const p=await Notification.requestPermission();toast(p==="granted"?"비 알림을 켰습니다.":"알림 권한이 허용되지 않았습니다.")
}
function checkRainNotification(){
 if(Notification.permission!=="granted"||!state.weather)return;const probs=state.weather.hourly.precipitation_probability.slice(0,6),i=probs.findIndex(v=>v>=70);if(i>=0&&localStorage.getItem("last-rain-note")!==new Date().toDateString()){new Notification("Weather AI 비 알림",{body:`${state.loc.name}: 약 ${i}시간 후 강수확률 ${probs[i]}%입니다.`,icon:"icons/icon-192.svg"});localStorage.setItem("last-rain-note",new Date().toDateString())}
}
function syncFavoritesToCloud(){window.weatherFirebase?.saveFavorites?.(state.favs)}
$("searchForm").addEventListener("submit",async e=>{e.preventDefault();let q=$("cityInput").value.trim();if(!q)return;try{let r=await geocode(q);load({name:r.name,admin1:r.admin1||"",country:r.country||"",latitude:r.latitude,longitude:r.longitude});$("cityInput").value=""}catch(e){toast(e.message)}})
$("gpsBtn").onclick=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>load({name:"현재 위치",latitude:p.coords.latitude,longitude:p.coords.longitude}),()=>toast("위치 권한을 허용해 주세요.")):toast("위치 기능을 지원하지 않습니다.")
$("favBtn").onclick=()=>{let i=state.favs.findIndex(f=>Math.abs(f.latitude-state.loc.latitude)<.001&&Math.abs(f.longitude-state.loc.longitude)<.001);i>=0?state.favs.splice(i,1):state.favs.push(state.loc);localStorage.setItem("wai-favs",JSON.stringify(state.favs));renderFavs();syncFavoritesToCloud()}
$("favorites").onclick=e=>{let b=e.target.closest("[data-fav]");if(b)load(state.favs[+b.dataset.fav])}
$("themeBtn").onclick=()=>document.body.classList.toggle("light");$("soundBtn").onclick=rainAudio;$("notifyBtn").onclick=enableNotifications;$("radarPlay").onclick=toggleRadar;$("cycloneRefresh").onclick=loadCyclones;$("aiBtn").onclick=gptBriefing;
$("loginBtn").onclick=()=>$("googleLogin").click();$("googleLogin").onclick=()=>window.weatherFirebase?.login?.()||toast("firebase-config.js 설정이 필요합니다.");$("logoutBtn").onclick=()=>window.weatherFirebase?.logout?.();
window.addEventListener("firebase-favorites",e=>{if(Array.isArray(e.detail)){state.favs=e.detail;localStorage.setItem("wai-favs",JSON.stringify(state.favs));renderFavs()}})
window.addEventListener("firebase-user",e=>$("accountStatus").textContent=e.detail?`${e.detail.displayName||e.detail.email} 로그인됨 · 클라우드 동기화 사용 중`:"로그아웃됨 · 로컬 저장 사용 중")
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.deferredPrompt=e;$("installBtn").hidden=false});$("installBtn").onclick=async()=>{if(!state.deferredPrompt)return;state.deferredPrompt.prompt();await state.deferredPrompt.userChoice;state.deferredPrompt=null;$("installBtn").hidden=true}
if("serviceWorker"in navigator)navigator.serviceWorker.register("service-worker.js");
initMap();initGlobe();loadCyclones();load(state.loc);
