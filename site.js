
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
const pageName=(location.pathname.split("/").filter(Boolean)[0]||"home").replace(/\.html$/,'');
const ESOTICA_CONTACT_DEFAULTS={
  phone:"+20 111 044 4528",
  whatsapp:"201110444528",
  facebook:"https://web.facebook.com/p/Esotica-Auto-61576540748603/",
  instagram:"https://www.instagram.com/esoticaauto/",
  email:""
};

const VISITOR_HEARTBEAT_MS=90000;
async function sendVisitorHeartbeat(isPageView=false){
  if(document.hidden||location.pathname.startsWith("/admin"))return;
  try{
    const response=await fetch("/api/analytics/heartbeat",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({page:location.pathname,event:isPageView?"pageview":"heartbeat",referrer:(()=>{try{return document.referrer?new URL(document.referrer).hostname:""}catch{return ""}})()}),
      credentials:"same-origin",
      cache:"no-store",
      keepalive:true
    });
    if(!response.ok)console.warn("Visitor analytics heartbeat unavailable",response.status);
  }catch{}
}
void sendVisitorHeartbeat(true);
window.setInterval(()=>{void sendVisitorHeartbeat(false)},VISITOR_HEARTBEAT_MS);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void sendVisitorHeartbeat()});
const TRACKED_LEAD_PATHS=new Set(["/booking","/contact","/parts"]);
const LEAD_SOURCE_TYPES=new Set(["offer","event","warranty","insurance","direct"]);
function leadValue(value,max=160){return String(value||"").trim().slice(0,max)}
function trackedInternalLink(raw,type,label,id=""){
  const value=String(raw||"").trim()||"/contact";
  try{
    const url=new URL(value,location.origin);
    const cleanPath=url.pathname.replace(/\.html$/,"");
    if(url.origin!==location.origin||!TRACKED_LEAD_PATHS.has(cleanPath))return value;
    if(!url.searchParams.has("source_type"))url.searchParams.set("source_type",LEAD_SOURCE_TYPES.has(type)?type:"direct");
    if(label&&!url.searchParams.has("source_label"))url.searchParams.set("source_label",leadValue(label));
    if(id!==""&&!url.searchParams.has("source_id"))url.searchParams.set("source_id",leadValue(id,80));
    if(!url.searchParams.has("source_page"))url.searchParams.set("source_page",location.pathname);
    return `${url.pathname}${url.search}${url.hash}`;
  }catch{return value}
}
function readLeadAttribution(){
  const params=new URLSearchParams(location.search);
  const rawType=leadValue(params.get("source_type"),30);
  const type=LEAD_SOURCE_TYPES.has(rawType)?rawType:"direct";
  if(type==="direct")return {type:"direct",label:"",id:"",page:""};
  return {type,label:leadValue(params.get("source_label")),id:leadValue(params.get("source_id"),80),page:leadValue(params.get("source_page"),220)};
}
const currentLeadAttribution=readLeadAttribution();
function leadContextText(lang){
  const ar=lang==="ar";
  const names={offer:ar?"عرض":"Offer",event:ar?"حدث":"Event",warranty:ar?"خدمة الضمان":"Warranty service",insurance:ar?"شركات التأمين":"Insurance partners",direct:ar?"دخول مباشر":"Direct visit"};
  const label=currentLeadAttribution.label||names[currentLeadAttribution.type]||names.direct;
  return ar?`مصدر الطلب: ${label}`:`Request source: ${label}`;
}
function renderLeadContext(){
  const banner=document.querySelector("[data-lead-context]");
  if(!banner)return;
  const text=banner.querySelector(".lead-context-text");if(text)text.textContent=leadContextText(document.documentElement.lang||"en");
}
function initLeadAttribution(){
  const form=document.querySelector("#bookingForm,#partsForm,#contactForm");if(!form)return;
  const fields={sourceType:currentLeadAttribution.type,sourceLabel:currentLeadAttribution.label,sourceId:currentLeadAttribution.id,sourcePage:currentLeadAttribution.page||location.pathname};
  Object.entries(fields).forEach(([name,value])=>{
    let input=form.elements[name];
    if(!input){input=document.createElement("input");input.type="hidden";input.name=name;form.appendChild(input)}
    input.defaultValue=value;input.setAttribute("value",value);input.value=value;
  });
  if(currentLeadAttribution.type!=="direct"){
    const banner=document.createElement("aside");banner.className=`lead-context is-${currentLeadAttribution.type}`;banner.dataset.leadContext="";banner.setAttribute("role","status");
    banner.innerHTML='<span class="lead-context-mark" aria-hidden="true"></span><div><small>ESOTICA REQUEST SOURCE</small><strong class="lead-context-text"></strong></div>';
    form.prepend(banner);renderLeadContext();
  }
}


document.body.classList.add(`page-${pageName}`);
const heroVideo=document.querySelector(".hero-video-main");
const heroSoundToggle=document.querySelector("#heroSoundToggle");
const heroMobileQuery=window.matchMedia("(max-width: 768px)");
let heroSoundChoice=null;
let heroAutoplayMuted=false;
function updateHeroSoundButton(){
  if(!heroSoundToggle||!heroVideo)return;
  const muted=heroVideo.muted;
  const arabic=document.documentElement.lang==="ar";
  const label=muted?(arabic?"تشغيل الصوت":"Sound on"):(arabic?"كتم الصوت":"Mute");
  heroSoundToggle.classList.toggle("is-muted",muted);
  heroSoundToggle.setAttribute("aria-pressed",String(!muted));
  heroSoundToggle.setAttribute("aria-label",label);
  const text=heroSoundToggle.querySelector(".hero-sound-label");if(text)text.textContent=label;
}
async function playHeroVideo(requestSound=true){
  if(!heroVideo)return;
  const wantsSound=heroSoundChoice==="muted"?false:(heroSoundChoice==="sound"?true:requestSound);
  heroVideo.muted=!wantsSound;
  if(wantsSound)heroVideo.volume=1;
  try{
    await heroVideo.play();heroAutoplayMuted=false;
  }catch{
    if(wantsSound){
      heroVideo.muted=true;heroAutoplayMuted=true;
      try{await heroVideo.play()}catch{}
    }
  }
  updateHeroSoundButton();
}
function loadResponsiveHeroVideo(){
  if(!heroVideo)return;
  const preferred=heroMobileQuery.matches?heroVideo.dataset.mobileSrc:heroVideo.dataset.desktopSrc;
  const fallback=heroVideo.dataset.fallbackSrc;
  const target=preferred||fallback;
  if(!target||heroVideo.dataset.activeSrc===target)return;
  heroVideo.dataset.activeSrc=target;
  heroVideo.dataset.fallbackApplied="false";
  heroVideo.classList.remove("is-fallback");
  heroVideo.src=target;
  heroVideo.load();
  void playHeroVideo(heroSoundChoice!=="muted"&&!heroAutoplayMuted);
}
function unlockHeroSound(event){
  if(!heroVideo||!heroAutoplayMuted||heroSoundChoice!==null||event?.target?.closest?.("#heroSoundToggle"))return;
  heroVideo.muted=false;heroVideo.volume=1;
  heroVideo.play().then(()=>{heroAutoplayMuted=false;updateHeroSoundButton()}).catch(()=>{heroVideo.muted=true;updateHeroSoundButton()});
}
if(heroVideo){
  heroVideo.muted=false;heroVideo.defaultMuted=false;heroVideo.volume=1;
  heroVideo.addEventListener("error",()=>{
    const fallback=heroVideo.dataset.fallbackSrc;
    if(!fallback||heroVideo.dataset.fallbackApplied==="true")return;
    heroVideo.dataset.fallbackApplied="true";
    heroVideo.dataset.activeSrc=fallback;
    heroVideo.classList.add("is-fallback");
    heroVideo.src=fallback;
    heroVideo.load();
    void playHeroVideo(heroSoundChoice!=="muted");
  });
  heroVideo.addEventListener("canplay",()=>{if(heroVideo.paused)void playHeroVideo(heroSoundChoice==="sound"||(!heroAutoplayMuted&&heroSoundChoice!=="muted"))});
  heroVideo.addEventListener("ended",()=>{heroVideo.currentTime=0;void heroVideo.play().catch(()=>{})});
  document.addEventListener("visibilitychange",()=>{if(!document.hidden&&heroVideo.paused)void heroVideo.play().catch(()=>{})});
  window.setInterval(()=>{if(heroVideo.paused&&!document.hidden)void heroVideo.play().catch(()=>{})},1500);
  document.addEventListener("pointerdown",unlockHeroSound,{once:true,capture:true});
  document.addEventListener("keydown",unlockHeroSound,{once:true,capture:true});
  if(heroMobileQuery.addEventListener)heroMobileQuery.addEventListener("change",loadResponsiveHeroVideo);
  else heroMobileQuery.addListener(loadResponsiveHeroVideo);
  loadResponsiveHeroVideo();
  updateHeroSoundButton();
}
heroSoundToggle?.addEventListener("click",()=>{
  if(!heroVideo)return;
  const wantsSound=heroVideo.muted;
  heroSoundChoice=wantsSound?"sound":"muted";
  heroVideo.muted=!wantsSound;
  if(wantsSound)heroVideo.volume=1;
  heroVideo.play().then(()=>{heroAutoplayMuted=false;updateHeroSoundButton()}).catch(()=>{heroVideo.muted=true;heroAutoplayMuted=true;updateHeroSoundButton()});
  updateHeroSoundButton();
});
$("#menuBtn")?.addEventListener("click",()=>$("#navLinks").classList.toggle("open"));
document.querySelectorAll("#navLinks a").forEach(a=>a.addEventListener("click",()=>$("#navLinks").classList.remove("open")));

