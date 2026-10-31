import test from 'node:test';
import assert from 'node:assert/strict';
import {setupAnalytics,visitorConfig,CHOICE_KEY} from '../dist/analytics.mjs';
function fixture(choice=null,privacy=false){
  const storage=new Map(choice?[[CHOICE_KEY,choice]]:[]),scripts=[];
  const ids=Object.fromEntries(['analyticsBanner','analyticsStatus','analyticsAllow','analyticsDecline','analyticsChoices'].map(id=>[id,{hidden:true}]));
  let reloads=0;
  const win={SWK_CONFIG:{gaMeasurementId:'G-VMCQ1FQRMY'},navigator:{globalPrivacyControl:privacy},location:{hostname:'stories-we-keep.vercel.app',href:'https://stories-we-keep.vercel.app/?story=private#name',reload(){reloads++;}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
  const doc={referrer:'https://dev.to/private/path?name=private',cookie:'_ga=123; _ga_TEST=456',getElementById:id=>ids[id],createElement:()=>({}),head:{append:s=>scripts.push(s)}};
  setupAnalytics(win,doc);return {win,doc,ids,scripts,storage,reloads:()=>reloads};
}
test('no Google script or page view before explicit consent; decline persists',()=>{
  const f=fixture();assert.equal(f.scripts.length,0);assert.equal(f.win.dataLayer,undefined);assert.equal(f.ids.analyticsBanner.hidden,false);
  f.ids.analyticsDecline.onclick();assert.equal(f.storage.get(CHOICE_KEY),'denied');assert.equal(f.scripts.length,0);
  assert.equal(fixture('denied').scripts.length,0);
});
test('opt-in sends only a fixed page view and origin-only referrer; withdrawal disables and reloads',()=>{
  const f=fixture();f.ids.analyticsAllow.onclick();f.ids.analyticsAllow.onclick();assert.equal(f.scripts.length,1);
  const commands=f.win.dataLayer.map(a=>Array.from(a));const events=commands.filter(a=>a[0]==='event');
  assert.equal(events.length,1);assert.equal(events[0][1],'page_view');
  assert.deepEqual(events[0][2],{page_location:'https://stories-we-keep.vercel.app/',page_title:'Stories We Keep: A family storybook',page_referrer:'https://dev.to'});
  assert.equal(JSON.stringify(commands).includes('private'),false);
  assert.equal(commands.find(a=>a[0]==='config')[2].send_page_view,false);
  assert.equal(commands.find(a=>a[0]==='consent')[2].ad_storage,'denied');
  f.ids.analyticsDecline.onclick();assert.equal(f.win['ga-disable-G-VMCQ1FQRMY'],true);assert.equal(f.reloads(),1);
});
test('browser privacy signals prevent loading, even with a stored opt-in',()=>{
  const f=fixture('allowed',true);assert.equal(f.scripts.length,0);f.ids.analyticsAllow.onclick();assert.equal(f.scripts.length,0);
  assert.equal(visitorConfig('not a URL').page_referrer,'');
});
