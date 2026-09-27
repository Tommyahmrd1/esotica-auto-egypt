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


/* ===== Admin productivity upgrade: search, filters, details, CSV export ===== */
const adminFilters={q:"",status:"",date:""};

function filteredAdminRows(){
  const rows=state.data?.[state.tab]||[];
  if(state.tab==="site")return [];
  return rows.filter(x=>{
    const q=adminFilters.q.trim().toLowerCase();
    const hay=Object.values(x).map(v=>String(v??"")).join(" ").toLowerCase();
    if(q && !hay.includes(q))return false;
    if(adminFilters.status && x.status!==adminFilters.status)return false;
    if(adminFilters.date){
      const d=new Date(Number(x.created_at)||x.created_at);
      const local=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
      if(local!==adminFilters.date)return false;
    }
    return true;
  });
}

function adminDetailsButton(type,id){
  return `<button class="row-action" type="button" data-details-type="${type}" data-details-id="${id}">التفاصيل</button>`;
}

function renderTable(){
 const t=state.tab, rows=filteredAdminRows();
 if(t==="site")return;
 if(!rows.length){$("#tableWrap").innerHTML='<div class="empty">لا توجد نتائج مطابقة.</div>';return}
 let head="", body="";
 if(t==="bookings"){
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>السيارة</th><th>الفرع</th><th>الموعد</th><th>التفاصيل</th><th>الحالة</th><th></th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.car_model)} / ${esc(x.year)}</td><td>${esc(x.branch)}</td><td>${esc(x.preferred_date)}</td><td>${esc(x.details)}</td><td>${statusSelect("bookings",x.id,x.status)}</td><td>${adminDetailsButton("bookings",x.id)}</td></tr>`).join("");
 }else if(t==="parts"){
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>السيارة</th><th>VIN</th><th>القطعة</th><th>الحالة</th><th></th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.car_model)} / ${esc(x.year)}</td><td dir="ltr">${esc(x.vin)}</td><td>${esc(x.details)}<br><small>${esc(x.part_code||"")}</small></td><td>${statusSelect("parts",x.id,x.status)}</td><td>${adminDetailsButton("parts",x.id)}</td></tr>`).join("");
 }else{
  head="<th>#</th><th>العميل</th><th>الهاتف</th><th>الموضوع</th><th>الرسالة</th><th>الحالة</th><th></th>";
  body=rows.map(x=>`<tr><td>${x.id}</td><td>${esc(x.name)}<br><small>${date(x.created_at)}</small></td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.subject)}</td><td>${esc(x.message)}</td><td>${statusSelect("contacts",x.id,x.status)}</td><td>${adminDetailsButton("contacts",x.id)}</td></tr>`).join("");
 }
 $("#tableWrap").innerHTML=`<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
 document.querySelectorAll(".status").forEach(s=>s.addEventListener("change",async e=>{
   const el=e.currentTarget, r=await fetch(`/api/admin/status/${el.dataset.type}/${el.dataset.id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({status:el.value})});
   if(!r.ok){alert("تعذر تحديث الحالة");await load()}
 }));
 document.querySelectorAll("[data-details-id]").forEach(b=>b.addEventListener("click",()=>openAdminDetails(b.dataset.detailsType,Number(b.dataset.detailsId))));
}

function openAdminDetails(type,id){
  const row=(state.data?.[type]||[]).find(x=>Number(x.id)===Number(id));if(!row)return;
  const labels={id:"رقم الطلب",created_at:"تاريخ الإنشاء",name:"اسم العميل",phone:"الهاتف",car_model:"السيارة / الموديل",year:"السنة",branch:"الفرع",preferred_date:"الموعد المفضل",details:"التفاصيل",vin:"VIN",part_code:"كود القطعة",quantity:"الكمية",subject:"الموضوع",message:"الرسالة",status:"الحالة"};
  const body=$("#adminModalBody");
  body.innerHTML=Object.entries(row).filter(([k])=>labels[k]).map(([k,v])=>`<div class="detail-row"><span>${labels[k]}</span><strong ${["phone","vin"].includes(k)?'dir="ltr"':""}>${esc(k==="created_at"?date(v):v)}</strong></div>`).join("");
  $("#adminModal").classList.remove("hidden");
}

function exportFilteredCSV(){
  const rows=filteredAdminRows();if(!rows.length){alert("لا توجد بيانات للتصدير.");return}
  const keys=state.tab==="bookings"?["id","created_at","name","phone","car_model","year","branch","preferred_date","details","status"]:
    state.tab==="parts"?["id","created_at","name","phone","car_model","year","vin","part_code","quantity","details","status"]:
    ["id","created_at","name","phone","subject","message","status"];
  const labels={id:"رقم الطلب",created_at:"تاريخ الإنشاء",name:"اسم العميل",phone:"الهاتف",car_model:"السيارة",year:"السنة",branch:"الفرع",preferred_date:"الموعد",details:"التفاصيل",status:"الحالة",vin:"VIN",part_code:"كود القطعة",quantity:"الكمية",subject:"الموضوع",message:"الرسالة"};
  const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const csv=[keys.map(k=>q(labels[k]||k)).join(","),...rows.map(r=>keys.map(k=>q(k==="created_at"?date(r[k]):r[k])).join(","))].join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`esotica-${state.tab}-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

(function initAdminTools(){
  const wrap=$("#tableWrap");if(!wrap)return;
  const tools=document.createElement("div");
  tools.className="admin-tools";
  tools.innerHTML=`
    <div class="admin-search"><input id="adminSearch" placeholder="بحث بالاسم أو الهاتف أو رقم الطلب..."></div>
    <select id="adminStatusFilter"><option value="">كل الحالات</option><option value="new">جديد</option><option value="contacted">تم التواصل</option><option value="confirmed">مؤكد</option><option value="completed">مكتمل</option><option value="cancelled">ملغي</option></select>
    <input id="adminDateFilter" type="date">
    <button id="adminClearFilters" class="tool-btn" type="button">مسح الفلاتر</button>
    <button id="adminExport" class="tool-btn tool-primary" type="button">تحميل Excel/CSV</button>`;
  wrap.parentNode.insertBefore(tools,wrap);
  $("#adminSearch").addEventListener("input",e=>{adminFilters.q=e.target.value;renderTable()});
  $("#adminStatusFilter").addEventListener("change",e=>{adminFilters.status=e.target.value;renderTable()});
  $("#adminDateFilter").addEventListener("change",e=>{adminFilters.date=e.target.value;renderTable()});
  $("#adminClearFilters").addEventListener("click",()=>{adminFilters.q=adminFilters.status=adminFilters.date="";$("#adminSearch").value="";$("#adminStatusFilter").value="";$("#adminDateFilter").value="";renderTable()});
  $("#adminExport").addEventListener("click",exportFilteredCSV);

  const modal=document.createElement("div");modal.id="adminModal";modal.className="admin-modal hidden";
  modal.innerHTML='<div class="admin-modal-card"><div class="admin-modal-head"><h2>تفاصيل الطلب</h2><button id="adminModalClose" type="button">×</button></div><div id="adminModalBody"></div></div>';
  document.body.appendChild(modal);
  $("#adminModalClose").onclick=()=>modal.classList.add("hidden");
  modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
})();
