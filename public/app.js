'use strict';
const $ = (s) => document.querySelector(s);
const ui = { messages:$('#messages'), prompt:$('#prompt'), composer:$('#composer'), send:$('#send'), thinking:$('#thinking'), thinkingLabel:$('#thinking-label'), welcome:$('#welcome-panel'), activity:$('#activity-list'), activityCount:$('#activity-count'), planForm:$('#plan-form'), goal:$('#goal'), planButton:$('#plan-button'), planOutput:$('#plan-output'), toast:$('#toast'), authWall:$('#auth-wall'), authForm:$('#auth-form'), authEmail:$('#auth-email'), authPassword:$('#auth-password'), authMessage:$('#auth-message'), authError:$('#auth-error'), authSetup:$('#auth-setup'), memoryPanel:$('#memory-panel'), memoryForm:$('#memory-form'), memoryInput:$('#memory-input'), memoryList:$('#memory-list'), memorySave:$('#memory-save'), memoryCount:$('#memory-count'), authSignup:$('#auth-signup'), logoutButton:$('#logout-button'), accountEmail:$('#account-email'), voiceInput:$('#voice-input'), voiceToggle:$('#voice-toggle'), voiceModal:$('#voice-modal'), voiceModeOpen:$('#voice-mode-open'), voiceStatus:$('#voice-status'), voiceStatusLight:$('#voice-status-light'), voiceCaption:$('#voice-caption'), voiceUserText:$('#voice-user-text'), voiceAiText:$('#voice-ai-text'), voiceStart:$('#voice-start'), voiceStop:$('#voice-stop'), voiceReplies:$('#voice-replies'), voiceLanguage:$('#voice-language'), voiceOutputHint:$('#voice-output-hint'), voiceClose:$('#voice-close') };
let mode='DREAM', busy=false, toastTimer, installPrompt=null, voiceAuto=localStorage.getItem('nyvex.voice.autoplay')==='true', recognition=null, isListening=false, authMode='legacy', activeUserId='guest', lastMemoryUser=null, voiceSessionActive=false, voiceTurnInProgress=false, voiceRetryTimer=null, voiceReplyAudio=localStorage.getItem('nyvex.voice.replies')!=='false', activeVoiceAudio=null, activeVoiceObjectUrl=null, voicePlaybackToken=0;
let STORAGE='nyvex.history.v2.guest', CHAT='nyvex.current.v2.guest';
const installButton=$('#install-app');
function refreshInstallButton(){if(!installButton)return;const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;installButton.classList.toggle('hidden',standalone);}
if(installButton)window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;refreshInstallButton();});
window.addEventListener('appinstalled',()=>{installPrompt=null;refreshInstallButton();toast('NYVEX installed on this device.');});
if(installButton)installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();try{await installPrompt.userChoice;}catch{}installPrompt=null;refreshInstallButton();return;}toast('Android: use your browser menu → Install app / Add to Home screen. iPhone: Share → Add to Home Screen.');});
refreshInstallButton();
let history=[];
try { history=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(!Array.isArray(history))history=[]; } catch { history=[]; }
let messages=[];
try { messages=JSON.parse(localStorage.getItem(CHAT)||'[]'); if(!Array.isArray(messages))messages=[]; } catch { messages=[]; }
function save(){try{localStorage.setItem(CHAT,JSON.stringify(messages.slice(-36)));}catch{}}
function switchAccount(userId){
  const next=String(userId||'guest');if(next===activeUserId)return false;
  activeUserId=next;STORAGE='nyvex.history.v2.'+next;CHAT='nyvex.current.v2.'+next;
  try{history=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(!Array.isArray(history))history=[];}catch{history=[];}
  try{messages=JSON.parse(localStorage.getItem(CHAT)||'[]');if(!Array.isArray(messages))messages=[];}catch{messages=[];}
  renderHistory();updateActivity([]);return true;
}