async function sendForm(form,url,msgEl){
  const btn=form.querySelector("button[type=submit]");
  btn.classList.add("loading"); btn.disabled=true;
  msg(msgEl,"جاري الإرسال...",true);
  try{
    const data=Object.fromEntries(new FormData(form).entries());
    Object.assign(data,{sourceType:currentLeadAttribution.type,sourceLabel:currentLeadAttribution.label,sourceId:currentLeadAttribution.id,sourcePage:currentLeadAttribution.page||location.pathname});
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
    const {settings={},reviews=[],gallery=[]}=await r.json();
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
    /* Visual identity is fixed in code; old dashboard image uploads are ignored. */
    
    if(settings.brand_name){
      document.querySelectorAll("#brandName").forEach(el=>el.textContent=settings.brand_name);
    }
    if(settings.brand_subtitle){
      document.querySelectorAll("#brandSub").forEach(el=>el.textContent=settings.brand_subtitle);
    }
    if(settings.show_brand_text==="false"){
      document.querySelectorAll(".brand-text").forEach(el=>el.style.display="none");
    }


    applyContactDetails(settings);
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
      else grid.innerHTML=reviews.map(x=>{
        const rating=Math.max(1,Math.min(5,Number(x.rating)||5));
        return `<article class="card review-card">
          <div class="review-author">
            <strong>${escHtml(x.customer_name)}</strong>
            ${x.car?`<small>${escHtml(x.car)}</small>`:""}
          </div>
          <div class="stars" aria-label="${rating} من 5">${"★".repeat(rating)}</div>
          <p class="review-text">${escHtml(x.review_text)}</p>
        </article>`;
      }).join("");
    }
    const galleryHolder=document.querySelector("#work-gallery .gallery-empty");
    if(galleryHolder&&gallery.length){
      galleryHolder.outerHTML='<div class="gallery-grid">'+gallery.map((x,i)=>`<figure class="gallery-item ${i%5===0?"gallery-wide":""}"><img src="/api/media/${encodeURIComponent(x.media_id)}" alt="${escHtml(x.caption||"Esotica Auto")}" loading="lazy">${x.caption?`<figcaption>${escHtml(x.caption)}</figcaption>`:""}</figure>`).join("")+'</div>';
    }
  }catch(e){console.warn("CMS content unavailable",e)}
}
function escHtml(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
const EN={
  "الخدمات":"Services","حجز صيانة":"Book Service","احجز صيانة":"Book Service","قطع الغيار":"Spare Parts","الفروع":"Locations","فروعنا":"Our Locations","تواصل معنا":"Contact Us","احجز الآن":"Book Now","شوف الفروع ←":"View locations →","تواصل معنا ←":"Contact us →",
  "خبرة متخصصة.":"Specialist expertise.","عناية تليق بسيارتك.":"Care worthy of your car.","خدمة متخصصة لسيارات Range Rover وJaguar، وعناية متكاملة بمجموعة مختارة من السيارات الفاخرة.":"Specialist Range Rover and Jaguar service, with complete care for a select range of luxury vehicles.","شوف الفروع":"View Locations","اكتشف Esotica":"Explore Esotica","فروع لخدمتك":"service locations","خبرة متخصصة":"specialist expertise","عناية متكاملة":"complete care",
  "كل ما تحتاجه لسيارتك":"Everything your car needs","ابدأ طلبك من الصفحة المخصصة، وسيقوم فريقنا بمراجعة التفاصيل والتواصل معك للتأكيد.":"Choose the service you need. Our team will review the details and contact you to confirm.","احجز موعدك واختر الفرع والتاريخ المناسب.":"Choose your preferred location and date.","ابدأ الحجز ←":"Book now →","أرسل رقم الشاسيه وبيانات القطعة لتأكيد التوفر والسعر.":"Send the VIN and part details to confirm availability and price.","استعلام قطع غيار ←":"Parts enquiry →","خدماتنا":"Our Services","صيانة وتشخيص وسمكرة ودهان وخدمات متخصصة لسيارتك.":"Maintenance, diagnostics, body repair and specialist vehicle care.","عرض الخدمات ←":"Explore services →","العناوين ومواعيد العمل والوصول لكل فرع.":"Addresses, opening hours and directions for every location.","عندك استفسار؟ ابعت رسالة مباشرة لفريقنا.":"Have a question? Send our team a message.","آراء عملائنا":"Client Reviews","ما يقوله عملاؤنا عن تجربتهم مع فريق Esotica Auto.":"What our clients say about their experience with Esotica Auto.","لا توجد تقييمات منشورة حتى الآن.":"No reviews have been published yet.",
  "خبرة متكاملة لسيارتك":"Complete expertise for your car","حلول صيانة وتشخيص متخصصة لسيارات Range Rover وJaguar، وخدمات مختارة للسيارات الفاخرة.":"Specialist maintenance and diagnostics for Range Rover and Jaguar, plus selected services for luxury vehicles.","الصيانة والتشخيص":"Maintenance & Diagnostics","صيانة دورية وتشخيص للأعطال الميكانيكية والكهربائية باستخدام أجهزة متخصصة.":"Scheduled maintenance and precise mechanical and electrical diagnostics using specialist equipment.","السمكرة والدهان":"Body & Paint","إصلاحات دقيقة وتشطيب نهائي يراعي تفاصيل السيارة وجودة مظهرها.":"Precision repairs and refinishing with close attention to every detail.","تحديد القطعة المناسبة وفق بيانات السيارة ورقم الشاسيه، مع تأكيد التوفر والسعر.":"Accurate part identification by vehicle details and VIN, with availability and price confirmation.","أرسل طلبك ←":"Send enquiry →","الفحص الشامل":"Comprehensive Inspection","تقييم متكامل للحالة الميكانيكية والكهربائية، مع توضيح الأولويات قبل بدء العمل.":"A complete mechanical and electrical assessment, with clear priorities before work begins.","الخدمة المتنقلة":"Mobile Service","دعم متنقل للحالات التي يمكن خدمتها خارج المركز وداخل نطاق التغطية.":"Mobile support for eligible services within our coverage area.","متابعة ما بعد الخدمة":"After-Service Care","نتابع معك بعد التسليم للتأكد من جودة التنفيذ واستقرار حالة السيارة.":"We follow up after delivery to ensure quality and lasting performance.",
  "احجز موعد الصيانة":"Book Your Service","اختر الفرع والتاريخ المناسب، وسيقوم فريقنا بالتواصل معك لتأكيد الموعد.":"Choose your preferred location and date. Our team will contact you to confirm the appointment.","احجز موعدك":"Request an Appointment","بعد إرسال الطلب، يراجع الفريق المختص بيانات السيارة والخدمة المطلوبة قبل تأكيد الموعد.":"Our specialist team reviews your vehicle and service details before confirming the appointment.","اختيار الفرع":"Choose a location","اختيار التاريخ المفضل":"Select a preferred date","تأكيد الموعد من الفريق":"Confirmation from our team","الاسم":"Name","رقم الهاتف":"Phone Number","السيارة / الموديل":"Vehicle / Model","سنة الصنع":"Model Year","الفرع":"Location","اختر الفرع":"Choose a location","التجمع الخامس - الجوي":"Fifth Settlement – Air Force Branch","التجمع الثالث - المنطقة الصناعية":"Third Settlement – Industrial Area","الشيخ زايد":"Sheikh Zayed","التاريخ المفضل":"Preferred Date","تفاصيل الخدمة":"Service Details","إرسال طلب الحجز":"Submit Booking Request",
  "طلب قطع الغيار":"Spare Parts Enquiry","أرسل بيانات السيارة والقطعة المطلوبة، وسيتواصل معك فريق قطع الغيار لتأكيد التوفر والسعر.":"Send your vehicle and part details. Our parts team will contact you to confirm availability and price.","بيانات دقيقة، استعلام أسرع":"Accurate details. Faster response.","يرجى إدخال رقم الشاسيه الكامل المكوّن من 17 خانة لضمان تحديد القطعة بدقة.":"Please enter the complete 17-character VIN to ensure accurate part identification.","رقم الشاسيه (17 خانة)":"VIN (17 characters)","كود القطعة إن وجد":"Part Number (if available)","الكمية":"Quantity","القطعة المطلوبة / التفاصيل":"Required Part / Details","إرسال استعلام القطعة":"Submit Parts Enquiry",
  "أقرب إليك بثلاثة فروع":"Three locations. One standard.","تعرف على عناوين الفروع ومواعيد العمل، واختر الموقع الأنسب لزيارتك.":"View our addresses and opening hours, then choose the most convenient location.","فرع الجوي":"Air Force Branch","فرع المصانع":"Industrial Area Branch","فرع زايد":"Sheikh Zayed Branch","فتح على الخريطة ←":"Open in Maps →","احجز في الفرع المناسب":"Book Your Preferred Location",
  "نحن هنا لخدمتك":"We’re here to help","أرسل استفسارك، وسيقوم فريق خدمة العملاء بالتواصل معك في أقرب وقت.":"Send your enquiry and our customer care team will contact you shortly.","كيف يمكننا مساعدتك؟":"How can we help?","شاركنا بيانات التواصل وتفاصيل استفسارك، وسيتولى الفريق المختص المتابعة معك.":"Share your contact details and enquiry, and the right specialist will follow up.","الموضوع":"Subject","الرسالة":"Message","إرسال الرسالة":"Send Message",
  "من داخل ورشنا":"Inside Our Workshops","لقطات من بيئة العمل والعناية التي نقدمها لسيارتك داخل Esotica Auto.":"A closer look at our workshop and the care your vehicle receives at Esotica Auto.","متخصصون في Range Rover وJaguar والعناية بالسيارات الفاخرة.":"Specialists in Range Rover, Jaguar and luxury vehicle care.","إدارة الموقع":"Site Administration","© 2026 Esotica Auto — جميع الحقوق محفوظة":"© 2026 Esotica Auto — All rights reserved",
  "سيتم إضافة صور وفيديوهات حقيقية من أعمالنا قريبًا.":"Real photos and videos from our work will be added soon.",
  "السبت–الخميس: 10:00 ص – 8:00 م • الجمعة إجازة":"Saturday–Thursday: 10:00 AM–8:00 PM • Friday closed","السبت–الخميس: 10:00 ص – 7:00 م • الجمعة إجازة":"Saturday–Thursday: 10:00 AM–7:00 PM • Friday closed",
  "خبرة متخصصة في صيانة Range Rover وJaguar.":"Specialist Range Rover and Jaguar expertise.","وعناية متكاملة تليق بسيارتك.":"Complete care worthy of your car.","من التشخيص والصيانة إلى المتابعة بعد التسليم، نهتم بكل تفصيلة للحفاظ على أداء سيارتك وجودتها.":"From diagnostics and maintenance to after-service follow-up, we care for every detail to preserve your vehicle’s performance and quality.",
  "العروض":"Offers","اكتشف أحدث عروض الصيانة والخدمات المتاحة حاليًا.":"Discover our latest maintenance and service offers.","شوف العروض ←":"View offers →","العروض الحالية":"Current Offers","هنا ستجد أحدث عروض الصيانة والخدمات المتاحة في Esotica Auto.":"Discover the latest Esotica Auto maintenance and service offers here.","لا توجد عروض منشورة حاليًا":"No offers are currently published.","سيتم إضافة العروض الجديدة هنا فور توفرها.":"New offers will appear here as soon as they become available.",
  "من داخل مركزنا":"Inside Our Center","صور حقيقية من أعمالنا داخل المركز سيتم إضافتها وتحديثها باستمرار.":"Real work from inside our center will be added and updated regularly.",
  "روابط سريعة":"Quick Links","فرع الشيخ زايد":"Sheikh Zayed Branch","للحجز أو الاستفسار استخدم صفحة التواصل وسيقوم الفريق المختص بالمتابعة معك.":"For bookings or enquiries, use our contact page and the appropriate team will follow up.","خبرة متخصصة في صيانة Range Rover وJaguar، وعناية متكاملة بمجموعة مختارة من السيارات الفاخرة.":"Specialist Range Rover and Jaguar service, with complete care for a select range of luxury vehicles."
};
Object.assign(EN,{
  "من نحن":"About Us",
  "مركز متخصص في صيانة Range Rover وJaguar، مع خدمات مختارة للسيارات الفاخرة وتركيز على التشخيص الدقيق وجودة التنفيذ والمتابعة.":"A specialist Range Rover and Jaguar service center, with selected luxury vehicle services focused on accurate diagnostics, quality workmanship and follow-up.",
  "عناية تبدأ من التشخيص وتستمر بعد التسليم.":"Care that starts with diagnosis and continues after delivery.",
  "في Esotica Auto نركز على فهم حالة السيارة بدقة قبل بدء العمل، وتوضيح المطلوب للعميل، وتنفيذ الخدمة بعناية، ثم المتابعة بعد التسليم.":"At Esotica Auto, we focus on understanding the vehicle accurately before work begins, explaining what is needed, carrying out the service carefully, and following up after delivery.",
  "نخدم عملاءنا من خلال فروع الجوي، المنطقة الصناعية، والشيخ زايد، مع إمكانية إرسال طلب الحجز أو استعلام قطع الغيار مباشرة من الموقع.":"We serve clients through our Air Force, Industrial Area and Sheikh Zayed locations, with online service booking and spare-parts enquiries available directly through the website.",
  "ما نهتم به":"What Matters to Us",
  "تشخيص واضح":"Clear Diagnostics",
  "فهم المشكلة وتحديد الأولويات قبل بدء التنفيذ.":"Understanding the issue and setting priorities before work begins.",
  "اهتمام بالتفاصيل":"Attention to Detail",
  "العناية بجودة التنفيذ ومظهر السيارة وتجربة العميل.":"Care for workmanship quality, vehicle appearance and the client experience.",
  "متابعة مستمرة":"Ongoing Follow-up",
  "التواصل مع العميل وتأكيد الخطوات ومتابعة ما بعد الخدمة.":"Keeping the client informed, confirming each step and following up after service.",
  "خدمة متخصصة":"Specialist Service",
  "تركيز أساسي على Range Rover وJaguar مع خبرة في سيارات فاخرة مختارة.":"A core focus on Range Rover and Jaguar, with experience across selected luxury vehicles.",
  "سياسة الخصوصية":"Privacy Policy",
  "توضيح مبسط لكيفية استخدام البيانات التي يرسلها العميل عبر الموقع.":"A simple explanation of how information submitted through the website is used.",
  "البيانات التي نجمعها":"Information We Collect",
  "عند استخدام نماذج الحجز أو قطع الغيار أو التواصل، قد ترسل لنا بيانات مثل الاسم، رقم الهاتف، بيانات السيارة، رقم الشاسيه، تفاصيل الطلب، والموعد المفضل.":"When using booking, spare-parts or contact forms, you may provide information such as your name, phone number, vehicle details, VIN, request details and preferred appointment date.",
  "كيف نستخدم البيانات":"How We Use Information",
  "تُستخدم البيانات لمراجعة الطلب، التواصل معك، تأكيد المواعيد أو توفر قطع الغيار، ومتابعة الخدمة المتعلقة بطلبك.":"Information is used to review your request, contact you, confirm appointments or parts availability, and follow up on the service related to your request.",
  "إحصاءات الزيارة":"Visit Analytics",
  "يستخدم الموقع رمزًا عشوائيًا محفوظًا على جهازك لحساب الزوار المميزين وتقدير عدد المتواجدين حاليًا، من دون تخزين اسمك أو رقم هاتفك أو عنوان IP ضمن إحصاءات الزيارة.":"The website uses a random identifier stored on your device to count unique visitors and estimate current activity, without storing your name, phone number or IP address in visit analytics.",
  "بيانات الدفع":"Payment Information",
  "الموقع الحالي لا يطلب إدخال بيانات بطاقات دفع أو بيانات مصرفية داخل نماذج الحجز والتواصل.":"The current website does not request payment-card or banking information in its booking and contact forms.",
  "الروابط الخارجية":"External Links",
  "قد يحتوي الموقع على روابط إلى خرائط Google وWhatsApp وFacebook وInstagram. عند فتح هذه الروابط تخضع لاستخدام وسياسات الخدمة الخارجية نفسها.":"The website may link to Google Maps, WhatsApp, Facebook and Instagram. When opening those links, the external service's own terms and policies apply.",
  "يستخدم الموقع رمزًا عشوائيًا لحساب الزوار المميزين، ويسجل بيانات تقنية عامة مثل نوع الجهاز، المتصفح، نظام التشغيل، اللغة، الدولة التقريبية والصفحات المزارة. لا نخزن الاسم أو رقم الهاتف أو عنوان IP ضمن إحصاءات الزيارة.":"The site uses a random identifier to count unique visitors and records general technical data such as device type, browser, operating system, language, approximate country and visited pages. Visitor analytics do not store names, phone numbers or IP addresses.",
  "الاستفسار عن بياناتك":"Questions About Your Information",
  "يمكنك التواصل معنا من صفحة «تواصل معنا» إذا كان لديك استفسار بخصوص البيانات التي أرسلتها عبر الموقع.":"You can contact us through the Contact Us page if you have a question about information you submitted through the website.",
  "تحديث السياسة":"Policy Updates",
  "قد يتم تحديث هذه الصفحة عند إضافة وظائف أو خدمات جديدة للموقع، وسيظهر النص الأحدث هنا.":"This page may be updated when new website features or services are added, and the latest wording will appear here."
,
  "العروض والأحداث":"Offers & Events",
  "العروض":"Offers",
  "الأحداث":"Events",
  "تابع أحدث العروض والخدمات والأحداث الموسمية، واعرف المتاح حاليًا قبل التواصل أو الحجز.":"Follow our latest offers, services and seasonal events, and check current availability before booking.",
  "لا توجد أحداث منشورة حاليًا":"No events are currently published",
  "ستظهر هنا الخدمات المتنقلة والأحداث الموسمية فور الإعلان عنها.":"Mobile services and seasonal events will appear here as soon as they are announced.",
  "متاح الآن":"Available Now",
  "غير متاح حاليًا":"Currently Unavailable",
  "قريبًا":"Coming Soon",
  "اعرف التفاصيل":"View Details",
  "من":"From",
  "إلى":"To",
  "فرع التجمع الخامس":"Fifth Settlement Branch",
  "فرع التجمع الثالث":"Third Settlement Branch",
  "الضمان والتأمين":"Warranty & Insurance",
  "خدمة الضمان وشركات التأمين":"Warranty Service & Insurance Partners",
  "إدارة واضحة ومتكاملة لأعمال الضمان والتأمين، من الفحص والتوثيق حتى التنفيذ والتسليم.":"A clear, complete process for warranty and insurance work, from inspection and documentation through repair and delivery.",
  "خدمة الضمان والتأمين باحترافية تليق بسيارتك":"Professional Warranty & Insurance Care for Your Vehicle",
  "إجراءات واضحة، توثيق دقيق، ومتابعة فنية متكاملة من لحظة الفحص وحتى اكتمال الإصلاح وتسليم السيارة.":"Clear procedures, precise documentation and complete technical follow-up from the initial inspection through repair and vehicle delivery.",
  "خدمة الضمان":"Warranty Service",
  "شركات التأمين":"Insurance Partners",
  "ضمان يمنحك راحة أكبر بتكلفة مدروسة":"Greater Peace of Mind at a Considered Cost",
  "عندما لا تكون برامج الضمان التقليدية هي الخيار الأنسب من حيث التكلفة، يقدم Esotica Warranty بديلًا عمليًا ومرنًا لحماية سيارتك، مع تغطية واضحة وتفاصيل كاملة قبل الاشتراك.":"When conventional warranty programmes are not the right fit for your budget, Esotica Warranty offers a practical, flexible way to protect your vehicle, with clear coverage and full details before you enrol.",
  "تقييم أهلية السيارة":"Vehicle Eligibility Assessment",
  "فحص حالة السيارة والموديل وتاريخ الصيانة لتحديد الخطة الأنسب.":"We review the vehicle's condition, model and service history to identify the most suitable plan.",
  "خطط تغطية مدروسة":"Considered Coverage Plans",
  "تغطية عملية بتكلفة مدروسة، مع توضيح الأعمال والأجزاء المشمولة.":"Practical coverage at a considered cost, with covered work and components clearly explained.",
  "وثيقة وكتيب ضمان":"Warranty Document & Handbook",
  "تستلم كتيبًا يوضح المدة، والتغطية، والاستثناءات، وآلية الاستفادة.":"You receive a handbook explaining the term, coverage, exclusions and how to use the warranty.",
  "دعم ومتابعة":"Support & Follow-Up",
  "فريقنا متاح لشرح التفاصيل ومتابعة أي طلب خلال مدة الضمان.":"Our team is available to explain the details and follow up on requests throughout the warranty term.",
  "كل التفاصيل قبل القرار":"Full Details Before You Decide",
  "توضح مدة الضمان ونطاق التغطية والاستثناءات في كتيب الضمان. تواصل معنا لمعرفة الخطة المتاحة لسيارتك.":"The warranty handbook explains the term, coverage and exclusions. Contact us to learn which plan is available for your vehicle.",
  "اعرف تفاصيل برنامج الضمان":"Explore the Warranty Programme",
  "ضمان واضح على الخدمة":"Clear Warranty Coverage",
  "نوضح لك نطاق التغطية قبل بدء العمل، ونوثق الخدمة المنفذة حتى تكون المتابعة بعد التسليم سهلة وواضحة.":"We explain the coverage before work begins and document the completed service for clear, straightforward follow-up.",
  "فحص وتوثيق":"Inspection & Documentation",
  "تسجيل حالة السيارة وتفاصيل العمل المطلوب قبل بدء التنفيذ.":"We record the vehicle condition and required work before repairs begin.",
  "نطاق تغطية واضح":"Clear Coverage Scope",
  "توضيح الأعمال والقطع المشمولة وشروط التغطية الخاصة بكل خدمة.":"The covered work, parts and service-specific conditions are explained clearly.",
  "تنفيذ دقيق":"Precise Workmanship",
  "تنفيذ الأعمال المعتمدة وفق إجراءات فنية واضحة ومراجعة الجودة.":"Approved work is completed through clear technical procedures and quality checks.",
  "متابعة بعد التسليم":"After-Service Follow-Up",
  "فريقنا متاح لمراجعة أي ملاحظة مرتبطة بالخدمة خلال نطاق الضمان.":"Our team is available to review any service-related concern within the warranty scope.",
  "معلومة مهمة":"Important Information",
  "تختلف مدة ونطاق الضمان حسب نوع العمل والقطعة، ويتم توضيح التفاصيل عند اعتماد أمر الإصلاح.":"Warranty duration and scope vary by repair and part; the details are confirmed when the repair order is approved.",
  "استفسر عن الضمان":"Ask About Warranty",
  "تعاون منظم مع شركات التأمين":"Organised Insurance Support",
  "نتولى خطوات الفحص والتوثيق والمتابعة الفنية لتسهيل إجراءات الإصلاح مع شركة التأمين.":"We handle inspection, documentation and technical follow-up to streamline repairs with the insurer.",
  "حلول تأمين أكثر سلاسة لسيارتك":"A Smoother Insurance Repair Experience",
  "نتعاون مع مجموعة من شركات التأمين الرائدة لإدارة رحلة الإصلاح بصورة منظمة، بدايةً من فحص السيارة وتوثيق الأضرار، مرورًا بالتنسيق الفني واعتماد الأعمال، وحتى مراجعة الجودة قبل التسليم.":"We work with a group of leading insurance companies to manage the repair journey efficiently—from vehicle inspection and damage documentation through technical coordination, work approval and final quality review.",
  "ثقة مبنية على الجودة والوضوح":"Trust Built on Quality and Clarity",
  "ثقة شركات التأمين في Esotica Auto تعكس التزامنا بالتقييم الفني الدقيق، والتوثيق الواضح، وجودة التنفيذ التي تليق بالسيارات الفاخرة.":"The confidence insurers place in Esotica Auto reflects our commitment to accurate technical assessment, clear documentation and repair quality worthy of luxury vehicles.",
  "تقييم فني موثق":"Documented Technical Assessment",
  "متابعة واضحة للإجراءات":"Clear Process Follow-Up",
  "مراجعة جودة قبل التسليم":"Quality Review Before Delivery",
  "رحلة إصلاح واضحة من البداية للنهاية":"A Clear Repair Journey from Start to Finish",
  "تقييم الحالة":"Damage Assessment",
  "فحص السيارة وتحديد الأعمال المطلوبة بدقة.":"The vehicle is inspected and the required work is identified accurately.",
  "الفحص والتقييم":"Inspection & Assessment",
  "فحص السيارة وتحديد الأضرار والأعمال المطلوبة بصورة دقيقة.":"We inspect the vehicle and accurately identify the damage and required work.",
  "إعداد المستندات":"Document Preparation",
  "تجهيز الصور والتقرير الفني وعرض الإصلاح.":"We prepare photos, the technical report and repair estimate.",
  "التوثيق الفني":"Technical Documentation",
  "إعداد الصور والتقرير الفني وتفاصيل الإصلاح المطلوبة.":"We prepare the photos, technical report and required repair details.",
  "متابعة الموافقة":"Approval Follow-Up",
  "التنسيق بشأن الأعمال المعتمدة قبل بدء التنفيذ.":"We coordinate the approved work before repairs begin.",
  "تنسيق الموافقة":"Approval Coordination",
  "متابعة الأعمال المعتمدة مع شركة التأمين قبل بدء التنفيذ.":"We coordinate the approved work with the insurance company before repairs begin.",
  "الإصلاح والتسليم":"Repair & Delivery",
  "تنفيذ الأعمال ومراجعة الجودة قبل تسليم السيارة.":"Repairs are completed and quality-checked before delivery.",
  "الإصلاح ومراجعة الجودة":"Repair & Quality Review",
  "تنفيذ الأعمال المعتمدة وفحص السيارة بعناية قبل التسليم.":"We complete the approved work and carefully inspect the vehicle before delivery.",
  "شركات التأمين المتعاقد معها":"Contracted Insurance Partners",
  "سيتم إضافة أسماء وشعارات الشركات المتعاقد معها هنا فور استلام القائمة المعتمدة.":"Approved partner names and logos will be added here once the confirmed list is received.",
  "شركاؤنا من شركات التأمين":"Our Insurance Partners",
  "نتعاون مع شبكة متنوعة من شركات التأمين لتسهيل إجراءات الفحص والموافقة والإصلاح، مع متابعة واضحة في كل مرحلة.":"We work with a diverse network of insurance companies to streamline inspection, approval and repair, with clear follow-up at every stage.",
  "شركات تأمين":"Insurance Companies",
  "المصرية للتأمين التكافلي":"Egyptian Takaful",
  "مصر للتأمين":"Misr Insurance",
  "ثروة للتأمين":"Sarwa Insurance",
  "مصر للتأمين التكافلي":"Misr Takaful Insurance",
  "وثاق للتأمين التكافلي":"Wethaq Takaful Insurance",
  "هل تريد التأكد من تغطية وثيقتك؟":"Would you like to check your policy coverage?",
  "أرسل بيانات السيارة واسم شركة التأمين، وسيقوم الفريق المختص بالتواصل معك.":"Send us your vehicle details and insurance company name, and our specialist team will contact you.",
  "استفسر عن تغطية التأمين":"Check Your Insurance Coverage",
  "تخضع الموافقة النهائية ونطاق التغطية لشروط وثيقة التأمين وقرار شركة التأمين.":"Final approval and coverage scope are subject to the policy terms and the insurance company's decision.",
  "للاستفسار عن تغطية شركتك":"Check Your Coverage",
  "تشغيل الصوت":"Sound on",
  "كتم الصوت":"Mute"});
Object.assign(EN,{
  "تخصصاتنا حسب الماركة":"Our Brand Expertise",
  "صفحات توضح نطاق خدماتنا للماركات الأكثر بحثًا، مع ربط مباشر بالحجز وقطع الغيار والفروع.":"Dedicated pages explaining our services for the most searched vehicle brands, with direct links to booking, spare parts and locations.",
  "صيانة Range Rover وLand Rover":"Range Rover & Land Rover Service",
  "صيانة وتشخيص وفحص وقطع غيار وفق بيانات السيارة.":"Maintenance, diagnostics, inspection and spare parts based on your vehicle details.",
  "اعرف التفاصيل ←":"View details →",
  "صيانة Jaguar":"Jaguar Service",
  "خدمات صيانة وتشخيص ومتابعة وقطع غيار لسيارات Jaguar.":"Maintenance, diagnostics, follow-up and spare-parts services for Jaguar vehicles.",
  "صيانة السيارات الفاخرة":"Luxury Car Service",
  "BMW وMercedes-Benz وPorsche وBentley وMaserati وFerrari وLamborghini وغيرها.":"BMW, Mercedes-Benz, Porsche, Bentley, Maserati, Ferrari, Lamborghini and more.",
  "خدمة متخصصة بدون وعود مبالغ فيها.":"Specialist service with clear, realistic expectations.",
  "نراجع بيانات السيارة والحالة المطلوبة قبل تأكيد نطاق الخدمة أو توفر القطع. يمكنك الحجز أو إرسال استعلام قطع الغيار مباشرة، ثم يتواصل الفريق المختص للتأكيد.":"We review your vehicle details and requested service before confirming the scope of work or parts availability. You can book a service or send a spare-parts enquiry directly, then our team will contact you to confirm.",
  "الماركات والخدمات المرتبطة:":"Related brands and services:",
  "استعلام قطع غيار":"Spare Parts Enquiry",
  "أسئلة شائعة":"Frequently Asked Questions",
  "خدمات صيانة وتشخيص وفحص وقطع غيار لسيارات Range Rover وLand Rover، مع مراجعة بيانات السيارة والحالة المطلوبة قبل تأكيد الخدمة.":"Maintenance, diagnostics, inspection and spare-parts services for Range Rover and Land Rover, with vehicle details reviewed before confirming the service.",
  "فحص الأعطال الميكانيكية والكهربائية والصيانة الدورية حسب حالة السيارة ومتطلباتها.":"Mechanical and electrical diagnostics plus scheduled maintenance based on the vehicle's condition and requirements.",
  "تقييم الحالة وتحديد الأولويات قبل بدء التنفيذ مع توضيح المطلوب للعميل.":"We assess the vehicle, identify priorities and explain the required work before starting.",
  "تحديد القطعة المناسبة باستخدام بيانات السيارة ورقم الشاسيه ثم تأكيد التوفر والسعر.":"We identify the correct part using vehicle details and VIN, then confirm availability and price.",
  "هل Esotica Auto متخصص في Range Rover وLand Rover؟":"Does Esotica Auto specialize in Range Rover and Land Rover?",
  "نعم، Range Rover وLand Rover من الماركات الأساسية التي تركز عليها خدمات الصيانة والتشخيص وقطع الغيار في Esotica Auto.":"Yes. Range Rover and Land Rover are among the core brands covered by Esotica Auto maintenance, diagnostics and spare-parts services.",
  "هل يمكن إرسال رقم الشاسيه لطلب قطعة غيار؟":"Can I send the VIN for a spare-parts request?",
  "نعم، صفحة قطع الغيار تسمح بإرسال بيانات السيارة ورقم الشاسيه لمراجعة القطعة المطلوبة والتواصل معك.":"Yes. The spare-parts page lets you send the vehicle details and VIN so our team can review the requested part and contact you.",
  "أين توجد فروع Esotica Auto؟":"Where are Esotica Auto branches located?",
  "لدينا فروع في التجمع الخامس والتجمع الثالث والشيخ زايد، ويمكنك مراجعة صفحة الفروع للعناوين ومواعيد العمل.":"We have locations in Fifth Settlement, Third Settlement and Sheikh Zayed. See the Locations page for addresses and opening hours.",
  "خدمات صيانة وتشخيص وفحص وقطع غيار لسيارات Jaguar مع متابعة الطلب من الحجز وحتى ما بعد الخدمة.":"Maintenance, diagnostics, inspection and spare-parts services for Jaguar vehicles, with follow-up from booking through after-service care.",
  "تشخيص الأعطال":"Fault Diagnostics",
  "فحص الأنظمة الميكانيكية والكهربائية وتحديد سبب المشكلة قبل تنفيذ الإصلاح.":"Mechanical and electrical system checks to identify the cause before repair work begins.",
  "الصيانة الدورية":"Scheduled Maintenance",
  "متابعة عناصر الصيانة الأساسية حسب حالة السيارة والاستخدام.":"Routine maintenance based on vehicle condition and usage.",
  "قطع غيار Jaguar":"Jaguar Spare Parts",
  "مراجعة بيانات السيارة ورقم الشاسيه لتحديد القطعة المناسبة وتأكيد التوفر.":"We review vehicle details and VIN to identify the correct part and confirm availability.",
  "هل يمكن حجز صيانة Jaguar من الموقع؟":"Can I book Jaguar service online?",
  "نعم، يمكنك اختيار الفرع والتاريخ المفضل وإرسال بيانات السيارة من صفحة الحجز.":"Yes. Choose your preferred location and date and submit your vehicle details through the booking page.",
  "هل تقدمون استعلام قطع غيار Jaguar؟":"Do you provide Jaguar spare-parts enquiries?",
  "نعم، يمكنك إرسال بيانات السيارة ورقم الشاسيه والقطعة المطلوبة من صفحة قطع الغيار.":"Yes. You can submit vehicle details, VIN and the required part through the spare-parts page.",
  "ما الفروع المتاحة لصيانة Jaguar؟":"Which locations are available for Jaguar service?",
  "يمكنك طلب الخدمة من فروع التجمع الخامس والتجمع الثالث والشيخ زايد وفق التوفر والتأكيد من الفريق.":"Service can be requested at Fifth Settlement, Third Settlement and Sheikh Zayed, subject to availability and team confirmation.",
  "إلى جانب Range Rover وJaguar، نقدم خدمات مختارة لعدد من السيارات الفاخرة والأداء العالي وفق نوع السيارة والحالة المطلوبة.":"In addition to Range Rover and Jaguar, we provide selected services for luxury and performance vehicles depending on the model and requested work.",
  "فحص وتشخيص":"Inspection & Diagnostics",
  "مراجعة الحالة وتحديد إمكانية تنفيذ الخدمة حسب الماركة والموديل وطبيعة العطل.":"We review the vehicle condition and confirm service availability based on the brand, model and issue.",
  "صيانة وإصلاحات":"Maintenance & Repairs",
  "خدمات صيانة مختارة مع التركيز على جودة التنفيذ ومراجعة التفاصيل قبل بدء العمل.":"Selected maintenance services focused on workmanship quality and reviewing details before work begins.",
  "استعلام عن القطع باستخدام بيانات السيارة ورقم الشاسيه عند الحاجة.":"Spare-parts enquiries using vehicle details and VIN when required.",
  "ما ماركات السيارات الفاخرة التي تتعامل معها Esotica Auto؟":"Which luxury vehicle brands does Esotica Auto service?",
  "تشمل الخدمات المختارة BMW وMercedes-Benz وPorsche وBentley وMaserati وFerrari وLamborghini وAston Martin وRolls-Royce وCorvette، بالإضافة إلى Range Rover وJaguar.":"Selected services include BMW, Mercedes-Benz, Porsche, Bentley, Maserati, Ferrari, Lamborghini, Aston Martin, Rolls-Royce and Corvette, in addition to Range Rover and Jaguar.",
  "هل كل الخدمات متاحة لكل الماركات؟":"Are all services available for every brand?",
  "يعتمد نطاق الخدمة على الماركة والموديل والحالة المطلوبة، لذلك يراجع الفريق بيانات السيارة قبل تأكيد الخدمة.":"Service availability depends on the brand, model and requested work, so our team reviews the vehicle details before confirming.",
  "هل يمكن طلب قطع غيار للسيارات الفاخرة؟":"Can I request spare parts for luxury vehicles?",
  "يمكن إرسال طلب قطع الغيار من الموقع، ويقوم الفريق بمراجعة بيانات السيارة والقطعة المطلوبة ثم التواصل لتأكيد التوفر.":"You can submit a spare-parts request through the website. Our team will review the vehicle and requested part, then contact you to confirm availability."
});
const AR=Object.fromEntries(Object.entries(EN).map(([ar,en])=>[en,ar]));
const AR_PLACEHOLDERS={"اكتب الخدمة أو المشكلة باختصار":"Briefly describe the service or issue","7 أو 17 خانة":"7 or 17 characters","أدخل رقم الشاسيه المكوّن من 17 خانة":"Enter the complete 17-character VIN"};
function translatePage(lang){
  const dict=lang==="en"?EN:AR;
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let n; while(n=walker.nextNode()){
    if(["SCRIPT","STYLE"].includes(n.parentElement?.tagName))continue;
    const raw=n.nodeValue,trim=raw.trim(),translated=dict[trim];
    if(translated)n.nodeValue=raw.replace(trim,translated);
  }
  document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el=>{
    const current=el.placeholder;
    if(lang==="en"&&AR_PLACEHOLDERS[current])el.placeholder=AR_PLACEHOLDERS[current];
    if(lang==="ar"){
      const found=Object.entries(AR_PLACEHOLDERS).find(([,en])=>en===current);if(found)el.placeholder=found[0];
    }
  });
  const toggle=document.querySelector("#langToggle");
  if(toggle){toggle.textContent=lang==="en"?"AR":"EN";toggle.setAttribute("aria-label",lang==="en"?"عرض الموقع بالعربية":"View site in English");}
  if(typeof renderEvents==="function")renderEvents(publicEvents,lang);
  if(typeof updateHeroSoundButton==="function")updateHeroSoundButton();
  if(typeof renderLeadContext==="function")renderLeadContext();
  localStorage.setItem("esotica-language",lang);
}
function initLanguage(){
  if(!document.querySelector("#langToggle")){
    const button=document.createElement("button");button.id="langToggle";button.className="lang-toggle";button.type="button";
    document.querySelector(".nav")?.insertBefore(button,document.querySelector(".nav-cta"));
    button.addEventListener("click",()=>translatePage(document.documentElement.lang==="en"?"ar":"en"));
  }
  translatePage(localStorage.getItem("esotica-language")||"en");
}
function formatPublicPhone(value){
  const digits=String(value||"").replace(/\D/g,"");
  const dialDigits=digits.startsWith("0")?`20${digits.slice(1)}`:digits;
  const localDigits=dialDigits.startsWith("20")?`0${dialDigits.slice(2)}`:digits;
  const display=/^01\d{9}$/.test(localDigits)?`${localDigits.slice(0,3)} ${localDigits.slice(3,7)} ${localDigits.slice(7)}`:String(value||"").trim();
  return {dial:dialDigits?`+${dialDigits}`:"",display};
}
function applyContactDetails(settings={}){
  const phone=formatPublicPhone(settings.contact_phone||ESOTICA_CONTACT_DEFAULTS.phone);
  const whatsappRaw=String(settings.whatsapp_number||ESOTICA_CONTACT_DEFAULTS.whatsapp).replace(/\D/g,"");
  const whatsapp=whatsappRaw.startsWith("0")?`20${whatsappRaw.slice(1)}`:whatsappRaw;
  const facebook=settings.facebook_url||ESOTICA_CONTACT_DEFAULTS.facebook;
  const instagram=settings.instagram_url||ESOTICA_CONTACT_DEFAULTS.instagram;
  const email=settings.contact_email||ESOTICA_CONTACT_DEFAULTS.email;
  const whatsappPages={home:"الصفحة الرئيسية",services:"الخدمات",booking:"حجز الصيانة",parts:"قطع الغيار",branches:"الفروع",offers:"العروض والأحداث",contact:"تواصل معنا","warranty-insurance":"الضمان والتأمين",about:"من نحن"};
  const whatsappText=`مرحبًا فريق Esotica Auto،\nأرغب في الاستفسار عن خدماتكم.\n\nالاسم: \nالسيارة / الموديل: \nتفاصيل الاستفسار: \n\n—\nتم التواصل من خلال موقع Esotica Auto | ${whatsappPages[pageName]||pageName}`;
  const whatsappUrl=whatsapp?`https://wa.me/${whatsapp}?text=${encodeURIComponent(whatsappText)}`:"";

  const footer=document.querySelector(".site-footer");
  if(footer){
    const quick=footer.querySelector(".footer-col");
    if(quick){
      const quickLinks=[["/warranty-insurance","الضمان والتأمين"],["/branches","فروعنا"],["/about","من نحن"],["/privacy","سياسة الخصوصية"]];
      for(const [href,label] of quickLinks){
        if(!quick.querySelector(`a[href="${href}"]`))quick.insertAdjacentHTML("beforeend",`<a href="${href}">${label}</a>`);
      }
    }
    const initialCols=[...footer.querySelectorAll(".footer-col")];
    const branchCol=initialCols.find((col,index)=>index>0&&col.querySelector('a[href="/branches"]'));
    if(branchCol)branchCol.remove();

    const cols=[...footer.querySelectorAll(".footer-col")];
    const contact=cols[cols.length-1];
    if(contact){
      let links=contact.querySelector(".footer-live-links");
      if(!links){links=document.createElement("div");links.className="footer-live-links";const btn=contact.querySelector(".footer-contact-btn");contact.insertBefore(links,btn||null)}
      const socialLinks=[
        whatsapp?`<a class="footer-social-icon whatsapp-icon" target="_blank" rel="noreferrer" href="${escHtml(whatsappUrl)}" aria-label="WhatsApp" title="WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7c1.7.9 3.6 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Z"/></svg></a>`:"",
        instagram?`<a class="footer-social-icon instagram-icon" target="_blank" rel="noreferrer" href="${escHtml(instagram)}" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle class="social-dot" cx="17.4" cy="6.6" r="1"></circle></svg></a>`:"",
        facebook?`<a class="footer-social-icon facebook-icon" target="_blank" rel="noreferrer" href="${escHtml(facebook)}" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 8.2V6.5c0-.8.5-1 1-1h2.6V2.1L14.4 2C11 2 9.8 4 9.8 6.2v2H7v4h2.8V22h4.4v-9.8h3.3l.5-4h-3.8Z"/></svg></a>`:""
      ].join("");
      links.innerHTML=
        (phone.dial?`<a class="footer-phone" dir="ltr" href="tel:${phone.dial}">${escHtml(phone.display)}</a>`:"")+
        (email?`<a class="footer-email" dir="ltr" href="mailto:${escHtml(email)}">${escHtml(email)}</a>`:"")+
        (socialLinks?`<div class="footer-social-icons">${socialLinks}</div>`:"");
    }
  }
  if(whatsapp){
    let a=document.querySelector(".whatsapp-float");
    if(!a){a=document.createElement("a");a.className="whatsapp-float";a.target="_blank";a.rel="noreferrer";a.setAttribute("aria-label","WhatsApp");document.body.appendChild(a)}
    a.innerHTML='<span class="wa-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.5-1.7c1.7.9 3.6 1.4 5.6 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Z"/></svg></span><span>WhatsApp</span>';
    a.href=whatsappUrl;
  }
}

