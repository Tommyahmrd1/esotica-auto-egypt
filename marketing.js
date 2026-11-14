/* First-touch campaign attribution for the current visit. No form contents,
   phone numbers, email addresses, query strings or advertising IDs are sent. */
(()=>{
  if(/^\/(?:admin|customer-preview)(?:\/|$)/.test(location.pathname))return;
  if(navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
  const storageKey="esotica-campaign-v1",sessionMs=30*60*1000;
  const label=value=>{
    const text=String(value||"").trim();
    return text.length<=100&&/^[\p{L}\p{N} _.()/-]*$/u.test(text)&&!/[0-9]{10,}/.test(text)?text:"";
  };
  const pagePath=value=>{
    try{const url=new URL(value,location.origin);return url.origin===location.origin?url.pathname.slice(0,160):""}catch{return ""}
  };
  let stored=null;
  try{stored=JSON.parse(sessionStorage.getItem(storageKey)||"null")}catch{}
  const params=new URLSearchParams(location.search);
  const source=label(params.get("utm_source"));
  let referrer="";
  try{referrer=document.referrer?new URL(document.referrer).hostname.toLowerCase():""}catch{}
  const externalReferrer=referrer&&referrer!==location.hostname?referrer:"";
  const inferredSource=/^(?:www\.)?(?:google\.|bing\.com|search\.yahoo\.com)/.test(externalReferrer)?"search":
    /(^|\.)(facebook\.com|instagram\.com|t\.co|linkedin\.com)$/.test(externalReferrer)?"social":externalReferrer?"referral":"direct";
  const fresh={source:source||inferredSource,medium:label(params.get("utm_medium"))||(inferredSource==="search"?"organic":inferredSource),
    name:label(params.get("utm_campaign")),content:label(params.get("utm_content")),term:label(params.get("utm_term")),
    landing:location.pathname.slice(0,160),referrer:externalReferrer,updatedAt:Date.now()};
  const campaign=(!source&&stored&&Number(stored.updatedAt)>Date.now()-sessionMs)?{
    source:label(stored.source)||"direct",medium:label(stored.medium),name:label(stored.name),content:label(stored.content),term:label(stored.term),
    landing:pagePath(stored.landing)||location.pathname,referrer:label(stored.referrer),updatedAt:Date.now()
  }:fresh;
  try{sessionStorage.setItem(storageKey,JSON.stringify(campaign))}catch{}
  const fields={campaignSource:campaign.source,campaignMedium:campaign.medium,campaignName:campaign.name,campaignContent:campaign.content,
    campaignTerm:campaign.term,campaignLanding:campaign.landing,campaignReferrer:campaign.referrer};
  const forms=document.querySelectorAll("#bookingForm,#partsForm,#contactForm");
  for(const form of forms){
    for(const [name,value] of Object.entries(fields)){
      const input=document.createElement("input");input.type="hidden";input.name=name;input.defaultValue=value;input.value=value;form.appendChild(input);
    }
  }
  function event(type,form=""){
    if(navigator.globalPrivacyControl===true||navigator.doNotTrack==="1")return;
    const payload={id:crypto.randomUUID(),type,form,page:location.pathname,...fields};
    void fetch("/api/analytics/event",{method:"POST",credentials:"same-origin",keepalive:true,
      headers:{"content-type":"application/json"},body:JSON.stringify(payload)}).catch(()=>{});
  }
  let pageRecorded=false;
  function pageView(){if(!pageRecorded){pageRecorded=true;event("page_view")}}
  // Reuse the existing visitor cookie after its first heartbeat response.
  document.addEventListener("esotica:visitor-ready",pageView,{once:true});
  window.setTimeout(pageView,2000);
  for(const form of forms){
    form.addEventListener("focusin",()=>event("form_start",form.id.replace("Form","")),{once:true});
  }
  document.addEventListener("click",e=>{
    const anchor=e.target.closest?.("a[href]");if(!anchor)return;
    let url;try{url=new URL(anchor.href,location.origin)}catch{return}
    if(url.protocol==="tel:")event("phone_click");
    else if(["wa.me","api.whatsapp.com","web.whatsapp.com"].includes(url.hostname))event("whatsapp_click");
    else if(url.origin===location.origin&&/^\/(?:en\/)?booking(?:\.html)?\/?$/.test(url.pathname))event("booking_click");
  });
})();
