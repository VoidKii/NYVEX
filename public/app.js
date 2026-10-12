'use strict';
const $ = (s) => document.querySelector(s);
const ui = { messages:$('#messages'), prompt:$('#prompt'), composer:$('#composer'), send:$('#send'), thinking:$('#thinking'), thinkingLabel:$('#thinking-label'), welcome:$('#welcome-panel'), activity:$('#activity-list'), activityCount:$('#activity-count'), planForm:$('#plan-form'), goal:$('#goal'), planButton:$('#plan-button'), planOutput:$('#plan-output'), toast:$('#toast'), authWall:$('#auth-wall'), authForm:$('#auth-form'), authEmail:$('#auth-email'), authPassword:$('#auth-password'), authMessage:$('#auth-message'), authError:$('#auth-error'), authSetup:$('#auth-setup'), memoryPanel:$('#memory-panel'), memoryForm:$('#memory-form'), memoryInput:$('#memory-input'), memoryList:$('#memory-list'), memorySave:$('#memory-save'), memoryCount:$('#memory-count'), authSignup:$('#auth-signup'), logoutButton:$('#logout-button'), accountEmail:$('#account-email'), voiceInput:$('#voice-input'), voiceToggle:$('#voice-toggle') };
let mode='DREAM', busy=false, toastTimer, installPrompt=null, voiceAuto=localStorage.getItem('nyvex.voice.autoplay')==='true', recognition=null, isListening=false, authMode='legacy', activeUserId='guest', lastMemoryUser=null;
let STORAGE='nyvex.history.v2.guest', CHAT='nyvex.current.v2.guest';
const installButton=$('#install-app');
function refreshInstallButton(){if(!installButton)return;const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;installButton.classList.toggle('hidden',standalone);}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;refreshInstallButton();});
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
async function sendMessage(text){text=String(text||'').trim();if(!text||busy)return;messages.push({role:'user',content:text});save();addMessage('user',text);ui.prompt.value='';ui.prompt.style.height='auto';setBusy(true);updateActivity([]);try{const res=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,messages:messages.slice(-18)})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed.');const answer=String(data.reply||'NYVEX returned an empty response.');const actions=Array.isArray(data.actions)?data.actions:[];messages.push({role:'assistant',content:answer,actions});save();addMessage('assistant',answer,actions);updateActivity(actions);$('#core-status').textContent='ACTIVE';if(voiceAuto)speakText(answer);}catch(e){toast(e.message||'Could not reach NYVEX.',true);addMessage('assistant',`I couldn't complete that request: ${e.message||'Network error'}. Check the API key/server status and retry.`); }finally{setBusy(false);ui.prompt.focus();}}
async function planMission(goal){goal=String(goal||'').trim();if(!goal||busy)return;setBusy(true);ui.planButton.disabled=true;try{const res=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'TACTIC',messages:[{role:'user',content:goal}]})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Plan failed.');renderPlan(data.plan);$('#breadcrumb-page').textContent='Mission planner';toast('Mission plan created. Check off steps as you finish them.');}catch(e){toast(e.message||'Could not create a plan.',true);}finally{setBusy(false);ui.planButton.disabled=false;}}
function chooseMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===next));$('#composer-mode').textContent=`${next} MODE`;}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
document.querySelectorAll('[data-prompt]').forEach(b=>b.addEventListener('click',()=>{ui.prompt.value=b.dataset.prompt;ui.prompt.focus();ui.prompt.dispatchEvent(new Event('input'));}));
ui.composer.addEventListener('submit',e=>{e.preventDefault();sendMessage(ui.prompt.value);});
ui.prompt.addEventListener('input',()=>{ui.prompt.style.height='auto';ui.prompt.style.height=`${Math.min(ui.prompt.scrollHeight,180)}px`;});
ui.prompt.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ui.composer.requestSubmit();}});
ui.planForm.addEventListener('submit',e=>{e.preventDefault();planMission(ui.goal.value);});
$('#new-chat').addEventListener('click',()=>{messages=[];save();renderHistory();updateActivity([]);ui.prompt.focus();});
$('#clear-chat').addEventListener('click',()=>{messages=[];save();renderHistory();updateActivity([]);toast('Current conversation cleared.');});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));const planner=b.dataset.view==='planner';$('#breadcrumb-page').textContent=planner?'Mission planner':'Agent';if(planner){$('#goal').focus({preventScroll:true});$('#goal').scrollIntoView({behavior:'smooth',block:'center'});}else{$('#agent-view').scrollIntoView({behavior:'smooth',block:'start'});ui.prompt.focus({preventScroll:true});}}));
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();messages=[];save();renderHistory();ui.prompt.focus();}});
function updateGate(d){
  authMode=d.supabaseConfigured?'supabase':'legacy';
  const emailWrap=$('#auth-email-wrap'),signup=$('#auth-signup'),passwordLabel=$('#auth-password-label'),submit=$('#auth-submit'),foot=$('#auth-foot');
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
renderHistory();updateActivity([]);status();
if('serviceWorker' in navigator && location.protocol==='https:'){navigator.serviceWorker.register('/sw.js').catch(()=>{});}