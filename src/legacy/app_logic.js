
/* ═══════════════════════ SUPABASE-MOCK DATA LAYER ═══════════════════════
   Every call below mirrors:  supabase.from('<table>').select()/insert()/update()
   On Replit, swap load()/save() for fetch(SUPABASE_URL + '/rest/v1/...')  */
const DBKEY='smriti_v1';
function seedDB(){
  const days=[...Array(14)].map((_,i)=>{const d=new Date(Date.now()-(13-i)*864e5);
    const t=i*0.9+Math.sin(i/2)*4;
    return{day:d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),
      memory:Math.round(58+t+Math.random()*8),attention:Math.round(62+t+Math.random()*8),speed:Math.round(54+t+Math.random()*9)};});
  return{
    users:[{username:'patient',password:'1234',role:'patient',name:'Biren Saikia',age:72,city:'Guwahati',avatar:'👴',phone:'+919876501111'},
           {username:'caregiver',password:'1234',role:'caregiver',name:'Pooja Saikia',relation:'Daughter',phone:'+919876543210'}],
    tasks:[{id:1,title:'Morning walk in the park',time:'07:00',done:true,icon:'🚶'},
           {id:2,title:'Take blood-pressure tablet',time:'09:00',done:true,icon:'💊'},
           {id:3,title:'Water the tulsi plants',time:'17:00',done:false,icon:'🌱'},
           {id:4,title:'Call Pooja (daughter)',time:'18:30',done:false,icon:'📞'}],
    meds:[{id:1,name:'Donepazil 5mg',time:'09:00 AM',taken:true},{id:2,name:'Vitamin D',time:'01:00 PM',taken:false},{id:3,name:'Memantine 10mg',time:'09:00 PM',taken:false}],
    appointment:{title:'Dr. Sharma — Memory Clinic, GMCH',day:'Friday',time:'11:00 AM'},
    diary:[{id:1,ts:Date.now()-864e5*2,text:'I had tea with Moloi in the garden this morning. The kahwa was strong.',trans:'আজি ৰাতিপুৱা মলয়ৰ সৈতে বাৰীত চাহ খাইছিলোঁ।',lang:'en-IN',to:'as',synced:true,audio:true},
           {id:2,ts:Date.now()-864e5,text:'Remembered our Bihu dance from 1998. Bihu danced with dhol. Felt happy.',trans:'मुझे 1998 का बिहू नृत्य याद आया। ढोल के साथ बिहू नाचा। अच्छा लगा।',lang:'en-IN',to:'hi',synced:true,audio:true}],
    scores:days,
    gameLog:[{game:'match',score:82,ts:Date.now()-36e5*5},{game:'odd',score:74,ts:Date.now()-36e5*20},{game:'seq',score:68,ts:Date.now()-864e5*30}],
    zones:[{id:1,name:'🏠 Home',x:200,y:150,r:55},{id:2,name:'🛕 Temple',x:95,y:95,r:42},{id:3,name:'🌳 Park',x:315,y:205,r:45}],
    alerts:[{id:1,type:'info',msg:'Hydration goal missed by 3 glasses yesterday',ts:Date.now()-864e5,status:'new'},
            {id:2,type:'good',msg:'Completed Memory Match Lv 3 — 82 pts 🎉',ts:Date.now()-36e5*5,status:'new'},
            {id:3,type:'warn',msg:'Evening walk skipped on Tuesday',ts:Date.now()-864e5*2,status:'old'}],
    hydration:{count:2,goal:8,date:new Date().toDateString()},
    levels:{match:2,seq:2,odd:2,pairs:1,treasure:1,talk:1},
    book:{profile:{name:'Biren Saikia',age:'72',born:'14 March 1954',home:'Nizarapara, Guwahati, Assam',job:'Retired Tea Estate Manager',food:'Masor tenga & komal Saul',song:'Bihu Husori',language:'Assamese · English'},
      family:[{n:'Moloi Saikia',r:'Wife · childhood sweetheart',p:'98765 02222',e:'👵',photo:'family-moloi.png',age:'68',birthday:'2 November',memory:'Tea together at sunrise'},{n:'Pooja Saikia',r:'Daughter · Guardian',p:'98765 43210',e:'👩',photo:'family-pooja.png',age:'38',birthday:'18 July',memory:'Kaziranga trip · 2019'},{n:'Rohan Saikia',r:'Son · in Shillong',p:'98765 09999',e:'🧑',photo:'family-rohan.png',age:'34',birthday:'9 January',memory:'Sunday guitar evenings'}],
      routine:[{t:'6:30 AM',a:'Wake up, drink warm water'},{t:'7:00 AM',a:'Walk in the park'},{t:'9:00 AM',a:'Breakfast + tablets'},{t:'4:30 PM',a:'Tea & story time'},{t:'9:00 PM',a:'Night medicine & sleep'}],
      places:[{n:'Home',e:'🏡',d:'Nizarapara, near temple'},{n:'Kaziranga',e:'🦏',d:'Saw rhino with Pooja, 2019'},{n:'Tea Garden',e:'🍃',d:'Where I worked 30 years'}],
      help:{doc:'Dr. R. Sharma · GMCH Memory Clinic',docp:'0361-2345678',addr:'Nizarapara, Guwahati-781001',blood:'B+'}},
    settings:{lang:'en',ts:'md',voice:true,rate:0.9,nMed:true,nHyd:true,nGeo:true,contrast:false,offline:false},
    lastActive:Date.now(),
    location:null
  };
}
const DB={data:null,
  load(){this.data=JSON.parse(localStorage.getItem(DBKEY)||'null')||seedDB();this.save();},
  save(){localStorage.setItem(DBKEY,JSON.stringify(this.data));} // → supabase upsert
};
DB.load(); const db=DB.data;
const bookDefaults=seedDB().book;
db.book.profile={...bookDefaults.profile,...(db.book?.profile||{})};
db.book.family=(db.book?.family||[]).map((f,i)=>({...bookDefaults.family[i],...f,photo:(f.photo||bookDefaults.family[i].photo||'').replace(/\.jpg$/i,'.png')}));
bookDefaults.family.slice(db.book.family.length).forEach(f=>db.book.family.push({...f}));
DB.save();

/* ═════════ i18n ═════════ */
const I18N={
 en:{nav_home:'Home',nav_games:'Brain Games',nav_diary:'Voice Diary',nav_book:'Memory Book',nav_guard:'Geofencing',nav_settings:'Settings',play_today:'Train your brain',today_tasks:"Today's tasks",hydration:'Hydration',reco_games:'Recommended for you today',brain_gym:'Brain Gym',all_games:'All games',voice_diary:'Voice Diary',in_your_lang:'in your language',memory_book:'My Memory Book',settings:'Settings',
  greet_m:'Good morning',greet_a:'Good afternoon',greet_e:'Good evening',water_left:'glasses of water to go',tasks_left:'tasks remaining',save:'Save',edit:'Edit',cancel:'Cancel'},
 as:{nav_home:'ঘৰ',nav_games:'মগজুৰ খেল',nav_diary:'কণ্ঠ ডায়েৰী',nav_book:'স্মৃতি পুথি',nav_guard:'ৰক্ষক',nav_settings:'ছেটিং',play_today:'মগজু ব্যায়াম কৰক',today_tasks:'আজিৰ কামবোৰ',hydration:'পানী',reco_games:'আজিৰ বাবে উপদেশিত',brain_gym:'মগজু জিম',all_games:'সকলো খেল',voice_diary:'কণ্ঠ ডায়েৰী',in_your_lang:'আপোনাৰ ভাষাত',memory_book:'মোৰ স্মৃতি পুথি',settings:'ছেটিং',
  greet_m:'শুভ প্ৰভাত',greet_a:'শুভ অপৰাহ্ন',greet_e:'শুভ সন্ধিয়া',water_left:'গিলাচ পানী বাকী',tasks_left:'টা কাম বাকী',save:'সাঁচক',edit:'সম্পাদনা',cancel:'বাতিল'},
 bn:{nav_home:'বাড়ি',nav_games:'ব্রেইন গেমস',nav_diary:'ভয়েস ডায়েরি',nav_book:'স্মৃতি বই',nav_guard:'জিওফেন্সিং',nav_settings:'সেটিংস',play_today:'মস্তিষ্কের ব্যায়াম করুন',today_tasks:'আজকের কাজ',hydration:'জলপান',reco_games:'আজকের সুপারিশ',brain_gym:'ব্রেইন জিম',all_games:'সব খেলা',voice_diary:'ভয়েস ডায়েরি',in_your_lang:'আপনার ভাষায়',memory_book:'আমার স্মৃতি বই',settings:'সেটিংস',
  greet_m:'শুভ সকাল',greet_a:'শুভ অপরাহ্ন',greet_e:'শুভ সন্ধ্যা',water_left:'গ্লাস জল বাকি',tasks_left:'টি কাজ বাকি',save:'সংরক্ষণ',edit:'সম্পাদনা',cancel:'বাতিল'},
 hi:{nav_home:'घर',nav_games:'ब्रेन गेम्स',nav_diary:'वॉइस डायरी',nav_book:'स्मृति पुस्तक',nav_guard:'जियोफेंसिंग',nav_settings:'सेटिंग्स',play_today:'मस्तिष्क का व्यायाम करें',today_tasks:'आज के काम',hydration:'पानी',reco_games:'आज की सिफारिश',brain_gym:'ब्रेन जिम',all_games:'सभी खेल',voice_diary:'वॉइस डायरी',in_your_lang:'आपकी भाषा में',memory_book:'मेरी स्मृति पुस्तक',settings:'सेटिंग्स',
  greet_m:'सुप्रभात',greet_a:'सुप्रभात',greet_e:'शुभ संध्या',water_left:'गिलास पानी बाकी',tasks_left:'काम बाकी',save:'सहेजें',edit:'संपादित करें',cancel:'रद्द'}};
