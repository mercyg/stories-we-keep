import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spaceTranscribe} from '../dist/speech-space.mjs';

test('speech client uploads audio and reassembles a split Ethiopic SSE response',async()=>{
  const original=globalThis.fetch;const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push([url,options]);
    if(calls.length===1)return Response.json(['/tmp/gradio/file.wav']);
    if(calls.length===2)return Response.json({event_id:'job-1'});
    const bytes=new TextEncoder().encode('event: heartbeat\ndata: null\n\nevent: complete\ndata: [{"text":"ትዝታ","duration":2}]\n\n');
    return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close()}}));
  };
  try {
    const result=await spaceTranscribe('https://example.test/',new Blob(['audio'],{type:'audio/wav'}),'am');
    assert.equal(result.text,'ትዝታ');
    assert.equal(calls[0][1].body.get('files').name,'memory.wav');
    assert.deepEqual(JSON.parse(calls[1][1].body).data,[{path:'/tmp/gradio/file.wav',orig_name:'memory.wav',meta:{_type:'gradio.FileData'}},'am']);
    assert.equal(calls[2][0],'https://example.test/gradio_api/call/transcribe/job-1');
  } finally {globalThis.fetch=original}
});

test('GPU errors are shown instead of creating an empty transcript',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json(['/tmp/file']):calls===2?Response.json({event_id:'job'}):new Response('event: error\ndata: "GPU quota exhausted"\n\n');
  try{await assert.rejects(spaceTranscribe('https://example.test',new Blob(['audio']),'en'),/GPU quota exhausted/)}
  finally{globalThis.fetch=original}
});
