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
    progress('Uploading your recording to the free speech service…');
    const form=new FormData();
    const name='memory.'+(audio.type.includes('mp4')?'m4a':audio.type.includes('wav')?'wav':'webm');
    form.append('files',audio,name);
    const paths=await (await request('/gradio_api/upload',{method:'POST',body:form})).json();
    if(!Array.isArray(paths)||typeof paths[0]!=='string')throw new Error('The recording could not be uploaded. Please try again.');
    const job=await (await request('/gradio_api/call/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({data:[{path:paths[0],orig_name:name,meta:{_type:'gradio.FileData'}},language]})})).json();
    if(typeof job.event_id!=='string')throw new Error('The speech service could not start transcription. Please try again.');
    progress('Waiting for the free GPU, then transcribing… Please keep this page open.');
    const response=await request('/gradio_api/call/transcribe/'+encodeURIComponent(job.event_id));
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
          const result=JSON.parse(data)?.[0];
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