const t=k=>(I18N[db.settings.lang]||I18N.en)[k]||I18N.en[k]||k;
function applyLang(){document.querySelectorAll('[data-i18n]').forEach(el=>el.textContent=t(el.dataset.i18n));}
function speak(txt,lang){if(!db.settings.voice)return;try{const u=new SpeechSynthesisUtterance(txt);
  u.lang=lang||( {en:'en-IN',as:'hi-IN',bn:'bn-IN',hi:'hi-IN'}[db.settings.lang]||'en-IN');u.rate=db.settings.rate;speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}}

/* ═════════ utils ═════════ */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function toast(msg,icon='✅'){const d=document.createElement('div');
  d.className='toast card px-4 py-3 flex items-center gap-3 text-sm font-semibold ink';
  d.innerHTML=`<span class="text-xl">${icon}</span><span class="flex-1">${msg}</span>`;
  $('#toasts').appendChild(d);setTimeout(()=>{d.style.transition='.4s';d.style.opacity='0';d.style.transform='translateY(-10px)';setTimeout(()=>d.remove(),400);},3400);}
const star=n=>'⭐'.repeat(n)+'<span class="opacity-25">'+'⭐'.repeat(3-n)+'</span>';

/* ═════════ AUTH ═════════ */
$('#togglePass').onclick=()=>{const p=$('#loginPass');p.type=p.type==='password'?'text':'password';};
$$('.demo-fill').forEach(b=>b.onclick=()=>{$('#loginUser').value=b.dataset.u;$('#loginPass').value=b.dataset.p;});
$('#loginForm').onsubmit=e=>{e.preventDefault();
  const u=db.users.find(x=>x.username===$('#loginUser').value.trim()&&x.password===$('#loginPass').value);
  if(!u){const er=$('#loginErr');er.textContent='Invalid username or password. Try the demo accounts below.';er.classList.remove('hidden');return;}
  sessionStorage.setItem('smriti_session',u.role);route(u.role);};
$('#logoutBtn1').onclick=$('#logoutBtn2').onclick=()=>{sessionStorage.clear();location.reload();};
function route(role){$('#loginScreen').classList.add('hidden');
  if(role==='caregiver'){$('#careApp').classList.remove('hidden');initCaregiver();}
  else{$('#patientApp').classList.remove('hidden');initPatient();}}

