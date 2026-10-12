'use strict';
const $ = (s) => document.querySelector(s);
const ui = { messages:$('#messages'), prompt:$('#prompt'), composer:$('#composer'), send:$('#send'), thinking:$('#thinking'), thinkingLabel:$('#thinking-label'), welcome:$('#welcome-panel'), activity:$('#activity-list'), activityCount:$('#activity-count'), planForm:$('#plan-form'), goal:$('#goal'), planButton:$('#plan-button'), planOutput:$('#plan-output'), toast:$('#toast'), authWall:$('#auth-wall'), authForm:$('#auth-form'), authPassword:$('#auth-password'), authMessage:$('#auth-message'), authError:$('#auth-error'), authSetup:$('#auth-setup') };
let mode='DREAM', busy=false, toastTimer;
const STORAGE='nyvex.history.v2', CHAT='nyvex.current.v2';
let history=[];
try { history=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(!Array.isArray(history))history=[]; } catch { history=[]; }
let messages=[];
try { messages=JSON.parse(localStorage.getItem(CHAT)||'[]'); if(!Array.isArray(messages))messages=[]; } catch { messages=[]; }
function save(){try{localStorage.setItem(CHAT,JSON.stringify(messages.slice(-36)));}catch{}}
function toast(text, bad=false){ui.toast.textContent=text;ui.toast.className=`toast show${bad?' error':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.className='toast',3000);}
function setBusy(value){busy=value;ui.send.disabled=value;ui.planButton.disabled=value;ui.prompt.disabled=value;ui.thinking.classList.toggle('hidden',!value);if(value)ui.thinkingLabel.textContent='Planning, using tools, and checking results…';}
function scrollEnd(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});}
function addMessage(role, text, actions=[]){
  ui.welcome.classList.add('hidden'); const wrap=document.createElement('article');wrap.className=`message ${role}`;
  const av=document.createElement('div');av.className='message-avatar';av.textContent=role==='user'?'Y':'N';
  const body=document.createElement('div');body.className='message-body';const meta=document.createElement('div');meta.className='message-meta';meta.textContent=role==='user'?'YOU':'NYVEX';
  const bubble=document.createElement('div');bubble.className='message-bubble';bubble.textContent=text;body.append(meta,bubble);
  if(actions.length){const badges=document.createElement('div');badges.className='message-tools';for(const a of actions){const t=document.createElement('span');t.textContent=`${a.ok?'✓':'!'} ${a.tool}`;badges.append(t);}body.append(badges);}
  wrap.append(av,body);ui.messages.append(wrap);scrollEnd();
}
function renderHistory(){ui.messages.replaceChildren();ui.welcome.classList.toggle('hidden',messages.length>0);for(const m of messages)addMessage(m.role,m.content,m.actions||[]);}
function updateActivity(actions=[]){ui.activity.replaceChildren();ui.activityCount.textContent=`${actions.length} STEP${actions.length===1?'':'S'}`;if(!actions.length){const e=document.createElement('div');e.className='activity-empty';e.innerHTML='<span class="activity-line"></span><span>No tool calls this run. Start another mission.</span>';ui.activity.append(e);return;}for(const a of actions){const item=document.createElement('div');item.className='activity-item';const mark=document.createElement('span');mark.className=`activity-mark ${a.ok?'done':'failed'}`;const txt=document.createElement('div');txt.className='activity-text';const title=document.createElement('b');title.textContent=a.tool;const detail=document.createElement('small');detail.textContent=a.summary|| (a.ok?'Tool completed':'Tool did not complete');txt.append(title,detail);item.append(mark,txt);ui.activity.append(item);}}
function renderPlan(plan){ui.planOutput.replaceChildren();const title=document.createElement('h3');title.className='plan-title';title.textContent=plan.title;const summary=document.createElement('p');summary.className='plan-summary';summary.textContent=plan.summary;ui.planOutput.append(title,summary);for(const t of plan.tasks){const row=document.createElement('div');row.className='plan-task';const check=document.createElement('input');check.type='checkbox';check.id=`task-${t.id}`;const label=document.createElement('label');label.htmlFor=check.id;label.append(document.createTextNode(t.title));if(t.detail){const detail=document.createElement('small');detail.textContent=t.detail;label.append(detail);}const pri=document.createElement('span');pri.className=`priority ${t.priority}`;pri.textContent=t.priority;label.append(pri);row.append(check,label);ui.planOutput.append(row);}}
async function sendMessage(text){text=String(text||'').trim();if(!text||busy)return;messages.push({role:'user',content:text});save();addMessage('user',text);ui.prompt.value='';ui.prompt.style.height='auto';setBusy(true);updateActivity([]);try{const res=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,messages:messages.slice(-18)})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed.');const answer=String(data.reply||'NYVEX returned an empty response.');const actions=Array.isArray(data.actions)?data.actions:[];messages.push({role:'assistant',content:answer,actions});save();addMessage('assistant',answer,actions);updateActivity(actions);$('#core-status').textContent='ACTIVE';}catch(e){toast(e.message||'Could not reach NYVEX.',true);addMessage('assistant',`I couldn't complete that request: ${e.message||'Network error'}. Check the API key/server status and retry.`); }finally{setBusy(false);ui.prompt.focus();}}
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
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));$('#breadcrumb-page').textContent=b.dataset.view==='planner'?'Mission planner':'Agent';if(b.dataset.view==='planner')$('#goal').focus();}));
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();messages=[];save();renderHistory();ui.prompt.focus();}});
function updateGate(d){
  if(!d.accessConfigured){
    ui.authWall.classList.remove('hidden');ui.authForm.classList.add('hidden');ui.authSetup.classList.remove('hidden');
    ui.authMessage.textContent='NYVEX is locked until the owner finishes the security setup.';
    return false;
  }
  if(!d.authenticated){
    ui.authWall.classList.remove('hidden');ui.authForm.classList.remove('hidden');ui.authSetup.classList.add('hidden');
    ui.authMessage.textContent='Enter the private access password to continue.';return false;
  }
  ui.authWall.classList.add('hidden');return true;
}
ui.authForm.addEventListener('submit',async e=>{
  e.preventDefault();ui.authError.textContent='';
  const password=ui.authPassword.value, submit=$('#auth-submit');
  submit.disabled=true;submit.textContent='Checking…';
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Could not unlock NYVEX.');
    ui.authPassword.value='';await status();
    if(!ui.authWall.classList.contains('hidden'))throw new Error('NYVEX is still locked. Refresh or check the access setup.');
    toast('Welcome back. NYVEX unlocked.');
  }catch(e){ui.authError.textContent=e.message||'Could not unlock NYVEX.';}
  finally{submit.disabled=false;submit.innerHTML='Unlock <span>↗</span>';}
});
async function status(){try{
  const r=await fetch('/api/status',{cache:'no-store'}), d=await r.json(), pulse=document.querySelector('.pulse');
  if(!updateGate(d)){
    if(!d.accessConfigured){$('#provider-state').textContent='Access setup needed';$('#provider-model').textContent='Set NYVEX_ACCESS_PASSWORD';$('#core-status').textContent='LOCKED';}
    else{$('#provider-state').textContent='Private workspace locked';$('#provider-model').textContent='Enter access password';$('#core-status').textContent='LOCKED';}
    pulse.classList.remove('on');pulse.classList.add('off');return;
  }
  if(d.configured){$('#provider-state').textContent='AI brain connected';$('#provider-model').textContent=d.model||'OpenAI model';pulse.classList.add('on');pulse.classList.remove('off');$('#core-status').textContent='ONLINE';}
  else{$('#provider-state').textContent='API key needed';$('#provider-model').textContent='Add OPENAI_API_KEY';pulse.classList.add('off');$('#core-status').textContent='WAITING';}
}catch{$('#provider-state').textContent='Server unreachable';$('#provider-model').textContent='Start NYVEX to connect';$('#core-status').textContent='OFFLINE';}}
renderHistory();updateActivity([]);status();