let publicEvents=[];
const EVENT_STATUS_LABELS={
  available:{ar:"متاح الآن",en:"Available Now"},
  unavailable:{ar:"غير متاح حاليًا",en:"Currently Unavailable"},
  coming:{ar:"قريبًا",en:"Coming Soon"}
};
function eventDate(value,lang){
  if(!value)return "";
  const date=new Date(value+"T12:00:00");
  if(Number.isNaN(date.getTime()))return escHtml(value);
  return date.toLocaleDateString(lang==="ar"?"ar-EG":"en-GB",{day:"numeric",month:"long",year:"numeric"});
}
function safeEventLink(value){
  const link=String(value||"/contact").trim();
  return /^(\/|https?:\/\/)/i.test(link)?link:"/contact";
}
function publicEventImage(item={}){
  if(item.image_media_id==="builtin:towing-service")return "/site/towing-service-event.webp?v=20261001-1";
  if(item.image_media_id)return `/api/media/${encodeURIComponent(item.image_media_id)}`;
  const title=`${item.title_ar||""} ${item.title_en||""}`.toLowerCase();
  return title.includes("mobile")||title.includes("موبايل")||title.includes("متنقلة")?"/site/mobile-service-event.jpeg?v=20260930-1":"";
}
function publicEventFallback(item={}){
  const title=`${item.title_ar||""} ${item.title_en||""}`.toLowerCase();
  return title.includes("mobile")||title.includes("موبايل")||title.includes("متنقلة")?"/site/mobile-service-event.jpeg?v=20260930-1":"";
}
function activatePublicEventImageFallbacks(container){
  container?.querySelectorAll("img[data-event-fallback]").forEach(image=>{
    const fallback=image.dataset.eventFallback;
    const recover=()=>{if(!fallback||image.src.includes("mobile-service-event.jpeg"))return;image.removeAttribute("data-event-fallback");image.src=fallback};
    image.addEventListener("error",recover,{once:true});
    if(image.complete&&!image.naturalWidth)recover();
  });
}
function renderEvents(items,lang){
  const grid=document.querySelector("#eventsGrid");if(!grid)return;
  const activeLang=lang||document.documentElement.lang||"en";
  if(!Array.isArray(items)||!items.length){
    grid.innerHTML=`<div class="empty-offers"><p class="eyebrow">ESOTICA EVENTS</p><h2>${activeLang==="ar"?"لا توجد أحداث منشورة حاليًا":"No events are currently published"}</h2><p>${activeLang==="ar"?"ستظهر هنا الخدمات المتنقلة والأحداث الموسمية فور الإعلان عنها.":"Mobile services and seasonal events will appear here as soon as they are announced."}</p><a class="btn btn-outline" href="/contact">${activeLang==="ar"?"تواصل معنا":"Contact Us"}</a></div>`;
    return;
  }
  grid.innerHTML=items.map(x=>{
    const status=EVENT_STATUS_LABELS[x.availability]||EVENT_STATUS_LABELS.available;
    const title=activeLang==="ar"?(x.title_ar||x.title_en):(x.title_en||x.title_ar);
    const description=activeLang==="ar"?(x.description_ar||x.description_en):(x.description_en||x.description_ar);
    const location=activeLang==="ar"?(x.location_ar||x.location_en):(x.location_en||x.location_ar);
    const buttonText=activeLang==="ar"?(x.button_text_ar||"اعرف التفاصيل"):(x.button_text_en||"View Details");
    const dateParts=[];
    if(x.start_date)dateParts.push(`${activeLang==="ar"?"من":"From"} ${eventDate(x.start_date,activeLang)}`);
    if(x.end_date)dateParts.push(`${activeLang==="ar"?"إلى":"To"} ${eventDate(x.end_date,activeLang)}`);
    const unavailable=x.availability==="unavailable";
    const imageUrl=publicEventImage(x);
    const fallbackImage=publicEventFallback(x);
    return `<article class="event-card">
      ${imageUrl?`<div class="event-image"><img src="${imageUrl}" ${fallbackImage&&imageUrl!==fallbackImage?`data-event-fallback="${fallbackImage}"`:""} alt="${escHtml(title)}" loading="lazy"></div>`:""}
      <div class="event-content">
        <div class="event-card-top"><p class="eyebrow">ESOTICA EVENT</p><span class="event-status is-${escHtml(x.availability||"available")}">${escHtml(status[activeLang]||status.en)}</span></div>
        <h2>${escHtml(title)}</h2>
        ${description?`<p>${escHtml(description)}</p>`:""}
        ${location?`<div class="event-meta"><span aria-hidden="true">⌖</span><span>${escHtml(location)}</span></div>`:""}
        ${dateParts.length?`<div class="event-dates">${dateParts.map(part=>`<span>${part}</span>`).join("")}</div>`:""}
        ${unavailable?`<span class="btn btn-outline event-cta-disabled" aria-disabled="true">${escHtml(status[activeLang]||status.en)}</span>`:`<a class="btn btn-gold" href="${escHtml(trackedInternalLink(safeEventLink(x.button_link),"event",title,x.id))}">${escHtml(buttonText)}</a>`}
      </div>
    </article>`;
  }).join("");
  activatePublicEventImageFallbacks(grid);
}
async function loadEvents(){
  const grid=document.querySelector("#eventsGrid");if(!grid)return;
  try{
    const response=await fetch("/api/events",{cache:"no-store"});
    const data=await response.json();
    if(!response.ok||!Array.isArray(data.events))throw new Error(data.error||"events unavailable");
    publicEvents=data.events;
    renderEvents(publicEvents,document.documentElement.lang||"en");
  }catch(error){console.warn("Events unavailable",error)}
}
function initOffersTabs(){
  const tabs=[...document.querySelectorAll("[data-offers-tab]")];
  const panels=[...document.querySelectorAll("[data-offers-panel]")];
  if(!tabs.length)return;
  const activate=name=>{
    tabs.forEach(tab=>{
      const active=tab.dataset.offersTab===name;
      tab.classList.toggle("is-active",active);
      tab.setAttribute("aria-selected",String(active));
      tab.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>{
      const active=panel.dataset.offersPanel===name;
      panel.classList.toggle("is-active",active);
      panel.hidden=!active;
    });
    if(name==="events")history.replaceState(null,"","#events");
    else if(location.hash==="#events")history.replaceState(null,"",location.pathname+location.search);
  };
  tabs.forEach(tab=>tab.addEventListener("click",()=>activate(tab.dataset.offersTab)));
  activate(location.hash==="#events"?"events":"offers");
}

async function loadOffers(){
  const grid=document.querySelector("#offersGrid");if(!grid)return;
  try{
    const r=await fetch("/api/offers",{cache:"no-store"}),j=await r.json();
    if(!r.ok||!Array.isArray(j.offers)||!j.offers.length)return;
    grid.innerHTML=j.offers.map(x=>{const ar=document.documentElement.lang==="ar",title=ar?(x.title||x.title_en):(x.title_en||x.title),description=ar?(x.description||x.description_en):(x.description_en||x.description),button=ar?(x.button_text||"احجز الآن"):(x.button_text_en||"Book Now"),image=x.image_media_id==="builtin:jlr-cashback-50"?"/site/offer-cashback-jlr-v2.webp?v=20261001-1":(x.image_media_id?`/api/media/${encodeURIComponent(x.image_media_id)}`:"");return `<article class="offer-card">
      ${image?`<div class="offer-image"><img src="${image}" alt="${escHtml(title)}" loading="lazy"></div>`:""}
      <div class="offer-content">
        <p class="eyebrow">ESOTICA OFFER</p>
        <h2>${escHtml(title)}</h2>
        <p>${escHtml(description||"")}</p>
        ${x.end_date?`<div class="offer-dates">${ar?"متاح حتى":"Available until"} ${escHtml(x.end_date)}</div>`:""}
        <a class="btn btn-gold" href="${escHtml(trackedInternalLink(x.button_link||"/booking","offer",title,x.id))}">${escHtml(button)}</a>
      </div>
    </article>`}).join("");
  }catch(e){console.warn("Offers unavailable",e)}
}

function initWarrantyTabs(){
  const tabs=[...document.querySelectorAll("[data-warranty-tab]")];
  const panels=[...document.querySelectorAll("[data-warranty-panel]")];
  if(!tabs.length)return;
  const activate=name=>{
    tabs.forEach(tab=>{
      const active=tab.dataset.warrantyTab===name;
      tab.classList.toggle("is-active",active);
      tab.setAttribute("aria-selected",String(active));
      tab.tabIndex=active?0:-1;
    });
    panels.forEach(panel=>{
      const active=panel.dataset.warrantyPanel===name;
      panel.classList.toggle("is-active",active);
      panel.hidden=!active;
    });
    if(name==="insurance")history.replaceState(null,"","#insurance");
    else if(location.hash==="#insurance")history.replaceState(null,"",location.pathname+location.search);
  };
  tabs.forEach(tab=>tab.addEventListener("click",()=>activate(tab.dataset.warrantyTab)));
  activate(location.hash==="#insurance"?"insurance":"warranty");
}

applyContactDetails({});
initLeadAttribution();
initOffersTabs();
initWarrantyTabs();
loadSiteContent().finally(initLanguage);
loadOffers();
loadEvents();
