import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordKey,seal,unseal,packStory,unpackStory} from '../dist/vault-crypto.mjs';

test('encryption preserves every story field and original audio; rejects tampering and record substitution',async()=>{
 const key=await passwordKey('test-only long password',crypto.getRandomValues(new Uint8Array(16)));
 assert.equal(key.extractable,false);
 const story={id:'one',title:'Private name',text:'ትዝታ',prompt:'A private question',book:{pages:[{photo:'data:image/png;base64,AAAA',text:'A private page'}]},audio:new Blob([new Uint8Array([0,1,255,20])],{type:'audio/webm;codecs=opus'})};
 const bytes=await packStory(story),record=await seal(key,bytes,'story:one');
 const result=unpackStory(await unseal(key,record,'story:one'));
 assert.equal(result.title,story.title);assert.equal(result.text,story.text);assert.deepEqual(result.book,story.book);
 assert.equal(result.audio.type,story.audio.type);assert.deepEqual(new Uint8Array(await result.audio.arrayBuffer()),new Uint8Array(await story.audio.arrayBuffer()));
 assert.notDeepEqual(record.iv,(await seal(key,bytes,'story:one')).iv);
 await assert.rejects(unseal(key,record,'story:two'));
 const damaged={...record,data:record.data.slice(0)};new Uint8Array(damaged.data)[0]^=1;await assert.rejects(unseal(key,damaged,'story:one'));
 assert.ok(!new TextDecoder().decode(record.data).includes(story.title));
});
