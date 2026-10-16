const DEMO_EMAIL="demo@esotica.local";
const DEMO_PASSWORD="Demo2026";
const loginView=document.querySelector("#loginView");
const portalView=document.querySelector("#portalView");
const sidebar=document.querySelector(".portal-sidebar");
const toast=document.querySelector("#toast");

const vehicles=[
  {brand:"RANGE ROVER",model:"Velar",year:"2021",plate:"أ ب ج 123",vin:"SALYA2BN5MA******",primary:true},
  {brand:"JAGUAR",model:"XE",year:"2020",plate:"س و ن 456",vin:"SAJAB4FX8LCP*****"}
];

let activities=[
  {type:"booking",icon:"✓",title:"تم تأكيد حجز الصيانة",text:"Range Rover Velar · فرع التجمع الخامس",date:"16 أكتوبر 2026",state:"مؤكد",done:true},
  {type:"parts",icon:"◇",title:"طلب استعلام قطع غيار",text:"Front brake pads · Jaguar XE",date:"12 أكتوبر 2026",state:"قيد المراجعة"},
  {type:"booking",icon:"↻",title:"صيانة دورية مكتملة",text:"Jaguar XE · فرع الشيخ زايد",date:"28 سبتمبر 2026",state:"مكتمل",done:true},
  {type:"inquiry",icon:"?",title:"استفسار عن خدمة الضمان",text:"تم التواصل والرد بواسطة فريق خدمة العملاء",date:"19 سبتمبر 2026",state:"تم الرد",done:true},
  {type:"booking",icon:"✓",title:"فحص وتشخيص مكتمل",text:"Range Rover Velar · فرع التجمع الثالث",date:"20 أغسطس 2026",state:"مكتمل",done:true}
];

const offers=[
  {title:"فحص شامل مجاني",text:"عرض خاص لسيارتك Range Rover Velar",until:"متاح حتى 31 أكتوبر 2026"},
  {title:"50% كاش باك على المصنعية",text:"لـRange Rover وJaguar موديلات 2016–2026",until:"تطبق الشروط والأحكام"}
];

function showToast(message){
  toast.textContent=message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer=window.setTimeout(()=>toast.classList.remove("show"),2800);
}

function renderVehicles(){
  const grid=document.querySelector("#vehicleGrid");
  grid.innerHTML=vehicles.map((car,index)=>`<article class="vehicle-card${car.added?" demo-added":""}">
    <div class="vehicle-brand"><span>${car.brand}</span>${car.primary?'<span class="status exclusive">السيارة الأساسية</span>':car.added?'<span class="status scheduled">أضيفت الآن</span>':""}</div>
    <h3>${car.model}</h3><p>موديل ${car.year}</p>
    <div class="vehicle-details">
      <div><span>رقم اللوحة</span><b>${car.plate||"غير مسجل"}</b></div>
      <div><span>رقم الشاسيه</span><b>${car.vin||"غير مسجل"}</b></div>
      <div><span>آخر زيارة</span><b>${index===0?"28 SEP 2026":index===1?"20 AUG 2026":"—"}</b></div>
    </div>
  </article>`).join("");
}

function activityMarkup(items){
  return items.map(item=>`<div class="activity-item" data-type="${item.type}">
    <span class="activity-icon">${item.icon}</span>
    <div><strong>${item.title}</strong><p>${item.text}</p><small>${item.date}</small></div>
    <span class="activity-state${item.done?" done":""}">${item.state}</span>
  </div>`).join("");
}

function renderActivities(filter="all"){
  document.querySelector("#recentActivity").innerHTML=activityMarkup(activities);
  const filtered=filter==="all"?activities:activities.filter(item=>item.type===filter);
  document.querySelector("#fullActivity").innerHTML=filtered.length?activityMarkup(filtered):'<p class="form-message">لا توجد تعاملات من هذا النوع.</p>';
}

function renderOffers(){
  document.querySelector("#offerList").innerHTML=offers.map((offer,index)=>`<div class="offer-row"><strong>${offer.title}</strong><p>${offer.text}</p><small>${offer.until}</small><button type="button" data-offer-index="${index}">تفعيل</button></div>`).join("");
}

function openPanel(name){
  document.querySelectorAll("[data-panel-view]").forEach(panel=>panel.classList.toggle("active",panel.dataset.panelView===name));
  document.querySelectorAll(".portal-nav [data-panel]").forEach(button=>button.classList.toggle("active",button.dataset.panel===name));
  sidebar.classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}

