import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const sb=createClient(
  "https://bgdfrfiihghajcfnpgrk.supabase.co",
  "sb_publishable__yopNc5eoc5PxKX-s2TlNw_EbnArTEV"
);

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const authScreen=$("#authScreen"),crmShell=$("#crmShell"),authStatus=$("#authStatus"),email=$("#email");
const fmtDate=v=>v?new Intl.DateTimeFormat("ar-EG",{dateStyle:"short",timeStyle:"short",timeZone:"Africa/Cairo"}).format(new Date(v)):"—";
const fmtDuration=s=>{s=Number(s)||0;const m=Math.floor(s/60),r=s%60;return m?m+"د "+r+"ث":r+"ث"};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const roleLabel=r=>({admin:"Admin",manager:"Manager",customer_service:"Customer Service",department_user:"Department User",viewer:"Viewer"})[r]||r||"—";

function status(msg,type=""){authStatus.textContent=msg;authStatus.className="form-status "+type}
function showAuth(){crmShell.classList.add("hidden");authScreen.classList.remove("hidden")}
async function getEmployee(user){
  const {data,error}=await sb.from("employees").select("id,full_name,system_role,is_active").eq("auth_user_id",user.id).maybeSingle();
  if(error)throw error;
  return data;
}
async function enterApp(session){
  if(!session?.user)return showAuth();
  try{await sb.rpc("bootstrap_crm_admin")}catch{}
  const employee=await getEmployee(session.user);
  if(!employee?.is_active){
    await sb.auth.signOut();
    status("الحساب غير مربوط بموظف مفعل داخل CRM.","error");
    return showAuth();
  }
  $("#employeeName").textContent=employee.full_name;
  $("#employeeRole").textContent=roleLabel(employee.system_role);
  $("#welcomeName").textContent=(employee.full_name||"").split(" ")[0]||"";
  authScreen.classList.add("hidden");crmShell.classList.remove("hidden");
  await loadDashboard();
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const addr=email.value.trim();
  if(!addr)return;
  status("جاري إرسال رابط الدخول...");
  const {error}=await sb.auth.signInWithOtp({
    email:addr,
    options:{emailRedirectTo:location.origin+"/"}
  });
  if(error)return status(error.message,"error");
  status("تم إرسال رابط الدخول على البريد. افتحه من نفس المتصفح.","ok");
});
$("#logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut();showAuth();status("")});

async function count(table,apply){
  let q=sb.from(table).select("*",{count:"exact",head:true});
  if(apply)q=apply(q);
  const {count,error}=await q;if(error)throw error;return count||0;
}
async function loadDashboard(){
  $("#recentCalls").className="calls-list loading-box";$("#recentCalls").textContent="جاري التحميل...";
  try{
    const now=new Date().toISOString();
    const [all,missed,rejected,open,overdue,due,recent]=await Promise.all([
      count("call_details"),
      count("call_details",q=>q.eq("call_status","missed")),
      count("call_details",q=>q.eq("call_status","rejected")),
      count("tickets",q=>q.not("status","in","(closed,cancelled)")),
      count("department_tasks",q=>q.lt("sla_due_at",now).not("status","in","(done,cancelled)")),
      count("followups",q=>q.lte("due_at",now).eq("status","pending")),
      sb.from("call_details").select("phone_normalized,call_status,started_at,duration_seconds,device_identifier").order("started_at",{ascending:false}).limit(7)
    ]);
    $("#totalCalls").textContent=all;$("#missedCalls").textContent=missed;$("#rejectedCalls").textContent=rejected;
    $("#openTickets").textContent=open;$("#overdueTasks").textContent=overdue;$("#dueFollowups").textContent=due;
    if(recent.error)throw recent.error;
    renderRecent(recent.data||[]);
  }catch(e){
    console.error(e);$("#recentCalls").className="calls-list loading-box";$("#recentCalls").textContent="تعذر تحميل البيانات.";
  }
}
function renderRecent(rows){
  const box=$("#recentCalls");box.className="calls-list";
  if(!rows.length){box.innerHTML='<div class="loading-box" style="min-height:260px">لا توجد مكالمات.</div>';return}
  box.innerHTML=rows.map(x=>'<div class="call-row"><div class="call-phone">'+esc(x.phone_normalized)+'</div><div class="call-status '+esc(x.call_status)+'">'+esc(x.call_status)+'</div><div class="call-date">'+fmtDate(x.started_at)+'</div><div class="call-duration">'+fmtDuration(x.duration_seconds)+'</div></div>').join("");
}
async function loadCalls(){
  const tbody=$("#callsTableBody");tbody.innerHTML='<tr><td colspan="5">جاري التحميل...</td></tr>';
  const {data,error}=await sb.from("call_details").select("phone_normalized,call_status,started_at,duration_seconds,device_identifier").order("started_at",{ascending:false}).limit(100);
  if(error){tbody.innerHTML='<tr><td colspan="5">تعذر تحميل المكالمات.</td></tr>';return}
  tbody.innerHTML=(data||[]).map(x=>'<tr><td>'+esc(x.phone_normalized)+'</td><td><span class="badge '+esc(x.call_status)+'">'+esc(x.call_status)+'</span></td><td>'+fmtDate(x.started_at)+'</td><td>'+fmtDuration(x.duration_seconds)+'</td><td>'+esc(x.device_identifier||"—")+'</td></tr>').join("")||'<tr><td colspan="5">لا توجد بيانات.</td></tr>';
}
function openView(name){
  $$(".view").forEach(v=>v.classList.add("hidden"));
  $("#"+name+"View").classList.remove("hidden");
  $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("#pageTitle").textContent=name==="calls"?"المكالمات":"لوحة التحكم";
  if(name==="calls")loadCalls();
  $("#sidebar").classList.remove("open");
}
$$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.go)));
$("#refreshBtn").addEventListener("click",loadDashboard);
$("#refreshCallsBtn").addEventListener("click",loadCalls);
$("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));

const {data:{session}}=await sb.auth.getSession();
if(session)await enterApp(session);else showAuth();