/* ═════════ PATIENT ROUTER ═════════ */
let curPage='home';
function go(p){curPage=p;$$('.page').forEach(s=>s.classList.toggle('active',s.id==='page-'+p));
  $$('#botNav .nav-item,#sideNav .nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
  window.scrollTo({top:0,behavior:'smooth'});
  const titles={home:'Home',games:'Brain Games',diary:'Voice Diary',book:'Memory Book',geo:'Guardian',settings:'Settings'};
  speak(t('nav_'+p)||titles[p]);
  if(p==='geo')requestAnimationFrame(()=>{ensureGeoMap();if(geoMap){geoMap.invalidateSize(true);if(currentLocation)geoMap.setView([currentLocation.lat,currentLocation.lng],Math.max(geoMap.getZoom(),16));renderGeo();}});
  if(p==='book')renderBook();}
$$('#botNav .nav-item,#sideNav .nav-item').forEach(b=>b.onclick=()=>go(b.dataset.page));
$$('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));

/* ═════════ HOME ═════════ */
const QUOTES=['Old memories are like Assam tea — they only grow richer with time.','A slow walk by the Brahmaputra settles the mind like nothing else.','Every rhino in Kaziranga remembers the way home. So will you.','One game a day keeps the fog away.'];
function hourGreet(){const h=new Date().getHours();return h<12?'greet_m':h<17?'greet_a':'greet_e';}
function renderHeader(){const g=t(hourGreet());
  $('#hdrGreeting').textContent=`${g}, Biren`;$('#sideName').textContent='Biren Saikia';
  $('#hdrDate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})+' · '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});}
function renderHome(){
  const g=t(hourGreet());
  $('#homeGreetTime').textContent=g;$('#homeGreetName').textContent='Biren! '+(new Date().getHours()<12?'🌤':new Date().getHours()<17?'☀️':'🌆');
  const left=db.tasks.filter(x=>!x.done).length;
  $('#homeTasksLeft').textContent=left;$('#homeWaterLeft').textContent=Math.max(0,db.hydration.goal-db.hydration.count);
  if(db.hydration.date!==new Date().toDateString()){db.hydration={count:0,goal:8,date:new Date().toDateString()};DB.save();}
  // tasks
  $('#tasksList').innerHTML=db.tasks.map(x=>`
   <button class="taskRow w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${x.done?'opacity-60':''}" style="border-color:var(--line);background:${x.done?'#F6F2E9':'#fff'}" data-id="${x.id}">
     <span class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style="background:#F3EDE2">${x.done?'✅':x.icon}</span>
     <span class="flex-1"><span class="font-bold text-sm ink block">${x.title}</span><span class="text-xs muted">${x.time}</span></span>
     <span class="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs shrink-0" style="border-color:${x.done?'#0E7C66':'var(--line)'};color:#0E7C66">${x.done?'✓':''}</span>
   </button>`).join('');
  $$('.taskRow').forEach(b=>b.onclick=()=>{const task=db.tasks.find(x=>x.id==b.dataset.id);task.done=!task.done;
    if(task.done){toast(task.title+' — done! ⭐');speak('Wonderful! '+task.title+' complete.');}
    DB.save();renderHome();});
  const done=db.tasks.filter(x=>x.done).length;$('#taskProg').textContent=`${done} / ${db.tasks.length} done`;
  const next=[...db.meds].sort((a,b)=>(!a.taken&&!b.taken)?0:a.taken?1:-1)[0];
  $('#nextMed').textContent=`${next.name} · ${next.time}${next.taken?' (done ✓)':''}`;
  // hydration
  $('#hydCount').textContent=db.hydration.count;
  $('#hydArc').style.strokeDashoffset=351.8*(1-db.hydration.count/db.hydration.goal);
  $('#hydBtns').innerHTML=[...Array(8)].map((_,i)=>`<button class="glassBtn w-9 h-10 rounded-lg text-lg ${i<db.hydration.count?'':'opacity-30'}" data-i="${i}">💧</button>`).join('');
  $$('.glassBtn').forEach(b=>b.onclick=()=>{db.hydration.count=Math.max(0,+b.dataset.i+1);DB.save();renderHome();
    if(db.hydration.count===8){toast('Hydration goal complete! 💧🎉','🏆');speak('Excellent! You drank eight glasses of water today.');}});
  $('#quoteBox').textContent=QUOTES[Math.floor(Date.now()/6e5)%QUOTES.length];
  renderNotifs();
}
$('#hydAdd').onclick=()=>{db.hydration.count=Math.min(8,db.hydration.count+1);DB.save();renderHome();speak('Water logged. '+(8-db.hydration.count)+' glasses to go.');};
$('#homeSpeak').onclick=()=>{const g=t(hourGreet());const left=db.tasks.filter(x=>!x.done).length;
  speak(`${g}, Biren. You have ${left} tasks remaining, and ${Math.max(0,8-db.hydration.count)} glasses of water to drink. Would you like to play a game?`);};
$('#callPooja').onclick=()=>toast('Calling Pooja (+91 98765 43210)…','📞');

/* notifications */
function renderNotifs(){
  const items=[];
  if(db.settings.nMed)items.push({i:'💊',t:'Memantine 10mg at 9:00 PM',c:'#FBEAE5'});
  if(db.settings.nHyd&&db.hydration.count<8)items.push({i:'💧',t:`Drink water — ${8-db.hydration.count} glasses left`,c:'#E8F1F8'});
  items.push({i:'🗓',t:`${db.appointment.title} · ${db.appointment.day} ${db.appointment.time}`,c:'#FFF3DC'});
  items.push({i:'🛡',t:'All safe zones active · Biren is home',c:'#EDF6F2'});
  $('#notifList').innerHTML=items.map(x=>`<div class="flex items-center gap-3 p-3 rounded-xl" style="background:${x.c}"><span class="text-lg">${x.i}</span><p class="text-xs font-semibold ink flex-1">${x.t}</p></div>`).join('');
  $('#notifBadge').textContent=items.length;
}
$('#notifBtn').onclick=e=>{e.stopPropagation();$('#notifPanel').classList.toggle('hidden');};
document.addEventListener('click',e=>{if(!e.target.closest('#notifPanel,#notifBtn'))$('#notifPanel')?.classList.add('hidden');});
$('#voiceHdrBtn').onclick=()=>$('#homeSpeak').click();

/* ═════════ GAMES ═════════ */
const GAMES=[
 {id:'talk',name:'Talk & Remember',emoji:'💬',desc:'Talk with your AI companion and practise remembering',domain:'memory',how:'Answer friendly questions, recall your favourites, and build a personal memory story.'},
 {id:'treasure',name:'AI Treasure Hunt',emoji:'🗺️',desc:'Explore your home, find treasures, and train memory',domain:'attention',how:'Follow the clues, find the right objects, and complete the memory round.'},
 {id:'match',name:'Memory Match',emoji:'🃏',desc:'Flip cards, find pairs of familiar things',domain:'memory',how:'Tap two cards to flip them. Match all pairs!'},
 {id:'seq',name:'Follow the Beat',emoji:'🎵',desc:'Repeat the glowing pattern',domain:'speed',how:'Watch the pads glow in order, then tap the same order!'},
 {id:'odd',name:'Spot the Odd One',emoji:'🔍',desc:'Find the one that is different',domain:'attention',how:'One tile is different from the rest — tap it quickly!'},
 {id:'pairs',name:'Daily Routine Recall',emoji:'🧩',desc:'Remember linked pairs from your day',domain:'memory',how:'Study the pairs, then answer the quiz!'}];
const EMBEDDED_GAMES={};function embeddedGameFile(id){return id==='talk'?'memory-companion.html':'treasure-hunt.html';}
function embeddedGameUrl(id){return embeddedGameFile(id);}
function openEmbeddedGame(id){const file=embeddedGameFile(id);const w=window.open(file,'_blank','noopener');if(!w)location.href=file;}
const SYM=['🦏','🍵','🌺','🐘','🪷','🍃','🪔','🐦'];
function domainAvg(d){const last=db.scores.slice(-7);return Math.round(last.reduce((a,s)=>a+s[d],0)/last.length);}
function recommend(){const sc=GAMES.map(g=>({g,v:domainAvg(g.domain)})).sort((a,b)=>a.v-b.v);return sc.slice(0,2);}
function renderGames(){
  $('#recoStrip').innerHTML=recommend().map(({g,v},i)=>`
   <button class="gameCard card p-5 text-left hover:-translate-y-1 transition relative overflow-hidden" data-g="${g.id}">
     <span class="absolute -right-3 -top-3 text-7xl opacity-10">${g.emoji}</span>
     <span class="chip px-2.5 py-1 text-[10px] font-bold bg-[#FFF3DC]" style="border-color:#EBD6A8;color:#8A6210">✨ AI PICK #${i+1}</span>
     <p class="font-display text-lg font-bold ink mt-2">${g.emoji} ${g.name}</p>
     <p class="text-xs muted mt-1">${g.desc}</p>
     <p class="text-xs mt-2 font-bold" style="color:var(--brand)">Trains ${g.domain} · your score ${v} → Lv ${db.levels[g.id]}</p>
   </button>`).join('');
  $('#gameGrid').innerHTML=GAMES.map(g=>`
   <button class="gameCard card p-4 text-left hover:-translate-y-1 transition" data-g="${g.id}">
     <div class="text-3xl">${g.emoji}</div>
     <p class="font-bold text-sm ink mt-2">${g.name}</p>
     <p class="text-xs muted mt-0.5">${g.desc}</p>
     <span class="chip inline-block px-2.5 py-1 text-[10px] font-bold mt-2 bg-[#EDF6F2]" style="border-color:#CFE6DD;color:#0A5C4C">Lv ${db.levels[g.id]} · ${g.domain}</span>
   </button>`).join('');
  $$('.gameCard').forEach(b=>b.onclick=()=>startGame(b.dataset.g));
}
$('#openAnalysis').onclick=()=>{openAnalysis();};
$('#focusQuestBtn').onclick=()=>openFocusQuest();

/* --- adaptive engine (ML-lite EMA) --- */
function adjustLevel(id,acc){const l=db.levels[id];
  if(acc>=0.8&&l<5)db.levels[id]=l+1;else if(acc<0.5&&l>1)db.levels[id]=l-1;}
function logRound(id,acc,score){adjustLevel(id,acc);
  const today=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  let row=db.scores.find(s=>s.day===today);
  const g=GAMES.find(x=>x.id===id);const d=g.domain;
  if(!row){row={day:today,memory:60,attention:60,speed:60};db.scores.push(row);}
  row[d]=Math.round(row[d]*0.6+score*0.4); // EMA update → supabase upsert scores
  db.gameLog.push({game:id,score:Math.round(score),ts:Date.now()}); // → insert game_log
  db.lastActive=Date.now();DB.save();}

function showResult(acc,score,dur){$('#resEmoji').textContent=acc>=0.8?'🌟':acc>=0.5?'👍':'🌱';
  $('#resTitle').textContent=acc>=0.8?'Wonderful!':acc>=0.5?'Well done!':'Good try!';
  $('#resStars').innerHTML=star(acc>=0.8?3:acc>=0.5?2:1);
  $('#resStats').innerHTML=`<p>Accuracy <b class="ink">${Math.round(acc*100)}%</b></p><p>Score <b class="ink">${Math.round(score)}</b> pts</p><p>Time ${dur}s</p>`;
  $('#resultModal').classList.remove('hidden');$('#resultModal').classList.add('flex');
  speak(acc>=0.8?'Wonderful! Excellent memory!':'Well done! Keep practising.');}
$('#resDone').onclick=()=>{$('#resultModal').classList.add('hidden');$('#resultModal').classList.remove('flex');$('#gameOverlay').classList.add('hidden');$('#gameOverlay').classList.remove('flex');renderGames();};
let lastGame=null;
$('#resAgain').onclick=()=>{$('#resultModal').classList.add('hidden');$('#resultModal').classList.remove('flex');startGame(lastGame);};
$('#gameClose').onclick=()=>{$('#gameOverlay').classList.add('hidden');$('#gameOverlay').classList.remove('flex');renderGames();};

const OV=$('#gameOverlay');function ov(html){$('#gameBody').innerHTML=html;OV.classList.remove('hidden');OV.classList.add('flex');}
function openFocusQuest(){
  ov(`<div class="flex items-center justify-between gap-3 mb-3 pr-10"><div><h3 class="font-display text-xl font-bold ink">🔑 Medha Focus Quest</h3><p class="text-xs muted mt-1">The game opens as a standalone page so it works reliably offline and across all devices.</p></div><button id="launchFocusQuest" class="btn-p px-3 py-2 text-xs font-bold whitespace-nowrap">▶ Start game</button></div><div class="rounded-2xl p-8 text-center border-2" style="border-color:#EBD6A8;background:linear-gradient(135deg,#FFF8E7,#F4F0E7)"><div class="text-6xl mb-4">🔑</div><h4 class="font-display text-2xl font-bold ink">Find Grandma’s keys</h4><p class="muted text-sm mt-2 max-w-md mx-auto">A gentle two-step focus game. The standalone page is self-contained and works offline.</p><button id="launchFocusQuest2" class="btn-p px-5 py-3 mt-5 font-bold">Open Focus Quest</button><p class="text-xs muted mt-3">If a new tab is blocked, use the Start game button again.</p></div>`);
  const launch=()=>{const w=window.open('focus-quest-standalone.html','_blank','noopener');if(!w)location.href='focus-quest-standalone.html';};
  $('#launchFocusQuest').onclick=launch;$('#launchFocusQuest2').onclick=launch;
}

function startGame(id){lastGame=id;const g=GAMES.find(x=>x.id===id);speak(g.name+'. '+g.how);
 ({talk:gameTalk,treasure:gameTreasure,match:gameMatch,seq:gameSeq,odd:gameOdd,pairs:gamePairs})[id]();}

/* TALK & REMEMBER — supplied standalone game embedded in the Brain Gym overlay */
function gameTalk(){
  ov(`<div class="flex items-center justify-between gap-3 mb-3 pr-10">
    <div><h3 class="font-display text-xl font-bold ink">💬 Talk &amp; Remember</h3>
    <p class="text-xs muted mt-1">A friendly conversation game for memory and recall</p></div>
    <a href="#" onclick="event.preventDefault();openEmbeddedGame('talk')" class="chip px-3 py-2 bg-white text-xs font-bold whitespace-nowrap">↗ Open full screen</a>
  </div>
  <iframe src="memory-companion.html" title="Talk and Remember" class="w-full rounded-2xl border-0 bg-[#F6F4EF]" data-embedded-game="talk" style="height:calc(96vh - 112px);min-height:420px"></iframe>`);
  const frame=$('#gameBody iframe[data-embedded-game="talk"]');
  if(frame) frame.src=embeddedGameUrl('talk');
}

/* AI TREASURE HUNT — supplied standalone game embedded in the Brain Gym overlay */
function gameTreasure(){
  ov(`<div class="flex items-center justify-between gap-3 mb-3 pr-10">
    <div><h3 class="font-display text-xl font-bold ink">🗺️ AI Treasure Hunt</h3>
    <p class="text-xs muted mt-1">Camera-powered clues, treasure finding, and a memory round</p></div>
    <a href="#" onclick="event.preventDefault();openEmbeddedGame('treasure')" class="chip px-3 py-2 bg-white text-xs font-bold whitespace-nowrap">↗ Open full screen</a>
  </div>
  <iframe src="treasure-hunt.html" title="AI Treasure Hunt" class="w-full rounded-2xl border-0 bg-[#FFF8E7]" data-embedded-game="treasure" style="height:calc(96vh - 112px);min-height:420px"></iframe>`);
  const frame=$('#gameBody iframe[data-embedded-game="treasure"]');
  if(frame) frame.src=embeddedGameUrl('treasure');
}

/* MATCH */
function gameMatch(){const pairs=[2,3,4,5,6][db.levels.match-1];
  const deck=[...SYM.slice(0,pairs),...SYM.slice(0,pairs)].sort(()=>Math.random()-.5);
  ov(`<h3 class="font-display text-xl font-bold ink">🃏 Memory Match <span class="text-sm muted">Lv ${db.levels.match} · ${pairs} pairs</span></h3>
  <p class="text-xs muted mt-1">${GAMES[0].how}</p>
  <div class="mt-4 flex gap-3 text-sm font-bold"><span class="chip px-3 py-1.5 bg-white">Moves: <span id="mmMoves">0</span></span><span class="chip px-3 py-1.5 bg-white">⏱ <span id="mmTime">0</span>s</span></div>
  <div id="mmGrid" class="mt-4 grid grid-cols-4 gap-2.5"></div>`);
  const grid=$('#mmGrid');let flip=[],moves=0,t0=Date.now(),timer=setInterval(()=>$('#mmTime')&&($('#mmTime').textContent=Math.round((Date.now()-t0)/1000)),500);
  grid.innerHTML=deck.map((s,i)=>`<div class="mm-card" data-i="${i}" data-s="${s}"><div class="mm-in"><div class="mm-f bg-[#F3EDE2] border-2 text-2xl" style="border-color:var(--line)">🪷</div><div class="mm-f mm-b">${s}</div></div></div>`).join('');
  grid.querySelectorAll('.mm-card').forEach(c=>c.onclick=()=>{
    if(c.classList.contains('matched')||flip.length===2||c===flip[0])return;
    c.classList.add('flipped');flip.push(c);
    if(flip.length===2){moves++;$('#mmMoves').textContent=moves;
      const[a,b]=flip;
      if(a.dataset.s===b.dataset.s){a.classList.add('matched');b.classList.add('matched');flip=[];speak('Match!');
        if([...grid.querySelectorAll('.matched')].length===deck.length){clearInterval(timer);
          const acc=Math.min(1,pairs/moves);const dur=Math.round((Date.now()-t0)/1000);
          const score=Math.max(20,acc*100-Math.min(20,dur/6));
          logRound('match',acc,score);setTimeout(()=>showResult(acc,score,dur),600);}}
      else setTimeout(()=>{a.classList.remove('flipped');b.classList.remove('flipped');flip=[];},750);}});}

/* SEQUENCE */
function gameSeq(){const len=db.levels.seq+2;const pads=[{c:'#0E7C66',e:'🍵'},{c:'#E3A63B',e:'🪔'},{c:'#3E7CB1',e:'🦏'},{c:'#C2452D',e:'🌺'}];
  ov(`<h3 class="font-display text-xl font-bold ink">🎵 Follow the Beat <span class="text-sm muted">Lv ${db.levels.seq} · ${len} steps</span></h3>
  <p class="text-xs muted mt-1">${GAMES[1].how}</p>
  <div class="mt-3 chip px-3 py-1.5 bg-[#FFF3DC] inline-block text-xs font-bold" id="seqStatus">👀 Watch carefully…</div>
  <div id="seqPads" class="mt-4 grid grid-cols-2 gap-3 max-w-xs mx-auto"></div>`);
  $('#seqPads').innerHTML=pads.map((p,i)=>`<button class="pad" data-i="${i}" style="background:${p.c}"><span>${p.e}</span></button>`).join('');
  const seq=[...Array(len)].map(()=>Math.floor(Math.random()*4));let idx=0,t0=Date.now();
  const els=$$('#seqPads .pad');
  (async()=>{await new Promise(r=>setTimeout(r,900));
    for(const s of seq){els[s].classList.add('lit');await new Promise(r=>setTimeout(r,520));els[s].classList.remove('lit');await new Promise(r=>setTimeout(r,220));}
    $('#seqStatus').textContent='👆 Your turn!';els.forEach(e=>e.onclick=async()=>{
      const i=+e.dataset.i;e.classList.add('lit');setTimeout(()=>e.classList.remove('lit'),200);
      if(seq[idx]===i){idx++;
        if(idx===len){const acc=idx/len;const dur=Math.round((Date.now()-t0)/1000);
          $('#seqStatus').textContent='🎉 Perfect!';
          logRound('seq',acc,Math.min(100,acc*100+Math.max(0,30-dur)));setTimeout(()=>showResult(acc,acc*100,dur),500);}}
      else{const acc=idx/len;const dur=Math.round((Date.now()-t0)/1000);
        logRound('seq',acc,acc*80);
        $('#seqStatus').textContent='❌ Oops! Pattern was different.';
        els.forEach(x=>x.onclick=null);setTimeout(()=>showResult(acc,acc*80,dur),700);}});})();}

/* ODD ONE */
const ODDSETS=[['🌺','🦏'],['🌺','🌸'],['🍃','🍀'],['🍵','🫖'],['🐦','🐤'],['🪷','🌺']];
function gameOdd(){const rounds=4+db.levels.odd;let round=0,hits=0,t0=Date.now(),react=[];
  ov(`<h3 class="font-display text-xl font-bold ink">🔍 Spot the Odd One <span class="text-sm muted">Lv ${db.levels.odd} · ${rounds} rounds</span></h3>
  <p class="text-xs muted mt-1">${GAMES[2].how}</p>
  <div class="mt-3 flex gap-3"><span class="chip px-3 py-1.5 bg-white text-xs font-bold">Round <span id="oddQ">1</span>/${rounds}</span><span class="chip px-3 py-1.5 bg-white text-xs font-bold">⏱ <span id="oddT">0</span>s</span></div>
  <div id="oddGrid" class="mt-4 grid grid-cols-4 gap-2.5"></div>`);
  const timer=setInterval(()=>$('#oddT')&&($('#oddT').textContent=Math.round((Date.now()-t0)/1000)),500);
  const rt=Date.now();
  function next(){round++;if(round>rounds){clearInterval(timer);const dur=Math.round((Date.now()-t0)/1000);
      const acc=hits/rounds;const avgR=react.length?react.reduce((a,b)=>a+b,0)/react.length/1000:9;
      logRound('odd',acc,Math.min(100,acc*100-Math.min(20,avgR*3)));return showResult(acc,acc*95,dur);}
    $('#oddQ').textContent=round;
    const [base,odd]=ODDSETS[Math.floor(Math.random()*ODDSETS.length)];
    const n=8+db.levels.odd;const oddIdx=Math.floor(Math.random()*n);
    $('#oddGrid').innerHTML=[...Array(n)].map((_,i)=>`<button class="oddBtn aspect-square rounded-xl text-3xl flex items-center justify-center transition hover:scale-105" style="background:#F3EDE2;border:2px solid var(--line)">${i===oddIdx?odd:base}</button>`).join('');
    const r0=Date.now();
    $('#oddGrid').querySelectorAll('.oddBtn').forEach((b,i)=>b.onclick=()=>{
      if(i===oddIdx){hits++;react.push(Date.now()-r0);b.style.background='#EDF6F2';b.style.borderColor='#0E7C66';speak('Correct!');setTimeout(next,450);}
      else{b.style.background='#FBEAE5';b.style.borderColor='#C2452D';
        const dur=Math.round((Date.now()-t0)/1000);const acc=hits/rounds;clearInterval(timer);
        logRound('odd',acc,acc*90);setTimeout(()=>showResult(acc,acc*90,dur),500);}});}
  next();}

/* PAIRS */
const PAIRS=[['Morning','Tea with Moloi',['Tea with Moloi','Rice & dal','Night walk']],
 ['Noon','Rice & dal (masor tenga)',['Tea & biscuits','Rice & dal (masor tenga)','Bihu dance']],
 ['4 PM','Walk in the park',['Walk in the park','Night medicine','Morning bath']],
 ['Saturday','Bihu dance class',['Temple visit','Bihu dance class','Doctor visit']],
 ['Night','Kaziranga story time',['Morning tea','Kaziranga story time','Market trip']]];
function gamePairs(){const study=8+db.levels.pairs*2;let qi=0,correct=0,t0=Date.now();
  ov(`<h3 class="font-display text-xl font-bold ink">🧩 Routine Recall <span class="text-sm muted">Lv ${db.levels.pairs}</span></h3>
  <div id="pairsStage" class="mt-4"></div>`);
  const stage=$('#pairsStage');
  stage.innerHTML=`<p class="text-sm muted">Study these pairs — memorize them! ⏳ <b id="pTimer">${study}</b>s</p>
   <div class="mt-3 space-y-2">${PAIRS.map(([a,b])=>`<div class="flex items-center gap-3 p-3 rounded-xl" style="background:#FFF6E4"><span class="font-bold text-sm w-20 shrink-0" style="color:#8A6210">${a}</span><span class="text-lg">→</span><span class="font-bold text-sm ink">${b}</span></div>`).join('')}</div>`;
  let s=study;const iv=setInterval(()=>{s--;const el=$('#pTimer');if(!el)return clearInterval(iv);el.textContent=s;
    if(s<=0){clearInterval(iv);quiz();}},1000);
  function quiz(){stage.innerHTML=`<p class="text-sm font-bold ink">Question <span id="pQ">1</span>/5 — what goes with it?</p>
    <p id="pCue" class="font-display text-3xl font-bold mt-3" style="color:var(--brand)"></p><div id="pOpts" class="mt-4 space-y-2.5"></div>`;
    function next(){if(qi>=5){const dur=Math.round((Date.now()-t0)/1000);const acc=correct/5;
        logRound('pairs',acc,acc*100);return showResult(acc,acc*100,dur);}
      $('#pQ').textContent=qi+1;const[cue,ans,opts]=PAIRS[qi];$('#pCue').textContent=cue;
      $('#pOpts').innerHTML=opts.map(o=>`<button class="pOpt w-full p-3.5 rounded-xl border-2 font-bold text-sm text-left bg-white" style="border-color:var(--line)">${o}</button>`).join('');
      $$('.pOpt').forEach(b=>b.onclick=()=>{if(b.textContent===ans){correct++;b.style.background='#EDF6F2';b.style.borderColor='#0E7C66';}
        else{b.style.background='#FBEAE5';b.style.borderColor='#C2452D';
          $$('.pOpt').forEach(x=>{if(x.textContent===ans){x.style.background='#EDF6F2';x.style.borderColor='#0E7C66';}});}
        qi++;setTimeout(next,700);});}
    next();}}

/* analysis */
let radarChart=null;
function openAnalysis(){$('#analysisModal').classList.remove('hidden');$('#analysisModal').classList.add('flex');
  const m=domainAvg('memory'),a=domainAvg('attention'),s=domainAvg('speed');const mean=Math.round((m+a+s)/3);
  const risk=mean>=75?['Low engagement risk','#0E7C66','#EDF6F2','🌟 Steady and strong — keep the daily rhythm going!']:
    mean>=60?['Mild watch','#8A6210','#FFF3DC','👀 Slight dips detected — AI has raised game difficulty gently.']:
    ['Attention needed','#C2452D','#FBEAE5','🧠 Recommend a clinician review + more frequent sessions.'];
  $('#riskCard').style.background=risk[2];$('#riskCard').innerHTML=`<div class="flex items-center gap-3"><span class="text-3xl">${mean>=75?'🌟':mean>=60?'👀':'🧠'}</span>
   <div><p class="text-[10px] font-bold uppercase tracking-wider" style="color:${risk[1]}">Dementia-risk indicator (demo)</p>
   <p class="font-display text-xl font-bold ink">${risk[0]} · <span style="color:${risk[1]}">${mean}/100</span></p></div></div>
   <p class="text-xs mt-2" style="color:${risk[1]}">${risk[3]}</p>`;
  $('#domainBars').innerHTML=[['Memory',m,'#0E7C66'],['Attention',a,'#3E7CB1'],['Speed',s,'#E3A63B']].map(([n,v,c])=>
   `<div><div class="h-24 rounded-lg relative overflow-hidden" style="background:#F3EDE2"><div class="absolute bottom-0 inset-x-0 rounded-lg" style="height:${v}%;background:${c};transition:height .8s"></div></div><p class="text-[10px] font-bold muted mt-1">${n}</p><p class="text-xs font-bold ink">${v}</p></div>`).join('');
  radarChart?.destroy();
  radarChart=new Chart($('#radarCh'),{type:'radar',data:{labels:['Memory','Attention','Speed'],datasets:[
    {label:'Last 7 days',data:[m,a,s],fill:true,backgroundColor:'rgba(14,124,102,.18)',borderColor:'#0E7C66',pointBackgroundColor:'#0E7C66'},
    {label:'2 weeks ago',data:[db.scores[0].memory,db.scores[0].attention,db.scores[0].speed],fill:false,borderColor:'#E3A63B',borderDash:[5,4],pointRadius:2}]},
   options:{maintainAspectRatio:false,plugins:{legend:{labels:{font:{family:'Plus Jakarta Sans',size:10}}}},scales:{r:{min:40,max:100,ticks:{stepSize:20,font:{size:9}}}}}});}
$('#analysisClose').onclick=()=>{$('#analysisModal').classList.add('hidden');$('#analysisModal').classList.remove('flex');};

/* ═════════ VOICE DIARY ═════════ */
const PHRASES=['I had tea with Moloi this morning','The Bihu memories made me happy','I walked in the park today','I remember Kaziranga from 2019'];
$('#phraseChips').innerHTML=PHRASES.map(p=>`<button class="chip px-3 py-1.5 bg-white text-xs font-semibold muted" data-p="${p}">💬 ${p}</button>`).join('');
$$('#phraseChips button').forEach(b=>b.onclick=()=>{$('#diaryText').value=b.dataset.p;});
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let recog=null,recording=false,recorder=null,audioChunks=[],audioMap={};
$('#micBig').onclick=async()=>{
  const mic=$('#micBig');
  if(recording){recog?.stop();recorder?.state==='recording'&&recorder.stop();recording=false;mic.classList.remove('mic-live');mic.textContent='🎙';$('#micHint').textContent='Stopped — edit or save below.';return;}
  recording=true;mic.classList.add('mic-live');mic.textContent='⏹';$('#micHint').textContent='🔴 Listening… speak now';
  audioChunks=[];
  try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>audioChunks.push(e.data);
    recorder.onstop=()=>{const blob=new Blob(audioChunks,{type:'audio/webm'});pendingAudio=URL.createObjectURL(blob);stream.getTracks().forEach(t=>t.stop());};
    recorder.start();}catch(e){/* audio optional */}
  if(SR){recog=new SR();recog.lang=$('#recLangSel').value;recog.continuous=true;recog.interimResults=false;
    recog.onresult=e=>{const txt=e.results[e.results.length-1][0].transcript.trim();
      $('#diaryText').value=($('#diaryText').value+' '+txt).trim();$('#micHint').textContent='… '+txt.slice(0,40);};
    recog.onerror=()=>{$('#micHint').textContent='Mic unavailable — you can type instead ✍️';};
    recog.onend=()=>{if(recording){recording=false;mic.classList.remove('mic-live');mic.textContent='🎙';$('#micHint').textContent='Captured! Review & save below.';}};
    recog.start();}
  else{$('#micHint').textContent='Voice engine not supported here — typing works too ✍️';
    setTimeout(()=>{if(recording){$('#diaryText').value=PHRASES[Math.floor(Math.random()*PHRASES.length)]+
      (recording?' — demo transcription while offline engine loads.':'');}},2500);}
};
let pendingAudio=null;
const MOCK_TR={'I had tea with Moloi this morning':{'as':'আজি ৰাতিপুৱা মলয়ৰ সৈতে চাহ খাইছিলোঁ','hi':'आज सुबह मोलयी के साथ चाय पी','bn':'আজ সকালে মলয়ের সাথে চায় খেয়েছি','en':'I had tea with Moloi this morning'},
 'The Bihu memories made me happy':{'as':'বিহুৰ স্মৃতিয়ে মোক সুখী কৰিলে','hi':'बिहू की यादों ने मुझे खुश किया','bn':'বিহুর স্মৃতি আমাকে খুশি দিয়েছে','en':'The Bihu memories made me happy'},
 'I walked in the park today':{'as':'আজি উদ্যানত খোজ কাঢ়িছিলোঁ','hi':'आज मैं पार्क में टहला','bn':'আজ আমি পার্কে হেঁটেছি','en':'I walked in the park today'},
 'I remember Kaziranga from 2019':{'as':'২০১৯ চনৰ কাজিৰঙা মনত পৰিছে','hi':'मुझे 2019 का काजीरंगा याद है','bn':'2019 এর কাজিরাঙ্গা মনে পড়ছে','en':'I remember Kaziranga from 2019'}};
$('#translateBtn').onclick=async()=>{
  const txt=$('#diaryText').value.trim();const to=$('#transLangSel').value;
  if(!txt)return toast('Say or type something first 🎙','💬');
  let out=null,src='offline dictionary';
  if(!out){const hit=MOCK_TR[txt]||Object.values(MOCK_TR).find(v=>v.en.toLowerCase()===txt.toLowerCase());out=(hit&&(hit[to]||hit.en))||txt;out+=to==='en'?'':' · '+(src==='Gemini API'?src:'demo translation');}
  $('#transOut').classList.remove('hidden');$('#transText').textContent=out;window._lastTrans=out;};
$('#saveEntryBtn').onclick=()=>{
  const txt=$('#diaryText').value.trim();if(!txt)return toast('Nothing to save yet 🎙','💬');
  const entry={id:Date.now(),ts:Date.now(),text:txt,trans:window._lastTrans||'',lang:$('#recLangSel').value,to:$('#transLangSel').value,
    synced:!db.settings.offline,audio:!!pendingAudio}; // → supabase.from('diary').insert
  if(pendingAudio)audioMap[entry.id]=pendingAudio;
  db.diary.unshift(entry);db.lastActive=Date.now();DB.save();
  $('#diaryText').value='';$('#transOut').classList.add('hidden');window._lastTrans=null;pendingAudio=null;
  toast(entry.synced?'Memory saved to cloud ☁️':'Saved offline — will sync 📶','📔');renderDiary();speak('Your memory has been saved.');};
function timeAgo(ts){const m=Math.round((Date.now()-ts)/6e4);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' hr ago':Math.round(m/1440)+' d ago';}
function renderDiary(){
  $('#entriesList').innerHTML=db.diary.map(e=>`
   <div class="card p-4">
     <div class="flex items-center gap-2 flex-wrap">
       <span class="text-lg">${e.audio?'🎧':'📝'}</span>
       <span class="text-xs font-bold muted">${new Date(e.ts).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${timeAgo(e.ts)}</span>
       <span class="chip px-2 py-0.5 text-[10px] font-bold ${e.synced?'bg-[#EDF6F2]':'bg-[#FFF3DC]'}" style="border-color:var(--line);color:${e.synced?'#0A5C4C':'#8A6210'}">${e.synced?'☁ Synced':'📶 Queued'}</span>
       <span class="flex-1"></span>
       <button class="playEnt chip px-3 py-1.5 text-xs font-bold bg-white" data-id="${e.id}">▶︎ Play</button>
     </div>
     <p class="text-sm ink mt-2 leading-relaxed">${e.text}</p>
     ${e.trans?`<p class="text-sm mt-1.5 p-2.5 rounded-lg bg-[#EDF6F2]" style="color:#0A5C4C">✨ ${e.trans}</p>`:''}
   </div>`).join('');
  $('#syncCount').textContent=db.diary.filter(e=>!e.synced).length;
  $$('.playEnt').forEach(b=>b.onclick=()=>{const e=db.diary.find(x=>x.id==b.dataset.id);
    if(audioMap[e.id])return new Audio(audioMap[e.id]).play();
    speak(e.trans&&e.to!==e.lang.slice(0,2)?e.trans:e.text,e.lang);});}
$('#syncBtn').onclick=()=>{const q=db.diary.filter(e=>!e.synced).length;
  if(!q)return toast('Everything already synced ☁️','✅');
  toast(`Syncing ${q} entr${q>1?'ies':'y'} to Supabase…`,'🔄');
  setTimeout(()=>{db.diary.forEach(e=>e.synced=true);DB.save();renderDiary();toast('Offline queue synced ☁️','✅');},900);};
$('#playAllBtn').onclick=()=>{const e=db.diary[0];if(e)speak(e.text,e.lang);};

/* ═════════ MEMORY BOOK ═════════ */
let bkIdx=0;
const ed=(k,v)=>`<span class="ed font-bold ink" data-k="${k}" contenteditable="false">${v}</span>`;
const FAMILY_PHOTOS={"family-moloi.png": "/family-moloi.svg", "family-pooja.png": "/family-pooja.svg", "family-rohan.png": "/family-rohan.svg"};
function familyPhoto(name){return FAMILY_PHOTOS[name]||name;}

function bookPages(){const b=db.book;return[
 {key:'cover',html:`<div class="h-full flex flex-col items-center justify-center text-center p-8" style="background:linear-gradient(150deg,#0A5C4C,#0E7C66)">
   <div class="weave w-24 h-2 rounded-full"></div>
   <p class="text-6xl mt-6">📖</p>
   <p class="font-display text-3xl font-bold text-white mt-4">My Memory Book</p>
   <p class="text-[#F2C063] font-semibold mt-1">মোৰ স্মৃতি পুথি</p>
   <div class="weave w-24 h-2 rounded-full mt-6"></div>
   <p class="text-white/70 text-xs mt-8">Belongs to ${ed('profile.name',b.profile.name)}</p></div>`},
 {key:'profile',title:'👤 About Me',html:`<dl class="space-y-3.5 mt-2 text-sm">
   ${[['Name','profile.name'],['Age','profile.age'],['Born','profile.born'],['Home','profile.home'],['Worked as','profile.job'],['Languages','profile.language'],['Favourite food','profile.food'],['Favourite song','profile.song']].map(([l,k])=>`<div><dt class="text-[10px] font-bold uppercase tracking-wider muted">${l}</dt><dd class="text-base">${ed(k,k.split('.').reduce((o,x)=>o[x],b))}</dd></div>`).join('')}</dl>`},
 {key:'family',title:'👨‍👩‍👧 My Family',html:`<div class="space-y-3 mt-2">${b.family.map((f,i)=>`
   <div class="flex items-start gap-3 p-3 rounded-xl" style="background:#FBF4E6">
     <img src="${familyPhoto(f.photo)}" alt="Portrait of ${f.n}" class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover family-portrait shrink-0 border-2 shadow-sm" style="border-color:#EBD6A8" onerror="this.removeAttribute('src');this.src=familyPhoto('missing')"/>
     <div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-xl">${f.e}</span><p class="font-bold ink text-sm">${ed('family.'+i+'.n',f.n)}</p></div>
     <p class="text-xs muted">${ed('family.'+i+'.r',f.r)} · age ${ed('family.'+i+'.age',f.age)}</p><p class="text-xs muted mt-1">🎂 ${ed('family.'+i+'.birthday',f.birthday)}</p><p class="text-xs font-semibold mt-1" style="color:var(--brand)">📞 ${ed('family.'+i+'.p',f.p)}</p><p class="text-xs mt-1.5 ink">“${ed('family.'+i+'.memory',f.memory)}”</p></div></div>`).join('')}</div>`},
 {key:'routine',title:'🕘 My Day',html:`<div class="mt-2 space-y-0">${b.routine.map((r,i)=>`
   <div class="flex gap-3 py-2.5 ${i<b.routine.length-1?'border-b':''}" style="border-color:#EFE6D4">
     <span class="text-xs font-extrabold w-14 shrink-0 pt-0.5" style="color:#8A6210">${ed('routine.'+i+'.t',r.t)}</span>
     <span class="text-sm ink flex-1">${ed('routine.'+i+'.a',r.a)}</span></div>`).join('')}</div>`},
 {key:'places',title:'🏡 Places I Love',html:`<div class="grid grid-cols-2 gap-2.5 mt-2">${b.places.map((p,i)=>`
   <div class="p-3 rounded-xl text-center" style="background:#FBF4E6"><span class="text-4xl">${p.e}</span>
   <p class="font-bold text-sm ink mt-1">${ed('places.'+i+'.n',p.n)}</p><p class="text-[11px] muted mt-0.5">${ed('places.'+i+'.d',p.d)}</p></div>`).join('')}</div>`},
 {key:'help',title:'🆘 Help Me',html:`<div class="mt-2 space-y-3 text-sm">
   <div class="p-3.5 rounded-xl" style="background:#FBEAE5"><p class="text-[10px] font-bold uppercase tracking-wider" style="color:#C2452D">Doctor</p>
     <p class="font-bold ink">${ed('help.doc',b.help.doc)}</p><p class="text-sm ink">📞 ${ed('help.docp',b.help.docp)}</p></div>
   <div class="p-3.5 rounded-xl" style="background:#EDF6F2"><p class="text-[10px] font-bold uppercase tracking-wider" style="color:#0A5C4C">Address</p><p class="ink">${ed('help.addr',b.help.addr)}</p></div>
   <div class="p-3.5 rounded-xl" style="background:#FFF3DC"><p class="text-[10px] font-bold uppercase tracking-wider" style="color:#8A6210">Blood group</p><p class="font-extrabold text-xl ink">${ed('help.blood',b.help.blood)}</p></div></div>`}] ;}
function renderBook(){const pages=bookPages();const book=$('#book');book.innerHTML='';
 pages.forEach((p,i)=>{
  const pg=document.createElement('div');pg.className='bk-page'+(i<bkIdx?' flipped':'');pg.style.zIndex=pages.length-i;
  pg.innerHTML=`<div class="bk-spine"></div><div class="bk-face"><div class="h-full p-6 sm:p-8 relative">
    ${p.title?`<div class="flex items-center justify-between"><h3 class="font-display text-xl font-bold ink">${p.title}</h3>
      <button class="pgEdit chip px-2.5 py-1.5 text-xs font-bold bg-white" data-pg="${p.key}">✏️ <span data-i18n="edit">Edit</span></button></div>
      <div class="weave h-1 rounded-full my-3 opacity-70"></div>`:''}
    <div class="overflow-auto" style="max-height:calc(100% - 4.5rem)">${p.html}</div></div></div>
    <div class="bk-face back"><div class="h-full flex items-center justify-center opacity-30 text-6xl">🪷</div></div>`;
  book.appendChild(pg);});
 $('#bookPageNum').textContent=bkIdx===0?'Cover':`Page ${bkIdx} / ${pages.length-1}`;
 $$('.pgEdit').forEach(b=>b.onclick=e=>{e.stopPropagation();
   const pg=b.closest('.bk-face');const spans=pg.querySelectorAll('.ed');const editing=spans[0].contentEditable==='true';
   spans.forEach(s=>s.contentEditable=editing?'false':'true');
   b.innerHTML=editing?'✏️ Edit':'💾 Save';b.style.background=editing?'':'#EDF6F2';
   if(editing){spans.forEach(s=>{const path=s.dataset.k.split('.');let o=db.book;
     for(let j=0;j<path.length-1;j++)o=o[path[j]];o[path[path.length-1]]=s.textContent.trim();});
     DB.save();toast('Memory book updated 📖','✅');}});}
$('#bookNext').onclick=()=>{if(bkIdx<bookPages().length-1){bkIdx++;renderBook();speak('Next page');}};
$('#bookPrev').onclick=()=>{if(bkIdx>0){bkIdx--;renderBook();}};
$('#book').onclick=e=>{if(e.target.closest('.pgEdit,.ed[contenteditable="true"]'))return;
  const r=$('#book').getBoundingClientRect();
  (e.clientX-r.left)/r.width>0.5?$('#bookNext').click():$('#bookPrev').click();};

/* ═════════ GEO-FENCING ═════════ */
let geoMap=null,geoUserMarker=null,geoAccuracyCircle=null,geoZoneLayers={},geoWatchId=null,currentLocation=null,pendingZone=null,sosActive=false;
const geoHome={lat:null,lng:null};
function geoDistance(a,b){const R=6371000,rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLng=(b.lng-a.lng)*rad;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
function zoneLatLng(z){return z.lat!=null&&z.lng!=null?{lat:z.lat,lng:z.lng}:null;}
function activeZone(){if(!currentLocation)return null;return db.zones.find(z=>{const c=zoneLatLng(z);return c&&geoDistance(currentLocation,c)<=z.r;})||null;}
function ensureGeoMap(){
  if(geoMap||!window.L)return;
  geoMap=L.map('geoMap',{zoomControl:true}).setView([26.1445,91.7362],13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(geoMap);
  setTimeout(()=>geoMap.invalidateSize(),100);
  renderGeo();
}
function renderGeo(){
  ensureGeoMap();
  if(!geoMap)return;
  Object.values(geoZoneLayers).forEach(layer=>geoMap.removeLayer(layer));geoZoneLayers={};
  db.zones.forEach(z=>{const c=zoneLatLng(z);if(!c)return;const circle=L.circle([c.lat,c.lng],{radius:z.r,color:'#0E7C66',fillColor:'#0E7C66',fillOpacity:.12,weight:2,dashArray:'6 5'}).addTo(geoMap);circle.bindTooltip(`${z.name} · ${z.r}m`);geoZoneLayers[z.id]=circle;});
  if(currentLocation){
    if(geoUserMarker)geoUserMarker.setLatLng([currentLocation.lat,currentLocation.lng]);
    else geoUserMarker=L.marker([currentLocation.lat,currentLocation.lng],{title:'Your real location'}).addTo(geoMap);
    geoUserMarker.bindTooltip('📍 Your real location').openTooltip();
    if(geoAccuracyCircle)geoAccuracyCircle.setLatLng([currentLocation.lat,currentLocation.lng]).setRadius(currentLocation.accuracy||0);
    else geoAccuracyCircle=L.circle([currentLocation.lat,currentLocation.lng],{radius:currentLocation.accuracy||0,color:'#3E7CB1',fillColor:'#3E7CB1',fillOpacity:.08,weight:1}).addTo(geoMap);
    const safe=activeZone();$('#geoStatus').textContent=safe?`Inside safe zone: ${safe.name}`:'Outside all safe zones';$('#geoStatus').style.color=safe?'#0A5C4C':'#C2452D';
    $('#geoCoords').textContent=`Lat ${currentLocation.lat.toFixed(6)}, Lng ${currentLocation.lng.toFixed(6)} · ±${Math.round(currentLocation.accuracy||0)} m accuracy`;
  }
  $('#zonesList').innerHTML=db.zones.map(z=>`<div class="flex items-center gap-2 p-2.5 rounded-xl" style="background:#F6F9F7"><span class="text-sm font-bold ink flex-1">${z.name} · ${z.r}m</span>${z.id===1?'<span class="chip px-2 py-0.5 text-[9px] font-bold bg-[#EDF6F2]" style="color:#0A5C4C">HOME</span>':''}<button class="delZone text-xs font-bold px-2" style="color:var(--danger)" data-id="${z.id}" ${z.id===1?'disabled style="opacity:.25"':''}>✕</button></div>`).join('');
  $$('.delZone').forEach(b=>b.onclick=()=>{if(b.dataset.id=='1')return;db.zones=db.zones.filter(z=>z.id!=b.dataset.id);DB.save();renderGeo();});
}
function handleGeoPosition(pos){
  currentLocation={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,ts:Date.now()};
  db.location={...currentLocation};db.lastActive=Date.now();DB.save();
  if(db.zones[0]&&!zoneLatLng(db.zones[0])){db.zones[0].lat=currentLocation.lat;db.zones[0].lng=currentLocation.lng;db.zones[0].r=+$('#radiusRange').value;DB.save();toast('Home safe zone set to your real location','📍');}
  if(geoMap)geoMap.setView([currentLocation.lat,currentLocation.lng],Math.max(geoMap.getZoom(),16));
  renderGeo();const safe=activeZone();if(!safe&&!sosActive)triggerSOS('live GPS');else if(safe&&sosActive)clearSOS();
}
let lastGeoErrorCode=null;
function handleGeoError(err){
  const messages={1:'Location permission was denied. Allow GPS access in your browser settings and try again.',2:'Your location is currently unavailable. Check your device GPS and try again.',3:'GPS timed out before a location was received. Try again in an open area.'};
  const msg=messages[err&&err.code]||'Unable to read your location. Please try again.';
  $('#geoStatus').textContent=msg;$('#geoStatus').style.color='var(--danger)';
  if(lastGeoErrorCode!==err?.code){toast(msg,'🛰');lastGeoErrorCode=err?.code;}
}
function startLiveLocation(){
  if(!navigator.geolocation)return toast('This browser does not support GPS','🛰');
  lastGeoErrorCode=null;
  $('#geoStatus').textContent='Requesting live location permission…';
  navigator.geolocation.getCurrentPosition(handleGeoPosition,handleGeoError,{enableHighAccuracy:true,timeout:15000,maximumAge:10000});
  if(geoWatchId==null)geoWatchId=navigator.geolocation.watchPosition(handleGeoPosition,handleGeoError,{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function triggerSOS(src){if(sosActive)return;sosActive=true;db.alerts.unshift({id:Date.now(),type:'sos',msg:`🚨 SOS — Biren left all safe zones (${src}) · location shared`,ts:Date.now(),status:'new'});db.lastActive=Date.now();DB.save();$('#geoBanner').classList.remove('hidden');$('#geoBanner').classList.add('flex');$('#sosModal').classList.remove('hidden');$('#sosModal').classList.add('flex');speak('You are outside your safe area. The caregiver has been alerted.');}
function clearSOS(){sosActive=false;$('#geoBanner').classList.add('hidden');$('#geoBanner').classList.remove('flex');$('#sosModal').classList.add('hidden');$('#sosModal').classList.remove('flex');db.alerts.unshift({id:Date.now(),type:'good',msg:'✓ SOS cleared — Biren marked himself safe',ts:Date.now(),status:'old'});DB.save();renderGeo();}
$('#sosSafe').onclick=$('#geoImSafe').onclick=clearSOS;
$('#useRealLoc').onclick=()=>{ensureGeoMap();startLiveLocation();};
$('#homeWalk').onclick=()=>{if(currentLocation&&geoMap)geoMap.setView([currentLocation.lat,currentLocation.lng],17);};
$('#radiusRange').oninput=e=>{db.zones[0].r=+e.target.value;$('#radiusVal').textContent=e.target.value+' m';DB.save();renderGeo();if(currentLocation&&!activeZone()&&!sosActive)triggerSOS('radius change');};
$('#addZoneBtn').onclick=()=>$('#addZoneForm').classList.toggle('hidden');
$('#zonePlaceBtn').onclick=()=>{const n=$('#zoneNameInp').value.trim();if(!n)return toast('Type a place name first ✍️','📍');pendingZone={name:'📍 '+n,r:40};toast('Tap a location on the real map to add it','👆');};
$('#geoMap').onclick=e=>{if(!pendingZone||!geoMap)return;const ll=geoMap.mouseEventToLatLng(e);db.zones.push({id:Date.now(),name:pendingZone.name,lat:ll.lat,lng:ll.lng,r:pendingZone.r});DB.save();pendingZone=null;$('#addZoneForm').classList.add('hidden');$('#zoneNameInp').value='';renderGeo();toast('Safe place added to the real map 📍','✅');};
$('#testSOS').onclick=()=>triggerSOS('manual test');

/* ═════════ SETTINGS ═════════ */
function applySettings(){const s=db.settings;document.body.dataset.ts=s.ts;
  document.body.classList.toggle('contrast',s.contrast);applyLang();
  $('#setLang').value=s.lang;$('#setVoice').checked=s.voice;$('#setRate').value=s.rate;$('#rateVal').textContent=s.rate.toFixed(1)+'×';
  $('#setNMed').checked=s.nMed;$('#setNHyd').checked=s.nHyd;$('#setNGeo').checked=s.nGeo;$('#setContrast').checked=s.contrast;
  $('#radiusRange').value=db.zones[0].r;$('#radiusVal').textContent=db.zones[0].r+' m';
  $$('.tsBtn').forEach(b=>{const on=b.dataset.ts===s.ts;b.style.background=on?'#0E7C66':'#fff';b.style.color=on?'#fff':'';b.style.borderColor=on?'#0E7C66':'var(--line)';});
  const off=s.offline;$('#netDot').className='inline-block w-2 h-2 rounded-full mr-1.5 '+(off?'bg-amber-500':'bg-emerald-500');
  $('#netLabel').textContent=off?'Offline':'Online';}
$('#setLang').onchange=e=>{db.settings.lang=e.target.value;DB.save();applyLang();renderHeader();renderHome();
  toast('Language updated · ভাষা সলনি হ’ল','🌐');speak(t(hourGreet())+', Biren');};
$$('.tsBtn').forEach(b=>b.onclick=()=>{db.settings.ts=b.dataset.ts;DB.save();applySettings();});
$('#setVoice').onchange=e=>{db.settings.voice=e.target.checked;DB.save();if(e.target.checked)speak('Voice assistance is on.');};
$('#setRate').oninput=e=>{db.settings.rate=+e.target.value;$('#rateVal').textContent=(+e.target.value).toFixed(1)+'×';DB.save();};
[['setNMed','nMed'],['setNHyd','nHyd'],['setNGeo','nGeo'],['setContrast','contrast']].forEach(([id,k])=>
  $('#'+id).onchange=e=>{db.settings[k]=e.target.checked;DB.save();applySettings();renderNotifs();});
$('#netPill').onclick=()=>{db.settings.offline=!db.settings.offline;DB.save();applySettings();renderDiary();
  toast(db.settings.offline?'Offline mode — entries will queue 📶':'Back online — tap Sync to push 📶','📶');};
$('#testNotifBtn').onclick=()=>{toast('💊 Memantine 10mg — time for your tablet!','⏰');speak('Reminder. Time to take Memantine tablet.');};
$('#docsBtn').onclick=()=>{$('#docsModal').classList.remove('hidden');$('#docsModal').classList.add('flex');};
$('#docsClose').onclick=()=>{$('#docsModal').classList.add('hidden');$('#docsModal').classList.remove('flex');};
$('#resetBtn').onclick=()=>{if(confirm('Reset all demo data?')){localStorage.removeItem(DBKEY);location.reload();}};

/* ═════════ CAREGIVER ═════════ */
let chLine,chRadar,chBars,chDough,careMap,carePatientMarker,careAccuracyCircle,careZoneLayers={};
function renderCareLocation(){
  if(!window.L||!$('#careMap'))return;
  if(!careMap){careMap=L.map('careMap',{zoomControl:true}).setView([26.1445,91.7362],13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(careMap);}
  setTimeout(()=>careMap.invalidateSize(),50);
  Object.values(careZoneLayers).forEach(x=>careMap.removeLayer(x));careZoneLayers={};
  db.zones.forEach(z=>{if(z.lat==null||z.lng==null)return;careZoneLayers[z.id]=L.circle([z.lat,z.lng],{radius:z.r,color:'#0E7C66',fillColor:'#0E7C66',fillOpacity:.12,weight:2,dashArray:'6 5'}).addTo(careMap).bindTooltip(`${z.name} · ${z.r}m`);});
  const loc=db.location;if(!loc){$('#cgLocationStatus').textContent='Waiting for GPS';$('#cgPatrolStatus').textContent='Patient has not shared a live position yet';return;}
  const ll=[loc.lat,loc.lng];if(carePatientMarker)carePatientMarker.setLatLng(ll);else carePatientMarker=L.marker(ll,{title:'Biren real location'}).addTo(careMap);carePatientMarker.bindTooltip('📍 Biren · real location').openTooltip();
  if(careAccuracyCircle)careAccuracyCircle.setLatLng(ll).setRadius(loc.accuracy||0);else careAccuracyCircle=L.circle(ll,{radius:loc.accuracy||0,color:'#3E7CB1',fillColor:'#3E7CB1',fillOpacity:.08,weight:1}).addTo(careMap);
  careMap.setView(ll,Math.max(careMap.getZoom(),16));
  const safe=db.zones.find(z=>z.lat!=null&&geoDistance(loc,{lat:z.lat,lng:z.lng})<=z.r);const age=Math.max(0,Math.round((Date.now()-(loc.ts||Date.now()))/60000));
  $('#cgLocationStatus').textContent=safe?`Inside ${safe.name}`:'Outside all safe zones';$('#cgLocationStatus').style.color=safe?'#0A5C4C':'#C2452D';$('#cgLocationCoords').textContent=`${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)} ±${Math.round(loc.accuracy||0)}m`;$('#cgLocationTime').textContent=age<1?'Just now':age+' min ago';$('#cgPatrolStatus').textContent=safe?'✓ Patient is inside a monitored zone':'🚨 Patient is outside monitored zones';$('#cgPatrolStatus').style.color=safe?'#0A5C4C':'#C2452D';
}

function initCaregiver(){
  const comp=d=>Math.round((d.memory+d.attention+d.speed)/3);
  const mean=Math.round(db.scores.slice(-7).reduce((a,s)=>a+comp(s),0)/7);
  const first=comp(db.scores[0]);const trend=mean-first;
  const mins=Math.max(1,Math.round((Date.now()-db.lastActive)/6e4));
  const stats=[['🧠 Cognitive index',mean+'/100',(trend>=0?'▲ +':'▼ ')+trend+' vs 2 wks',trend>=0?'#EDF6F2':'#FBEAE5',trend>=0?'#0A5C4C':'#C2452D'],
   ['✅ Tasks today',db.tasks.filter(x=>x.done).length+'/'+db.tasks.length,'on track','#EDF6F2','#0A5C4C'],
   ['💧 Hydration',db.hydration.count+'/8',db.hydration.count>=8?'goal met ✨':'nudge sent','#E8F1F8','#3E7CB1'],
   ['🕐 Last active',mins<60?mins+' min ago':Math.round(mins/60)+' hr ago','playing games 🎮','#FFF3DC','#8A6210']];
  $('#careStats').innerHTML=stats.map(([l,v,s,bg,c])=>`
   <div class="card p-4"><p class="text-xs font-bold uppercase tracking-wider muted">${l}</p>
    <p class="font-display text-3xl font-bold ink mt-1">${v}</p>
    <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold" style="background:${bg};color:${c}">${s}</span></div>`).join('');
  $('#careTrend').textContent=(trend>=0?'▲ improving +':'▼ declining ')+trend+' pts';
  const labels=db.scores.map(s=>s.day);
  chLine?.destroy();
  chLine=new Chart($('#chLine'),{type:'line',data:{labels,datasets:[
    {label:'Memory',data:db.scores.map(s=>s.memory),borderColor:'#0E7C66',backgroundColor:'rgba(14,124,102,.12)',fill:true,tension:.4,pointRadius:2},
    {label:'Attention',data:db.scores.map(s=>s.attention),borderColor:'#3E7CB1',tension:.4,pointRadius:2},
    {label:'Speed',data:db.scores.map(s=>s.speed),borderColor:'#E3A63B',tension:.4,pointRadius:2}]},
   options:{maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:10,font:{size:10}}}},scales:{y:{min:40,max:100}}}});
  chRadar?.destroy();
  chRadar=new Chart($('#chRadar'),{type:'radar',data:{labels:['Memory','Attention','Speed'],datasets:[
    {label:'This week',data:[domainAvg('memory'),domainAvg('attention'),domainAvg('speed')],fill:true,backgroundColor:'rgba(14,124,102,.2)',borderColor:'#0E7C66'},
    {label:'Baseline',data:[db.scores[0].memory,db.scores[0].attention,db.scores[0].speed],borderColor:'#E3A63B',borderDash:[5,4]}]},
   options:{maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:10,font:{size:10}}}},scales:{r:{min:40,max:100,ticks:{stepSize:20,font:{size:9}}}}}});
  chBars?.destroy();
  chBars=new Chart($('#chBars'),{type:'bar',data:{labels:GAMES.map(g=>g.emoji+' '+g.name.split(' ')[0]),
    datasets:[{label:'Avg score',data:GAMES.map(g=>{const logs=db.gameLog.filter(l=>l.game===g.id);return logs.length?Math.round(logs.reduce((a,l)=>a+l.score,0)/logs.length):domainAvg(g.domain)}),backgroundColor:'#0E7C66',borderRadius:8},
    {label:'AI level',data:GAMES.map(g=>db.levels[g.id]*18),backgroundColor:'#E3A63B',borderRadius:8}]},
   options:{maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:10,font:{size:10}}}},scales:{y:{beginAtZero:true}}}});
  const done=db.tasks.filter(x=>x.done).length;
  chDough?.destroy();
  chDough=new Chart($('#chDough'),{type:'doughnut',data:{labels:['Done','Pending'],datasets:[{data:[done,db.tasks.length-done],backgroundColor:['#0E7C66','#ECE3D6'],borderWidth:0}]},
   options:{maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}}}});
  renderCareExtras();renderCareLocation();}
