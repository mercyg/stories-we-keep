export function privacyUI(vault,onUnlock){
  const dialog=document.createElement('dialog');dialog.className='settings-dialog';dialog.id='privacyDialog';dialog.setAttribute('aria-labelledby','privacyTitle');
  dialog.innerHTML=`<form id="privacyForm"><h2 id="privacyTitle">Set a password for your stories</h2><p id="privacyDescription"></p><label>Password<input id="privacyPassword" type="password" autocomplete="new-password" required maxlength="256"></label><label id="privacyRepeatLabel">Type your password again<input id="privacyRepeat" type="password" autocomplete="new-password" maxlength="256"></label><p id="privacyPasswordHint" class="small">Use at least 12 letters, numbers, or symbols. A few words together can be easier to remember.</p><div id="privacyRecovery" class="password-reminder"><strong>Keep your password somewhere safe.</strong><p>If you forget it, we cannot reset it or open your saved stories for you.</p></div><p id="privacyStorageNote" class="small"><strong>Your stories stay in this browser.</strong> Clearing browser data deletes your saved stories. They also won’t appear on another device. A password does not back them up. Download a book to keep a separate copy; downloaded books are not password-protected.</p><details id="privacyMore"><summary>Where are my stories kept?</summary><p>Stories are saved only in this browser on this device. They do not appear automatically on another phone or computer. Clearing browser data removes them. Download a book if you want a separate copy.</p><p>This also protects stories you have already saved. Before continuing, close any other Stories We Keep tabs. Your password is never sent to us or the speech service.</p></details><label id="privacyAcknowledgeLabel" class="privacy-check"><input id="privacyAcknowledge" type="checkbox"><span>I’ll keep my password safe. I understand it cannot be reset.</span></label><p id="privacyStatus" class="status" role="status"></p><div class="button-row"><button id="privacySubmit" class="button primary" type="submit">Set password</button><button id="privacyCancel" class="text-button" type="button">Cancel</button></div></form>`;
  document.body.append(dialog);const $=id=>dialog.querySelector('#'+id);
  let pending=null,working=false,setup=false;
  function finish(value){if(working)return;dialog.close();$('privacyPassword').value='';$('privacyRepeat').value='';pending?.(value);pending=null;}
  $('privacyCancel').onclick=()=>finish(false);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
  $('privacyForm').onsubmit=async e=>{
    e.preventDefault();if(working)return;
    const password=$('privacyPassword').value;
    if(setup){let message='';if(password.length<12)message='Choose a longer password: at least 12 letters, numbers, or symbols.';else if(password!==$('privacyRepeat').value)message='The passwords don’t match. Please type the same password in both boxes.';else if(!$('privacyAcknowledge').checked)message='Please check the box to confirm you’ll keep your password safe.';if(message){$('privacyStatus').textContent=message;return}}
    working=true;for(const el of dialog.querySelectorAll('input,button'))el.disabled=true;$('privacyStatus').textContent=setup?'Protecting your stories…':'Unlocking stories…';
    try{if(setup)await vault.setup(password);else await vault.unlock(password);await onUnlock();working=false;finish(true)}
    catch(error){$('privacyStatus').textContent=error.message}
    finally{working=false;for(const el of dialog.querySelectorAll('input,button'))el.disabled=false;$('privacyPassword').value='';$('privacyRepeat').value='';}
  };
  return async function ensure(){
    if(pending)return false;
    const state=await vault.state();if(state.unlocked)return true;setup=!state.configured;
    $('privacyTitle').textContent=setup?'Set a password for your stories':'Open your saved stories';
    $('privacyDescription').textContent=setup?'Choose a password to keep your saved stories, photos, and recordings private on this device. You’ll use it to open them when you return.':'Enter the password you chose when you first saved stories on this device.';
    $('privacyRepeatLabel').hidden=!setup;$('privacyPasswordHint').hidden=!setup;$('privacyMore').hidden=!setup;$('privacyStorageNote').hidden=!setup;$('privacyMore').open=false;$('privacyRecovery').hidden=!setup;$('privacyAcknowledgeLabel').hidden=!setup;
    $('privacyPassword').autocomplete=setup?'new-password':'current-password';$('privacySubmit').textContent=setup?'Set password':'Open my stories';$('privacyAcknowledge').checked=false;$('privacyStatus').textContent='';
    const result=new Promise(resolve=>{pending=resolve});dialog.showModal();$('privacyPassword').focus();return result;
  };
}

export function processingConsent(destination,kind='audio'){
  return new Promise(resolve=>{
    const dialog=document.createElement('dialog');dialog.className='settings-dialog';dialog.setAttribute('aria-labelledby','processingTitle');
    dialog.innerHTML=`<h2 id="processingTitle">${kind==='audio'?'Send this recording for transcription?':'Send this text for translation?'}</h2><p id="processingDetails"></p><p>The service must read the ${kind==='audio'?'audio':'text'} to process it. This is not end-to-end encrypted. Our hosted speech service processes audio in memory instead of creating downloadable audio files, and encrypts the returned transcript for this browser. Hosting infrastructure can still access audio during processing; we cannot guarantee provider-wide deletion.</p><p>You can keep this memory on your device and enter the words yourself instead.</p><label class="privacy-check"><input id="processingPermission" type="checkbox">I have the storyteller’s permission to send this ${kind==='audio'?'recording':'text'}.</label><div class="button-row"><button id="processingSend" class="button primary" disabled>Send ${kind==='audio'?'recording':'text'}</button><button id="processingCancel" class="text-button">Keep on device</button></div>`;
    dialog.querySelector('#processingDetails').textContent=`This ${kind==='audio'?'recording':'text'} will be sent to ${destination}. The password protects saved stories on this device; it does not hide this request from the processing service.`;
    const finish=value=>{dialog.close();dialog.remove();resolve(value)};
    dialog.querySelector('#processingPermission').onchange=e=>{dialog.querySelector('#processingSend').disabled=!e.target.checked};
    dialog.querySelector('#processingSend').onclick=()=>finish(true);dialog.querySelector('#processingCancel').onclick=()=>finish(false);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
    document.body.append(dialog);dialog.showModal();
  });
}
