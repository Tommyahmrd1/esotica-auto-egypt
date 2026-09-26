// Keep the official logo after admin settings finish loading.
document.addEventListener('DOMContentLoaded',()=>{const keepOfficialLogo=()=>document.querySelectorAll('.brand-mark img,.brand-logo img,.esotica-intro-logo').forEach(img=>{if(!img.src.endsWith('/site/logo.png'))img.src='/site/logo.png';});keepOfficialLogo();new MutationObserver(keepOfficialLogo).observe(document.body,{childList:true,subtree:true});});

// Always use the official Esotica artwork, not the text-based SVG.
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.brand-mark img,.brand-logo img,.esotica-intro-logo').forEach(img=>{img.src='/site/logo.png';img.alt='Esotica Auto';});});


const ESOTICA_ASSETS={
  logo:"/site/esotica-logo.svg",
  home:"/site/home-hero.webp",
  parts:"/site/parts-hero.webp"
};
const cleanPath=location.pathname.replace(/\/+$/,"")||"/";
if(cleanPath==="/")document.body.classList.add("home-page");
else if(cleanPath==="/parts"||cleanPath==="/parts.html")document.body.classList.add("parts-page");
else document.body.classList.add("inner-page");

function applySiteLogo(){
  document.querySelectorAll(".brand-mark").forEach(el=>{
    el.innerHTML='<img src="'+ESOTICA_ASSETS.logo+'" alt="Esotica">';
    el.classList.add("has-logo");
  });
  document.querySelectorAll(".brand-text").forEach(el=>el.style.display="none");
}
applySiteLogo();

function playEsoticaIntro(){
  if(cleanPath!=="/")return;
  if(sessionStorage.getItem("esoticaIntroShown")==="1")return;
  sessionStorage.setItem("esoticaIntroShown","1");
  const intro=document.createElement("div");
  intro.className="esotica-intro";
  intro.setAttribute("aria-hidden","true");
  intro.innerHTML=
    '<span class="esotica-headlight left"></span>'+
    '<span class="esotica-headlight right"></span>'+
    '<span class="esotica-intro-sheen"></span>'+
    '<img class="esotica-intro-logo" src="'+ESOTICA_ASSETS.logo+'" alt="">';
  document.body.prepend(intro);
  setTimeout(()=>intro.remove(),3700);
}
playEsoticaIntro();


function cairoNow(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Cairo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hour12:false}).formatToParts(new Date());
  const get=t=>parts.find(p=>p.type===t)?.value||"";
  return {date:`${get("year")}-${get("month")}-${get("day")}`,hour:Number(get("hour"))};
}
const bookingDateInput=document.querySelector('#bookingForm input[name="preferredDate"]');
if(bookingDateInput){
  const now=cairoNow();
  bookingDateInput.min=now.date;
}

const $=s=>document.querySelector(s);
const msg=(el,text,ok=true)=>{el.textContent=text;el.className="form-msg "+(ok?"ok":"err")};
$("#menuBtn")?.addEventListener("click",()=>$("#navLinks").classList.toggle("open"));
document.querySelectorAll("#navLinks a").forEach(a=>a.addEventListener("click",()=>$("#navLinks").classList.remove("open")));

async function sendForm(form,url,msgEl){
  const btn=form.querySelector("button[type=submit]");
  btn.classList.add("loading"); btn.disabled=true;
  msg(msgEl,"جاري الإرسال...",true);
  try{
    const data=Object.fromEntries(new FormData(form).entries());
    if(data.quantity) data.quantity=Number(data.quantity);
    const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||"تعذر إرسال الطلب.");
    msg(msgEl,j.message||"تم استلام طلبك بنجاح.",true);
    form.reset();
  }catch(e){msg(msgEl,e.message||"تعذر إرسال الطلب.",false)}
  finally{btn.classList.remove("loading");btn.disabled=false}
}
$("#bookingForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const form=e.currentTarget, chosen=form.elements.preferredDate.value, now=cairoNow();
  if(chosen<now.date){msg($("#bookingMsg"),"لا يمكن اختيار تاريخ قديم. اختار تاريخ من اليوم أو بعده.",false);return}
  if(chosen===now.date && now.hour>=17){msg($("#bookingMsg"),"انتهى وقت حجز نفس اليوم. اختار موعدًا من بكرة أو بعده.",false);return}
  sendForm(form,"/api/booking",$("#bookingMsg"));
});
$("#partsForm")?.addEventListener("submit",e=>{e.preventDefault();sendForm(e.currentTarget,"/api/parts",$("#partsMsg"))});
$("#contactForm")?.addEventListener("submit",e=>{e.preventDefault();sendForm(e.currentTarget,"/api/contact",$("#contactMsg"))});