function renderCareExtras(){
  const news=db.alerts.filter(a=>a.status==='new').length;
  $('#alertCount').textContent=news+' new';
  $('#cgAlerts').innerHTML=db.alerts.map(a=>`
   <div class="flex items-start gap-2.5 p-3 rounded-xl" style="background:${a.type==='sos'?'#FBEAE5':a.type==='good'?'#EDF6F2':a.type==='warn'?'#FFF3DC':'#F3EDE2'}">
     <span class="text-sm">${a.type==='sos'?'🚨':a.type==='good'?'🎉':a.type==='warn'?'⚠️':'💧'}</span>
     <div class="flex-1 min-w-0"><p class="text-xs font-semibold ink">${a.msg}</p><p class="text-[10px] muted mt-0.5">${timeAgo(a.ts)}</p></div>
     ${a.status==='new'?`<button class="resAlert text-[10px] font-bold px-2 py-1 rounded-lg bg-white" style="color:#0A5C4C" data-id="${a.id}">Resolve</button>`:'<span class="text-[10px] muted">✓</span>'}
   </div>`).join('');
  $$('.resAlert').forEach(b=>b.onclick=()=>{const a=db.alerts.find(x=>x.id==b.dataset.id);a.status='old';DB.save();renderCareExtras();});
  $('#cgTasks').innerHTML=db.tasks.map(x=>`
   <div class="flex items-center gap-2.5 p-2.5 rounded-xl" style="background:#F8F4EC">
     <span>${x.done?'✅':x.icon}</span><p class="text-xs font-semibold ink flex-1">${x.title} · ${x.time}</p>
     <button class="cgTaskDel text-xs font-bold" style="color:var(--danger)" data-id="${x.id}">✕</button></div>`).join('');
  $$('.cgTaskDel').forEach(b=>b.onclick=()=>{db.tasks=db.tasks.filter(x=>x.id!=b.dataset.id);DB.save();initCaregiver();});
  $('#cgTasksMini').innerHTML=db.tasks.map(x=>`<p class="text-xs ${x.done?'muted line-through':'ink font-semibold'}">${x.done?'✓':'○'} ${x.title}</p>`).join('');
  $('#cgMeds').innerHTML=db.meds.map(m=>`
   <label class="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer" style="background:#F8F4EC">
     <input type="checkbox" class="medChk w-5 h-5 accent-[#0E7C66]" data-id="${m.id}" ${m.taken?'checked':''}/>
     <span class="text-xs font-semibold ink flex-1 ${m.taken?'line-through opacity-50':''}">💊 ${m.name}</span>
     <span class="text-[10px] font-bold muted">${m.time}</span></label>`).join('');
  $$('.medChk').forEach(c=>c.onchange=()=>{const m=db.meds.find(x=>x.id==c.dataset.id);m.taken=c.checked;DB.save();renderCareExtras();});
  $('#cgDiary').innerHTML=db.diary.length?db.diary.map(e=>`
   <div class="p-3 rounded-xl" style="background:#F8F4EC">
     <div class="flex items-center gap-2 flex-wrap"><span>${e.audio?'🎧':'📝'}</span>
      <span class="text-[10px] font-bold muted">${new Date(e.ts).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
      <span class="chip px-1.5 py-0.5 text-[9px] font-bold bg-white" style="color:${e.synced?'#0A5C4C':'#8A6210'}">${e.synced?'☁':'📶 Q'}</span>
      <span class="flex-1"></span>
      <button class="cgPlay chip px-2.5 py-1 text-[10px] font-bold bg-white" data-id="${e.id}">▶︎</button>
      <button class="cgDel chip px-2.5 py-1 text-[10px] font-bold bg-white" data-id="${e.id}" style="color:var(--danger)">🗑</button></div>
     <p class="text-xs ink mt-1.5">${e.text}</p>${e.trans?`<p class="text-[11px] mt-1" style="color:#0A5C4C">✨ ${e.trans}</p>`:''}</div>`).join('')
   :'<p class="text-xs muted">No recordings yet.</p>';
  $$('.cgPlay').forEach(b=>b.onclick=()=>{const e=db.diary.find(x=>x.id==b.dataset.id);if(audioMap[e.id])new Audio(audioMap[e.id]).play();else speak(e.text,e.lang);});
  $$('.cgDel').forEach(b=>b.onclick=()=>{if(confirm('Delete this voice entry?')){db.diary=db.diary.filter(x=>x.id!=b.dataset.id);DB.save();renderCareExtras();toast('Entry deleted','🗑');}});
  $('#cgZoneSum').textContent=`${db.zones.length} safe zones · home radius ${db.zones[0].r}m · alerts ${db.settings.nGeo?'ON':'OFF'}`;renderCareLocation();}
