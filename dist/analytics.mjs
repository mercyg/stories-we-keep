// Basic consent mode: no Google script or requests until a visitor opts in.
export const CHOICE_KEY='swk-analytics-choice-v1';
export function visitorConfig(referrer=''){
  let source='';try{source=new URL(referrer).origin;}catch{}
  return {send_page_view:false,page_location:'https://stories-we-keep.vercel.app/',
    page_title:'Stories We Keep: A family storybook',page_referrer:source,
    allow_google_signals:false,allow_ad_personalization_signals:false,
    cookie_domain:'stories-we-keep.vercel.app',cookie_flags:'SameSite=Lax;Secure'};
}
export function setupAnalytics(win,doc){
  const id=win.SWK_CONFIG?.gaMeasurementId;
  if(!/^G-[A-Z0-9]+$/.test(id||'')||win.location.hostname!=='stories-we-keep.vercel.app')return;
  const banner=doc.getElementById('analyticsBanner'),status=doc.getElementById('analyticsStatus');
  const allow=doc.getElementById('analyticsAllow'),decline=doc.getElementById('analyticsDecline');
  const manage=doc.getElementById('analyticsChoices');
  const blocked=win.navigator.globalPrivacyControl===true||win.navigator.doNotTrack==='1';
  let loaded=false;
  function read(){try{return win.localStorage.getItem(CHOICE_KEY);}catch{return null;}}
  function remember(choice){try{win.localStorage.setItem(CHOICE_KEY,choice);}catch{}}
  function load(){
    if(loaded||blocked)return;loaded=true;
    win['ga-disable-'+id]=false;
    win.dataLayer=win.dataLayer||[];win.gtag=function(){win.dataLayer.push(arguments);};
    win.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    win.gtag('js',new Date());
    const config=visitorConfig(doc.referrer);
    win.gtag('config',id,config);
    win.gtag('event','page_view',{page_location:config.page_location,page_title:config.page_title,page_referrer:config.page_referrer});
    const script=doc.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+id;
    doc.head.append(script);
  }
  function clearCookies(){
    for(const pair of doc.cookie.split(';')){
      const name=pair.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
      for(const domain of ['', ';domain=stories-we-keep.vercel.app',';domain=.stories-we-keep.vercel.app'])
        doc.cookie=name+'=;Max-Age=0;path=/'+domain+';SameSite=Lax;Secure';
    }
  }
  function show(){
    banner.hidden=false;allow.disabled=blocked;
    status.textContent=blocked?'Analytics is off because your browser requests not to be tracked.':
      read()==='allowed'?'Analytics is currently on. Choose No thanks to turn it off.':'Analytics is off unless you choose Allow analytics.';
  }
  allow.onclick=()=>{remember('allowed');banner.hidden=true;load();};
  decline.onclick=()=>{
    remember('denied');win['ga-disable-'+id]=true;clearCookies();banner.hidden=true;
    // Reload removes the Google script and its listeners after withdrawing consent.
    if(loaded)win.location.reload();
  };
  manage.onclick=show;manage.hidden=false;
  if(blocked){win['ga-disable-'+id]=true;clearCookies();}
  else if(read()==='allowed')load();
  else if(read()!=='denied')show();
}
if(typeof window!=='undefined')setupAnalytics(window,document);