async function loadSiteContent(){
  try{
    const r=await fetch("/api/site-content",{cache:"no-store"});if(!r.ok)return;
    const {settings={},reviews=[]}=await r.json();
    const setText=(sel,val)=>{if(val&&document.querySelector(sel))document.querySelector(sel).textContent=val};
    if(settings.hero_title){
      const el=document.querySelector("#heroTitle"); if(el) el.textContent=settings.hero_title;
    }
    setText("#heroSubtitle",settings.hero_subtitle);
    const p=document.querySelector("#heroPrimary");if(p){
      if(settings.hero_primary_text)p.textContent=settings.hero_primary_text;
      if(settings.hero_primary_link)p.href=settings.hero_primary_link;
    }
    const s=document.querySelector("#heroSecondary");if(s){
      if(settings.hero_secondary_text)s.textContent=settings.hero_secondary_text;
      if(settings.hero_secondary_link)s.href=settings.hero_secondary_link;
    }
    /* Homepage artwork is intentionally fixed to the Esotica workshop hero. */
    
    if(settings.brand_name){
      document.querySelectorAll("#brandName").forEach(el=>el.textContent=settings.brand_name);
    }
    if(settings.brand_subtitle){
      document.querySelectorAll("#brandSub").forEach(el=>el.textContent=settings.brand_subtitle);
    }
    if(settings.show_brand_text==="false"){
      document.querySelectorAll(".brand-text").forEach(el=>el.style.display="none");
    }

    if(settings.logo_media_id){
      document.querySelectorAll(".brand-mark").forEach(el=>{
        el.innerHTML=`<img src="/api/media/${settings.logo_media_id}" alt="Esotica logo">`;
        el.classList.add("has-logo");
      });
    }
    if(settings.accent_color && /^#[0-9A-Fa-f]{6}$/.test(settings.accent_color)){
      document.documentElement.style.setProperty("--gold",settings.accent_color);
      document.documentElement.style.setProperty("--gold2",settings.accent_color);
    }
    const visibility={
      services:settings.show_services,booking:settings.show_booking,parts:settings.show_parts,
      branches:settings.show_branches,reviews:settings.show_reviews,contact:settings.show_contact
    };
    for(const [id,val] of Object.entries(visibility)){
      if(val==="false"){const el=document.querySelector(`[data-section="${id}"]`);if(el)el.style.display="none";}
    }
    if(settings.section_order){
      const order=settings.section_order.split(",").map(x=>x.trim()).filter(Boolean);
      const main=document.querySelector("main");
      const sections=Object.fromEntries([...document.querySelectorAll("[data-section]")].map(el=>[el.dataset.section,el]));
      let anchor=document.querySelector(".strip");
      for(const id of order){
        const el=sections[id];if(el){main.insertBefore(el,anchor?anchor.nextSibling:null);anchor=el;}
      }
    }
    const grid=document.querySelector("#reviewsGrid");
    if(grid){
      if(!reviews.length)grid.innerHTML='<div class="card review-placeholder">لا توجد تقييمات منشورة حتى الآن.</div>';
      else grid.innerHTML=reviews.map(x=>`
        <article class="card review-card">
          <div class="stars">${"★".repeat(Math.max(1,Math.min(5,Number(x.rating)||5)))}</div>
          <p>${escHtml(x.review_text)}</p>
          <strong>${escHtml(x.customer_name)}</strong>
          ${x.car?`<small>${escHtml(x.car)}</small>`:""}
        </article>`).join("");
    }
  }catch(e){console.warn("CMS content unavailable",e)}
}
function escHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
loadSiteContent().finally(applySiteLogo);