$('#cgTaskAdd').onclick=()=>{const t=$('#cgTaskInp').value.trim();if(!t)return;
  db.tasks.push({id:Date.now(),title:t,time:$('#cgTaskTime').value||'12:00',done:false,icon:'📌'});
  $('#cgTaskInp').value='';DB.save();initCaregiver();toast('Task pushed to Biren\'s home screen','📝');};
$('#cgExport').onclick=()=>{const txt=db.diary.map(e=>`[${new Date(e.ts).toLocaleString()}] ${e.text}\n${e.trans?'↳ '+e.trans+'\n':''}`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));a.download='smriti_voice_diary.txt';a.click();toast('Diary exported','⬇');};
$('#cgCenterLocation').onclick=()=>{if(db.location&&careMap)careMap.setView([db.location.lat,db.location.lng],17);};
$('#cgSOSTest').onclick=()=>{db.alerts.unshift({id:Date.now(),type:'sos',msg:'🚨 TEST — SOS drill triggered from dashboard',ts:Date.now(),status:'new'});DB.save();renderCareExtras();toast('SOS drill triggered — patient device alerted','🚨');};


window.addEventListener('storage',e=>{if(e.key===DBKEY){const fresh=JSON.parse(e.newValue||'null');if(fresh){Object.assign(db,fresh);renderCareExtras();renderCareLocation();}}});
setInterval(()=>{if(sessionStorage.getItem('smriti_session')==='caregiver'){const fresh=JSON.parse(localStorage.getItem(DBKEY)||'null');if(fresh){Object.assign(db,fresh);renderCareExtras();renderCareLocation();}}},5000);
/* ═════════ INIT ═════════ */
function initPatient(){applySettings();renderHeader();renderHome();renderGames();renderDiary();renderBook();renderGeo();setTimeout(ensureGeoMap,150);
  setInterval(renderHeader,30000);
  speak(t(hourGreet())+', Biren. Welcome to MEDHA-AI.');
  setTimeout(()=>{if(db.settings.nHyd&&db.hydration.count<8)toast('💧 Time for a glass of water!','💧');},4000);
  setTimeout(()=>{if(db.settings.nMed)toast('💊 Memantine at 9:00 PM','⏰');},12000);}
applySettings();
const sess=sessionStorage.getItem('smriti_session');
if(sess==='caregiver'||sess==='patient')route(sess);else $('#loginScreen').classList.remove('hidden');