function showPortal(){
  loginView.classList.add("hidden");
  portalView.classList.remove("hidden");
  sessionStorage.setItem("esoticaPortalDemo","active");
  renderVehicles();renderActivities();renderOffers();
}

document.querySelector("#passwordToggle").addEventListener("click",event=>{
  const input=document.querySelector('#loginForm input[name="password"]');
  input.type=input.type==="password"?"text":"password";
  event.currentTarget.textContent=input.type==="password"?"إظهار":"إخفاء";
});

document.querySelector("#loginForm").addEventListener("submit",event=>{
  event.preventDefault();
  const form=event.currentTarget;
  const message=document.querySelector("#loginMessage");
  const email=form.elements.email.value.trim().toLowerCase();
  const password=form.elements.password.value;
  if(email!==DEMO_EMAIL||password!==DEMO_PASSWORD){message.textContent="بيانات الدخول غير صحيحة. استخدم بيانات التجربة الموضحة بالأعلى.";return}
  message.textContent="";showPortal();showToast("تم فتح حساب العميل التجريبي");
});

document.querySelectorAll(".portal-nav [data-panel]").forEach(button=>button.addEventListener("click",()=>openPanel(button.dataset.panel)));
document.querySelectorAll("[data-open-panel]").forEach(button=>button.addEventListener("click",()=>openPanel(button.dataset.openPanel)));
document.querySelector("#mobileMenuButton").addEventListener("click",()=>sidebar.classList.toggle("open"));
document.querySelector("#logoutButton").addEventListener("click",()=>{sessionStorage.removeItem("esoticaPortalDemo");portalView.classList.add("hidden");loginView.classList.remove("hidden");sidebar.classList.remove("open");window.scrollTo({top:0,behavior:"smooth"})});
document.querySelectorAll("[data-toast]").forEach(button=>button.addEventListener("click",()=>showToast(button.dataset.toast)));

document.querySelector("#activateOffer").addEventListener("click",event=>{
  event.currentTarget.textContent="تم تفعيل العرض ✓";event.currentTarget.classList.add("activated");event.currentTarget.disabled=true;
  activities.unshift({type:"inquiry",icon:"★",title:"تم تفعيل عرض الفحص الشامل",text:"سيتم ربطه بالحجز القادم في النسخة الحقيقية",date:"الآن — تجربة",state:"مفعّل",done:true});
  renderActivities();showToast("تم تفعيل العرض داخل النسخة التجريبية");
});

document.querySelector("#offerList").addEventListener("click",event=>{
  const button=event.target.closest("[data-offer-index]");if(!button)return;
  button.textContent="مفعّل ✓";button.disabled=true;showToast(`تم تفعيل: ${offers[Number(button.dataset.offerIndex)].title}`);
});

document.querySelectorAll("[data-history-filter]").forEach(button=>button.addEventListener("click",()=>{
  document.querySelectorAll("[data-history-filter]").forEach(item=>item.classList.toggle("active",item===button));renderActivities(button.dataset.historyFilter);
}));

const vehicleModal=document.querySelector("#vehicleModal");
document.querySelector("#addVehicleButton").addEventListener("click",()=>vehicleModal.classList.remove("hidden"));
document.querySelector("#closeVehicleModal").addEventListener("click",()=>vehicleModal.classList.add("hidden"));
vehicleModal.addEventListener("click",event=>{if(event.target===vehicleModal)vehicleModal.classList.add("hidden")});
document.querySelector("#vehicleForm").addEventListener("submit",event=>{
  event.preventDefault();const form=event.currentTarget;const data=Object.fromEntries(new FormData(form).entries());
  vehicles.push({brand:data.brand.toUpperCase(),model:data.model,year:data.year,plate:data.plate,vin:data.vin,added:true});renderVehicles();
  document.querySelectorAll(".portal-nav [data-panel='vehicles'] b").forEach(el=>el.textContent=String(vehicles.length));
  form.reset();vehicleModal.classList.add("hidden");showToast("تمت إضافة السيارة للتجربة فقط");
});

document.querySelector("#profileForm").addEventListener("submit",event=>{
  event.preventDefault();const message=document.querySelector("#profileMessage");message.textContent="تم حفظ التعديلات داخل جلسة التجربة فقط.";message.classList.add("success");showToast("تم حفظ بيانات الحساب التجريبية");
});

document.addEventListener("keydown",event=>{if(event.key==="Escape"){vehicleModal.classList.add("hidden");sidebar.classList.remove("open")}});

if(sessionStorage.getItem("esoticaPortalDemo")==="active")showPortal();
