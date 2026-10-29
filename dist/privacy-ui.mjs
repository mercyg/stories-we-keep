export function privacyUI(vault,onUnlock){
  const dialog=document.createElement('dialog');dialog.className='settings-dialog';dialog.id='privacyDialog';dialog.setAttribute('aria-labelledby','privacyTitle');
  dialog.innerHTML=`<form id="privacyForm"><h2 id="privacyTitle">Protect your stories</h2><p id="privacyDescription"></p><label>Password<input id="privacyPassword" type="password" autocomplete="new-password" required maxlength="256"></label><label id="privacyRepeatLabel">Repeat password<input id="privacyRepeat" type="password" autocomplete="new-password" maxlength="256"></label><p id="privacyRecovery" class="small">Use a long, unique phrase of at least 12 characters. This password stays on your device. We cannot recover it. If you forget it, protected stories cannot be unlocked. Clearing browser data also removes them.</p><label id="privacyAcknowledgeLabel" class="privacy-check"><input id="privacyAcknowledge" type="checkbox">I understand there is no password recovery and will keep a backup of my password.</label><p id="privacyStatus" class="status" role="status"></p><div class="button-row"><button id="privacySubmit" class="button primary" type="submit">Protect stories</button><button id="privacyCancel" class="text-button" type="button">Cancel</button></div></form>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  let pending=null,working=false,setup=false;
  function finish(value){if(working)return;dialog.close();$('privacyPassword').value='';$('privacyRepeat').value='';pending?.(value);pending=null;}
  $('privacyCancel').onclick=()=>finish(false);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
  $('privacyForm').onsubmit=async e=>{
    e.preventDefault();if(working)return;
    const password=$('privacyPassword').value;
    if(setup&&(password.length<12||password!==$('privacyRepeat').value||!$('privacyAcknowledge').checked)){$('privacyStatus').textContent='Use at least 12 characters, repeat the same password, and acknowledge the recovery limit.';return}
    working=true;for(const el of dialog.querySelectorAll('input,button'))el.disabled=true;$('privacyStatus').textContent=setup?'Encrypting saved stories…':'Unlocking stories…';
    try{if(setup)await vault.setup(password);else await vault.unlock(password);await onUnlock();working=false;finish(true)}
    catch(error){$('privacyStatus').textContent=error.message}
    finally{working=false;for(const el of dialog.querySelectorAll('input,button'))el.disabled=false;$('privacyPassword').value='';$('privacyRepeat').value='';}
  };
  return async function ensure(){
    if(pending)return false;
    const state=await vault.state();if(state.unlocked)return true;setup=!state.configured;
    $('privacyTitle').textContent=setup?'Protect your stories':'Unlock your stories';
    $('privacyDescription').textContent=setup?'Saved words, names, pictures, and recordings will be encrypted in this browser. Existing memories will be protected together. Close other Stories We Keep tabs before setting this up. The password is never sent to the transcription service.':'Enter the password you chose for this browser. Your password is not sent to a server.';
    $('privacyRepeatLabel').hidden=!setup;$('privacyRecovery').hidden=!setup;$('privacyAcknowledgeLabel').hidden=!setup;
    $('privacyPassword').autocomplete=setup?'new-password':'current-password';$('privacySubmit').textContent=setup?'Protect stories':'Unlock stories';$('privacyAcknowledge').checked=false;$('privacyStatus').textContent='';
    const result=new Promise(resolve=>{pending=resolve});dialog.showModal();$('privacyPassword').focus();return result;
  };
}

export function processingConsent(destination,kind='audio'){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='settings-dialog';dialog.setAttribute('aria-labelledby','processingTitle');
    dialog.innerHTML=`<h2 id="processingTitle">${kind==='audio'?'Send this recording for transcription?':'Send this text for translation?'}</h2><p id="processingDetails"></p><p>The service must read the ${kind==='audio'?'audio':'text'} to process it. This is not end-to-end encrypted. Our speech code removes processed audio files, but we cannot promise deletion from every layer of the hosting provider.</p><p>You can keep this memory on your device and enter the words yourself instead.</p><label class="privacy-check"><input id="processingPermission" type="checkbox">I have the storyteller’s permission to send this ${kind==='audio'?'recording':'text'}.</label><div class="button-row"><button id="processingSend" class="button primary" disabled>Send ${kind==='audio'?'recording':'text'}</button><button id="processingCancel" class="text-button">Keep on device</button></div>`;
    dialog.querySelector('#processingDetails').textContent=`This ${kind==='audio'?'recording':'text'} will be sent to ${destination}. The password protects saved stories on this device; it does not hide this request from the processing service.`;
    const finish=value=>{dialog.close();dialog.remove();resolve(value)};
    dialog.querySelector('#processingPermission').onchange=e=>{dialog.querySelector('#processingSend').disabled=!e.target.checked};
    dialog.querySelector('#processingSend').onclick=()=>finish(true);dialog.querySelector('#processingCancel').onclick=()=>finish(false);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
    document.body.append(dialog);dialog.showModal();
  });
}