function toast(text, bad=false){ui.toast.textContent=text;ui.toast.className=`toast show${bad?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.className='toast',3000);}
function setBusy(value){busy=value;ui.send.disabled=value;ui.planButton.disabled=value;ui.prompt.disabled=value;ui.thinking.classList.toggle('hidden',!value);if(value)ui.thinkingLabel.textContent='Planning, using tools, and checking results…';}
function scrollEnd(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}
function addMessage(role, text, actions=[]){
  ui.welcome.classList.add('hidden'); const wrap=document.createElement('article');wrap.className=`message ${role}`;
  const av=document.createElement('div');av.className='message-avatar';av.textContent=role==='user'?'Y':'N';
  const body=document.createElement('div');body.className='message-body';const meta=document.createElement('div');meta.className='message-meta';meta.textContent=role==='user'?'YOU':'NYVEX';
  const bubble=document.createElement('div');bubble.className='message-bubble';bubble.textContent=text;body.append(meta,bubble);
  if(role==='assistant' && 'speechSynthesis' in window){const speaker=document.createElement('button');speaker.type='button';speaker.className='speak-message';speaker.textContent='🔊';speaker.title='Read this reply aloud';speaker.setAttribute('aria-label','Read this NYVEX response aloud');speaker.addEventListener('click',()=>speakText(text));meta.append(speaker);}
  if(actions.length){const badges=document.createElement('div');badges.className='message-tools';for(const a of actions){const t=document.createElement('span');t.textContent=`${a.ok?'✓':'!'} ${a.tool}`;badges.append(t);}body.append(badges);}
  wrap.append(av,body);ui.messages.append(wrap);scrollEnd();
}
function renderHistory(){ui.messages.replaceChildren();ui.welcome.classList.toggle('hidden',messages.length>0);for(const m of messages)addMessage(m.role,m.content,m.actions||[]);}
function updateActivity(actions=[]){ui.activity.replaceChildren();ui.activityCount.textContent=`${actions.length} STEP${actions.length===1?'':'S'}`;if(!actions.length){const e=document.createElement('div');e.className='activity-empty';e.innerHTML='<span class="activity-line"></span><span>No tool calls this run. Start another mission.</span>';ui.activity.append(e);return;}for(const a of actions){const item=document.createElement('div');item.className='activity-item';const mark=document.createElement('span');mark.className=`activity-mark ${a.ok?'done':'failed'}`;const txt=document.createElement('div');txt.className='activity-text';const title=document.createElement('b');title.textContent=a.tool;const detail=document.createElement('small');detail.textContent=a.summary|| (a.ok?'Tool completed':'Tool did not complete');txt.append(title,detail);item.append(mark,txt);ui.activity.append(item);}}
function renderPlan(plan){ui.planOutput.replaceChildren();const title=document.createElement('h3');title.className='plan-title';title.textContent=plan.title;const summary=document.createElement('p');summary.className='plan-summary';summary.textContent=plan.summary;ui.planOutput.append(title,summary);for(const t of plan.tasks){const row=document.createElement('div');row.className='plan-task';const check=document.createElement('input');check.type='checkbox';check.id=`task-${t.id}`;const label=document.createElement('label');label.htmlFor=check.id;label.append(document.createTextNode(t.title));if(t.detail){const detail=document.createElement('small');detail.textContent=t.detail;label.append(detail);}const pri=document.createElement('span');pri.className=`priority ${t.priority}`;pri.textContent=t.priority;label.append(pri);row.append(check,label);ui.planOutput.append(row);}}
async function sendMessage(text, options={}){
  text=String(text||'').trim();
  if(!text||busy){
    if(options.fromVoice&&voiceSessionActive){voiceTurnInProgress=false;scheduleVoiceListening(900);}
    return;
  }
  messages.push({role:'user',content:text});save();addMessage('user',text);
  ui.prompt.value='';ui.prompt.style.height='auto';setBusy(true);updateActivity([]);
  let voiceCallbackScheduled=false;
  try{
    const requestMessages=options.fromVoice
      ? messages.slice(-8).map(m=>({role:m.role,content:String(m.content||'').slice(-1200)}))
      : messages.slice(-18);
    const endpoint=options.fromVoice?'/api/chat':'/api/agent';
    const payload={mode,messages:requestMessages};
    if(options.fromVoice)payload.voiceLanguage=ui.voiceLanguage.value||'en-US';
    const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||'Request failed.');
    const answer=String(data.reply||'NYVEX returned an empty response.');
    const actions=Array.isArray(data.actions)?data.actions:[];
    messages.push({role:'assistant',content:answer,actions});save();addMessage('assistant',answer,actions);updateActivity(actions);
    $('#core-status').textContent='ACTIVE';
    if(options.fromVoice&&voiceSessionActive){
      ui.voiceAiText.textContent=answer;
      setVoiceStatus('NYVEX responding','I have your answer. I will listen again when the reply finishes.');
      voiceCallbackScheduled=true;
      if(voiceReplyAudio)speakText(answer,finishVoiceTurn);
      else finishVoiceTurn();
    }else if(voiceAuto)speakText(answer);
  }catch(e){
    const failure="I couldn't complete that request: "+(e.message||'Network error')+". Check the connection and try again.";
    toast(e.message||'Could not reach NYVEX.',true);
    addMessage('assistant',failure);
    if(options.fromVoice&&voiceSessionActive){
      ui.voiceAiText.textContent=failure;
      voiceCallbackScheduled=true;
      if(voiceReplyAudio)speakText(failure,finishVoiceTurn);
      else finishVoiceTurn();
    }
  }finally{
    setBusy(false);ui.prompt.focus();
    if(options.fromVoice&&voiceSessionActive&&!voiceCallbackScheduled&&voiceTurnInProgress)finishVoiceTurn();
  }
}
async function planMission(goal){goal=String(goal||'').trim();if(!goal||busy)return;setBusy(true);ui.planButton.disabled=true;try{const res=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'TACTIC',messages:[{role:'user',content:goal}]})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Plan failed.');renderPlan(data.plan);$('#breadcrumb-page').textContent='Mission planner';toast('Mission plan created. Check off steps as you finish them.');}catch(e){toast(e.message||'Could not create a plan.',true);}finally{setBusy(false);ui.planButton.disabled=false;}}
function chooseMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===next));$('#composer-mode').textContent=`${next} MODE`;}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{ui.prompt.value=b.dataset.prompt;ui.prompt.focus();ui.prompt.dispatchEvent(new Event('input'));}));
ui.composer.addEventListener('submit',e=>{e.preventDefault();sendMessage(ui.prompt.value);});
ui.prompt.addEventListener('input',()=>{ui.prompt.style.height='auto';ui.prompt.style.height=`${Math.min(ui.prompt.scrollHeight,180)}px`;});
ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ui.composer.requestSubmit();}});
ui.planForm.addEventListener('submit',e=>{e.preventDefault();planMission(ui.goal.value);});
function startNewConversation(){messages=[];save();renderHistory();updateActivity([]);ui.prompt.focus();}
document.querySelectorAll('#new-chat, #new-chat-mobile').forEach(button=>button.addEventListener('click',startNewConversation));
$('#clear-chat').addEventListener('click',()=>{messages=[];save();renderHistory();updateActivity([]);toast('Current conversation cleared.');});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));const planner=b.dataset.view==='planner';$('#breadcrumb-page').textContent=planner?'Mission planner':'Agent';if(planner){$('#goal').focus({preventScroll:true});$('#goal').scrollIntoView({behavior:'smooth',block:'center'});}else{$('#agent-view').scrollIntoView({behavior:'smooth',block:'start'});ui.prompt.focus({preventScroll:true});}}));
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();messages=[];save();renderHistory();ui.prompt.focus();}});
function updateGate(d){
  authMode=d.supabaseConfigured?'supabase':'legacy';
  const emailWrap=$('#auth-email-wrap'),signup=$('#auth-signup'),passwordLabel=$('#auth-password-label'),submit=$('#auth-submit'),foot=$('#auth-foot');
  ui.authEmail.required=Boolean(d.supabaseConfigured);
  if(d.supabaseConfigured){
    emailWrap.classList.remove('hidden');signup.classList.remove('hidden');passwordLabel.textContent='PASSWORD';
    submit.innerHTML='Sign in <span>↗</span>';foot.textContent='EACH ACCOUNT HAS ITS OWN PRIVATE MEMORY.';
    if(!d.authenticated){
      ui.authWall.classList.remove('hidden');ui.authForm.classList.remove('hidden');ui.authSetup.classList.add('hidden');
      ui.authMessage.textContent='Sign in to your private NYVEX workspace, or create your own account.';
      return false;
    }
    ui.authWall.classList.add('hidden');return true;
  }
  emailWrap.classList.add('hidden');signup.classList.add('hidden');passwordLabel.textContent='ACCESS PASSWORD';
  submit.innerHTML='Unlock <span>↗</span>';foot.textContent='ACCESS IS RESTRICTED TO THE OWNER · SESSION EXPIRES AFTER 7 DAYS';
  if(!d.accessConfigured){
    ui.authWall.classList.remove('hidden');ui.authForm.classList.add('hidden');ui.authSetup.classList.remove('hidden');
    ui.authMessage.textContent='NYVEX is locked until access setup is completed.';return false;
  }
  if(!d.authenticated){
    ui.authWall.classList.remove('hidden');ui.authForm.classList.remove('hidden');ui.authSetup.classList.add('hidden');
    ui.authMessage.textContent='Enter the private access password to continue.';return false;
  }
  ui.authWall.classList.add('hidden');return true;
}
async function accountAction(endpoint){
  ui.authError.textContent='';
  const email=ui.authEmail.value.trim(),password=ui.authPassword.value,submit=$('#auth-submit');
  submit.disabled=true;ui.authSignup.disabled=true;submit.textContent=endpoint.endsWith('signup')?'Creating…':'Signing in…';
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Account request failed.');
    if(d.requiresEmailConfirmation){ui.authMessage.textContent=d.message||'Check your email to confirm your account, then sign in.';toast('Check your email to finish signing up.');return;}
    ui.authPassword.value='';await status();
    if(ui.authWall.classList.contains('hidden'))toast(endpoint.endsWith('signup')?'Your NYVEX account is ready.':'Welcome back to NYVEX.');
  }catch(e){ui.authError.textContent=e.message||'Could not complete account request.';}
  finally{submit.disabled=false;ui.authSignup.disabled=false;submit.innerHTML=authMode==='supabase'?'Sign in <span>↗</span>':'Unlock <span>↗</span>';}
}
ui.authForm.addEventListener('submit',async e=>{
  e.preventDefault();ui.authError.textContent='';
  if(authMode==='supabase'){await accountAction('/api/auth/login');return;}
  const password=ui.authPassword.value,submit=$('#auth-submit');submit.disabled=true;submit.textContent='Checking…';
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not unlock NYVEX.');
    ui.authPassword.value='';await status();
    if(!ui.authWall.classList.contains('hidden'))throw new Error('NYVEX is still locked. Check the access setup.');
    toast('Welcome back. NYVEX unlocked.');
  }catch(e){ui.authError.textContent=e.message||'Could not unlock NYVEX.';}
  finally{submit.disabled=false;submit.innerHTML='Unlock <span>↗</span>';}
});
ui.authSignup.addEventListener('click',()=>{if(authMode==='supabase')accountAction('/api/auth/signup');});
ui.logoutButton.addEventListener('click',async()=>{
  try{await fetch(authMode==='supabase'?'/api/auth/logout':'/api/logout',{method:'POST'});}catch{}
  switchAccount('guest');lastMemoryUser=null;ui.accountEmail.classList.add('hidden');ui.logoutButton.classList.add('hidden');ui.memoryPanel.classList.add('hidden');await status();toast('Signed out.');
});
function renderMemories(memories){
  ui.memoryList.replaceChildren();ui.memoryCount.textContent=String(memories.length)+' SAVED';
  if(!memories.length){const p=document.createElement('p');p.className='memory-empty';p.textContent='No memories yet. Save a preference or ask NYVEX to remember something.';ui.memoryList.append(p);return;}
  for(const item of memories){
    const row=document.createElement('div');row.className='memory-item';
    const text=document.createElement('p');text.textContent=item.content;
    const remove=document.createElement('button');remove.type='button';remove.className='memory-delete';remove.textContent='×';remove.setAttribute('aria-label','Delete saved memory');
    remove.addEventListener('click',async()=>{try{const r=await fetch('/api/memory?id='+encodeURIComponent(item.id),{method:'DELETE'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Delete failed.');await loadMemories();toast('Memory deleted.');}catch(e){toast(e.message||'Could not delete memory.',true);}});
    row.append(text,remove);ui.memoryList.append(row);
  }
}
async function loadMemories(){
  if(authMode!=='supabase'||!activeUserId||activeUserId==='guest')return;
  try{const r=await fetch('/api/memory',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Memory is unavailable.');renderMemories(Array.isArray(d.memories)?d.memories:[]);}
  catch(e){ui.memoryList.replaceChildren();const p=document.createElement('p');p.className='memory-empty memory-error';p.textContent=e.message||'Memory is unavailable.';ui.memoryList.append(p);ui.memoryCount.textContent='SETUP NEEDED';}
}
ui.memoryForm.addEventListener('submit',async e=>{
  e.preventDefault();const content=ui.memoryInput.value.trim();if(!content)return;
  ui.memorySave.disabled=true;ui.memorySave.textContent='Saving…';
  try{const r=await fetch('/api/memory',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not save memory.');ui.memoryInput.value='';await loadMemories();toast('Saved to your private memory.');}
  catch(err){toast(err.message||'Memory could not be saved.',true);}
  finally{ui.memorySave.disabled=false;ui.memorySave.textContent='Save memory';}
});
async function status(){try{
  const r=await fetch('/api/status',{cache:'no-store'}),d=await r.json(),pulse=document.querySelector('.pulse');
  authMode=d.supabaseConfigured?'supabase':'legacy';
  if(d.supabaseConfigured){
    const nextUser=d.authenticated&&d.user?.id?d.user.id:'guest';
    const changed=switchAccount(nextUser);
    ui.accountEmail.textContent=d.user?.email||'';ui.accountEmail.classList.toggle('hidden',!d.authenticated);
    ui.logoutButton.classList.toggle('hidden',!d.authenticated);
    ui.memoryPanel.classList.toggle('hidden',!d.authenticated);
    if(d.authenticated&&(changed||lastMemoryUser!==nextUser)){lastMemoryUser=nextUser;await loadMemories();}
    if(!d.authenticated)lastMemoryUser=null;
  }else{
    switchAccount('guest');ui.accountEmail.classList.add('hidden');ui.logoutButton.classList.add('hidden');ui.memoryPanel.classList.add('hidden');
  }
  if(!updateGate(d)){
    if(d.supabaseConfigured){$('#provider-state').textContent='Sign in to NYVEX';$('#provider-model').textContent='Create your private account';}
    else if(!d.accessConfigured){$('#provider-state').textContent='Access setup needed';$('#provider-model').textContent='Set NYVEX_ACCESS_PASSWORD';}
    else{$('#provider-state').textContent='Private workspace locked';$('#provider-model').textContent='Enter access password';}
    $('#core-status').textContent='LOCKED';pulse.classList.remove('on');pulse.classList.add('off');return;
  }
  if(d.configured){$('#provider-state').textContent='AI brain connected';$('#provider-model').textContent=d.model||'Cloud AI';pulse.classList.add('on');pulse.classList.remove('off');$('#core-status').textContent='ONLINE';}
  else{$('#provider-state').textContent='AI key needed';$('#provider-model').textContent='Check provider setup';pulse.classList.add('off');$('#core-status').textContent='WAITING';}
}catch{$('#provider-state').textContent='Server unreachable';$('#provider-model').textContent='Start NYVEX to connect';$('#core-status').textContent='OFFLINE';}}
function voiceRecognitionConstructor(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
function setVoiceStatus(status,caption){
  ui.voiceStatus.textContent=String(status||'Voice link standby').toUpperCase();
  ui.voiceCaption.textContent=caption||'';
  ui.voiceStatusLight.classList.toggle('on',voiceSessionActive);
  ui.voiceModal.classList.toggle('voice-active',voiceSessionActive);
}
function matchingSpeechVoice(language){
  if(!('speechSynthesis' in window))return null;
  const voices=window.speechSynthesis.getVoices();
  const normal=value=>String(value||'').toLowerCase().replace(/_/g,'-');
  const target=normal(language);
  return voices.find(v=>normal(v.lang)===target)
    ||voices.find(v=>normal(v.lang).split('-')[0]===target.split('-')[0])
    ||null;
}
function refreshVoiceOutputHint(){
  if(!ui.voiceOutputHint)return;
  const language=ui.voiceLanguage.value||'en-US';
  if(language==='ne-NP'){
    ui.voiceOutputHint.textContent='Roman Nepali selected: replies use Latin letters (for example, “Namaste, timi kasto chau?”) and are spoken as Nepali. Cloud voice quotas apply.';
    ui.voiceOutputHint.classList.remove('warning');
    return;
  }
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){
    ui.voiceOutputHint.textContent='Your browser has no built-in speech voice for this language. NYVEX will try cloud-generated speech instead.';
    ui.voiceOutputHint.classList.remove('warning');
    return;
  }
  const voices=window.speechSynthesis.getVoices();
  const voice=matchingSpeechVoice(language);
  if(voice){
    ui.voiceOutputHint.textContent='Device speech voice ready: '+voice.name+' · '+voice.lang+'.';
    ui.voiceOutputHint.classList.remove('warning');
  }else if(!voices.length){
    ui.voiceOutputHint.textContent='Checking voices. NYVEX can try cloud-generated speech if the device lacks a matching voice.';
    ui.voiceOutputHint.classList.remove('warning');
  }else{
    ui.voiceOutputHint.textContent='No matching device voice found. NYVEX will try cloud-generated speech; free-tier quotas apply.';
    ui.voiceOutputHint.classList.remove('warning');
  }
}
function stopCloudVoicePlayback(){
  const audio=activeVoiceAudio;
  activeVoiceAudio=null;
  if(audio){
    audio.onended=null;audio.onerror=null;audio.onplay=null;
    try{audio.pause();audio.removeAttribute('src');audio.load();}catch{}
  }
  if(activeVoiceObjectUrl){try{URL.revokeObjectURL(activeVoiceObjectUrl);}catch{}activeVoiceObjectUrl=null;}
}
function playBrowserSpeech(text,language,onEnd){
  if(!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){
    if(typeof onEnd==='function')setTimeout(onEnd,0);
    return false;
  }
  stopCloudVoicePlayback();
  window.speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(String(text||'').replace(/https?:\/\/\S+/g,'link').slice(0,3200));
  utterance.lang=language;utterance.rate=0.98;utterance.pitch=0.96;utterance.volume=1;
  const voice=matchingSpeechVoice(language);
  if(voice)utterance.voice=voice;
  let completed=false;
  const finish=()=>{if(completed)return;completed=true;if(typeof onEnd==='function')onEnd();};
  utterance.onstart=()=>{if(voiceSessionActive)setVoiceStatus('NYVEX speaking','Speaking your reply. I will listen again when the answer finishes.');};
  utterance.onend=finish;utterance.onerror=finish;
  window.speechSynthesis.speak(utterance);
  return true;
}
async function speakCloudText(text,language,onEnd){
  const token=++voicePlaybackToken;
  let completed=false,fallbackStarted=false;
  const finish=()=>{if(completed)return;completed=true;if(typeof onEnd==='function')onEnd();};
  const startFallback=reason=>{
    if(fallbackStarted||token!==voicePlaybackToken)return;
    fallbackStarted=true;stopCloudVoicePlayback();
    const detail=String(reason||'cloud voice is unavailable').slice(0,160);
    if(ui.voiceOutputHint){
      ui.voiceOutputHint.textContent=language==='ne-NP'
        ? 'Cloud Nepali voice failed ('+detail+'). This device has no Nepali voice fallback, so check the error and retry.'
        : 'Cloud speech is temporarily unavailable ('+detail+'). Trying your phone’s speech engine as a fallback.';
      ui.voiceOutputHint.classList.add('warning');
    }
    toast(language==='ne-NP'?'Cloud Nepali voice failed. This device has no Nepali fallback; check the message above.':'Cloud voice is temporarily unavailable. Trying device speech as a fallback.',true);
    if(language==='ne-NP'){finish();return;}
    if(!playBrowserSpeech(text,language,finish))finish();
  };
  stopCloudVoicePlayback();
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  if(ui.voiceOutputHint){
    ui.voiceOutputHint.textContent=language==='ne-NP'
      ? 'Generating Roman Nepali speech with NYVEX cloud voice…'
      : 'Generating audio with NYVEX cloud voice…';
    ui.voiceOutputHint.classList.remove('warning');
  }
  if(voiceSessionActive)setVoiceStatus('Generating voice','Creating spoken audio. This may take a moment.');
  try{
    const response=await fetch('/api/speech',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text:String(text||'').slice(0,2400),language})
    });
    if(!response.ok){
      let data={};try{data=await response.json();}catch{}
      throw new Error(data.error||'Cloud voice is temporarily unavailable.');
    }
    const blob=await response.blob();
    if(token!==voicePlaybackToken){finish();return;}
    if(blob.size<100||blob.size>10*1024*1024)throw new Error('The cloud voice returned an invalid audio file.');
    const objectUrl=URL.createObjectURL(blob);
    const audio=new Audio(objectUrl);
    audio.preload='auto';audio.playsInline=true;
    activeVoiceAudio=audio;activeVoiceObjectUrl=objectUrl;
    const clean=()=>{
      if(activeVoiceAudio===audio)activeVoiceAudio=null;
      if(activeVoiceObjectUrl===objectUrl){try{URL.revokeObjectURL(objectUrl);}catch{}activeVoiceObjectUrl=null;}
    };
    audio.onplay=()=>{
      if(ui.voiceOutputHint){
        ui.voiceOutputHint.textContent=language==='ne-NP'
          ? 'Speaking Roman Nepali with NYVEX cloud voice.'
          : 'Speaking with NYVEX cloud voice.';
        ui.voiceOutputHint.classList.remove('warning');
      }
      if(voiceSessionActive)setVoiceStatus('NYVEX speaking','Speaking your reply. I will listen again when the answer finishes.');
    };
    audio.onended=()=>{clean();finish();};
    audio.onerror=()=>{clean();startFallback('the browser could not play the generated audio');};
    await audio.play();
  }catch(error){
    if(token!==voicePlaybackToken){finish();return;}
    startFallback(String(error?.message||'cloud voice is unavailable'));
  }
}
function speakText(text,onEnd){
  const language=ui.voiceLanguage?ui.voiceLanguage.value:'en-US';
  if(language==='ne-NP'||!matchingSpeechVoice(language)||!('speechSynthesis' in window)||!window.SpeechSynthesisUtterance){
    speakCloudText(text,language,onEnd);
    return true;
  }
  return playBrowserSpeech(text,language,onEnd);
}
function refreshVoiceToggle(){
  ui.voiceToggle.textContent=voiceAuto?'🔊 Voice on':'🔊 Voice off';
  ui.voiceToggle.setAttribute('aria-pressed',String(voiceAuto));
}
ui.voiceToggle.addEventListener('click',()=>{
  voiceAuto=!voiceAuto;localStorage.setItem('nyvex.voice.autoplay',String(voiceAuto));refreshVoiceToggle();
  if(!voiceAuto&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  toast(voiceAuto?'NYVEX will speak replies aloud.':'Spoken replies turned off.');
});
function refreshVoiceReplyButton(){
  ui.voiceReplies.textContent=voiceReplyAudio?'◖ Spoken replies on':'◖ Spoken replies off';
  ui.voiceReplies.setAttribute('aria-pressed',String(voiceReplyAudio));
}
function openVoiceMode(){
  ui.voiceModal.classList.remove('hidden');document.body.classList.add('voice-open');
  ui.voiceModeOpen.setAttribute('aria-expanded','true');
  const supported=Boolean(voiceRecognitionConstructor());
  ui.voiceStart.disabled=!supported;
  ui.voiceStart.textContent=supported?'Start listening':'Microphone unavailable';
  ui.voiceUserText.textContent='Waiting for your voice…';
  ui.voiceAiText.textContent='Standing by.';
  if(voiceSessionActive){
    setVoiceStatus(isListening?'Listening':'Voice session active',isListening?'I am listening. Speak naturally.':'Voice session is active.');
  }else if(supported){
    setVoiceStatus('Voice link standby','Start a session when you are ready. NYVEX will listen again after each spoken reply.');
  }else{
    setVoiceStatus('Voice input unavailable','This browser does not support speech recognition. Try a current version of Chrome or Edge, or use the normal chat controls.');
  }
  refreshVoiceReplyButton();refreshVoiceOutputHint();
  (supported?ui.voiceStart:ui.voiceClose).focus({preventScroll:true});
}
function closeVoiceMode(){
  stopVoiceSession(false);
  ui.voiceModal.classList.add('hidden');document.body.classList.remove('voice-open');
  ui.voiceModeOpen.setAttribute('aria-expanded','false');
  ui.voiceModeOpen.focus({preventScroll:true});
}
function scheduleVoiceListening(delay){
  clearTimeout(voiceRetryTimer);
  if(!voiceSessionActive)return;
  voiceRetryTimer=setTimeout(()=>{voiceRetryTimer=null;startVoiceListening();},Math.max(250,delay||500));
}
function finishVoiceTurn(){
  if(!voiceSessionActive)return;
  voiceTurnInProgress=false;
  setVoiceStatus('Voice link active','Reply complete. I am getting ready to listen again.');
  scheduleVoiceListening(650);
}
function startVoiceListening(){
  if(!voiceSessionActive||isListening||voiceTurnInProgress)return;
  if(busy){scheduleVoiceListening(900);return;}
  const SpeechRecognition=voiceRecognitionConstructor();
  if(!SpeechRecognition){
    stopVoiceSession(false);setVoiceStatus('Voice input unavailable','Speech recognition is not supported in this browser.');return;
  }
  let current;
  try{current=new SpeechRecognition();}catch{
    stopVoiceSession(false);setVoiceStatus('Microphone unavailable','Could not create a microphone session. Try reloading or use typed chat.');return;
  }
  recognition=current;
  current.lang=ui.voiceLanguage.value||'en-US';
  current.continuous=false;current.interimResults=true;current.maxAlternatives=1;
  let finalTranscript='',submitted=false;
  current.onstart=()=>{
    if(!voiceSessionActive)return;
    isListening=true;ui.voiceInput.classList.remove('listening');
    setVoiceStatus('Listening now','I am listening. Speak naturally, then pause when you are done.');
  };
  current.onresult=(event)=>{
    let interim='';
    for(let i=event.resultIndex;i<event.results.length;i++){
      const result=event.results[i],transcript=String(result[0]&&result[0].transcript||'');
      if(result.isFinal)finalTranscript+=transcript+' ';
      else interim+=transcript;
    }
    if(interim.trim()&&!finalTranscript.trim())ui.voiceCaption.textContent='Hearing: '+interim.trim();
    const phrase=finalTranscript.trim();
    if(phrase&&!submitted){
      submitted=true;voiceTurnInProgress=true;
      ui.voiceUserText.textContent=phrase;ui.voiceAiText.textContent='Thinking through your request…';
      setVoiceStatus('Thinking','I heard you. NYVEX is working on your request.');
      try{current.stop();}catch{}
      sendMessage(phrase,{fromVoice:true});
    }
  };
  current.onerror=(event)=>{
    if(!voiceSessionActive)return;
    const reason=String(event.error||'');
    if(reason==='not-allowed'||reason==='service-not-allowed'||reason==='audio-capture'){
      const message=reason==='audio-capture'?'No microphone was found. Connect or enable a microphone and try again.':'Microphone access was blocked. Allow it in your browser settings, then start a new session.';
      stopVoiceSession(false);setVoiceStatus('Microphone blocked',message);toast(message,true);return;
    }
    if(reason==='network')setVoiceStatus('Voice connection interrupted','The browser speech service had a connection issue. Retrying…');
    else if(reason!=='no-speech')setVoiceStatus('Voice input interrupted','I could not hear that clearly. I will try listening again.');
  };
  current.onend=()=>{
    if(recognition===current)recognition=null;
    isListening=false;
    if(voiceSessionActive&&!voiceTurnInProgress)scheduleVoiceListening(700);
  };
  try{current.start();}
  catch{
    if(recognition===current)recognition=null;
    isListening=false;
    stopVoiceSession(false);
    setVoiceStatus('Could not start microphone','Check your browser microphone permission and try again.');
    toast('Could not start the microphone. Check browser permission and try again.',true);
  }
}
function stopVoiceSession(announce=false){
  const hadSession=voiceSessionActive||isListening;
  voicePlaybackToken++;
  stopCloudVoicePlayback();
  voiceSessionActive=false;voiceTurnInProgress=false;
  clearTimeout(voiceRetryTimer);voiceRetryTimer=null;
  const current=recognition;recognition=null;
  if(current){try{current.onend=null;current.stop();}catch{}}
  isListening=false;
  ui.voiceInput.classList.remove('listening');ui.voiceInput.textContent='🎙';
  if('speechSynthesis' in window)window.speechSynthesis.cancel();
  ui.voiceStart.classList.remove('hidden');ui.voiceStop.classList.add('hidden');
  ui.voiceModal.classList.remove('voice-active');
  setVoiceStatus('Voice link standby','Session ended. Start listening whenever you are ready.');
  if(announce&&hadSession)toast('NYVEX voice session ended.');
}
function startVoiceSession(){
  const SpeechRecognition=voiceRecognitionConstructor();
  if(!SpeechRecognition){setVoiceStatus('Voice input unavailable','Try Chrome or Edge on desktop, or a mobile browser that supports speech recognition.');toast('Voice input is not available in this browser.',true);return;}
  if(voiceSessionActive){scheduleVoiceListening(250);return;}
  voiceSessionActive=true;voiceTurnInProgress=false;
  ui.voiceStart.classList.add('hidden');ui.voiceStop.classList.remove('hidden');
  setVoiceStatus('Connecting voice link','Starting microphone. Your voice session stays active until you end it.');
  ui.voiceUserText.textContent='Waiting for your first message…';ui.voiceAiText.textContent='Ready when you are.';
  startVoiceListening();
}
function startOneShotVoiceInput(){
  const SpeechRecognition=voiceRecognitionConstructor();
  if(isListening&&recognition&&!voiceSessionActive){try{recognition.stop();}catch{}return;}
  if(!SpeechRecognition){toast('Voice input is not available in this browser. Try Chrome or Edge, or type your message.',true);return;}
  let current;
  try{current=new SpeechRecognition();}catch{toast('Could not start the microphone. Check browser permission and try again.',true);return;}
  recognition=current;current.lang=ui.voiceLanguage?ui.voiceLanguage.value:'en-US';current.continuous=false;current.interimResults=false;current.maxAlternatives=1;
  current.onstart=()=>{isListening=true;ui.voiceInput.classList.add('listening');ui.voiceInput.textContent='■ Stop';toast('Listening — say your message.');};
  current.onresult=(event)=>{
    const phrase=String(event.results&&event.results[0]&&event.results[0][0]&&event.results[0][0].transcript||'').trim();
    if(phrase){ui.prompt.value=phrase;ui.prompt.dispatchEvent(new Event('input'));sendMessage(phrase);}
  };
  current.onerror=(event)=>{const reason=String(event.error||'');toast(reason==='not-allowed'?'Allow microphone access in your browser settings.':'Voice input stopped. Try again or type your message.',true);};
  current.onend=()=>{
    if(recognition===current)recognition=null;
    if(!voiceSessionActive){isListening=false;ui.voiceInput.classList.remove('listening');ui.voiceInput.textContent='🎙';}
  };
  try{current.start();}catch{
    if(recognition===current)recognition=null;isListening=false;ui.voiceInput.classList.remove('listening');ui.voiceInput.textContent='🎙';
    toast('Could not start the microphone. Check browser permission and try again.',true);
  }
}
ui.voiceModeOpen.addEventListener('click',openVoiceMode);
ui.voiceClose.addEventListener('click',closeVoiceMode);
ui.voiceModal.addEventListener('click',event=>{if(event.target.closest('[data-voice-close]'))closeVoiceMode();});
ui.voiceStart.addEventListener('click',startVoiceSession);
ui.voiceStop.addEventListener('click',()=>stopVoiceSession(true));
ui.voiceReplies.addEventListener('click',()=>{
  voiceReplyAudio=!voiceReplyAudio;localStorage.setItem('nyvex.voice.replies',String(voiceReplyAudio));refreshVoiceReplyButton();
  if(!voiceReplyAudio&&'speechSynthesis' in window)window.speechSynthesis.cancel();
  toast(voiceReplyAudio?'Voice session replies will be spoken aloud.':'Spoken replies muted for this session.');
});
ui.voiceInput.addEventListener('click',startOneShotVoiceInput);
ui.voiceLanguage.addEventListener('change',()=>{
  localStorage.setItem('nyvex.voice.language',ui.voiceLanguage.value);
  refreshVoiceOutputHint();
  if(voiceSessionActive&&isListening&&recognition){try{recognition.stop();}catch{}}
});
if('speechSynthesis' in window&&typeof window.speechSynthesis.addEventListener==='function'){
  window.speechSynthesis.addEventListener('voiceschanged',refreshVoiceOutputHint);
}
const savedVoiceLanguage=localStorage.getItem('nyvex.voice.language');
if(savedVoiceLanguage&&['en-US','ne-NP','hi-IN'].includes(savedVoiceLanguage))ui.voiceLanguage.value=savedVoiceLanguage;
window.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!ui.voiceModal.classList.contains('hidden'))closeVoiceMode();
});
refreshVoiceToggle();refreshVoiceReplyButton();refreshVoiceOutputHint();

renderHistory();updateActivity([]);status();
if('serviceWorker' in navigator && location.protocol==='https:'){navigator.serviceWorker.register('/sw.js?v=10').catch(()=>{});}