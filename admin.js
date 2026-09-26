const $=s=>document.querySelector(s);
let state={tab:"bookings",data:null};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function showLogin(){ $("#loginView").classList.remove("hidden");$("#dashView").classList.add("hidden");$("#logoutBtn").classList.add("hidden") }
function showDash(){ $("#loginView").classList.add("hidden");$("#dashView").classList.remove("hidden");$("#logoutBtn").classList.remove("hidden") }
function date(v){try{return new Date(v).toLocaleString("ar-EG")}catch{return v}}
function render(){
 const d=state.data;if(!d)return;
 const all=[...d.bookings,...d.parts,...d.contacts], fresh=all.filter(x=>x.status==="new").length;
 $("#summaryText").textContent=`آخر تحديث: ${new Date().toLocaleString("ar-EG")}`;
 $("#stats").innerHTML=[
  ["إجمالي الطلبات",all.length],["جديدة",fresh],["حجوزات",d.bookings.length],["قطع غيار",d.parts.length]
 ].map(([a,b])=>`<div class="stat"><b>${b}</b><span>${a}</span></div>`).join("");
 renderTable();
}
function statusSelect(type,id,value){
 return `<select class="status" data-type="${type}" data-id="${id}">
 ${["new","contacted","confirmed","completed","cancelled"].map(x=>`<option value="${x}" ${x===value?"selected":""}>${({new:"جديد",contacted:"تم التواصل",confirmed:"مؤكد",completed:"مكتمل",cancelled:"ملغي"})[x]}</option>`).join("")}
 </select>`;
}
function renderTable(){
 const t=state.tab, rows=state.data?.[t]||[];
 if(!rows.length){$("#tableWrap").innerHTML='<div class="empty">لا توجد بيانات حتى الآن.</div>';return}
 let head="", body="";
 if(t==="bookings"){
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>السيارة</th><th>الفرع</th><th>الموعد</th><th>التفاصيل</th><th>الحالة</th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.car_model)} / ${esc(x.year)}</td><td>${esc(x.branch)}</td><td>${esc(x.preferred_date)}</td><td>${esc(x.details)}</td><td>${statusSelect("bookings",x.id,x.status)}</td></tr>`).join("");
 }else if(t==="parts"){
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>السيارة</th><th>VIN</th><th>القطعة</th><th>الحالة</th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.car_model)} / ${esc(x.year)}</td><td dir="ltr">${esc(x.vin)}</td><td>${esc(x.details)}<br><small>${esc(x.part_code||"")}</small></td><td>${statusSelect("parts",x.id,x.status)}</td></tr>`).join("");
 }else{
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>الموضوع</th><th>الرسالة</th><th>الحالة</th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.subject)}</td><td>${esc(x.message)}</td><td>${statusSelect("contacts",x.id,x.status)}</td></tr>`).join("");
 }
 $("#tableWrap").innerHTML=`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
 document.querySelectorAll(".status").forEach(s=>s.addEventListener("change",async e=>{
   const el=e.currentTarget, r=await fetch(`/api/admin/status/${el.dataset.type}/${el.dataset.id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({status:el.value})});
   if(!r.ok){alert("تعذر تحديث الحالة");await load()}
 }));
}
async function load(){
 const r=await fetch("/api/admin/dashboard",{cache:"no-store"});
 if(r.status===401||r.status===403){showLogin();return}
 const j=await r.json(); if(!r.ok){alert(j.error||"تعذر تحميل البيانات");return}
 state.data=j;showDash();render();
}
$("#loginForm").addEventListener("submit",async e=>{
 e.preventDefault();const m=$("#loginMsg");m.textContent="جاري الدخول...";
 const data=Object.fromEntries(new FormData(e.currentTarget).entries());
 const r=await fetch("/api/admin/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok){m.textContent=j.error||"بيانات الدخول غير صحيحة.";m.className="form-msg err";return}
 m.textContent="";await load();
});
$("#logoutBtn").addEventListener("click",async()=>{await fetch("/api/admin/logout",{method:"POST"});showLogin()});
$("#refreshBtn").addEventListener("click",load);
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.tab=b.dataset.tab;
  if(state.tab==="site"){$("#tableWrap").classList.add("hidden");$("#sitePanel").classList.remove("hidden");loadCMS()}
  else{$("#tableWrap").classList.remove("hidden");$("#sitePanel").classList.add("hidden");renderTable()}
}));
load();

let cmsData={settings:{},reviews:[]};

async function loadCMS(){
  const r=await fetch("/api/admin/site-settings",{cache:"no-store"});
  if(!r.ok)return;
  cmsData=await r.json();
  const f=$("#siteSettingsForm"),s=cmsData.settings||{};
  if(f){
    for(const name of ["hero_title","hero_subtitle","hero_primary_text","hero_primary_link","hero_secondary_text","hero_secondary_link","accent_color","brand_name","brand_subtitle"]){
      if(f.elements[name] && s[name]!=null)f.elements[name].value=s[name];
    }
    for(const name of ["show_services","show_booking","show_parts","show_branches","show_reviews","show_contact","show_brand_text"]){
      if(f.elements[name])f.elements[name].checked=s[name]!=="false";
    }
    if(s.section_order){
      const order=s.section_order.split(",");
      const sorter=$("#sectionSorter");
      order.forEach(id=>{const el=sorter?.querySelector(`[data-id="${id}"]`);if(el)sorter.appendChild(el)});
    }
  }
  renderAdminReviews();
}
function renderAdminReviews(){
  const el=$("#reviewsAdminList");if(!el)return;
  if(!cmsData.reviews?.length){el.innerHTML='<p>لا توجد تقييمات بعد.</p>';return}
  el.innerHTML=cmsData.reviews.map(x=>`
    <div class="review-admin">
      <strong>${esc(x.customer_name)} — ${x.rating}★</strong>
      <p>${esc(x.review_text)}</p>
      <small>${x.visible?"ظاهر على الموقع":"مخفي"}</small>
      <div class="review-actions">
        <button data-review-toggle="${x.id}">${x.visible?"إخفاء":"إظهار"}</button>
        <button data-review-delete="${x.id}">حذف</button>
      </div>
    </div>`).join("");
  document.querySelectorAll("[data-review-toggle]").forEach(b=>b.onclick=()=>reviewAction(b.dataset.reviewToggle,"toggle"));
  document.querySelectorAll("[data-review-delete]").forEach(b=>b.onclick=()=>{if(confirm("حذف التقييم؟"))reviewAction(b.dataset.reviewDelete,"delete")});
}
async function reviewAction(id,action){
  const r=await fetch(`/api/admin/reviews/${id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action})});
  if(!r.ok){alert("تعذر تحديث التقييم");return}await loadCMS();
}
$("#siteSettingsForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget;
  const payload={};
  for(const name of ["hero_title","hero_subtitle","hero_primary_text","hero_primary_link","hero_secondary_text","hero_secondary_link","accent_color","brand_name","brand_subtitle"])payload[name]=f.elements[name].value;
  for(const name of ["show_services","show_booking","show_parts","show_branches","show_reviews","show_contact","show_brand_text"])payload[name]=String(f.elements[name].checked);
  payload.section_order=[...$("#sectionSorter").children].map(x=>x.dataset.id).join(",");
  const r=await fetch("/api/admin/site-settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const m=$("#siteMsg");m.textContent=r.ok?"تم حفظ تغييرات الموقع.":"تعذر الحفظ.";m.className="form-msg "+(r.ok?"ok":"err");
});
async function uploadMedia(form,msgEl,settingKey){
  const r=await fetch("/api/admin/media",{method:"POST",body:new FormData(form)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){msgEl.textContent=j.error||"تعذر رفع الصورة.";msgEl.className="form-msg err";return}
  const rr=await fetch("/api/admin/site-settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({[settingKey]:j.id})});
  msgEl.textContent=rr.ok?"تم رفع الصورة وتطبيقها على الموقع.":"تم الرفع لكن تعذر تطبيق الصورة.";msgEl.className="form-msg "+(rr.ok?"ok":"err");
  if(rr.ok)await loadCMS();
}
$("#logoUploadForm")?.addEventListener("submit",e=>{e.preventDefault();uploadMedia(e.currentTarget,$("#logoMsg"),"logo_media_id")});
$("#heroUploadForm")?.addEventListener("submit",e=>{e.preventDefault();uploadMedia(e.currentTarget,$("#heroMsg"),"hero_media_id")});
$("#reviewForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries());
  const r=await fetch("/api/admin/reviews",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(d)});
  const m=$("#reviewMsg");m.textContent=r.ok?"تمت إضافة التقييم.":"تعذر إضافة التقييم.";m.className="form-msg "+(r.ok?"ok":"err");
  if(r.ok){f.reset();await loadCMS()}
});
(function initSorter(){
 const s=$("#sectionSorter");if(!s)return;let dragging=null;
 s.querySelectorAll("[draggable=true]").forEach(item=>{
   item.addEventListener("dragstart",()=>{dragging=item;item.classList.add("dragging")});
   item.addEventListener("dragend",()=>{item.classList.remove("dragging");dragging=null});
 });
 s.addEventListener("dragover",e=>{
   e.preventDefault();if(!dragging)return;
   const after=[...s.querySelectorAll("[draggable=true]:not(.dragging)")].find(el=>e.clientY<=el.getBoundingClientRect().top+el.offsetHeight/2);
   if(after)s.insertBefore(dragging,after);else s.appendChild(dragging);
 });
})();
