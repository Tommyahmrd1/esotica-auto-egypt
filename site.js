
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
document.body.classList.add(`page-${pageName}`);
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
const EN={
  "الخدمات":"Services","حجز صيانة":"Book Service","قطع الغيار":"Spare Parts","الفروع":"Locations","تواصل معنا":"Contact Us","احجز الآن":"Book Now",
  "خبرة متخصصة.":"Specialist expertise.","عناية تليق بسيارتك.":"Care worthy of your car.","خدمة متخصصة لسيارات Range Rover وJaguar، وعناية متكاملة بمجموعة مختارة من السيارات الفاخرة.":"Specialist Range Rover and Jaguar service, with complete care for a select range of luxury vehicles.","شوف الفروع":"View Locations","اكتشف Esotica":"Explore Esotica","فروع لخدمتك":"service locations","خبرة متخصصة":"specialist expertise","عناية متكاملة":"complete care",
  "كل ما تحتاجه لسيارتك":"Everything your car needs","ابدأ طلبك من الصفحة المخصصة، وسيقوم فريقنا بمراجعة التفاصيل والتواصل معك للتأكيد.":"Choose the service you need. Our team will review the details and contact you to confirm.","احجز موعدك واختر الفرع والتاريخ المناسب.":"Choose your preferred location and date.","ابدأ الحجز ←":"Book now →","أرسل رقم الشاسيه وبيانات القطعة لتأكيد التوفر والسعر.":"Send the VIN and part details to confirm availability and price.","استعلام قطع غيار ←":"Parts enquiry →","خدماتنا":"Our Services","صيانة وتشخيص وسمكرة ودهان وخدمات متخصصة لسيارتك.":"Maintenance, diagnostics, body repair and specialist vehicle care.","عرض الخدمات ←":"Explore services →","العناوين ومواعيد العمل والوصول لكل فرع.":"Addresses, opening hours and directions for every location.","عندك استفسار؟ ابعت رسالة مباشرة لفريقنا.":"Have a question? Send our team a message.","آراء عملائنا":"Client Reviews","ما يقوله عملاؤنا عن تجربتهم مع فريق Esotica Auto.":"What our clients say about their experience with Esotica Auto.","لا توجد تقييمات منشورة حتى الآن.":"No reviews have been published yet.",
  "خبرة متكاملة لسيارتك":"Complete expertise for your car","حلول صيانة وتشخيص متخصصة لسيارات Range Rover وJaguar، وخدمات مختارة للسيارات الفاخرة.":"Specialist maintenance and diagnostics for Range Rover and Jaguar, plus selected services for luxury vehicles.","الصيانة والتشخيص":"Maintenance & Diagnostics","صيانة دورية وتشخيص للأعطال الميكانيكية والكهربائية باستخدام أجهزة متخصصة.":"Scheduled maintenance and precise mechanical and electrical diagnostics using specialist equipment.","السمكرة والدهان":"Body & Paint","إصلاحات دقيقة وتشطيب نهائي يراعي تفاصيل السيارة وجودة مظهرها.":"Precision repairs and refinishing with close attention to every detail.","تحديد القطعة المناسبة وفق بيانات السيارة ورقم الشاسيه، مع تأكيد التوفر والسعر.":"Accurate part identification by vehicle details and VIN, with availability and price confirmation.","أرسل طلبك ←":"Send enquiry →","الفحص الشامل":"Comprehensive Inspection","تقييم متكامل للحالة الميكانيكية والكهربائية، مع توضيح الأولويات قبل بدء العمل.":"A complete mechanical and electrical assessment, with clear priorities before work begins.","الخدمة المتنقلة":"Mobile Service","دعم متنقل للحالات التي يمكن خدمتها خارج المركز وداخل نطاق التغطية.":"Mobile support for eligible services within our coverage area.","متابعة ما بعد الخدمة":"After-Service Care","نتابع معك بعد التسليم للتأكد من جودة التنفيذ واستقرار حالة السيارة.":"We follow up after delivery to ensure quality and lasting performance.",
  "احجز موعد الصيانة":"Book Your Service","اختر الفرع والتاريخ المناسب، وسيقوم فريقنا بالتواصل معك لتأكيد الموعد.":"Choose your preferred location and date. Our team will contact you to confirm the appointment.","احجز موعدك":"Request an Appointment","بعد إرسال الطلب، يراجع الفريق المختص بيانات السيارة والخدمة المطلوبة قبل تأكيد الموعد.":"Our specialist team reviews your vehicle and service details before confirming the appointment.","اختيار الفرع":"Choose a location","اختيار التاريخ المفضل":"Select a preferred date","تأكيد الموعد من الفريق":"Confirmation from our team","الاسم":"Name","رقم الهاتف":"Phone Number","السيارة / الموديل":"Vehicle / Model","سنة الصنع":"Model Year","الفرع":"Location","اختر الفرع":"Choose a location","التجمع الخامس - الجوي":"Fifth Settlement – Air Force Branch","التجمع الثالث - المنطقة الصناعية":"Third Settlement – Industrial Area","الشيخ زايد":"Sheikh Zayed","التاريخ المفضل":"Preferred Date","تفاصيل الخدمة":"Service Details","إرسال طلب الحجز":"Submit Booking Request",
  "طلب قطع الغيار":"Spare Parts Enquiry","أرسل بيانات السيارة والقطعة المطلوبة، وسيتواصل معك فريق قطع الغيار لتأكيد التوفر والسعر.":"Send your vehicle and part details. Our parts team will contact you to confirm availability and price.","بيانات دقيقة، استعلام أسرع":"Accurate details. Faster response.","اكتب رقم الشاسيه كاملًا أو آخر 7 خانات لمساعدتنا في تحديد القطعة المناسبة.":"Enter the full VIN or its last 7 characters to help us identify the correct part.","رقم الشاسيه / آخر 7 خانات":"VIN / Last 7 Characters","كود القطعة إن وجد":"Part Number (if available)","الكمية":"Quantity","القطعة المطلوبة / التفاصيل":"Required Part / Details","إرسال استعلام القطعة":"Submit Parts Enquiry",
  "أقرب إليك بثلاثة فروع":"Three locations. One standard.","تعرف على عناوين الفروع ومواعيد العمل، واختر الموقع الأنسب لزيارتك.":"View our addresses and opening hours, then choose the most convenient location.","فرع الجوي":"Air Force Branch","فرع المصانع":"Industrial Area Branch","فرع زايد":"Sheikh Zayed Branch","فتح على الخريطة ←":"Open in Maps →","احجز في الفرع المناسب":"Book Your Preferred Location",
  "نحن هنا لخدمتك":"We’re here to help","أرسل استفسارك، وسيقوم فريق خدمة العملاء بالتواصل معك في أقرب وقت.":"Send your enquiry and our customer care team will contact you shortly.","كيف يمكننا مساعدتك؟":"How can we help?","شاركنا بيانات التواصل وتفاصيل استفسارك، وسيتولى الفريق المختص المتابعة معك.":"Share your contact details and enquiry, and the right specialist will follow up.","الموضوع":"Subject","الرسالة":"Message","إرسال الرسالة":"Send Message",
  "من داخل ورشنا":"Inside Our Workshops","لقطات من بيئة العمل والعناية التي نقدمها لسيارتك داخل Esotica Auto.":"A closer look at our workshop and the care your vehicle receives at Esotica Auto.","متخصصون في Range Rover وJaguar والعناية بالسيارات الفاخرة.":"Specialists in Range Rover, Jaguar and luxury vehicle care.","إدارة الموقع":"Site Administration","© 2026 Esotica Auto — جميع الحقوق محفوظة":"© 2026 Esotica Auto — All rights reserved",
  "السبت–الخميس: 10:00 ص – 8:00 م • الجمعة إجازة":"Saturday–Thursday: 10:00 AM–8:00 PM • Friday closed","السبت–الخميس: 10:00 ص – 7:00 م • الجمعة إجازة":"Saturday–Thursday: 10:00 AM–7:00 PM • Friday closed"
};
const AR=Object.fromEntries(Object.entries(EN).map(([ar,en])=>[en,ar]));
const AR_PLACEHOLDERS={"اكتب الخدمة أو المشكلة باختصار":"Briefly describe the service or issue","7 أو 17 خانة":"7 or 17 characters"};
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
loadSiteContent().finally(initLanguage);
