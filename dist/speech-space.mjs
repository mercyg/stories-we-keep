import {bytesToBase64,transcriptRecipient} from './transcript-crypto.mjs';
// Small client for Gradio's public upload + named-call SSE API. No secret keys.
export function readEvent(block) {
  const lines=block.split(/\r?\n/);
  return {event:lines.find(l=>l.startsWith('event:'))?.slice(6).trim(),
    data:lines.filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n')};
}
export async function spaceTranscribe(base, audio, language, progress=()=>{}) {
  base=base.replace(/\/$/,'');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),240000);
  let reader;
  async function request(path,options={}) {
    const response=await fetch(base+path,{...options,signal:controller.signal});
    if(!response.ok) {
      if(response.status===429)throw new Error('The free speech service is busy or its quota is used up. Your recording is still here; try again later.');
      throw new Error('The free speech service is starting or unavailable. Your recording is still here; try again shortly.');
    }
    return response;
  }
  try {
    if(!audio.size||audio.size>30*1024*1024)throw new Error('Use a nonempty recording smaller than 30 MB.');
    progress('Preparing a protected transcript response…');
    const recipient=await transcriptRecipient();
    const encoded=bytesToBase64(new Uint8Array(await audio.arrayBuffer()));
    progress('Sending your recording for in-memory transcription…');
    const job=await (await request('/gradio_api/call/transcribe_private',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({data:[encoded,language,recipient.publicKey]})})).json();
    if(typeof job.event_id!=='string')throw new Error('The speech service could not start transcription. Please try again.');
    progress('Waiting for the free GPU, then transcribing… Please keep this page open.');
    const response=await request('/gradio_api/call/transcribe_private/'+encodeURIComponent(job.event_id));
    reader=response.body.getReader();
    const decoder=new TextDecoder();let pending='';
    while(true) {
      const {done,value}=await reader.read();
      pending=(pending+decoder.decode(value,{stream:!done})).replace(/\r\n/g,'\n');
      let end;
      while((end=pending.indexOf('\n\n'))!==-1) {
        const {event,data}=readEvent(pending.slice(0,end));pending=pending.slice(end+2);
        if(event==='error') {
          let detail;try{detail=JSON.parse(data)}catch{}
          throw new Error(typeof detail==='string'?detail:detail?.message||'The free speech service could not finish. Its GPU queue or quota may be full. Your recording is still here.');
        }
        if(event==='complete') {
          const result=await recipient.decrypt(JSON.parse(data)?.[0]);
          if(typeof result?.text!=='string'||!result.text.trim())throw new Error('No speech was recognized. Try a clearer recording.');
          return result;
        }
      }
      if(done)throw new Error('The speech connection ended before the transcript arrived. Your recording is still here; try again.');
    }
  } catch(error) {
    if(error.name==='AbortError')throw new Error('The free speech service took too long. Your recording is still here; please try again later.');
    if(error instanceof TypeError)throw new Error('Cannot reach the free speech service. Check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timer);
    if(reader)await reader.cancel().catch(()=>{});
  }
}
