/**
 * src/admin.js — Toàn bộ nghiệp vụ quản trị VPNTrinhHg3 Admin Panel
 * Tách từ admin.html theo kiến trúc Giai đoạn 3
 */

import { WORKER_URL, getSiteKey, getAdminToken, setAdminToken, clearAdminToken, api, aj } from './api.js';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import currency from 'currency.js';
import Sortable from 'sortablejs';
import Swal from 'sweetalert2';
import { Grid, html } from 'gridjs';
import 'gridjs/dist/theme/mermaid.css';
import Chart from 'chart.js/auto';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

if (typeof window !== 'undefined') {
  window.Quill = Quill;
  window.DOMPurify = DOMPurify;
  window.dayjs = dayjs;
  window.currency = currency;
  window.Sortable = Sortable;
  window.Swal = Swal;
  window.gridjs = { Grid, html };
  window.Chart = Chart;
}

import {
  $, arr, esc, q, cm, genId, genHex, normId, isLife, normSt, trimNum,
  VND_SEP, fmtVnd, toast, cp, sleep, autoGrow, parseAny, fmtBank, oTs
} from './shared.js';


// ===================== CẤU HÌNH =====================
const SITE_KEY = getSiteKey();
const API = WORKER_URL;
const PDS={1:"https://vpntrinhhg.pages.dev",2:"https://vpntrinhhg2.pages.dev",3:"https://vpntrinhhg3.pages.dev"};
let PD=/pages\.dev$/.test(location.hostname)?location.origin:PDS[3];
const GH_REPO="trinhhg/vpntrinhhg3";
const PKG_LIST=[["t1","Gói 1 tháng - 60,000VND / $2.5 / ¥15.5 (100GB)",30],["t2","Gói 1 tháng - 70,000VND / $3 / ¥18 (500GB)",30],["c1","Gói 1 tháng - 80,000VND / $3.5 / ¥20.5 (1000GB)",30],["c2","Gói Cao Cấp - 200,000VND / $8 / ¥50 (3000GB)",30],["c3","Gói 1 Năm - 799,000VND / $30 / ¥199 (300GB/tháng)",365],["d1","Không Giới Hạn - 200,000VND / $8 / ¥52 (200GB)",0],["d2","Không Giới Hạn - 399,000VND / $16 / ¥102 (1000GB)",0],["d3","Không Giới Hạn - 999,000VND / $40 / ¥256 (5000GB)",0],["o1","[Giá cũ] Gói 1 tháng - 50,000VND / ¥12.5 (100GB)",30],["o2","[Giá cũ] Gói 1 tháng - 60,000VND / ¥15 (500GB)",30],["o3","[Giá cũ] Gói 1 tháng - 70,000VND / ¥17.5 (1000GB)",30]];
const TABS=[["t-ord","fa-box","Đơn hàng"],["t-check","fa-clipboard-check","Kiểm tra"],["t-trans","fa-file-invoice-dollar","Giao dịch"],["t-lnk","fa-link","Link Sub"],["t-dead","fa-ban","Đã xóa"],["t-pkg","fa-boxes-stacked","Gói cước"],["t-mail","fa-envelope","Soạn mail"],["t-cms","fa-book","H.Dẫn"],["t-settings","fa-cog","Cài đặt"]];
// PKG_DB: giá hiện tại + giá cũ (o1/o2/o3) để nhận diện dữ liệu lịch sử — TUYỆT ĐỐI không quy đổi totalVnd của đơn cũ sang giá mới.
const PKG_DB={t1:{n:"Gói 1 tháng",d:"100GB",vnd:60000,cny:15.5,m:1},t2:{n:"Gói 1 tháng",d:"500GB",vnd:70000,cny:18,m:1},c1:{n:"Gói 1 tháng",d:"1000GB",vnd:80000,cny:20.5,m:1},c2:{n:"Gói Cao Cấp",d:"3000GB",vnd:200000,cny:50,m:1},c3:{n:"Gói 1 Năm",d:"300GB/tháng",vnd:799000,cny:199,m:12},d1:{n:"Không Giới Hạn",d:"200GB",vnd:200000,cny:52,m:0},d2:{n:"Không Giới Hạn",d:"1000GB",vnd:399000,cny:102,m:0},d3:{n:"Không Giới Hạn",d:"5000GB",vnd:999000,cny:256,m:0},o1:{n:"Gói 1 tháng",d:"100GB",vnd:50000,cny:12.5,m:1,old:true},o2:{n:"Gói 1 tháng",d:"500GB",vnd:60000,cny:15,m:1,old:true},o3:{n:"Gói 1 tháng",d:"1000GB",vnd:70000,cny:17.5,m:1,old:true}};

// ===================== TIỆN ÍCH =====================
// $ from shared.js
// arr from shared.js
// esc from shared.js
// q from shared.js   // dùng trong onclick="fn(${q(x)})"
// cm from shared.js
// genId from shared.js
// genHex from shared.js
// normId from shared.js
// isLife from shared.js
// normSt from shared.js
const getT=m=>{try{const u=new URL(m);return u.searchParams.get("top")||u.searchParams.get("liki")||u.searchParams.get("lidj")||u.searchParams.get("kidj")||u.searchParams.get("OwO")||u.searchParams.get("token")||u.searchParams.get("oos")||"";}catch{return "";}};
// trimNum from shared.js
// VND_SEP from shared.js
// fmtVnd from shared.js
// Toast & toast from shared.js
// cp from shared.js
// sleep from shared.js
// autoGrow from shared.js

// ---- thời gian: thuần Day.js chuẩn xác 100% DD/MM/YYYY HH:mm
// dayjs already extended
const off = () => (cmsDb.settings && cmsDb.settings.tz) === "CN" ? 8 : 7;
const TZN = () => off() === 8 ? "Asia/Shanghai" : "Asia/Ho_Chi_Minh";
const nowMs = () => Date.now() + ((cmsDb.settings && cmsDb.settings.simMode) ? Number(cmsDb.settings.simOffset) || 0 : 0);

// parseAny from shared.js
// fmtBank from shared.js
// oTs from shared.js
const dmyOf = ts => dayjs(ts).tz(TZN()).format("DD/MM/YYYY");
const parseDmy = s => {
  const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? dayjs.tz(`${m[3]}-${m[2]}-${m[1]} 00:00:00`, TZN()).valueOf() : 0;
};
const expEnd = e => {
  const m = String(e || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? dayjs.tz(`${m[3]}-${m[2]}-${m[1]} 23:59:59`, TZN()).valueOf() : 0;
};
const monthInfo = ts => {
  if (!ts) return { key: "000000", label: "Không rõ tháng" };
  const d = dayjs(ts).tz(TZN());
  return { key: d.format("YYYYMM"), label: `Tháng ${d.format("M")} năm ${d.format("YYYY")}` };
};
const fmtFull = (ms, tz) => dayjs(ms).tz(tz).format("HH:mm:ss DD/MM/YYYY");
function tickClocks() { const a = $("clkVN"); if (!a) return; a.textContent = fmtFull(Date.now(), "Asia/Ho_Chi_Minh"); $("clkCN").textContent = fmtFull(Date.now(), "Asia/Shanghai"); $("clkWeb").textContent = fmtFull(nowMs(), TZN()); }
function paintTimeUI(){
 const s=cmsDb.settings,tz=s.tz||"VN",sim=!!s.simMode;
 ["VN","CN"].forEach(k=>{const el=$("tzCard"+k);if(!el)return;const on=tz===k;el.classList.toggle("border-indigo-500",on);el.classList.toggle("bg-indigo-50",on);el.classList.toggle("border-slate-200",!on);});
 const b=$("simBadge");if(b){b.className="text-[11px] font-black px-2 py-1 rounded "+(sim?"bg-purple-100 text-purple-700":"bg-emerald-100 text-emerald-700");b.textContent=sim?"ĐANG CHẠY GIỜ TÙY CHỈNH":"ĐANG CHẠY GIỜ THỰC";}
 const i=$("simInput");if(i&&!i.value)i.value=new Date(nowMs()+off()*36e5).toISOString().slice(0,16);tickClocks();}
async function pickTz(k){cmsDb.settings.tz=k;paintTimeUI();try{await saveCmsDb();renderOrd();renderLinks();toast("Đã chọn múi giờ "+(k==="CN"?"Trung Quốc (UTC+8)":"Việt Nam (UTC+7)"));}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
async function applySim(){
 const m=String($("simInput").value||"").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);if(!m)return toast("Chọn ngày giờ trước!","err");
 const target=Date.UTC(+m[1],m[2]-1,+m[3],+m[4],+m[5])-off()*36e5,s=cmsDb.settings;s.simMode=true;s.simOffset=target-Date.now();
 try{await saveCmsDb();paintTimeUI();renderOrd();renderLinks();toast("Web đang chạy theo giờ tùy chỉnh");logEvent("warn","Giờ hệ thống","Bật giờ tùy chỉnh: "+fmtBank(target));}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
async function clearSim(){const s=cmsDb.settings;s.simMode=false;s.simOffset=0;try{await saveCmsDb();$("simInput").value="";paintTimeUI();renderOrd();renderLinks();toast("Đã về giờ thực");logEvent("ok","Giờ hệ thống","Tắt giờ tùy chỉnh");}catch(e){toast("Lỗi lưu: "+e.message,"err");}}

// ===================== GÓI / GIÁ =====================
const OLD_BY_DATA={"100GB":"o1","500GB":"o2","1000GB":"o3"};
function pkgOf(o){
 if(!o) return null;
 if(o.pkgId){
   if(PKG_DB[o.pkgId]) return PKG_DB[o.pkgId];
   if(Array.isArray(adminPkgsList)){
     const dp = adminPkgsList.find(x => x.id === o.pkgId);
     if(dp) return { n: dp.name || dp.n, d: dp.data || dp.d, vnd: Number(dp.vnd)||0, cny: Number(dp.cny)||0, m: dp.time === "lifetime" ? 0 : Number(dp.time)||1 };
   }
 }
 const total=Number(o.totalVnd)||0,data=String(o.pkgData||"").toUpperCase();
 if(total>0&&OLD_BY_DATA[data]){const op=PKG_DB[OLD_BY_DATA[data]];const np=Object.values(PKG_DB).find(p=>!p.old&&p.d===data);
  if(op&&total%op.vnd===0&&total/op.vnd<=36)return op;
  if(np&&total%np.vnd===0&&total/np.vnd<=36)return np;}
 const found = Object.values(PKG_DB).find(p=>!p.old&&p.n===o.pkgName&&p.d===o.pkgData)||Object.values(PKG_DB).find(p=>p.n===o.pkgName&&p.d===o.pkgData);
 if(found) return found;
 if(Array.isArray(adminPkgsList)){
   const dp = adminPkgsList.find(p => (p.name === o.pkgName || p.id === o.pkgId) && (!o.pkgData || p.data === o.pkgData));
   if(dp) return { n: dp.name || dp.n, d: dp.data || dp.d, vnd: Number(dp.vnd)||0, cny: Number(dp.cny)||0, m: dp.time === "lifetime" ? 0 : Number(dp.time)||1 };
 }
 return null;
}
const pkgLabel=o=>{const p=pkgOf(o);return p?`${p.n} - ${fmtVnd(p.vnd)}VND${p.old?" (giá cũ)":""}`:(o.pkgName||"—");};
// Số tháng: days/30; doanh thu chỉ tính phần nguyên (6.5 tháng => 6). Không làm tròn lên.
const fmtMonths=d=>{d=Number(d)||0;return d>0?String(Math.floor(d/30)):"";};
function ordMonths(o){const p=pkgOf(o);if(p&&p.m===0)return 0;const d=Number(o.days);if(d>0)return Math.floor(d/30);return (p?p.m:1)*(Number(o.qty)||1);}
function webLabel(v,wu){const t=String(v||"")+" "+String(wu||"");if(/vpntrinhhg3|lucastanora/i.test(t))return "Web 3";if(/vpntrinhhg2|onepiece/i.test(t))return "Web 2";if(/vpntrinhhg\.|doicucden/i.test(t))return "Web 1";return v?String(v).replace(/^https?:\/\//,"").replace(/\/$/,""):"—";}
let myWebIndex = /vpntrinhhg2|onepiece/i.test(location.hostname) ? 2 : /vpntrinhhg\.|doicucden/i.test(location.hostname) ? 1 : 3;
function getMe(){
  const n = myWebIndex || 3;
  return { n, field: "info" + n, PD: PDS[n] || PDS[3] };
}
function linkBottom(l){
 if (!l) return '<span class="text-purple-600 font-bold">Vĩnh viễn</span>';
 let exp = "";
 if (l.orderId) {
   const od = ordersDb.find(o => normId(o.id) === normId(l.orderId));
   if (od && od.expDate) exp = od.expDate;
 }
 if (!exp && l.masked) {
   const od = ordersDb.find(o => o.info1 === l.masked || o.info2 === l.masked || o.info3 === l.masked);
   if (od && od.expDate) exp = od.expDate;
 }
 if (!exp) exp = l.expDate || l.date || "";

 if (!exp || isLife(exp)) {
   return '<span class="text-purple-600 font-bold">Vĩnh viễn</span>';
 }

 // Chuẩn hóa xóa bỏ giờ HH:mm, chỉ lấy ngày DD/MM/YYYY
 const cleanDmy = String(exp).trim().split(/\s+/)[0];
 try {
   if (typeof dayjs !== "undefined") {
     const ms = parseAny(cleanDmy);
     if (ms > 0) {
       const target = dayjs(ms).tz(TZN()).startOf('day');
       const now = dayjs(nowMs()).tz(TZN()).startOf('day');
       const daysLeft = target.diff(now, 'day');
       if (daysLeft >= 0 && daysLeft <= 3) {
         return `<span class="text-orange-500 font-bold">${esc(cleanDmy)}</span>`;
       }
       if (daysLeft < 0) {
         return `<span class="text-red-600 font-bold">${esc(cleanDmy)}</span>`;
       }
     }
   }
 } catch(e) {}

 return `<span class="text-slate-500 font-medium">${esc(cleanDmy)}</span>`;
}
const payOf=o=>/alipay/i.test(o.method||"")?"Alipay":/weixin|wechat/i.test(o.method||"")?"Weixin":"Bank";

// ===================== API + ĐĂNG NHẬP =====================
let TOKEN=localStorage.getItem(SITE_KEY+"_tok")||"";
let myDev=localStorage.getItem(SITE_KEY+"_dev")||"";
if(!myDev){myDev="DEV-"+genHex(9).toUpperCase();localStorage.setItem(SITE_KEY+"_dev",myDev);}
// api from ./api.js
// aj from api.js
const logEvent=(lvl,act,msg,ref)=>api("/api/admin/log",{method:"POST",body:{lvl,act,msg,ref}}).catch(()=>{});
function toLogin(msg){TOKEN="";localStorage.removeItem(SITE_KEY+"_tok");document.documentElement.classList.remove("has-tok");$("main").classList.add("hidden");$("hdr").classList.add("hidden");$("hdr").style.display="none";$("loginWrap").classList.remove("hidden");if(msg)toast(msg,"warn");}
async function doLogin(){
 const btn=$("loginBtn");btn.disabled=true;
 try{const r=await api("/api/admin/login",{method:"POST",body:{password:$("pwInput").value,dev:{id:myDev,ua:navigator.userAgent.slice(0,70)}},noRedirect:true});const j=await r.json().catch(()=>({}));
  if(r.ok&&j.token){TOKEN=j.token;localStorage.setItem(SITE_KEY+"_tok",TOKEN);$("pwInput").value="";startApp(true);}else toast(j.error||"Đăng nhập thất bại","err");
 }catch(e){toast("Không kết nối được Worker: "+e.message,"err");}
 btn.disabled=false;}
function doLogout(){localStorage.removeItem(SITE_KEY+"_tok");location.reload();}
function resetAndHardReload(){
  try {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    if ('caches' in window) {
      caches.keys().then(names => { names.forEach(name => caches.delete(name)); });
    }
  } catch(e) {}
  window.location.reload(true);
}

// ===================== DỮ LIỆU =====================
let ordersDb=[],linksDb=[],linkPoolDb=[],dataReqDb=[],deadDb=[],devicesDb=[],cmsDb={settings:{},link_origins:{}},guides={},txData=[],txSince="",txPollT=null,txFails=0;
let curOrdTab="success",curTxTab="giamsat",logsData={worker:[],d1:[]},lastSig={},modalInit={},modalNew=false,modalOldId="",upgInit="";
const isMailMaster=()=>cmsDb.settings.emailRole==="master";
const expLocked=()=>!!(cmsDb.settings&&cmsDb.settings.lockExpiry);
const lockFulfillOn=()=>!!(cmsDb.settings&&cmsDb.settings.lockFulfill);
const mailOnSaveOn=()=>localStorage.getItem(SITE_KEY+"_mailOnSave")!=="0";
const manualEditOn=()=>localStorage.getItem(SITE_KEY+"_manualEdit")==="1";
function setManualEdit(v){
  localStorage.setItem(SITE_KEY+"_manualEdit", v ? "1" : "0");
  toast(v ? "Đã BẬT Sửa tay — cho phép sửa 3 ô định tuyến, lưu xong không bị ghi đè" : "Đã TẮT Sửa tay — 3 ô link định tuyến ở chế độ chỉ đọc");
}

// Link đã xóa KHÔNG được quay lại: mọi link có id nằm trong "Đã xóa" (server) hoặc trong tombstone cục bộ đều bị loại khỏi danh sách active
// trước khi hiển thị / trước khi ghi ngược lên ALL_LINKS (tự chữa nếu Worker/Cron/nguồn cũ ghi đè lại).
const tombGet=()=>{try{return JSON.parse(localStorage.getItem(SITE_KEY+"_delLinks")||"[]");}catch{return[];}};
const tombSet=a=>{try{localStorage.setItem(SITE_KEY+"_delLinks",JSON.stringify(a.slice(-600)));}catch{}};
const addTomb=l=>{const a=tombGet();if(!a.some(t=>t.id===l.id))a.push({id:l.id,ts:Date.now()});tombSet(a);};
const rmTomb=id=>tombSet(tombGet().filter(t=>t.id!==id));
const isDeleted=l=>!!l&&(deadDb.some(d=>d.id===l.id)||tombGet().some(t=>t.id===l.id));
function healLinks(){const n=linksDb.length;linksDb=linksDb.filter(l=>!isDeleted(l));return n-linksDb.length;}

function applyPoll(j){if(!j)return;ordersDb=arr(j.orders);linksDb=arr(j.links);healLinks();linkPoolDb=arr(j.pool);dataReqDb=arr(j.data_requests);}
async function fetchAll(msg){
 try{
  const [poll,cms,dead,devs,g]=await Promise.all([aj("/api/admin/poll"),aj("/api/cms"),aj("/api/deadlinks"),aj("/api/devices"),aj("/api/guides")]);
  deadDb=arr(dead);applyPoll(poll);cmsDb=cms&&typeof cms==="object"&&!Array.isArray(cms)?cms:{};cmsDb.settings=cmsDb.settings||{};cmsDb.link_origins=cmsDb.link_origins||{};
  devicesDb=arr(devs);guides=g&&typeof g==="object"?g:{};
  const healed=arr(poll&&poll.links).length-linksDb.length;
  let pc=false;linksDb.forEach(l=>{if(l.orig&&l.orig!=="Da_bi_khoa"&&!linkPoolDb.find(p=>p.url===l.orig)&&!isLockedPoolUrl(l.orig)){linkPoolDb.push({id:"POOL-"+Date.now()+Math.floor(Math.random()*100),url:l.orig,gb:"",remainGb:"",exp:l.expDate||"",max:30});pc=true;}});
  if(pc)await aj("/api/link_pool",{method:"POST",body:linkPoolDb});
  if(healed>0){try{await aj("/api/links",{method:"POST",body:linksDb});logEvent("warn","Link Sub",`Tự chữa: loại ${healed} link đã xóa bị quay lại danh sách`);}catch(e){}}
  lastSig={o:JSON.stringify(ordersDb),l:JSON.stringify(linksDb),p:JSON.stringify(linkPoolDb),d:JSON.stringify(dataReqDb)};
  renderOrd();renderCheckTab();renderDataRequests();renderLinks();renderDead();renderDev();loadSettingsUI();if(!curArtsReady)initGuides();
  loadStatus();if(msg)toast("Đã làm mới dữ liệu!");
 }catch(e){if(e.message!=="401")toast("Lỗi tải dữ liệu: "+e.message,"err");}}
const isLockedPoolUrl=u=>u==="Da_bi_khoa";
async function pollMain(){
 if(document.hidden||!TOKEN||!$("mOrd").classList.contains("hidden"))return;
 try{const j=await aj("/api/admin/poll");
  const s={o:JSON.stringify(arr(j.orders)),l:JSON.stringify(arr(j.links)),p:JSON.stringify(arr(j.pool)),d:JSON.stringify(arr(j.data_requests))};const oldPending=dataReqDb.filter(r=>r.status==="pending").length;
  applyPoll(j);if(s.o!==lastSig.o){renderOrd();renderCheckTab();if(!$("t-trans").classList.contains("hidden")&&curTxTab==="rev")renderRevenue();}if(s.l!==lastSig.l||s.p!==lastSig.p)renderLinks();
  if(s.d!==lastSig.d){renderDataRequests();if(dataReqDb.filter(r=>r.status==="pending").length>oldPending)toast("Có yêu cầu dung lượng mới!","warn");}
  lastSig=s;}catch(e){}}

// ===================== TAB NAVIGATION =====================
function switchPkgSubTab(tab){
  $("pane-pkg-cards").classList.toggle("hidden", tab !== "cards");
  $("pane-pkg-fulfill").classList.toggle("hidden", tab !== "fulfill");
  $("btn-pkg-cards").classList.toggle("active", tab === "cards");
  $("btn-pkg-fulfill").classList.toggle("active", tab === "fulfill");
}

function buildTabs(){
  $("tabBar").innerHTML=TABS.map(([id,ic,lb])=>`
    <button onclick="go('${id}')" id="btn-${id}" class="col-span-1 tab-btn flex flex-col md:flex-row items-center px-1 py-2 md:px-4 md:py-1.5 rounded-xl font-bold text-[10px] sm:text-xs md:text-sm bg-white text-slate-600 border border-slate-200 shadow-sm justify-center gap-1 relative">
      <i class="fas ${ic} md:mr-1"></i>
      <span>${lb}</span>
      ${id==='t-trans'?'<span id="transBadge" class="hidden absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-black">!</span>':''}
      ${id==='t-check'?'<span id="checkBadge" class="hidden absolute top-0.5 right-0.5 bg-purple-600 text-white text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-black">0</span>':''}
    </button>
  `).join("");
}

function go(id, fromHistory){
 if(!TABS.some(t=>t[0]===id))id="t-ord";
 TABS.forEach(([t])=>{
   $(t).classList.add("hidden");
   const b=$("btn-"+t);
   if(b){b.classList.remove("active");b.classList.add("bg-white","text-slate-600");}
 });
 $(id).classList.remove("hidden");
 const a=$("btn-"+id);
 if(a){a.classList.add("active");a.classList.remove("bg-white","text-slate-600");}
 localStorage.setItem(SITE_KEY+"_lastTab",id);

 if (!fromHistory) {
   const hName = '#' + id.replace('t-', '');
   if (location.hash !== hName) {
     history.pushState({ tab: id }, '', hName);
   }
 }

 try{
  if(id==="t-pkg"){loadAdminPkgs();loadFulfillmentConfig();}
  if(id==="t-check")renderCheckTab();
  if(id==="t-dead")renderDead();
  if(id==="t-lnk")renderLinks();
  if(id==="t-settings"){loadSettingsUI();loadStatus();loadQuota();}
  if(id==="t-trans"){localStorage.setItem(SITE_KEY+"_txSeen",Date.now());$("transBadge").classList.add("hidden");if(curTxTab==="rev")renderRevenue();else renderTransactions();}
  if(id==="t-mail")renderMailComposer();
  if(id==="t-cms"&&curArtsReady)renderGuideAll();
 }catch(e){console.error("go("+id+") lỗi:",e);toast("Lỗi mở tab: "+e.message,"err");}
 restoreAdminScroll(id);
}

window.addEventListener('popstate', (e) => {
  const hash = location.hash.replace('#', '');
  const tabId = hash ? 't-' + hash : 't-ord';
  if (TABS.some(t => t[0] === tabId)) {
    go(tabId, true);
  }
});

// ===================== ĐƠN HÀNG =====================
function switchOrdTab(t){curOrdTab=t;["success","pending","failed"].forEach(x=>$("otab-"+x).classList.toggle("active",x===t));renderOrd();}
const ordAmountTxt=o=>{const pay=payOf(o),p=pkgOf(o);if(pay==="Bank")return Number(o.totalVnd)>0?fmtVnd(o.totalVnd)+"vnd":"—";const c=Number(o.totalCny)>0?Number(o.totalCny):0;if(c)return "¥"+trimNum(c);return p&&p.cny?"¥"+trimNum(p.cny*(Number(o.qty)||1))+" (theo gói)":"—";};
function ordCard(o,ro){
 const now=nowMs(),st=normSt(o.status);let daysLeft=null,expiring=false,expired=false;
 if(st==="success"&&o.expDate&&!isLife(o.expDate)){
  const lockTs=parseDmy(o.expDate); // 00:00:00 ngày hết hạn theo chuẩn Worker
  if(lockTs){
   if(now>=lockTs){
    // Chạm 00:00:00 ngày hết hạn -> Khóa link & đổi sang ĐÃ HẾT HẠN (xám ngoét)
    expired=true;
    daysLeft=-1;
   }else{
    // Đang trong hạn: đếm lùi số ngày nguyên còn lại (mua hôm nay 27/10 gói 30 ngày -> còn 29n)
    expired=false;
    daysLeft=Math.floor((lockTs-now)/864e5);
    expiring=daysLeft<=3;
   }
  }
 }
 const dot=expired?'<div class="dot-gray"></div>':st==="success"?'<div class="dot-green"></div>':st==="pending"?'<div class="dot-yellow"></div>':'<div class="dot-red"></div>';
 const card=expired?'card-expired-done border border-slate-300':expiring?'card-expiring':'bg-white border border-slate-200';
 let bu="";if(o.pendingUpgrade)bu=`<span class="bg-yellow-100 text-yellow-800 border border-yellow-200 text-[9px] font-black px-1.5 py-0.5 rounded ml-1 uppercase">Xác minh Nâng gói</span>`;else if(o.upgradeStatus==="failed")bu=`<span class="bg-red-100 text-red-800 border border-red-200 text-[9px] font-black px-1.5 py-0.5 rounded ml-1 uppercase">Từ chối Nâng gói</span>`;else if(o.isUpgrade)bu=`<span class="bg-green-100 text-green-800 border border-green-200 text-[9px] font-black px-1.5 py-0.5 rounded ml-1 uppercase">Nâng gói Thành công</span>`;
 const kind=o.orderType==="renew"?`<span class="bg-sky-100 text-sky-700 text-[9px] font-black px-1.5 py-0.5 rounded ml-1 uppercase">Gia hạn</span>`:"";
 const nick=o.nickname?`<span class="text-[10px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded ml-1"><i class="fas fa-user-tag mr-0.5"></i>${esc(o.nickname)}</span>`:"";
 const lk=o.lockInfo?Object.keys(o.lockInfo).filter(k=>o.lockInfo[k]):[];const lkb=lk.length?`<span title="Ô đã khóa (sửa tay): ${esc(lk.join(", "))}" class="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded ml-1"><i class="fas fa-lock mr-0.5"></i>${lk.map(k=>k.replace("info","")).join("/")}</span>`:"";

 // Hàng 3: Zalo chiếm cố định ~140px (đủ 15 số điện thoại), HSD nhận trọn 65% đất còn lại không bị cắt ngày
 const zaloPart = `Zalo: <span class="font-bold text-slate-700 cp" onclick="cp(${q(o.zalo)})">${esc(o.zalo||"")}</span>`;
 const hsdPart = `| HSD: <span class="font-bold text-slate-700">${esc(o.expDate||"—")}</span>${daysLeft!==null&&daysLeft>=0?` <span class="font-black ${daysLeft<=1?"text-red-600":"text-orange-500"}">(còn ${daysLeft}n)</span>`:""}`;

 // Hàng 4: 3 Badge riêng biệt (Method tag màu giống tab doanh thu + Thực nhận + Số tháng)
 const pay = payOf(o);
 const methodBadge = pay === "Alipay" ? '<span class="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-[10px] font-black">Alipay</span>'
                   : pay === "Weixin" ? '<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">Weixin</span>'
                   : '<span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">Bank VN</span>';
 const amtBadge = `<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">Thực nhận: ${esc(ordAmountTxt(o))}</span>`;
 const mBadge = `<span class="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">${pkgOf(o)&&pkgOf(o).m===0?"Vĩnh viễn":ordMonths(o)+" tháng"}</span>`;

 const acts=ro?"":`<div class="flex gap-1.5">${st==="success"&&o.expDate&&!expired&&!isLife(o.expDate)?`<button onclick="sendExpMail(${q(o.id)})" title="Nhắc hết hạn" class="text-amber-500 font-bold px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-xs hover:bg-amber-500 hover:text-white"><i class="fas fa-clock"></i></button>`:""}<button onclick="sendZaloMail(${q(o.id)})" title="Nhắc hỗ trợ cài đặt (Zalo)" class="text-blue-500 font-bold px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-xs hover:bg-blue-500 hover:text-white"><i class="fas fa-comment-dots"></i></button><button onclick="openOrdModal(${q(o.id)})" title="Sửa" class="text-indigo-600 font-bold px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-xs hover:bg-indigo-600 hover:text-white"><i class="fas fa-pen md:mr-1"></i><span class="hidden md:inline">Sửa</span></button><button onclick="delOrd(${q(o.id)})" title="Xóa" class="text-red-500 font-bold px-2.5 py-1.5 bg-red-50 border border-red-100 rounded-lg text-xs hover:bg-red-500 hover:text-white"><i class="fas fa-trash"></i></button></div>`;

 return `<div class="${card} rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-stretch justify-between gap-2 md:gap-3 w-full min-w-0"><div class="flex-1 min-w-0">
  <div class="flex items-center gap-2 mb-1 flex-wrap">${dot}<span class="font-bold text-[10px] text-slate-400">#${ordersDb.indexOf(o)+1}</span><span class="font-mono font-extrabold text-indigo-600 text-xs md:text-base cp order-id-text" onclick="cp(${q(o.id)})">${esc(o.id)}</span>${nick}${kind}${st==="pending"?`<span class="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">Chưa xác nhận CK</span>`:""}${bu}${lkb}${expired?`<span class="text-[10px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1">ĐÃ HẾT HẠN</span>`:""}</div>
  <div class="font-bold text-slate-800 text-xs md:text-sm cp truncate pl-5 order-email-text" onclick="cp(${q(o.email)})">${esc(o.email||"—")}</div>
  <div class="text-[11px] md:text-sm text-slate-500 mt-1 pl-5 order-meta-text flex items-center gap-2 w-full"><div class="shrink-0 whitespace-nowrap">${zaloPart}</div><div class="flex-1 min-w-0 truncate">${hsdPart}</div></div>
  <div class="pl-5 mt-2 flex flex-wrap items-center gap-1.5">${methodBadge}${amtBadge}${mBadge}</div></div>
  <div class="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0 border-t border-slate-100 md:border-0 pt-2 md:pt-0"><span class="text-[10px] md:text-xs text-slate-400 font-semibold whitespace-nowrap">${esc(o.date || fmtBank(o.createdTs || 0))}</span>${acts}</div></div>`;}
function renderOrd(){
 const counts={success:0,pending:0,failed:0};ordersDb.forEach(o=>{const s=normSt(o.status);if(counts[s]!==undefined)counts[s]++;});
 ["success","pending","failed"].forEach(t=>$("cnt-"+t).textContent=counts[t]);
 const list=ordersDb.filter(o=>normSt(o.status)===curOrdTab),tb=$("ordBody");
 if(!list.length){tb.innerHTML=`<div class="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm font-bold">Không có đơn nào</div>`;return;}
 const groups={};list.forEach(o=>{const mi=monthInfo(oTs(o));(groups[mi.key]=groups[mi.key]||{label:mi.label,orders:[]}).orders.push(o);});
 let html="";
 for(const key of Object.keys(groups).sort((a,b)=>b.localeCompare(a))){
  const g=groups[key];
  g.orders.sort((a,b)=>oTs(b)-oTs(a));
  html+=`<div class="month-header"><i class="far fa-calendar-alt text-indigo-400"></i><span>${g.label}</span><span class="month-count">${g.orders.length} đơn</span></div><div class="space-y-3 mb-6">${g.orders.map(o=>ordCard(o,false)).join("")}</div>`;}
 tb.innerHTML=html;}
function updateOrderTogglesUI(){
  const lf = lockFulfillOn(), ms = mailOnSaveOn(), me = manualEditOn();
  const setBtn = (btnId, badgeId, active) => {
    const btn = $(btnId), b = $(badgeId);
    if (!btn || !b) return;
    if (active) {
      // Chuẩn Ảnh 1: Viền dày 2px #4f46e5, nền #e0e7ff, chữ #4338ca
      btn.className = "flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 border-2 rounded-xl p-2 sm:p-2.5 shadow-sm transition text-left bg-indigo-100 text-indigo-700 border-indigo-600 font-extrabold";
      b.className = "text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 shrink-0 border border-indigo-300";
      b.textContent = "BẬT";
    } else {
      btn.className = "flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 border rounded-xl p-2 sm:p-2.5 shadow-sm transition text-left bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200";
      b.className = "text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0";
      b.textContent = "TẮT";
    }
  };
  setBtn("btnToggleLockFulfill", "badgeLockFulfill", lf);
  setBtn("btnToggleMailOnSave", "badgeMailOnSave", ms);
  setBtn("btnToggleManualEdit", "badgeManualEdit", me);
}
async function toggleLockFulfillBtn(){
  const s = cmsDb.settings; const cur = !s.lockFulfill;
  s.lockFulfill = cur;
  updateOrderTogglesUI();
  try {
    await saveCmsDb();
    toast(cur ? "Đã BẬT Khóa fulfillment — sửa đơn không chạy auto" : "Đã TẮT Khóa fulfillment");
    logEvent("warn", "Khóa fulfillment", cur ? "Bật" : "Tắt");
  } catch(e) {
    s.lockFulfill = !cur; updateOrderTogglesUI(); toast("Lỗi lưu: " + e.message, "err");
  }
}

function toggleMailOnSaveBtn(){
  const cur = !mailOnSaveOn();
  localStorage.setItem(SITE_KEY + "_mailOnSave", cur ? "1" : "0");
  updateOrderTogglesUI();
  toast(cur ? "Đã BẬT gửi mail báo khách khi lưu đơn" : "Đã TẮT gửi mail khi lưu đơn");
}

function toggleManualEditBtn(){
  const cur = !manualEditOn();
  localStorage.setItem(SITE_KEY + "_manualEdit", cur ? "1" : "0");
  updateOrderTogglesUI();
  toast(cur ? "Đã BẬT Sửa tay — cho phép sửa 3 ô định tuyến" : "Đã TẮT Sửa tay");
}

function autoFillNickname(){const e=$("mOEmail").value.trim().toLowerCase();if(!e||$("mONickname").value)return;const x=ordersDb.find(o=>String(o.email||"").toLowerCase()===e&&o.nickname);if(x)$("mONickname").value=x.nickname;}
function updMonths(){$("mOMonths").value=fmtMonths($("mODays").value);}
function updAmountUi(){const bank=!/alipay|weixin/i.test($("mOMethod").value);$("mOAmountLbl").textContent=bank?"Số tiền thu (VND) — lưu vào totalVnd":"Số tiền đã nhận (¥ CNY) — lưu vào totalCny";$("mOAmountNote").textContent=bank?"Bank VN: totalCny để trống.":"Alipay/Weixin: totalVnd để trống. Đơn mới tự lấy tiền từ gói; đơn cũ thiếu tiền thì bạn tự nhập.";}
function fillAmount(){const pk=PKG_DB[$("mOPkg").value];if(!pk)return;const bank=!/alipay|weixin/i.test($("mOMethod").value),d=parseInt($("mODays").value)||0,qty=pk.m===1?Math.max(1,Math.floor(d/30)):1,v=bank?pk.vnd*qty:(pk.cny?pk.cny*qty:0);$("mOAmount").value=v?trimNum(v):"";updAmountUi();}
// Tính ngày 2 chiều tức thì, mỏ neo createdTs cố định, 1 tháng = 30 ngày, 1 năm = 365 ngày
function getOrderAnchorTs() {
  const curDateStr = $("mODate")?.value || "";
  const parsed = parseAny(curDateStr);
  return parsed || Number(modalInit.createdTs) || nowMs();
}

function autoFillDays() {
  const p = PKG_LIST.find(x => x[0] === $("mOPkg").value);
  if (!p) return;
  if (!modalNew && expLocked()) { updMonths(); return; }
  
  if (modalNew) {
    const em = $("mOEmail").value.trim().toLowerCase();
    if (em) {
      const pastOrders = ordersDb.filter(o => o && normSt(o.status) === "success" && String(o.email || "").toLowerCase() === em && o.id !== $("mOId").value);
      if (pastOrders.length > 0) {
        const now = nowMs();
        // Kiểm tra xem có đơn cũ nào còn hạn (qua 00:00:00 UTC+7 hôm nay) hay không
        const hasActiveOrder = pastOrders.some(o => {
          if (!o.expDate) return false;
          if (isLife(o.expDate)) return true;
          return parseDmy(o.expDate) > now;
        });
        if (hasActiveOrder) {
          // Email cũ còn đơn còn hạn: Để trống ô HSD và số ngày để Admin tự nhập
          $("mODays").value = "";
          $("mOExp").value = "";
          updMonths();
          return;
        }
        // Nếu tất cả các đơn cũ đều đã hết hạn: Tính như đơn mới từ ngày mua hiện tại
      }
    }
  }

  const anchor = getOrderAnchorTs();
  if (p[2] > 0) {
    const days = p[2];
    $("mODays").value = days;
    $("mOExp").value = dmyOf(anchor + days * 864e5);
  } else {
    $("mODays").value = "";
    $("mOExp").value = "Vĩnh viễn";
  }
  updMonths();
}

function onPkgChange() { autoFillDays(); fillAmount(); }
function onMethodChange() { if(modalNew) fillAmount(); else updAmountUi(); }

// Khi người dùng sửa ô "Số ngày SD"
function recalcExpFromDays() {
  updMonths();
  if (!modalNew && expLocked()) return;
  const d = parseInt($("mODays").value) || 0;
  const anchor = getOrderAnchorTs();
  if (d > 0) {
    $("mOExp").value = dmyOf(anchor + d * 864e5);
  }
  if (modalNew) fillAmount();
}

// Khi người dùng sửa trực tiếp ô "HSD" (mOExp)
function recalcDaysFromExp() {
  const expStr = $("mOExp").value.trim();
  if (isLife(expStr)) {
    $("mODays").value = "";
    updMonths();
    return;
  }
  const expTs = parseDmy(expStr);
  const anchor = getOrderAnchorTs();
  if (expTs && expTs > anchor) {
    const diffDays = Math.round((expTs - anchor) / 864e5);
    $("mODays").value = diffDays;
    updMonths();
  }
}
function togSF(){const s=$("mOStatus").value;$("fSuc").classList.toggle("hidden",s!=="success");$("fFail").classList.toggle("hidden",s!=="failed");}
function syncUpg(t){const ids={verify:"mOUpgVerify",success:"mOUpgSuccess",reject:"mOUpgReject"};if($(ids[t]).checked)for(const k in ids)if(k!==t)$(ids[k]).checked=false;}
const curUpg=()=>$("mOUpgVerify").checked?"verify":$("mOUpgSuccess").checked?"success":$("mOUpgReject").checked?"reject":"none";
function readModal(){return{email:$("mOEmail").value.trim(),nickname:$("mONickname").value.trim(),zalo:$("mOZalo").value.trim(),method:$("mOMethod").value,status:$("mOStatus").value,expDate:$("mOExp").value.trim(),days:parseInt($("mODays").value)||"",reason:$("mOReason").value.trim(),info1:$("mOLink1").value.trim(),info2:$("mOLink2").value.trim(),info3:$("mOLink3").value.trim(),pkgId:$("mOPkg").value,amount:$("mOAmount").value.trim()};}
function openOrdModal(id){
 const o=id?ordersDb.find(x=>x.id===id):null;if(id&&!o)return;modalNew=!o;modalOldId=o?o.id:"";
 $("upgChecks").innerHTML=[["Verify","verify","yellow","Đang xác minh"],["Success","success","green","Thành công"],["Reject","reject","red","Từ chối"]].map(([n,k,c,l])=>`<label class="flex items-center bg-${c}-50 text-${c}-700 px-2 py-1 rounded-full cursor-pointer border border-${c}-200"><input type="checkbox" id="mOUpg${n}" onchange="syncUpg('${k}')" class="w-3 h-3 mr-1 accent-${c}-600"><span class="text-[9px] font-bold">${l}</span></label>`).join("");
 $("mOrdTtl").textContent=o?"Sửa đơn":"Tạo thủ công";$("mOId").value=o?o.id:genId();
 $("mOIdNote").classList.toggle("hidden",!o);if(o)$("mOIdNote").textContent="Đổi mã đơn ở ô trên = ĐỔI ID của chính đơn này (không tạo đơn trùng). Cần Worker hỗ trợ đổi ID.";
 $("mOEmail").value=o?.email||"";$("mONickname").value=o?.nickname||"";$("mOZalo").value=o?.zalo||"";$("mOExp").value=o?.expDate||"";$("mODays").value=o?.days||"";
 $("mOUpgVerify").checked=!!o?.pendingUpgrade;$("mOUpgSuccess").checked=!!(o?.isUpgrade&&!o.pendingUpgrade&&o.upgradeStatus!=="failed");$("mOUpgReject").checked=o?.upgradeStatus==="failed";
 $("mOLink1").value=o?.info1||o?.info||"";$("mOLink2").value=o?.info2||"";$("mOLink3").value=o?.info3||"";$("mOReason").value=o?.reason||"";
 $("mOStatus").value=o?normSt(o.status):"pending";$("mOMethod").value=/alipay/i.test(o?.method||"")?"Alipay":/weixin|wechat/i.test(o?.method||"")?"Weixin":"Ngân hàng VN";
 const sel=$("mOPkg");
 const dynamicList = [...PKG_LIST];
 if(Array.isArray(adminPkgsList) && adminPkgsList.length){
   adminPkgsList.forEach(dp => {
     if(!dynamicList.some(x => x[0] === dp.id)){
       const timeNum = dp.time === "lifetime" ? 0 : (Number(dp.time) || 1) * 30;
       dynamicList.push([dp.id, `${dp.name || dp.id} - ${fmtVnd(dp.vnd)}VND (${dp.data || ''})`, timeNum]);
     }
   });
 }
 sel.innerHTML=dynamicList.map(p=>`<option value="${p[0]}">${esc(p[1])}</option>`).join("");
 if(o){let pid=dynamicList.find(p=>p[0]===o.pkgId)?.[0];if(!pid){const pp=pkgOf(o);if(pp)pid=Object.keys(PKG_DB).find(k=>PKG_DB[k]===pp);}
  if(!pid)pid=dynamicList.find(p=>o.pkgName&&o.pkgData&&p[1].startsWith(o.pkgName)&&p[1].includes("("+o.pkgData+")"))?.[0];
  if(pid)sel.value=pid;else{sel.innerHTML+=`<option value="-1" selected>${esc(o.pkg||o.pkgName||"Gói custom")}</option>`;sel.value="-1";}
  const bank=!/alipay|weixin/i.test($("mOMethod").value);$("mOAmount").value=bank?(o.totalVnd||""):(o.totalCny||o.totalVnd||"");}
 else{sel.value="t1";$("mOAmount").value="";}

 // Quản lý 3 ô Link theo công tắc "Sửa tay":
 const canEditManual = manualEditOn();
 ["1","2","3"].forEach(i=>{
   const inp = $("mOLink"+i);
   inp.readOnly = !canEditManual;
   if(canEditManual){
     inp.classList.remove("bg-slate-100","cursor-not-allowed","text-slate-500");
     inp.classList.add("bg-white","cursor-text");
     inp.placeholder = "Dán link sub vào đây (sau khi lưu sẽ được khóa)";
   } else {
     inp.classList.add("bg-slate-100","cursor-not-allowed","text-slate-500");
     inp.classList.remove("bg-white","cursor-text");
     inp.placeholder = "Đang tắt Sửa tay (chỉ đọc) — bật công tắc Sửa tay ngoài tab để sửa";
   }
   $("mOUnl"+i).checked=false;
   const lk=!!(o&&o.lockInfo&&o.lockInfo["info"+i]);
   $("mOUnlW"+i).classList.toggle("hidden",!lk);
   $("mOLkTag"+i).innerHTML=lk?'<span class="text-purple-600 font-bold"><i class="fas fa-lock"></i> đã khóa (sửa tay)</span>':"";
 });

 const lockOn=!modalNew&&expLocked();$("mOExp").disabled=lockOn;$("mODays").disabled=lockOn;
 const ln=$("mOLockNote");ln.classList.toggle("hidden",!(lockOn||lockFulfillOn()||canEditManual));
 ln.innerHTML=(lockOn?'<i class="fas fa-lock mr-1"></i>Đang bật <b>Khóa thông tin hết hạn</b>: HSD &amp; số ngày sẽ KHÔNG đổi. ':"")
  +(lockFulfillOn()?'<i class="fas fa-lock mr-1"></i>Đang bật <b>Khóa fulfillment</b>: lưu đơn sẽ không cấp link / gửi mail tự động. ':"")
  +(canEditManual?'<i class="fas fa-pen-to-square text-purple-600 mr-1"></i>Đang bật <b>Sửa tay</b>: bạn có thể sửa 3 ô Link, lưu xong sẽ khóa không bị ghi đè.':"");
 if(modalNew){autoFillDays();fillAmount();}
 updMonths();updAmountUi();togSF();modalInit=readModal();upgInit=curUpg();$("mOrd").classList.remove("hidden");}

async function saveOrd(){
 const oldId=modalOldId,id=normId($("mOId").value);
 if(!/^DH[A-Z0-9]{10}$/.test(id))return toast("Mã đơn phải dạng DH + 10 ký tự chữ/số","err");
 if((!oldId||id!==oldId)&&ordersDb.some(x=>normId(x.id)===id))return toast("Mã đơn "+id+" đã tồn tại","err");
 const cur=readModal(),body={id:oldId||id};
 if(oldId&&id!==oldId)body.newId=id;
 for(const k in cur){if(k==="amount")continue;if(modalNew?(cur[k]!==""&&cur[k]!=="-1"):cur[k]!==modalInit[k]){if(k==="pkgId"&&cur[k]==="-1")continue;body[k]=cur[k];}}
 const bank=!/alipay|weixin/i.test(cur.method),amt=Number(String(cur.amount).replace(/[,\s]/g,""))||0;
 if(modalNew){body.totalVnd=bank&&amt?amt:"";body.totalCny=!bank&&amt?amt:"";}
 else if(cur.amount!==modalInit.amount){if(bank)body.totalVnd=amt||"";else body.totalCny=amt||"";}
 const pk=PKG_DB[cur.pkgId];if(pk&&(modalNew||cur.days!==modalInit.days||cur.pkgId!==modalInit.pkgId))body.qty=pk.m===1?Math.max(1,Math.floor((parseInt(cur.days)||0)/30)):1;
 if(!modalNew&&expLocked()){delete body.expDate;delete body.days;}
 if(lockFulfillOn())body.lockAuto=true;if(expLocked())body.lockExpiry=true;
 if(manualEditOn())body.manualEdit=true; // Báo cho server biết đang bật chế độ Sửa tay
 const un=["1","2","3"].filter(i=>$("mOUnl"+i).checked).map(i=>"info"+i);if(un.length)body.unlockInfo=un;
 if(modalNew||curUpg()!==upgInit)body.upg=curUpg();
 if(modalNew&&!body.status)body.status="pending";
 const btn=$("btnSaveOrd");btn.disabled=true;
 try{const j=await aj("/api/admin/order",{method:"POST",body});const o=j.order;
  if(body.newId&&o.id!==body.newId)toast("Worker chưa hỗ trợ đổi Mã đơn — mã đơn giữ nguyên "+o.id,"warn");
  let i=ordersDb.findIndex(x=>x.id===(oldId||o.id));if(i<0)i=ordersDb.findIndex(x=>x.id===o.id);if(i>=0)ordersDb[i]=o;else ordersDb.unshift(o);
  lastSig.o=JSON.stringify(ordersDb);renderOrd();cm("mOrd");toast("Đã lưu"+((j.kind==="new"||j.kind==="renew")&&!lockFulfillOn()?" & đã cấp link":""));
  if (modalNew) {
    triggerTelegramBackupNow(`Đơn hàng mới #${o.id} (${o.email || "Khách"})`);
  }
  const st=normSt(o.status);
  if(mailOnSaveOn()&&!lockFulfillOn()&&o.email&&(body.status==="success"||body.status==="failed")&&(st==="success"||st==="failed")){
   if(!isMailMaster())toast("Web đang ở chế độ SLAVE, bỏ qua gửi mail","warn");else{const key=st==="success"?mailKeyOf(o):"failed";sendMailClient(o.email,subjVars(getTpl(key).subject,orderVars(o)),st==="success"?mailSuccess(o):mailFailed(o));logEvent("ok","Gửi mail",(st==="success"?"Kích hoạt thành công → ":"Kích hoạt thất bại → ")+o.email,o.id);}}
 }catch(e){if(e.message!=="401")toast("Lỗi lưu đơn: "+e.message,"err");}
 btn.disabled=false;}
async function delOrd(id){
 if(!confirm("Xóa đơn "+id+"? Toàn bộ Link Sub của đơn này sẽ được khóa và chuyển sang tab Đã Xóa."))return;
 try{
   await api("/api/admin/order?id="+id,{method:"DELETE"});
   ordersDb=ordersDb.filter(x=>x.id!==id);
   lastSig.o=JSON.stringify(ordersDb);
   renderOrd();renderCheckTab();
   fetchAll();
   toast("Đã xóa đơn & thu hồi toàn bộ link sub liên quan");
   triggerTelegramBackupNow(`Xóa đơn hàng #${id}`);
 }catch(e){}
}
// ===================== TAB KIỂM TRA ĐƠN THIẾU LINK CỤC BỘ =====================
function getMissingOrders(){
 const now = nowMs();
 const me = getMe();
 return ordersDb.filter(o => 
   o && normSt(o.status) === "success" && 
   (!o.expDate || isLife(o.expDate) || (expEnd(o.expDate) >= now)) &&
   !o[me.field]
 );
}

function updateCheckBadge(){
 const list = getMissingOrders();
 const b = $("checkBadge"), cnt = $("checkBadgeCount");
 if (b) {
   b.textContent = list.length;
   b.classList.toggle("hidden", list.length === 0);
 }
 if (cnt) cnt.textContent = list.length;
}

function renderCheckTab(){
 const me = getMe();
 updateCheckBadge();
 const tb = $("checkBody");
 if (!tb) return;

 if ($("checkHeaderTitle")) $("checkHeaderTitle").innerHTML = `<i class="fas fa-clipboard-check text-indigo-600 mr-1.5"></i>Kiểm tra bù link (${me.field.toUpperCase()}) <span id="checkBadgeCount" class="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-0.5 rounded-full ml-1">0</span>`;
 if ($("scanRoutingFieldTxt")) $("scanRoutingFieldTxt").textContent = me.field.toUpperCase();

 const list = getMissingOrders();
 if (!list.length) {
   tb.innerHTML = `<div class="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm font-bold">
     <i class="fas fa-circle-check text-emerald-500 text-3xl mb-2 block"></i>
     Tuyệt vời! Tất cả đơn hàng còn hạn đều đã có link ${me.field.toUpperCase()} của web này.
   </div>`;
   return;
 }

 tb.innerHTML = list.map((o, idx) => {
   return `
   <div class="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
     <div class="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
       <div>
         <div class="flex items-center gap-2 flex-wrap">
           <span class="text-xs font-bold text-slate-400">#${idx+1}</span>
           <span class="font-mono font-black text-indigo-600 text-sm cp" onclick="cp('${o.id}')">${esc(o.id)}</span>
           <span class="font-bold text-slate-700 text-xs">${esc(o.email || "—")}</span>
           ${o.nickname ? `<span class="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded"><i class="fas fa-user-tag mr-0.5"></i>${esc(o.nickname)}</span>` : ""}
         </div>
         <div class="text-[11px] text-slate-500 mt-1">
           Gói: <b>${esc(pkgLabel(o))}</b> · HSD: <b>${esc(o.expDate || "Vĩnh viễn")}</b>
         </div>
       </div>
       <div class="flex gap-2 shrink-0">
         <button onclick="healSingleOrder('${o.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition flex items-center gap-1">
           <i class="fas fa-bolt mr-1"></i>Bù link cục bộ
         </button>
         <button onclick="saveCheckManual('${o.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm transition">
           <i class="fas fa-save mr-1"></i>Lưu link
         </button>
       </div>
     </div>

     <!-- Ô sửa tay định tuyến cục bộ của web này -->
     <div>
       <label class="block text-[10px] font-bold ${o[me.field] ? 'text-emerald-700' : 'text-purple-700'} mb-1">
         ${o[me.field] ? '<i class="fas fa-check-circle text-emerald-500 mr-1"></i>' : '<i class="fas fa-triangle-exclamation text-amber-500 mr-1"></i>'}Ô Link ${me.field.toUpperCase()} (Định tuyến của web này)
       </label>
       <input type="text" id="chkLink_${o.id}" value="${esc(o[me.field] || '')}" placeholder="Dán link ${me.field.toUpperCase()} vào đây..." class="w-full p-2 text-xs border ${o[me.field] ? 'border-slate-200 bg-slate-50' : 'border-purple-300 bg-purple-50/30'} rounded-lg font-mono outline-none focus:border-indigo-500">
     </div>
   </div>`;
 }).join("");
}

// Lưu sửa tay trực tiếp ô link cục bộ từ tab Kiểm tra
async function saveCheckManual(orderId){
 const o = ordersDb.find(x => x.id === orderId);
 if (!o) return;
 const me = getMe();
 const lk = ($("chkLink_" + orderId)?.value || "").trim();

 toast("Đang lưu link sửa tay...");
 try {
   const body = { id: o.id, [me.field]: lk, manualEdit: true };
   const j = await aj("/api/admin/order", { method: "POST", body });
   const idx = ordersDb.findIndex(x => x.id === o.id);
   if (idx >= 0) ordersDb[idx] = j.order;
   lastSig.o = JSON.stringify(ordersDb);
   renderCheckTab();
   renderOrd();
   toast(`Đã lưu link ${me.field.toUpperCase()} cho đơn ${o.id}!`);
 } catch(e) {
   toast("Lỗi lưu link: " + e.message, "err");
 }
}

// Bù link cục bộ cho 1 đơn cụ thể
async function healSingleOrder(orderId){
 const me = getMe();
 toast(`Đang cấp bù link ${me.field.toUpperCase()} cho đơn ${orderId}...`);
 try {
   const res = await aj("/api/admin/heal", { method: "POST", body: { orderIds: [orderId] } });
   const item = res && res.details && res.details[0];
   if (item && item.success && item.link) {
     const targetOrder = ordersDb.find(o => normId(o.id) === normId(item.id));
     if (targetOrder) targetOrder[item.field || me.field] = item.link;
     lastSig.o = JSON.stringify(ordersDb);
     renderCheckTab();
     renderOrd();
     toast(`Đã cấp bù link ${me.field.toUpperCase()} thành công!`);
   } else {
     toast("Không thể cấp bù link (hết nguồn trống trong kho)!", "warn");
   }
 } catch(e) {
   toast("Lỗi: " + e.message, "err");
 }
}

// Bù link cục bộ toàn bộ danh sách (1 request batching)
async function healAllMissingWithProgress(){
 const list = getMissingOrders();
 const me = getMe();
 if (!list.length) return toast(`Tất cả đơn đã đủ link ${me.field.toUpperCase()}!`, "info");
 const btn = $("btnHealAll");
 btn.disabled = true;
 const box = $("checkProgressBox"), bar = $("checkProgressBar"), pTxt = $("checkProgressPercent"), sTxt = $("checkProgressStatus"), logEl = $("checkLogTerminal");
 box.classList.remove("hidden");
 bar.style.width = "20%";
 pTxt.textContent = "20%";
 $("statTotal").textContent = list.length;
 $("statSuccess").textContent = "0";
 $("statFailed").textContent = "0";
 logEl.innerHTML = `<div class="text-indigo-300">[CỤC BỘ] Đang xử lý cấp bù link ${me.field.toUpperCase()} cho ${list.length} đơn...</div>`;
 sTxt.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i>Đang cấp bù link từ kho cục bộ...`;

 try {
   const allIds = list.map(o => o.id);
   const res = await aj("/api/admin/heal", { method: "POST", body: { orderIds: allIds } });
   bar.style.width = "75%";
   pTxt.textContent = "75%";

   const details = arr(res.details);
   let successCount = 0, failCount = 0;

   logEl.innerHTML += `<div class="text-slate-400 mt-1">// === KẾT QUẢ CẤP BÙ CỤC BỘ ===</div>`;

   for (const item of details) {
     const targetOrder = ordersDb.find(o => normId(o.id) === normId(item.id));
     if (targetOrder && item.success && item.link) {
       targetOrder[item.field || me.field] = item.link;
     }
     const logLine = document.createElement("div");
     if (item.success) {
       successCount++;
       logLine.className = "text-emerald-300 font-bold";
       logLine.textContent = `✔ [THÀNH CÔNG] Đơn ${item.id} (${item.email}): Đã gán link ${item.field.toUpperCase()}`;
     } else {
       failCount++;
       logLine.className = "text-rose-400 font-bold";
       logLine.textContent = `✘ [THẤT BẠI] Đơn ${item.id} (${item.email}): Hết node trống trong kho`;
     }
     logEl.appendChild(logLine);
   }

   lastSig.o = JSON.stringify(ordersDb);
   renderCheckTab();
   renderOrd();

   $("statSuccess").textContent = successCount;
   $("statFailed").textContent = failCount;

   bar.style.width = "100%";
   pTxt.textContent = "100%";
   sTxt.innerHTML = `<i class="fas fa-circle-check text-emerald-400 mr-1"></i>Hoàn tất! ${successCount} đơn thành công, ${failCount} đơn lỗi.`;
   toast(`Đã xử lý xong: ${successCount} đơn thành công, ${failCount} thất bại.`);
 } catch(e) {
   bar.style.width = "100%";
   sTxt.innerHTML = `<i class="fas fa-circle-xmark text-rose-400 mr-1"></i>Lỗi trong quá trình bù link!`;
   const logLine = document.createElement("div");
   logLine.className = "text-rose-400 font-bold";
   logLine.textContent = `✘ [LỖI HỆ THỐNG]: ${e.message || "Không phản hồi"}`;
   logEl.appendChild(logLine);
   toast("Lỗi bù link: " + e.message, "err");
 } finally {
   btn.disabled = false;
 }
}
const healAllMissing = healAllMissingWithProgress;

// ===================== MAIL: LÕI TEMPLATE (giống hệt Worker để preview = gửi thật) =====================
const htmlEscape=esc;
const sendMailClient=(to,subject,html)=>api("/api/admin/send_mail",{method:"POST",body:{to,subject,html}}).catch(()=>{});
const mailGrad=(c1,c2,ang,stop)=>`linear-gradient(${Number(ang)||135}deg,${c1} 0%,${c2} ${Math.max(1,Math.min(100,Number(stop)||100))}%)`;
const mailShell=(c1,c2,title,inner,ang,stop)=>`<div style="font-family:Arial,Helvetica,sans-serif;width:100%;max-width:480px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden"><div style="background:${c1};background-image:${mailGrad(c1,c2,ang,stop)};padding:22px 16px;text-align:center"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:800;line-height:1.4;text-transform:uppercase;letter-spacing:.5px;font-family:Arial,Helvetica,sans-serif">${title}</h2></div><div style="padding:20px;font-family:Arial,Helvetica,sans-serif">${inner}</div></div>`;
const mailIdBox=(label,id,color)=>`<div style="background:#f1f5f9;border-left:4px solid ${color};padding:15px;border-radius:8px;margin:18px 0;text-align:center"><p style="margin:0;font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase">${label}</p><p style="margin:8px 0 0;font-size:22px;font-weight:900;color:${color};letter-spacing:1px;word-break:break-word">${htmlEscape(id)}</p></div>`;
const mailPortal=(PDx,label)=>`<div style="text-align:center;margin:24px 0 6px"><a href="${htmlEscape(PDx)}" style="display:block;background:#1e293b;color:#ffffff;padding:13px 15px;border-radius:10px;text-decoration:none;font-weight:900;font-size:14px">${label}</a></div><p style="margin:10px 0 0;font-size:12px;color:#64748b;text-align:center;line-height:1.5">👉 <i>Dùng <b>Mã Đơn Hàng</b> hoặc <b>Email</b> để tra cứu thông tin đơn hàng</i></p>`;
const mailBtn=(href,bg,label)=>`<td width="50%" style="padding:4px"><a href="${htmlEscape(href)}" style="display:block;background:${bg};color:#ffffff;padding:10px 0;border-radius:8px;text-decoration:none;font-weight:bold;font-size:12px;text-align:center">${label}</a></td>`;
const mailSupport=PDx=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:22px;text-align:center"><p style="margin:0 0 12px;color:#475569;font-size:13px;line-height:1.5">Cần hỗ trợ? Đội ngũ của chúng tôi luôn sẵn sàng 24/7 để hỗ trợ bạn ❤️</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${mailBtn("https://zalo.me/0917678211","#0068ff","Chat Zalo")}${mailBtn("https://www.facebook.com/trinh.hg.57","#0668E1","Messenger")}</tr><tr>${mailBtn("https://t.me/hoaian57","#0088cc","Telegram")}${mailBtn(String(PDx).replace(/\/$/,"")+"/#wechat","#07C160","WeChat")}</tr></table></div>`;
const TPL_THEME={red:["#fef2f2","#fca5a5","#991b1b","#b91c1c"],amber:["#fefce8","#facc15","#a16207","#ca8a04"],purple:["#f5f3ff","#a78bfa","#6d28d9","#7c3aed"],blue:["#eff6ff","#93c5fd","#1e40af","#2563eb"],green:["#f0fdf4","#86efac","#166534","#16a34a"]};
const P0={t:"portal",x:"TRUY CẬP CỔNG KHÁCH HÀNG"},S0={t:"support"};
// Mẫu hệ thống: bản sao đúng cấu trúc SYS_TPL của Worker. UI chỉ cho sửa 5 mẫu; renew/upgrade giữ mặc định của Worker.
const SYS_TPL={
 success:{subject:"VPN Trinh Hg - Kích hoạt thành công",title:"KÍCH HOẠT THÀNH CÔNG",c1:"#4f46e5",c2:"#8b5cf6",ang:135,stop:100,blocks:[{t:"text",x:"Xin chào, Gói VPN **{pkgName}** của bạn đã sẵn sàng."},{t:"orderid",label:"MÃ ĐƠN HÀNG CỦA BẠN"},P0,S0]},
 renew:{subject:"VPN Trinh Hg - Gia hạn thành công",title:"GIA HẠN THÀNH CÔNG",c1:"#4f46e5",c2:"#8b5cf6",ang:135,stop:100,blocks:[{t:"text",x:"Xin chào, Gói VPN **{pkgName}** của bạn đã được gia hạn thành công."},{t:"orderid",label:"MÃ ĐƠN HÀNG CỦA BẠN"},P0,S0]},
 upgrade:{subject:"VPN Trinh Hg - Nâng cấp thành công",title:"NÂNG CẤP THÀNH CÔNG",c1:"#4f46e5",c2:"#8b5cf6",ang:135,stop:100,blocks:[{t:"text",x:"Xin chào, Gói VPN **{pkgName}** của bạn đã được nâng cấp thành công."},{t:"orderid",label:"MÃ ĐƠN HÀNG CỦA BẠN"},P0,S0]},
 failed:{subject:"VPN Trinh Hg - Kích hoạt thất bại",title:"KÍCH HOẠT THẤT BẠI",c1:"#ef4444",c2:"#b91c1c",ang:135,stop:100,blocks:[{t:"text",x:"Xin chào, Gói VPN **{pkgName}** của bạn không thể kích hoạt."},{t:"orderid",label:"MÃ ĐƠN HÀNG CỦA BẠN",color:"#4f46e5"},{t:"box",label:"LÝ DO TỪ CHỐI",x:"{reason}",theme:"red"},P0,S0]},
 exp:{subject:"VPN Trinh Hg - Gói VPN sắp hết hạn",title:"GÓI VPN SẮP HẾT HẠN",c1:"#f59e0b",c2:"#d97706",ang:135,stop:100,blocks:[{t:"text",x:"Xin chào, Gói VPN **{pkgName}** của bạn {expText}.",al:"c"},{t:"orderid",label:"MÃ ĐƠN HÀNG HIỆN TẠI",color:"#d97706"},{t:"text",x:"Gia hạn ngay để không bị gián đoạn dịch vụ.",al:"c",sz:"m"},{t:"portal",x:"GIA HẠN NGAY TẠI WEBSITE"},S0]},
 support:{subject:"VPN Trinh Hg - Hỗ trợ cài đặt",title:"HỖ TRỢ CÀI ĐẶT",c1:"#2563eb",c2:"#1d4ed8",ang:135,stop:100,blocks:[{t:"text",x:"Vui lòng liên hệ Admin qua Zalo để được hỗ trợ gói VPN mã đơn **{orderId}** nhé!",al:"c"},{t:"box",label:"ZALO ADMIN",x:"0917678211",theme:"amber"},P0,S0]},
 data:{subject:"VPN Trinh Hg - Báo cáo dung lượng {orderId}",title:"KẾT QUẢ TRA CỨU\nDUNG LƯỢNG",c1:"#8b5cf6",c2:"#6d28d9",ang:135,stop:100,blocks:[{t:"text",x:"Đây là dung lượng của đơn hàng **{orderId}**.",al:"c"},{t:"box",label:"DUNG LƯỢNG CÒN LẠI",x:"{gb} GB",theme:"purple"},{t:"text",x:"Nếu tốc độ chậm, có thể gói đã dùng hết dung lượng.",al:"c",sz:"m"},P0,S0]}
};
const getTpl=k=>({...SYS_TPL[k],...((((cmsDb&&cmsDb.mailSys)||{})[k])||{})});
const subjVars=(t,v)=>String(t??"").replace(/\{(\w+)\}/g,(m,k)=>(v[k]!==undefined&&v[k]!==null?String(v[k]):m));
function mailRender(tpl,v,PDx){
 const rp=t=>subjVars(t,v),tx=t=>htmlEscape(rp(t)).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
 const al=b=>(b.al==="c"?"center":b.al==="r"?"right":"left"),fs={s:"12px",m:"14px",l:"17px",xl:"22px"};
 const inner=arr(tpl.blocks).map(b=>{
  if(b.t==="text")return `<p style="margin:0 0 12px;font-size:${fs[b.sz]||"15px"};line-height:1.6;color:#334155;text-align:${al(b)};white-space:pre-wrap;${b.b?"font-weight:bold;":""}${b.i?"font-style:italic;":""}${b.ul?"text-decoration:underline;":""}">${tx(b.x)}</p>`;
  if(b.t==="orderid")return mailIdBox(htmlEscape(rp(b.label||"MÃ ĐƠN HÀNG CỦA BẠN")),v.orderId||"",b.color||tpl.c1);
  if(b.t==="box"){const t=TPL_THEME[b.theme]||TPL_THEME.amber;return `<div style="background:${t[0]};border:2px dashed ${t[1]};padding:18px;border-radius:12px;text-align:center;margin:14px 0"><p style="margin:0;font-size:12px;color:${t[2]};font-weight:bold;text-transform:uppercase">${htmlEscape(rp(b.label))}</p><p style="margin:10px 0 0;font-size:${fs[b.sz]||"26px"};font-weight:900;color:${t[3]};word-break:break-word">${tx(b.x)}</p></div>`;}
  if(b.t==="info")return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:10px 0">${[["✉️","Email",v.email],["#️⃣","Mã đơn",v.orderId],["📦","Gói VPN",v.pkg],["⏰","HSD",v.exp]].map(([ic,lb,val])=>`<tr><td style="padding:9px 6px;border-bottom:1px solid #f1f5f9;width:34%;font-size:13px;color:#64748b">${ic} ${lb}</td><td style="padding:9px 6px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:bold;color:#0f172a;word-break:break-word">${htmlEscape(val||"—")}</td></tr>`).join("")}</table>`;
  if(b.t==="portal")return mailPortal(PDx,htmlEscape(rp(b.x||"TRUY CẬP CỔNG KHÁCH HÀNG")));
  if(b.t==="support")return mailSupport(PDx);
  if(b.t==="img")return /^https?:\/\//i.test(b.u||"")?`<div style="text-align:${al(b)};margin:10px 0"><img src="${htmlEscape(b.u)}" style="max-width:100%;border-radius:8px"></div>`:"";
  if(b.t==="divider")return '<hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0">';
  if(b.t==="spacer")return `<div style="height:${Math.max(4,Math.min(200,parseInt(b.h)||16))}px"></div>`;
  return "";}).join("");
 return mailShell(tpl.c1,tpl.c2,htmlEscape(rp(tpl.title)).replace(/\n/g,"<br>"),inner,tpl.ang,tpl.stop);}
function orderVars(o,extra){const pk=pkgOf(o),lockTs=parseDmy(o.expDate),dl=o.expDate&&!isLife(o.expDate)&&lockTs>nowMs()?Math.floor((lockTs-nowMs())/864e5):"";
 return {email:o.email||"",orderId:o.id||"",pkgName:o.pkgName||"",pkg:pk?pkgLabel(o):(o.pkgName||""),exp:o.expDate||"",daysLeft:dl,nickname:o.nickname||"",zalo:o.zalo||"",reason:o.reason||"Vui lòng liên hệ Admin",...(extra||{})};}
const mailKeyOf=o=>o.orderType==="renew"?"renew":"success";
const mailSuccess=o=>mailRender(getTpl(mailKeyOf(o)),orderVars(o),PD);
const mailFailed=o=>mailRender(getTpl("failed"),orderVars(o),PD);
const mailExp=(o,expText)=>mailRender(getTpl("exp"),orderVars(o,{expText}),PD);
const mailZalo=o=>mailRender(getTpl("support"),orderVars(o),PD);
const dataVars=(r,gb)=>{const oi=ordersDb.find(o=>normId(o.id)===normId(r.orderId));return {...(oi?orderVars(oi):{email:r.email||"",orderId:r.orderId||"",pkgName:r.pkgName||"",pkg:r.pkgName||"",exp:"",daysLeft:"",nickname:"",zalo:"",reason:""}),email:r.email||"",orderId:r.orderId||"",gb};};
const mailData=(r,gb)=>mailRender(getTpl("data"),dataVars(r,gb),PD);
function sendExpMail(id){if(!isMailMaster())return toast("Đang ở chế độ SLAVE Email","err");const o=ordersDb.find(x=>x.id===id);if(!o?.email)return toast("Chưa có email","err");
 const lockTs=parseDmy(o.expDate),dl=lockTs>nowMs()?Math.floor((lockTs-nowMs())/864e5):0;const msg=dl<=1?"**ngày mai hết hạn**":`còn **${dl} ngày** (hết hạn **${o.expDate}**)`;
 sendMailClient(o.email,subjVars(getTpl("exp").subject,orderVars(o,{expText:msg.replace(/\*\*/g,"")})),mailExp(o,msg));logEvent("ok","Gửi mail","Nhắc hết hạn (thủ công) → "+o.email,o.id);toast("Đã gửi mail nhắc hết hạn");}
function sendZaloMail(id){if(!isMailMaster())return toast("Đang ở chế độ SLAVE Email","err");const o=ordersDb.find(x=>x.id===id);if(!o?.email)return toast("Chưa có email","err");
 sendMailClient(o.email,subjVars(getTpl("support").subject,orderVars(o)),mailZalo(o));logEvent("ok","Gửi mail","Hỗ trợ cài đặt → "+o.email,o.id);toast("Đã gửi mail nhắc hỗ trợ cài đặt");}
// ===================== DOANH THU =====================
let revTab="over",revMonth="all",revPayView=null;
const REV_TABS=[["over","Tổng quan KPI & Biểu đồ"],["pay","Thanh toán & Tỷ giá"],["cost","Quản lý Chi phí vốn"]];

// Bảng Quy Đổi Tỷ Giá Tập Trung dùng chung toàn hệ thống
function getCentralRates(){
  const s = (cmsDb && cmsDb.settings) || {};
  s.rates = s.rates || {};
  return {
    vndCny: Number(s.rates.vndCny || s.cnyRate) || 3600,
    cnyUsd: Number(s.rates.cnyUsd) || 7.25,
    vndUsd: Number(s.rates.vndUsd) || 26100
  };
}
const cnyRate = () => getCentralRates().vndCny;
const curVal = (v, prec = 0) => typeof currency !== "undefined" ? currency(v, { precision: prec, symbol: '' }) : { value: Number(v)||0, add: (x)=>({ value: (Number(v)||0)+(Number(x)||0) }), subtract: (x)=>({ value: (Number(v)||0)-(Number(x)||0) }) };
const shortN = v => v >= 1e6 ? (v/1e6).toFixed(v>=1e7?0:1).replace(/\.0$/,"")+"tr" : v >= 1e3 ? Math.round(v/1e3)+"k" : String(Math.round(v));
const monthLbl = k => k === "000000" ? "Không rõ" : `${+k.slice(4)}/${k.slice(2,4)}`;
const kpi = (l, v, sub, c) => `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><div class="text-[11px] font-bold text-slate-500 uppercase">${l}</div><div class="text-xl md:text-2xl font-black ${c||"text-indigo-600"} mt-1 break-words">${v}</div>${sub?`<div class="text-[11px] text-slate-400 mt-0.5">${sub}</div>`:""}</div>`;
const box = (t, inner) => `<div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><div class="font-bold text-sm text-slate-800 mb-3">${t}</div>${inner}</div>`;

function revList(all){
  const r = getCentralRates();
  return ordersDb.filter(o => normSt(o.status) === "success").map(o => {
    const p = pkgOf(o), pay = payOf(o), qty = Number(o.qty) || 1;
    let cny = 0, vnd = 0;
    if (pay === "Bank") {
      vnd = Number(o.totalVnd) || (p ? curVal(p.vnd).value * qty : 0);
    } else {
      cny = Number(o.totalCny) || (p ? curVal(p.cny, 2).value * qty : 0);
      vnd = curVal(cny, 2).value * r.vndCny;
    }
    return { o, p, pay, qty, months: ordMonths(o), cny, vnd, key: monthInfo(oTs(o)).key };
  }).filter(x => all || revMonth === "all" || x.key === revMonth);
}

function costSum(all){
  const r = getCentralRates();
  let total = 0; const by = {};
  (cmsDb.costs || []).filter(c => all || revMonth === "all" || monthInfo(c.ts).key === revMonth).forEach(c => {
    let v = Number(c.total) || 0;
    if (c.cur === "CNY") v = v * r.vndCny;
    else if (c.cur === "USD") v = v * r.vndUsd;
    total += v;
    const k = c.src || "Khác";
    by[k] = (by[k] || 0) + v;
  });
  return { total, by };
}

function monthTotals(){
  const m = {};
  revList(true).forEach(x => {
    const k = x.key;
    if (!m[k]) m[k] = { k, vnd: 0, n: 0, bank: 0, alipay: 0, weixin: 0 };
    m[k].vnd += x.vnd;
    m[k].n++;
    if (x.pay === "Bank") m[k].bank += x.vnd;
    else if (x.pay === "Alipay") m[k].alipay += x.vnd;
    else if (x.pay === "Weixin") m[k].weixin += x.vnd;
  });
  return m;
}

function setRevTab(k){
  revTab = k;
  revPayView = null;
  renderRevenue();
}

function setRevPayView(k){
  revPayView = k;
  renderRevenue();
}

function renderRevenue(){
  $("revTabs").innerHTML = REV_TABS.map(([k,l]) => `<button onclick="setRevTab('${k}')" class="settings-sub-tab text-center !px-3 font-bold ${revTab===k?'active':''}">${l}</button>`).join("");
  const ms = new Set(ordersDb.map(o => monthInfo(oTs(o)).key));
  (cmsDb.costs || []).forEach(c => ms.add(monthInfo(c.ts).key));
  $("revMonth").innerHTML = `<option value="all">Tất cả các tháng</option>` + [...ms].sort().reverse().map(k => `<option value="${k}" ${revMonth===k?'selected':''}>Tháng ${monthLbl(k)}</option>`).join("");
  const R = revList(), b = $("revBody");
  ({ over: revOver, pay: revPay, cost: revCost }[revTab])(R, b);
}

let chartRevStacked = null, chartPayDonut = null, chartProfitArea = null;
let gridPkgTable = null, gridRankTable = null, gridPayDetail = null, gridCostTable = null;

// SUB-TAB 1: TỔNG QUAN KPI & 3 BIỂU ĐỒ APEXCHARTS
function revOver(R, b){
  const sum = R.reduce((a, x) => a + x.vnd, 0);
  const cost = costSum().total;
  const profit = sum - cost;
  const margin = sum ? Math.round((profit / sum) * 100) : 0;
  const mt = monthTotals(), keys = Object.keys(mt).sort().slice(-12);
  const by = { Bank: 0, Alipay: 0, Weixin: 0 };
  R.forEach(x => by[x.pay] += x.vnd);

  b.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      ${kpi("Tổng Doanh Thu", fmtVnd(sum) + "đ", `${R.length} đơn thành công`)}
      ${kpi("Chi Phí Vốn VPN", fmtVnd(cost) + "đ", "Tiền nhập nguồn Liangxin/DJJC/Kitty", "text-orange-500")}
      ${kpi("Lợi Nhuận Ròng", fmtVnd(profit) + "đ", `Doanh thu - Chi phí vốn`, profit >= 0 ? "text-emerald-600" : "text-rose-600")}
      ${kpi("Tỷ Suất Lợi Nhuận", margin + "%", "Lãi ròng / Tổng doanh thu", margin >= 50 ? "text-indigo-600" : "text-amber-600")}
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
        <div class="font-bold text-sm text-slate-800 flex items-center justify-between">
          <span class="flex items-center gap-2"><i class="fas fa-chart-column text-indigo-600"></i>Cơ cấu doanh thu 12 tháng (Stacked Column)</span>
          <span class="text-[10px] font-bold text-slate-400">Đơn vị: VND</span>
        </div>
        <div id="chartRevStackedBox" class="min-h-[280px]"></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
        <div class="font-bold text-sm text-slate-800 flex items-center gap-2"><i class="fas fa-chart-pie text-purple-600"></i>Tỷ lệ 3 Cổng thanh toán</div>
        <div id="chartPayDonutBox" class="min-h-[280px] flex items-center justify-center"></div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-2">
      <div class="font-bold text-sm text-slate-800 flex items-center justify-between">
        <span class="flex items-center gap-2"><i class="fas fa-chart-area text-emerald-600"></i>Doanh thu vs Chi phí vốn → Lợi nhuận ròng 12 tháng (Area Chart)</span>
        <span class="text-[10px] font-bold text-slate-400">Chart.js (MIT)</span>
      </div>
      <div id="chartProfitAreaBox" class="min-h-[260px]"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div class="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><i class="fas fa-table-list text-indigo-600"></i>Bảng Doanh thu theo Gói cước (Grid.js)</div>
        <div id="gridPkgBox"></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div class="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2"><i class="fas fa-ranking-star text-amber-500"></i>Xếp hạng doanh thu theo Tháng (Grid.js)</div>
        <div id="gridRankBox"></div>
      </div>
    </div>
  `;

  setTimeout(() => {
    if (typeof Chart !== "undefined") {
      // 1. Biểu đồ Cột phân tầng (Stacked Column)
      if (chartRevStacked) { try { chartRevStacked.destroy(); } catch(e){} }
      const el1 = document.getElementById("chartRevStackedBox");
      if (el1) {
        el1.innerHTML = '<canvas id="cvRevStacked" style="max-height:280px; width:100%;"></canvas>';
        const ctx1 = document.getElementById("cvRevStacked").getContext("2d");
        chartRevStacked = new Chart(ctx1, {
          type: 'bar',
          data: {
            labels: keys.map(k => monthLbl(k)),
            datasets: [
              { label: 'Ngân hàng VN', data: keys.map(k => mt[k].bank || 0), backgroundColor: '#4f46e5', borderRadius: 4 },
              { label: 'Alipay', data: keys.map(k => mt[k].alipay || 0), backgroundColor: '#0284c7', borderRadius: 4 },
              { label: 'WeChat', data: keys.map(k => mt[k].weixin || 0), backgroundColor: '#10b981', borderRadius: 4 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
              y: { stacked: true, ticks: { callback: (v) => shortN(v) } }
            },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { font: { size: 11, weight: 'bold' }, boxWidth: 12 } },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtVnd(ctx.raw)} đ` } }
            }
          }
        });
      }

      // 2. Biểu đồ Donut 3 Cổng thanh toán
      if (chartPayDonut) { try { chartPayDonut.destroy(); } catch(e){} }
      const el2 = document.getElementById("chartPayDonutBox");
      if (el2) {
        el2.innerHTML = '<canvas id="cvPayDonut" style="max-height:280px; width:100%;"></canvas>';
        const ctx2 = document.getElementById("cvPayDonut").getContext("2d");
        chartPayDonut = new Chart(ctx2, {
          type: 'doughnut',
          data: {
            labels: ['Ngân hàng VN', 'Alipay', 'WeChat'],
            datasets: [{
              data: [by.Bank || 0, by.Alipay || 0, by.Weixin || 0],
              backgroundColor: ['#4f46e5', '#0284c7', '#10b981'],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { font: { size: 11, weight: 'bold' }, boxWidth: 12 } },
              tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtVnd(ctx.raw)} đ` } }
            }
          }
        });
      }

      // 3. Biểu đồ Vùng (Area Chart) Doanh thu vs Chi phí -> Lãi ròng
      if (chartProfitArea) { try { chartProfitArea.destroy(); } catch(e){} }
      const el3 = document.getElementById("chartProfitAreaBox");
      if (el3) {
        const costPerMonth = keys.map(k => {
          let cSum = 0;
          (cmsDb.costs || []).filter(c => monthInfo(c.ts).key === k).forEach(c => {
            let v = Number(c.total) || 0;
            if (c.cur === "CNY") v = v * getCentralRates().vndCny;
            else if (c.cur === "USD") v = v * getCentralRates().vndUsd;
            cSum += v;
          });
          return cSum;
        });
        const revPerMonth = keys.map(k => mt[k].vnd || 0);
        const profitPerMonth = keys.map((k, i) => revPerMonth[i] - costPerMonth[i]);

        el3.innerHTML = '<canvas id="cvProfitArea" style="max-height:260px; width:100%;"></canvas>';
        const ctx3 = document.getElementById("cvProfitArea").getContext("2d");
        chartProfitArea = new Chart(ctx3, {
          type: 'line',
          data: {
            labels: keys.map(k => monthLbl(k)),
            datasets: [
              { label: 'Doanh thu', data: revPerMonth, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.15)', fill: true, tension: 0.35, borderWidth: 2 },
              { label: 'Chi phí vốn', data: costPerMonth, borderColor: '#f97316', backgroundColor: 'rgba(249, 115, 22, 0.15)', fill: true, tension: 0.35, borderWidth: 2 },
              { label: 'Lợi nhuận ròng', data: profitPerMonth, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: true, tension: 0.35, borderWidth: 2 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' } } },
              y: { ticks: { callback: (v) => shortN(v) } }
            },
            plugins: {
              legend: { position: 'top', align: 'end', labels: { font: { size: 11, weight: 'bold' }, boxWidth: 12 } },
              tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtVnd(ctx.raw)} đ` } }
            }
          }
        });
      }
    }

    // Grid.js Render Bảng Gói & Bảng Tháng
    if (typeof gridjs !== "undefined") {
      const g = {};
      R.forEach(x => {
        const k = x.p ? x.p.n + "|" + x.p.vnd : (x.o.pkgName || "Gói khác");
        const e = g[k] = g[k] || { l: x.p ? `${x.p.n} (${x.p.d || ''})` : (x.o.pkgName || "Gói khác"), n: 0, vnd: 0 };
        e.n++; e.vnd += x.vnd;
      });
      const pkgData = Object.values(g).sort((a,c) => c.vnd - a.vnd).map(it => [it.l, it.n, fmtVnd(it.vnd) + " đ"]);
      const elPkg = document.getElementById("gridPkgBox");
      if (elPkg) {
        elPkg.innerHTML = "";
        new gridjs.Grid({
          columns: ["Gói cước", "Đơn", "Doanh thu"],
          data: pkgData,
          pagination: { limit: 5 },
          className: { table: 'w-full text-xs text-left' }
        }).render(elPkg);
      }

      const rankData = Object.values(mt).sort((a,c) => c.vnd - a.vnd).map((m, idx) => [`#${idx + 1} - Tháng ${monthLbl(m.k)}`, m.n, fmtVnd(m.vnd) + " đ"]);
      const elRank = document.getElementById("gridRankBox");
      if (elRank) {
        elRank.innerHTML = "";
        new gridjs.Grid({
          columns: ["Tháng", "Số đơn", "Doanh thu"],
          data: rankData,
          pagination: { limit: 5 },
          className: { table: 'w-full text-xs text-left' }
        }).render(elRank);
      }
    }
  }, 60);
}

// SUB-TAB 2: THANH TOÁN & BẢNG TỶ GIÁ TẬP TRUNG (CENTRALIZED EXCHANGE RATE TABLE)
const PAYLBL = { Bank: "🏦 Ngân hàng VN", Alipay: "🔵 Alipay", Weixin: "🟢 WeChat" };

function revPay(R, b){
  if (revPayView) { revPayDetail(b); return; }
  const r = getCentralRates();
  const m = { Bank: { n: 0, vnd: 0, cny: 0 }, Alipay: { n: 0, vnd: 0, cny: 0 }, Weixin: { n: 0, vnd: 0, cny: 0 } };
  R.forEach(x => { const e = m[x.pay]; e.n++; e.vnd += x.vnd; e.cny += x.cny; });
  const total = m.Bank.vnd + m.Alipay.vnd + m.Weixin.vnd;

  const cardPay = (title, k, colorCls, icon) => `
    <div onclick="setRevPayView('${k}')" class="cursor-pointer bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition rounded-2xl p-4 shadow-sm">
      <div class="flex justify-between items-center mb-1">
        <div class="font-extrabold text-sm ${colorCls} flex items-center gap-1.5"><i class="${icon}"></i>${title}</div>
        <i class="fas fa-arrow-right text-slate-300 text-xs"></i>
      </div>
      <div class="text-[11px] text-slate-500 mb-2">${m[k].n} đơn thành công · bấm để xem chi tiết</div>
      ${k === "Bank" ? `<div class="text-xl font-black text-slate-800">${fmtVnd(m[k].vnd)}đ</div>` : `
        <div class="text-xl font-black text-slate-800">¥${(Math.round(m[k].cny*100)/100).toLocaleString("en-US")}</div>
        <div class="text-[11px] font-bold text-slate-500 mt-0.5">≈ ${fmtVnd(m[k].vnd)}đ (tỷ giá ${fmtVnd(r.vndCny)})</div>
      `}
    </div>
  `;

  b.innerHTML = `
    <!-- BẢNG QUY ĐỔI TỶ GIÁ TẬP TRUNG (CENTRALIZED EXCHANGE RATE TABLE) -->
    <div class="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="font-black text-sm text-indigo-900 flex items-center gap-2">
          <i class="fas fa-money-bill-transfer text-indigo-600"></i>Bảng Quy Đổi Tỷ Giá Tập Trung (Dùng chung Doanh thu & Cửa hàng)
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="saveCentralRates()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm flex items-center gap-1 transition active:scale-95">
            <i class="fas fa-save mr-1"></i>LƯU BẢNG TỶ GIÁ
          </button>
          <button type="button" onclick="syncRatesToPackages()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-sm flex items-center gap-1 transition active:scale-95" title="Tự động tính lại giá VND, CNY, USD cho toàn bộ gói cước">
            <i class="fas fa-rotate mr-1"></i>ĐỒNG BỘ VÀO GÓI CƯỚC
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div class="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
          <label class="block font-bold text-slate-600 mb-1">Tỷ giá VND ⟷ CNY (P2P)</label>
          <div class="relative">
            <input type="number" id="rateVndCny" step="10" value="${r.vndCny}" placeholder="VD: 3600" class="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-indigo-700 outline-none pr-12">
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VND/¥</span>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 block">1 CNY = ${fmtVnd(r.vndCny)} VND</span>
        </div>

        <div class="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
          <label class="block font-bold text-slate-600 mb-1">Tỷ giá CNY ⟷ USD (P2P)</label>
          <div class="relative">
            <input type="number" id="rateCnyUsd" step="0.01" value="${r.cnyUsd}" placeholder="VD: 7.25" class="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-blue-700 outline-none pr-12">
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">¥/$</span>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 block">1 USD = ${r.cnyUsd} CNY</span>
        </div>

        <div class="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
          <label class="block font-bold text-slate-600 mb-1">Tỷ giá VND ⟷ USD (P2P)</label>
          <div class="relative">
            <input type="number" id="rateVndUsd" step="100" value="${r.vndUsd}" placeholder="VD: 26100" class="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-emerald-700 outline-none pr-12">
            <span class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VND/$</span>
          </div>
          <span class="text-[10px] text-slate-400 mt-1 block">1 USD = ${fmtVnd(r.vndUsd)} VND</span>
        </div>
      </div>
    </div>

    <!-- 3 THẺ CỔNG THANH TOÁN -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      ${cardPay("Ngân hàng VN", "Bank", "text-indigo-600", "fas fa-building-columns")}
      ${cardPay("Alipay", "Alipay", "text-sky-600", "fab fa-alipay")}
      ${cardPay("WeChat", "Weixin", "text-emerald-600", "fab fa-weixin")}
    </div>

    <div class="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white shadow-lg flex items-center justify-between flex-wrap gap-3">
      <div>
        <div class="text-xs font-bold opacity-80 uppercase">Tổng Doanh Thu Tất Cả Các Cổng (Đã quy đổi VND)</div>
        <div class="text-3xl font-black mt-1">${fmtVnd(total)}đ</div>
      </div>
      <div class="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-sm">
        ${R.length} đơn thành công
      </div>
    </div>
  `;
}

async function saveCentralRates(){
  const vndCny = Number($("rateVndCny").value) || 0;
  const cnyUsd = Number($("rateCnyUsd").value) || 0;
  const vndUsd = Number($("rateVndUsd").value) || 0;
  if (vndCny <= 0 || cnyUsd <= 0 || vndUsd <= 0) return toast("Vui lòng nhập đầy đủ 3 tỷ giá lớn hơn 0", "warn");
  cmsDb.settings = cmsDb.settings || {};
  cmsDb.settings.rates = { vndCny, cnyUsd, vndUsd };
  cmsDb.settings.cnyRate = vndCny; // Tương thích ngược
  try {
    await saveCmsDb();
    toast("Đã lưu Bảng Quy Đổi Tỷ Giá Tập Trung thành công!");
    logEvent("ok", "Tỷ giá trung tâm", `VND/CNY: ${vndCny} · CNY/USD: ${cnyUsd} · VND/USD: ${vndUsd}`);
    renderRevenue();
  } catch(e) {
    toast("Lỗi lưu tỷ giá: " + e.message, "err");
  }
}

async function syncRatesToPackages(){
  const r = getCentralRates();
  if (!Array.isArray(adminPkgsList) || !adminPkgsList.length) return toast("Chưa tải danh sách gói cước", "warn");
  adminPkgsList.forEach(p => {
    if (p.isCustom) return;
    if (p.vnd > 0) {
      // Tự động tính giá CNY và USD theo VND thực thu
      p.cny = Math.round((p.vnd / r.vndCny) * 2) / 2; // làm tròn 0.5
      p.usd = Math.round((p.vnd / r.vndUsd) * 2) / 2; // làm tròn 0.5
    }
  });
  try {
    await aj("/api/packages", { method: "POST", body: { packages: adminPkgsList } });
    toast("Đã tự động quy đổi và đồng bộ giá CNY & USD cho toàn bộ gói cước!");
    if (!$("t-pkg").classList.contains("hidden")) renderPkgAdmin();
  } catch(e) {
    toast("Lỗi đồng bộ gói cước: " + e.message, "err");
  }
}

// BẢNG DRILL-DOWN CHI TIẾT CỔNG THANH TOÁN BẰNG GRID.JS
function revPayDetail(b){
  const k = revPayView;
  const list = ordersDb.filter(o => payOf(o) === k && (revMonth === "all" || monthInfo(oTs(o)).key === revMonth)).sort((a,c) => oTs(c) - oTs(a));
  const ok = list.filter(o => normSt(o.status) === "success").length;

  b.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <button onclick="setRevPayView(null)" class="bg-white border border-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs shadow-sm hover:bg-slate-50 transition flex items-center gap-1.5">
        <i class="fas fa-arrow-left"></i>Quay lại danh sách cổng
      </button>
      <div class="text-xs font-bold text-slate-600">
        ${PAYLBL[k]} · ${list.length} đơn (${ok} thành công) · <span class="text-indigo-600">Hiển thị dạng Grid.js</span>
      </div>
    </div>
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div id="gridPayDetailBox"></div>
    </div>
  `;

  setTimeout(() => {
    if (typeof gridjs !== "undefined") {
      const dataRows = list.map(o => [
        o.id,
        o.email || "-",
        pkgLabel(o),
        o.status === "success" ? "Thành công" : (o.status === "pending" ? "Đang chờ" : "Thất bại"),
        fmtVnd(o.totalVnd || 0) + " đ",
        dmyOf(oTs(o))
      ]);
      const el = document.getElementById("gridPayDetailBox");
      if (el) {
        el.innerHTML = "";
        new gridjs.Grid({
          columns: ["Mã đơn", "Email khách", "Gói cước", "Trạng thái", "Số tiền (VND)", "Ngày tạo"],
          data: dataRows,
          search: true,
          pagination: { limit: 10 },
          sort: true,
          className: { table: 'w-full text-xs text-left' }
        }).render(el);
      }
    }
  }, 50);
}

// SUB-TAB 3: QUẢN LÝ CHI PHÍ VỐN (GRID.JS & CURRENCY.JS)
function revCost(R, b){
  const cs = costSum();
  const sum = R.reduce((a, x) => a + x.vnd, 0);
  const list = [...(cmsDb.costs || [])].filter(c => revMonth === "all" || monthInfo(c.ts).key === revMonth).sort((a,c) => c.ts - a.ts);

  b.innerHTML = `
    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div class="font-bold text-sm text-slate-800 flex items-center gap-2">
        <i class="fas fa-file-invoice text-orange-500"></i>Thêm Khoản Chi Phí Vốn (Mua nguồn VPN / Server)
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <input id="cSrc" placeholder="Nguồn mua (VD: Liangxin, DJJC, Kitty)" class="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500">
        <input id="cItem" placeholder="Tên gói / Node VPN gốc" class="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500">
        <input id="cQty" type="number" placeholder="Số lượng" class="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500">
        <input id="cUnit" type="number" step="any" placeholder="Đơn giá" class="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500">
        <select id="cCur" class="p-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-700 outline-none">
          <option value="VND">VND (đ)</option>
          <option value="CNY">CNY (¥)</option>
          <option value="USD">USD ($)</option>
        </select>
        <input id="cDate" placeholder="DD/MM/YYYY" value="${dmyOf(nowMs())}" class="p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500 text-center">
        <input id="cNote" placeholder="Ghi chú chi phí" class="col-span-2 p-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:border-indigo-500">
      </div>
      <button onclick="addCost()" class="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5">
        <i class="fas fa-plus"></i>GHI NHẬN CHI PHÍ VỐN
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      ${kpi("Tổng Chi Phí Vốn", fmtVnd(cs.total) + "đ", "Đã quy đổi VND", "text-orange-500")}
      ${kpi("Doanh Thu Thuần", fmtVnd(sum) + "đ", `${R.length} đơn thành công`)}
      ${kpi("Lợi Nhuận Sau Vốn", fmtVnd(sum - cs.total) + "đ", sum ? Math.round((sum - cs.total) / sum * 100) + "% doanh thu" : "", sum - cs.total >= 0 ? "text-emerald-600" : "text-rose-600")}
    </div>

    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div class="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
        <span class="flex items-center gap-2"><i class="fas fa-list-check text-indigo-600"></i>Danh sách Chi phí vốn đã ghi nhận</span>
        <span class="text-[10px] font-bold text-slate-400">Quản lý bằng Grid.js</span>
      </div>
      <div id="gridCostBox"></div>
    </div>
  `;

  setTimeout(() => {
    if (typeof gridjs !== "undefined") {
      const el = document.getElementById("gridCostBox");
      if (el) {
        el.innerHTML = "";
        const costRows = list.map(c => [
          dmyOf(c.ts),
          c.src,
          c.item || "-",
          c.qty,
          (c.cur === "CNY" ? "¥" : (c.cur === "USD" ? "$" : "")) + Number(c.unit).toLocaleString("en-US") + (c.cur === "VND" ? " đ" : ""),
          (c.cur === "CNY" ? "¥" : (c.cur === "USD" ? "$" : "")) + Number(c.total).toLocaleString("en-US") + (c.cur === "VND" ? " đ" : ""),
          gridjs.html(`<button onclick="delCost('${c.id}')" class="text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 font-bold px-2 py-1 rounded transition text-xs"><i class="fas fa-trash"></i></button>`)
        ]);
        new gridjs.Grid({
          columns: ["Ngày mua", "Nguồn mua", "Mô tả / Gói", "SL", "Đơn giá", "Thành tiền", "Thao tác"],
          data: costRows,
          search: true,
          pagination: { limit: 10 },
          sort: true,
          className: { table: 'w-full text-xs text-left' }
        }).render(el);
      }
    }
  }, 50);
}

async function addCost(){
  const src = $("cSrc").value.trim(), qty = +$("cQty").value || 0, unit = +$("cUnit").value || 0;
  if (!src || qty <= 0 || unit <= 0) return toast("Vui lòng nhập nguồn mua, số lượng và đơn giá", "warn");
  const m = $("cDate").value.trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const ts = m ? Date.UTC(+m[3], m[2]-1, +m[1]) - off()*36e5 : nowMs();
  cmsDb.costs = arr(cmsDb.costs);
  cmsDb.costs.push({
    id: "C-" + Date.now(),
    ts, src, item: $("cItem").value.trim(),
    qty, unit, cur: $("cCur").value,
    total: curVal(qty).multiply(unit).value,
    note: $("cNote").value.trim()
  });
  try {
    await saveCmsDb();
    toast("Đã thêm khoản chi phí vốn thành công!");
    logEvent("ok", "Chi phí vốn", `${src} · ${qty} x ${unit} ${$("cCur").value}`);
    renderRevenue();
  } catch(e) {
    toast("Lỗi lưu chi phí: " + e.message, "err");
  }
}

async function delCost(id){
  if (!confirm("Bạn có chắc muốn xóa khoản chi phí vốn này?")) return;
  cmsDb.costs = arr(cmsDb.costs).filter(c => c.id !== id);
  try {
    await saveCmsDb();
    toast("Đã xóa khoản chi phí thành công!");
    renderRevenue();
  } catch(e) {
    toast("Lỗi xóa: " + e.message, "err");
  }
}

// ===================== SOẠN MAIL (Mẫu hệ thống + Mẫu tự do) =====================
const MC_COLORS={indigo:["#4f46e5","#8b5cf6"],red:["#ef4444","#b91c1c"],green:["#10b981","#059669"],blue:["#2563eb","#6366f1"],amber:["#f59e0b","#d97706"],purple:["#7e22ce","#a855f7"]};
const MC_BT=[["text","Đoạn văn","fa-paragraph"],["orderid","Mã đơn hàng","fa-hashtag"],["box","Khung nổi bật","fa-square"],["info","Bảng thông tin","fa-table-list"],["portal","Nút vào cổng","fa-arrow-up-right-from-square"],["support","Khối hỗ trợ","fa-headset"],["img","Ảnh","fa-image"],["divider","Đường kẻ","fa-minus"],["spacer","Cách dòng","fa-arrows-up-down"]];
const MC_VARS_BASE=[["{email}","Email khách"],["{orderId}","Mã đơn hàng"],["{pkg}","Gói VPN"],["{exp}","Ngày hết hạn"]];
const MC_VARS_SYS=[["{pkgName}","Tên gói"],["{daysLeft}","Số ngày còn lại"],["{expText}","Câu nhắc hạn (mẫu sắp hết hạn)"],["{reason}","Lý do từ chối (mẫu thất bại)"],["{gb}","Số GB (mẫu dung lượng)"]];
const MC_SYS_KEYS=["support","success","failed","exp","data"];
const MC_SYS_NAMES={support:"1. Hỗ trợ cài đặt",success:"2. Kích hoạt thành công",failed:"3. Kích hoạt thất bại",exp:"4. VPN sắp hết hạn",data:"5. Báo cáo dung lượng"};
const MC_PRESETS={
 maint:{name:"Thông báo bảo trì",subject:"VPN Trinh Hg - Thông báo bảo trì hệ thống",title:"THÔNG BÁO\nBẢO TRÌ HỆ THỐNG",c1:MC_COLORS.amber[0],c2:MC_COLORS.amber[1],blocks:[{t:"text",x:"Xin chào {email},"},{t:"text",x:"Hệ thống sẽ bảo trì từ [giờ bắt đầu] đến [giờ kết thúc] ngày [ngày]. Trong thời gian này dịch vụ có thể gián đoạn ngắn, rất mong bạn thông cảm."},{t:"orderid"},{t:"portal",x:"TRUY CẬP CỔNG KHÁCH HÀNG"},{t:"support"}]},
 info:{name:"Thông báo chung",subject:"VPN Trinh Hg - Thông báo",title:"THÔNG BÁO\nTỪ VPN TRINH HG",c1:MC_COLORS.indigo[0],c2:MC_COLORS.indigo[1],blocks:[{t:"text",x:"Xin chào {email},"},{t:"text",x:"Nội dung thông báo..."},{t:"orderid"},{t:"portal",x:"TRUY CẬP CỔNG KHÁCH HÀNG"},{t:"support"}]},
 promo:{name:"Ưu đãi / khuyến mãi",subject:"VPN Trinh Hg - Ưu đãi dành cho bạn",title:"ƯU ĐÃI\nDÀNH RIÊNG CHO BẠN",c1:MC_COLORS.green[0],c2:MC_COLORS.green[1],blocks:[{t:"text",x:"Xin chào {email},",b:1},{t:"text",x:"Gói {pkg} của bạn sẽ hết hạn ngày {exp}. Gia hạn sớm để nhận ưu đãi..."},{t:"portal",x:"GIA HẠN NGAY TẠI WEBSITE"},{t:"support"}]}};
let mc={subject:"",title:"",color:"indigo",c1:"#4f46e5",c2:"#8b5cf6",ang:135,stop:100,blocks:[]},mcTab="sys",mcInited=false,mcCurKey="",mcRecs=[],mcStop=false,mcSending=false,mcSel=-1,mcLastFocusEl=null;
document.addEventListener("focusin",e=>{const t=e.target;if(t&&t.classList&&t.classList.contains("mc-ins"))mcLastFocusEl=t;});
const mcColorName=(c1,c2)=>Object.keys(MC_COLORS).find(k=>MC_COLORS[k][0].toLowerCase()===String(c1).toLowerCase()&&MC_COLORS[k][1].toLowerCase()===String(c2).toLowerCase())||"custom";
const mcClone=b=>JSON.parse(JSON.stringify(b||[]));
function tplToMc(t){const c1=t.c1||"#4f46e5",c2=t.c2||"#8b5cf6";return{subject:t.subject||"",title:String(t.title||"").replace(/\\n/g,"\n"),c1,c2,color:mcColorName(c1,c2),ang:Number(t.ang)||135,stop:Number(t.stop)||100,blocks:mcClone(t.blocks)};}
const mcToTpl=()=>({subject:mc.subject,title:mc.title,c1:mc.c1,c2:mc.c2,ang:Number(mc.ang)||135,stop:Number(mc.stop)||100,blocks:mcClone(mc.blocks)});
function mcSampleVars(){const base={email:"khachhang@gmail.com",orderId:"DHXXXXXXXXXX",pkgName:"Gói 1 tháng",pkg:"Gói 1 tháng - 60,000VND",exp:"30/10/2026",daysLeft:2,nickname:"",zalo:"",reason:"Không nhận được thanh toán",expText:"còn **2 ngày** (hết hạn **30/10/2026**)",gb:"120"};return base;}
function mcRenderTabs(){
 ["sys","free"].forEach(t=>$("mcTab-"+t).classList.toggle("active",mcTab===t));
 $("mcRecipPanel").classList.toggle("hidden",mcTab!=="free");
 $("mcHint").innerHTML=mcTab==="sys"?"5 mẫu mail tự động của hệ thống. <b>Lưu mẫu</b> = bản đã lưu trở thành mẫu production mặc định (Worker dùng khi gửi thật). Không có quét danh sách / gửi thử — production quyết định khi nào gửi. Biến như <b>{email}</b> <b>{orderId}</b> <b>{pkgName}</b> được thay theo từng đơn.":"Soạn mail tự do gửi cho khách còn đơn còn hạn. Dùng <b>{email}</b> <b>{orderId}</b> <b>{pkg}</b> <b>{exp}</b>, hệ thống thay theo từng người nhận. Có thể Lưu mẫu / Nạp mẫu để dùng lại.";
 $("mcExtraBtn").innerHTML=mcTab==="sys"?'<i class="fas fa-rotate-left mr-1"></i>Khôi phục mặc định':'<i class="fas fa-trash mr-1"></i>Xóa mẫu đã lưu';}
function mcRenderPresetOptions(keep){
 const sys=cmsDb.mailSys||{},fr=cmsDb.mailFree||{};
 $("mcPreset").innerHTML=mcTab==="sys"?MC_SYS_KEYS.map(k=>`<option value="sys:${k}">${esc(MC_SYS_NAMES[k])}${sys[k]?" · đã tùy chỉnh":""}</option>`).join(""):
  `<optgroup label="Mẫu có sẵn">${Object.keys(MC_PRESETS).map(k=>`<option value="builtin:${k}">${esc(MC_PRESETS[k].name)}</option>`).join("")}</optgroup>`+(Object.keys(fr).length?`<optgroup label="Mẫu đã lưu">${Object.entries(fr).map(([id,f])=>`<option value="saved:${esc(id)}">${esc(f.name||id)}</option>`).join("")}</optgroup>`:"");
 if(keep&&[...$("mcPreset").options].some(o=>o.value===keep))$("mcPreset").value=keep;}
function mcLoadPreset(){
 const v=$("mcPreset").value,i=v.indexOf(":"),kind=v.slice(0,i),key=v.slice(i+1);mcCurKey=v;
 if(kind==="sys")mc=tplToMc(getTpl(key));
 else if(kind==="saved"){const f=(cmsDb.mailFree||{})[key];if(!f)return toast("Không tìm thấy mẫu đã lưu","err");mc=tplToMc(f.tpl);}
 else mc=tplToMc(MC_PRESETS[key]||MC_PRESETS.info);
 mcSel=-1;mcRenderEditor();}
function mcSwitchTab(t){mcTab=t;mcRenderTabs();mcRenderPresetOptions();mcLoadPreset();}
function renderMailComposer(){
 if(!mcInited){mcInited=true;mcTab="sys";mcRenderTabs();mcRenderPresetOptions();mcLoadPreset();return;}
 mcRenderTabs();mcRenderEditor();}
function mcInsertVar(v){
 const el=mcLastFocusEl&&document.body.contains(mcLastFocusEl)?mcLastFocusEl:$("mcSubject");
 const s=el.selectionStart??el.value.length,e=el.selectionEnd??el.value.length;
 el.value=el.value.slice(0,s)+v+el.value.slice(e);el.focus();el.selectionStart=el.selectionEnd=s+v.length;
 el.dispatchEvent(new Event("input",{bubbles:true}));}
function mcRenderEditor(){
 const vars=mcTab==="sys"?[...MC_VARS_BASE,...MC_VARS_SYS]:MC_VARS_BASE;
 $("mcVarBtns").innerHTML=vars.map(([v,l])=>`<button type="button" onmousedown="event.preventDefault()" onclick="mcInsertVar('${v}')" class="bg-indigo-50 text-indigo-600 font-mono font-bold text-[10px] px-2 py-1 rounded hover:bg-indigo-100" title="${esc(l)}">${v}</button>`).join("");
 $("mcSubject").value=mc.subject;$("mcTitle").value=mc.title;$("mcColor").value=mc.color;$("mcC1").value=mc.c1;$("mcC2").value=mc.c2;
 $("mcStop").value=mc.stop;$("mcStopV").textContent=mc.stop;$("mcAng").value=mc.ang;$("mcAngV").textContent=mc.ang;
 $("mcAddBtns").innerHTML=`<span class="text-[10px] font-bold text-slate-400 px-1">THÊM KHỐI:</span>`+MC_BT.map(([t,l,ic])=>`<button onclick="mcAdd('${t}')" class="bg-white border shadow-sm px-2 py-1 rounded text-[11px] font-bold text-slate-700 hover:bg-slate-50"><i class="fas ${ic} mr-1"></i>${l}</button>`).join("");
 const tb=(i,k,on,ic)=>`<button onclick="mcSet(${i},'${k}',${on?0:1},true)" class="w-6 h-6 rounded border text-[10px] ${on?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-500"}"><i class="fas ${ic}"></i></button>`;
 $("mcList").innerHTML=mc.blocks.map((b,i)=>{const nm=(MC_BT.find(x=>x[0]===b.t)||[b.t,b.t])[1],txt=b.t==="text"||b.t==="box",ab=(txt||b.t==="img")?[["l","fa-align-left"],["c","fa-align-center"],["r","fa-align-right"]].map(([a,ic])=>`<button onclick="mcSet(${i},'al','${a}',true)" class="w-6 h-6 rounded border text-[10px] ${(b.al||"l")===a?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-500"}"><i class="fas ${ic}"></i></button>`).join(""):"";
  const tf=b.t==="text"?tb(i,"b",b.b,"fa-bold")+tb(i,"i",b.i,"fa-italic")+tb(i,"ul",b.ul,"fa-underline"):"";
  const sz=(b.t==="text"||b.t==="box")?`<select onchange="mcSet(${i},'sz',this.value,true)" class="h-6 text-[10px] border rounded bg-white"><option value="">Cỡ</option>${[["s","Nhỏ"],["m","Vừa"],["l","Lớn"],["xl","R.lớn"]].map(([v,l])=>`<option value="${v}" ${b.sz===v?"selected":""}>${l}</option>`).join("")}</select>`:"";
  const inp=(k,ph,cls)=>`<input value="${esc(b[k]||"")}" oninput="mcSet(${i},'${k}',this.value)" placeholder="${ph}" class="mc-ins w-full p-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none ${cls||""}">`;
  let body="";
  if(b.t==="text")body=`<textarea rows="3" oninput="mcSet(${i},'x',this.value)" class="mc-ins w-full p-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none">${esc(b.x||"")}</textarea><div class="text-[10px] text-slate-400">**chữ đậm** được hỗ trợ · chèn biến bằng các nút phía trên</div>`;
  else if(b.t==="box")body=inp("label","Nhãn khung (VD: LÝ DO TỪ CHỐI)")+`<textarea rows="2" oninput="mcSet(${i},'x',this.value)" class="mc-ins w-full p-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none">${esc(b.x||"")}</textarea><select onchange="mcSet(${i},'theme',this.value,true)" class="h-7 text-[11px] border rounded bg-white">${[["amber","Vàng"],["red","Đỏ"],["purple","Tím"],["blue","Xanh dương"],["green","Xanh lá"]].map(([v,l])=>`<option value="${v}" ${(b.theme||"amber")===v?"selected":""}>${l}</option>`).join("")}</select>`;
  else if(b.t==="orderid")body=inp("label","Nhãn (mặc định: MÃ ĐƠN HÀNG CỦA BẠN)")+`<div class="flex items-center gap-2 text-[11px] text-slate-500">Màu số mã <input type="color" value="${esc(b.color||mc.c1)}" oninput="mcSet(${i},'color',this.value)" class="h-7 w-10 border rounded"></div>`;
  else if(b.t==="portal")body=inp("x","Chữ trên nút");
  else if(b.t==="img")body=inp("u","https://... (link ảnh)","font-mono");
  else if(b.t==="spacer")body=`<input type="number" value="${b.h||16}" oninput="mcSet(${i},'h',this.value)" class="w-20 p-1 text-xs border rounded bg-white"> px`;
  else body=`<div class="text-[10px] text-slate-400">${b.t==="info"?"Bảng Email / Mã đơn / Gói / HSD — tự điền theo từng đơn":b.t==="support"?"Khối hỗ trợ Zalo / Messenger / Telegram / WeChat":"—"}</div>`;
  return `<div onclick="mcSel=${i}" class="bg-white border ${mcSel===i?"border-indigo-400":"border-slate-200"} rounded-lg p-2 space-y-1"><div class="flex items-center gap-1 flex-wrap"><span class="text-[11px] font-black text-slate-500 mr-1">${nm}</span>${ab}${tf}${sz}<div class="ml-auto flex gap-1"><button onclick="mcMove(${i},-1)" class="w-6 h-6 rounded border text-[10px] text-slate-500"><i class="fas fa-arrow-up"></i></button><button onclick="mcMove(${i},1)" class="w-6 h-6 rounded border text-[10px] text-slate-500"><i class="fas fa-arrow-down"></i></button><button onclick="mcDel(${i})" class="w-6 h-6 rounded border text-[10px] text-red-500"><i class="fas fa-xmark"></i></button></div></div>${body}</div>`;}).join("")||'<div class="text-xs text-slate-400 italic p-3 text-center">Chưa có khối nào</div>';
 mcPreview();}
function mcPreview(){
 const iframe = $("mcPreviewIframe");
 const rendered = mcToHtml();
 if (iframe) {
   iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet"><style>body{margin:0;padding:12px;background:#f1f5f9;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;}</style></head><body>${rendered}</body></html>`;
 }
 const el = $("mcPreview");
 if (el) el.innerHTML = rendered;
 $("mcGradBar").style.background = mailGrad(mc.c1, mc.c2, mc.ang, mc.stop);
}
function mcSet(i,k,v,re){mc.blocks[i][k]=v;if(re)mcRenderEditor();else mcPreview();}
function mcAdd(t){const nb={t};if(t==="text")nb.x="";if(t==="portal")nb.x="TRUY CẬP CỔNG KHÁCH HÀNG";if(t==="box"){nb.label="TIÊU ĐỀ";nb.x="Nội dung";nb.theme="amber";}if(t==="spacer")nb.h=16;if(t==="img")nb.u="";const at=mcSel>=0?mcSel+1:mc.blocks.length;mc.blocks.splice(at,0,nb);mcSel=at;mcRenderEditor();}
function mcMove(i,d){const j=i+d;if(j<0||j>=mc.blocks.length)return;[mc.blocks[i],mc.blocks[j]]=[mc.blocks[j],mc.blocks[i]];mcSel=j;mcRenderEditor();}
function mcDel(i){mc.blocks.splice(i,1);mcSel=-1;mcRenderEditor();}
function mcPickColor(k){mc.color=k;if(MC_COLORS[k]){mc.c1=MC_COLORS[k][0];mc.c2=MC_COLORS[k][1];}$("mcC1").value=mc.c1;$("mcC2").value=mc.c2;mcPreview();}
function mcColorInput(k,v){mc[k]=v;mc.color=mcColorName(mc.c1,mc.c2);$("mcColor").value=mc.color;mcPreview();}
function mcGrad(k,v){mc[k]=Number(v);$(k==="stop"?"mcStopV":"mcAngV").textContent=v;mcPreview();}
async function mcSaveTemplate(){
 const i=mcCurKey.indexOf(":"),kind=mcCurKey.slice(0,i),key=mcCurKey.slice(i+1);
 if(kind==="sys"){cmsDb.mailSys=cmsDb.mailSys||{};cmsDb.mailSys[key]=mcToTpl();if(!cmsDb.mailSys[key].subject)cmsDb.mailSys[key].subject=SYS_TPL[key].subject;
  try{await saveCmsDb();toast("Đã lưu — trở thành mẫu production mặc định cho \""+MC_SYS_NAMES[key].replace(/^\d\.\s/,"")+"\"");logEvent("ok","Soạn mail","Lưu mẫu hệ thống: "+key);mcRenderPresetOptions(mcCurKey);}catch(e){toast("Lỗi lưu: "+e.message,"err");}return;}
 const cur=kind==="saved"?(cmsDb.mailFree||{})[key]:null;
 const name=prompt("Tên mẫu để lưu:",cur?cur.name:(mc.subject||"Mẫu mới"));if(!name||!name.trim())return;
 const id=cur?key:"f"+Date.now().toString(36);cmsDb.mailFree=cmsDb.mailFree||{};cmsDb.mailFree[id]={name:name.trim(),tpl:mcToTpl(),ts:nowMs()};
 try{await saveCmsDb();toast("Đã lưu mẫu \""+name.trim()+"\"");mcCurKey="saved:"+id;mcRenderPresetOptions(mcCurKey);}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
async function mcExtraAction(){
 const i=mcCurKey.indexOf(":"),kind=mcCurKey.slice(0,i),key=mcCurKey.slice(i+1);
 if(mcTab==="sys"){if(!(cmsDb.mailSys||{})[key])return toast("Mẫu này đang là mặc định","warn");if(!confirm("Khôi phục mẫu này về mặc định của hệ thống?"))return;delete cmsDb.mailSys[key];try{await saveCmsDb();toast("Đã khôi phục mặc định");mcRenderPresetOptions(mcCurKey);mcLoadPreset();}catch(e){toast("Lỗi lưu: "+e.message,"err");}return;}
 if(kind!=="saved")return toast("Chỉ xóa được mẫu do bạn đã lưu","warn");if(!confirm("Xóa mẫu đã lưu này?"))return;
 delete cmsDb.mailFree[key];try{await saveCmsDb();toast("Đã xóa mẫu");mcRenderPresetOptions();mcLoadPreset();}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
function mcScan(){
 const now=nowMs(),m=new Map();
 ordersDb.filter(o=>normSt(o.status)==="success"&&o.email).forEach(o=>{const life=isLife(o.expDate),end=life?Infinity:expEnd(o.expDate);if(!life&&(!end||end<now))return;const k=o.email.toLowerCase(),c=m.get(k);if(!c||oTs(o)>oTs(c))m.set(k,o);});
 mcRecs=[...m.values()].map(o=>({email:o.email,id:o.id,exp:o.expDate||"Vĩnh viễn",pkg:pkgLabel(o),o,sel:true,st:""})).sort((a,c)=>a.email.localeCompare(c.email));mcRenderRecs();toast(`Tìm thấy ${mcRecs.length} email còn đơn còn hạn`);}
function mcRenderRecs(){
 const el=$("mcRecs");if(!mcRecs.length){el.innerHTML='<div class="text-xs text-slate-400 italic">Không có email nào còn hạn.</div>';return;}
 const n=mcRecs.filter(r=>r.sel).length,ic={"":"",sending:'<i class="fas fa-spinner fa-spin text-indigo-500"></i>',ok:'<i class="fas fa-circle-check text-emerald-500"></i>',err:'<i class="fas fa-circle-xmark text-red-500"></i>'};
 el.innerHTML=`<label class="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2"><input type="checkbox" ${n===mcRecs.length?"checked":""} onchange="mcRecs.forEach(r=>r.sel=this.checked);mcRenderRecs()" class="w-4 h-4 accent-indigo-600">Chọn tất cả (${n}/${mcRecs.length})</label><div class="max-h-64 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">${mcRecs.map((r,i)=>`<label class="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50"><input type="checkbox" ${r.sel?"checked":""} onchange="mcRecs[${i}].sel=this.checked;mcRenderRecs()" class="w-4 h-4 accent-indigo-600"><span class="font-bold text-slate-700 truncate flex-1">${esc(r.email)}</span><span class="font-mono text-indigo-500">${esc(r.id)}</span><span class="text-slate-400 whitespace-nowrap">HSD ${esc(r.exp)}</span><span class="w-4 text-center">${ic[r.st]||""}</span></label>`).join("")}</div>`;}
async function mcSend(){
 if(mcSending)return;if(mcTab!=="free")return;if(!isMailMaster())return toast("Web đang ở chế độ SLAVE Email, không được gửi mail","err");
 const list=mcRecs.filter(r=>r.sel);if(!list.length)return toast("Chưa chọn email nào (bấm Quét danh sách)","err");
 const subj=(mc.subject||"").trim();if(!subj)return toast("Nhập tiêu đề (subject) mail","err");if(!mc.blocks.length)return toast("Mail chưa có nội dung","err");
 if(!confirm(`Bắn mail "${subj}" cho ${list.length} người?\nHệ thống gửi lần lượt từng người một, xong người này mới tới người kia.`))return;
 mcSending=true;mcStop=false;$("mcProg").classList.remove("hidden");let ok=0;const tpl=mcToTpl();
 
 // HẠNG MỤC 4: Gom toàn bộ nhật ký vào RAM trình duyệt, không gửi ghi KV từng mail một
 const batchLogs = [];
 
 for(let i=0;i<list.length;i++){
  if(mcStop){toast("Đã dừng theo yêu cầu","warn");break;}
  const r=list[i];r.st="sending";mcRenderRecs();$("mcProgTxt").textContent=`Đang gửi ${i+1}/${list.length}: ${r.email}`;
  try{
    const v=orderVars(r.o);
    await sendMailClient(r.email,subjVars(subj,v),mailRender(tpl,v,PD));
    r.st="ok";ok++;
    batchLogs.push({ lvl: "ok", act: "Gửi mail", msg: `Thông báo "${subj}" → ${r.email}`, ref: r.id });
  }catch(e){
    r.st="err";
    batchLogs.push({ lvl: "error", act: "Gửi mail", msg: `Lỗi "${subj}" → ${r.email}`, ref: r.id });
  }
  $("mcBar").style.width=Math.round((i+1)/list.length*100)+"%";mcRenderRecs();await sleep(1500);
 }

 // Gửi gom 1 request duy nhất lên Worker để ghi KV đúng 1 lần
 if(batchLogs.length){
   try{
     await aj("/api/admin/log_batch", { method: "POST", body: { logs: batchLogs }, soft: true });
   }catch(e){}
 }

 mcSending=false;$("mcProgTxt").textContent=`Hoàn tất: đã gửi ${ok}/${list.length} email. Đã gom log ghi KV 1 lần duy nhất.`;toast(`Đã gửi ${ok}/${list.length} email`);}

// ===================== DUNG LƯỢNG =====================
// Lấy nguyên tên gói từ Order theo chuẩn pkgLabel (so khớp orderId và email)
function dataPriceLabel(r){
 const oi=ordersDb.find(o=>normId(o.id)===normId(r.orderId) && String(o.email||"").toLowerCase()===String(r.email||"").toLowerCase());
 return oi ? pkgLabel(oi) : (r.pkgName||"—");
}
function renderDataRequests(){
 const tb=$("dataReqBody");if(!dataReqDb.length){tb.innerHTML=`<div class="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm font-bold">Không có yêu cầu nào</div>`;return;}
 const groups={};dataReqDb.forEach((r,i)=>{const mi=monthInfo(Number(r.ts)||parseAny(r.date));(groups[mi.key]=groups[mi.key]||{label:mi.label,items:[]}).items.push({r,i});});
 let html="";
 for(const key of Object.keys(groups).sort((a,b)=>b.localeCompare(a))){
  const g=groups[key];html+=`<div class="month-header"><i class="far fa-calendar-alt text-indigo-400"></i><span>${g.label}</span><span class="month-count">${g.items.length} yêu cầu</span></div><div class="space-y-3 mb-6">`;
  html+=g.items.map(({r,i})=>{const ok=r.status==="success";
   return `<div class="${ok?"bg-slate-50 border-slate-200 opacity-60":"bg-white border-2 border-dashed border-indigo-400"} rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"><div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1">${ok?'<div class="dot-green"></div>':'<div class="dot-yellow"></div>'}<span class="font-mono font-extrabold text-indigo-600 text-sm cp" onclick="cp(${q(r.orderId)})">${esc(r.orderId)}</span></div><div class="font-bold text-slate-800 text-xs cp truncate pl-5" onclick="cp(${q(r.email)})">${esc(r.email)}</div><div class="text-[11px] text-slate-500 mt-1 pl-5"><b>${esc(dataPriceLabel(r))}</b> - ${fmtBank(r.ts||r.date)}</div></div>
   <div class="flex gap-2 items-center"><div class="relative w-28"><input type="number" step="0.1" id="gb-input-${i}" placeholder="Số GB..." class="w-full p-2 text-xs border border-slate-300 rounded-lg outline-none font-bold bg-white text-center pr-8" ${ok?"disabled":""}><span class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">GB</span></div>
   <button onclick="sendDataReport(${i})" class="${ok?"bg-slate-300 text-slate-500 pointer-events-none":"bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"} font-bold px-3 py-2 rounded-lg text-xs flex items-center"><i class="fas fa-paper-plane mr-1.5"></i>${ok?"Đã Gửi":"Gửi Khách"}</button><button onclick="delDataRequest(${i})" class="text-red-500 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white px-3 py-2 rounded-lg"><i class="fas fa-trash"></i></button></div></div>`;}).join("");
  html+=`</div>`;}
 tb.innerHTML=html;}
async function sendDataReport(i){if(!isMailMaster())return toast("Đang ở chế độ SLAVE Email","err");const r=dataReqDb[i],gb=$("gb-input-"+i).value.trim();if(!gb)return toast("Nhập số GB!","err");
 sendMailClient(r.email,subjVars(getTpl("data").subject,dataVars(r,gb)),mailData(r,gb));r.status="success";renderDataRequests();await aj("/api/data_requests",{method:"POST",body:dataReqDb});lastSig.d=JSON.stringify(dataReqDb);logEvent("ok","Gửi mail","Báo cáo dung lượng → "+r.email,r.orderId);toast("Đã báo cáo cho khách");}
async function delDataRequest(i){dataReqDb.splice(i,1);renderDataRequests();await aj("/api/data_requests",{method:"POST",body:dataReqDb});lastSig.d=JSON.stringify(dataReqDb);}
async function clearDataRequests(){dataReqDb=[];renderDataRequests();await aj("/api/data_requests",{method:"POST",body:[]});lastSig.d="[]";toast("Đã dọn sạch");}

// ===================== GIAO DỊCH D1 (qua Worker) =====================
function switchTxTab(t){curTxTab=t;document.querySelectorAll("#t-trans .settings-sub-tab").forEach(b=>b.classList.remove("active"));$("tx-"+t).classList.add("active");const rv=t==="rev";$("txTableWrap").classList.toggle("hidden",rv);$("revPane").classList.toggle("hidden",!rv);if(rv)renderRevenue();else renderTransactions();}
const extractOrder=raw=>{if(!raw)return null;const m=String(raw).replace(/[-_.\s]/g,"").toUpperCase().match(/(DH[A-Z0-9]{10})/);return m?m[1]:null;};
function mergeTx(list){const map=new Map(txData.map(t=>[t.id,t]));list.forEach(t=>{map.set(t.id,t);if(t.updated_at&&t.updated_at>txSince)txSince=t.updated_at;});txData=[...map.values()].sort((a,b)=>b.id-a.id).slice(0,300);}
async function loadTx(force){
 clearTimeout(txPollT);
 try{
  const first=force||!txData.length;
  const j=await aj(first?"/api/admin/tx?status=all&limit=100":`/api/admin/tx?status=all&limit=100&updated_since=${encodeURIComponent(txSince||"2000-01-01 00:00:00")}`);
  if(first){txData=[];txSince="";}
  const list=arr(j&&j.transactions);mergeTx(list);txFails=0;
  if(!$("t-trans").classList.contains("hidden")){if(curTxTab!=="rev")renderTransactions();}else{const seen=+localStorage.getItem(SITE_KEY+"_txSeen")||0;const n=txData.filter(t=>/unmatched|review|mismatch/.test(t.status)&&parseAny(t.created_at)>seen).length;if(n){$("transBadge").innerText=n;$("transBadge").classList.remove("hidden");}}
 }catch(e){txFails++;if(!txData.length&&!$("t-trans").classList.contains("hidden"))$("transBody").innerHTML=`<tr><td colspan="10" class="text-center py-8 text-slate-400 font-bold">Lỗi tải giao dịch: ${esc(e.message)}</td></tr>`;}
 const active=!$("t-trans").classList.contains("hidden");
 txPollT=setTimeout(()=>{if(document.hidden)return loadTx();loadTx();},document.hidden?30000:Math.min(30000,(active?5000:20000)*(1+txFails)));}
const kindBadge=k=>k==="upgrade"?`<span class="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-black uppercase ml-1">NÂNG CẤP</span>`:k==="renew"?`<span class="bg-sky-100 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[9px] font-black uppercase ml-1">GIA HẠN</span>`:`<span class="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black uppercase ml-1">MỚI</span>`;
// Xóa thật trong D1 qua Worker (/api/admin/tx/:id/delete) — confirm, xóa server, rồi tải lại từ D1 (không chỉ xóa trên UI). Dùng chung cho bảng Đối soát và Giao dịch thô.
async function deleteTx(id){
 if(!confirm(`Xóa hẳn giao dịch #${id} khỏi D1? Hành động này không thể hoàn tác.`))return;
 try{const j=await aj("/api/admin/tx/"+id+"/delete",{method:"POST"});if(j&&j.ok===false)throw new Error(j.error||"D1 từ chối xóa");txData=txData.filter(t=>t.id!==id);renderTransactions();toast("Đã xóa giao dịch #"+id);logEvent("warn","admin","Xóa giao dịch D1","#"+id);await loadTx(true);}
 catch(e){toast("Lỗi xóa: "+e.message,"err");}}
const delBtn=id=>`<button onclick="deleteTx(${id})" title="Xóa hẳn khỏi D1" class="bg-red-50 text-red-600 border border-red-100 hover:bg-red-500 hover:text-white font-bold w-9 h-8 rounded-lg text-xs"><i class="fas fa-trash"></i></button>`;
function renderTransactions(){
 const th=$("transHead"),tb=$("transBody");if(curTxTab==="rev")return;
 if(!txData.length){th.innerHTML="";tb.innerHTML='<tr><td colspan="10" class="text-center py-8 text-slate-400 font-bold">Không có giao dịch nào</td></tr>';return;}
 if(curTxTab==="giamsat"){
  th.innerHTML='<tr><th>STT</th><th>Mã Đơn</th><th>Giờ Tạo Đơn</th><th>Email Khách</th><th>Tiền Thu & SL</th><th>Nguồn Web</th><th>Mã CK (Regex)</th><th>Trạng Thái</th><th class="col-ok">Khớp</th><th class="col-x">Xóa</th></tr>';
  tb.innerHTML=txData.map((tx,i)=>{
   const oId=tx.order_id||"Trống",oi=ordersDb.find(o=>normId(o.id)===normId(oId)),mo=tx.matchedOrder||{};
   const email=oi?.email||mo.email||"Chưa xác định",tc=oi?fmtBank(oTs(oi)):(mo.created_at?fmtBank(mo.created_at):"—"),web=webLabel(oi?.sourceWeb||oi?.target_web||mo.target_web,mo.worker_url);
   const amt=Number(tx.amount);
   const sl=oi && oi.qty ? Number(oi.qty) : 1;
   const rx=extractOrder(tx.notification||tx.content),s=tx.status;
   const badge=/^(success|paid)$/.test(s)?["emerald","success"]:s==="pending"?["orange","pending"]:s==="unmatched"?["slate","unmatched"]:/reject|invalid|failed/.test(s)?["rose","failed"]:["yellow",s];
   const kind=tx.kind||mo.order_type||(oi?.isUpgrade?"upgrade":(oi?.orderType==="renew"?"renew":"new"));
   let oIdBadge = "bg-slate-100 text-slate-600 border-slate-200";
   if (oId === "Trống" || !oId) {
     oIdBadge = "bg-slate-100 text-slate-500 border-slate-200";
   } else if (kind === "upgrade") {
     oIdBadge = "bg-purple-100 text-purple-800 border-purple-200";
   } else if (kind === "renew") {
     oIdBadge = "bg-sky-100 text-sky-800 border-sky-200";
   } else {
     oIdBadge = "bg-emerald-100 text-emerald-800 border-emerald-200";
   }
   return `<tr>
    <td class="text-xs font-bold text-slate-400">${i+1}</td>
    <td><span class="font-mono font-black text-xs px-2 py-1 rounded-md border cp inline-block ${oIdBadge}" onclick="cp(${q(oId)})">${esc(oId)}</span></td>
    <td class="text-xs text-slate-600 whitespace-nowrap">${tc}</td>
    <td class="text-xs font-bold text-slate-700 cp" onclick="cp(${q(email)})">${esc(email)}</td>
    <td><span class="font-black text-rose-600 whitespace-nowrap">${amt.toLocaleString("en-US")}VND</span> <span class="text-xs text-slate-500 font-bold">x${sl}</span></td>
    <td class="text-xs font-bold text-slate-500">${esc(web)}</td>
    <td>${rx?`<span class="font-bold text-[11px] cp text-slate-700" onclick="cp('${rx}')">${rx}</span>`:'<span class="text-slate-400 font-bold text-xs">Trống</span>'}</td>
    <td><span class="bg-${badge[0]}-100 text-${badge[0]}-700 border border-${badge[0]}-200 px-2 py-1 rounded text-[10px] font-bold uppercase" title="${esc(tx.review_note||"")}">${esc(badge[1])}</span></td>
    <td class="col-ok">${/^(success|paid|rejected)$/.test(s)?'<span class="text-slate-300">—</span>':`<button onclick="approveTransaction(${tx.id})" title="Ép khớp giao dịch" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-8 h-8 rounded-lg shadow text-xs flex items-center justify-center mx-auto transition active:scale-95"><i class="fas fa-bolt"></i></button>`}</td>
    <td class="col-x">${delBtn(tx.id)}</td>
   </tr>`;}).join("");
 }else{
  th.innerHTML='<tr><th>STT</th><th>Thời Gian</th><th>Số Tiền</th><th>Nội Dung Thô</th><th class="col-x">Xóa</th></tr>';
  tb.innerHTML=txData.map((tx,i)=>`<tr><td class="text-xs text-slate-500 font-bold">${i+1}</td><td class="text-xs text-slate-600 whitespace-nowrap">${fmtBank(tx.created_at)}</td><td class="font-black text-rose-600 whitespace-nowrap">${Number(tx.amount).toLocaleString("en-US")}VND</td><td class="font-mono text-[11px] text-slate-600 bg-slate-50 whitespace-normal break-words min-w-[250px]">${esc(tx.notification||tx.content||"—")}</td><td class="col-x">${delBtn(tx.id)}</td></tr>`).join("");}}
async function approveTransaction(id){
 const tx=txData.find(t=>t.id===id);let oid=extractOrder(tx?.notification||tx?.content)||tx?.order_id||"";
 if(oid){if(!confirm(`ÉP KHỚP giao dịch #${id} cho đơn ${oid}?\nHệ thống sẽ chuyển Success và cấp link.`))return;}else{oid=prompt("Nhập Mã Đơn (DHXXXXXXXXXX) muốn chốt cho giao dịch này:","");if(!oid)return;}
 oid=normId(oid);toast("Đang ép khớp...");
 try{await aj("/api/admin/tx/"+id+"/approve",{method:"POST",body:{orderId:oid,note:"Duyệt tay qua Admin UI"}});toast("Đã ép khớp, hệ thống đang cấp link");if(tx){tx.status="success";tx.order_id=oid;}renderTransactions();setTimeout(pollMain,2500);setTimeout(()=>loadTx(),1500);}
 catch(e){if(e.message!=="401")toast("Lỗi: "+e.message,"err");}}
// ===================== LINK SUB =====================
// 1. Hàm nhận diện nhà mạng (Khai báo dạng function chuẩn để hoist lên đầu phạm vi)
function detectProvider(u) {
  const s = String(u || "").toLowerCase();
  if (s.includes("tohno-1.top") || s.includes("oosaka") || s.includes("kitty")) return "kt";
  if (s.includes("liangxin")) return "lx";
  if (s.includes("djjc")) return "dj";
  return "other";
}

function buildMasked(orig, fresh, orig2) {
  const tok = genHex(32);
  const p1 = detectProvider(orig);
  const p2 = orig2 ? detectProvider(orig2) : null;
  if (p2) {
    const s = new Set([p1, p2]);
    if (s.has("lx") && s.has("kt")) return PD + "/v4/VPNTrinhHg?liki=" + tok + "#VPNTrinhHg";
    if (s.has("lx") && s.has("dj")) return PD + "/v5/VPNTrinhHg?lidj=" + tok + "#VPNTrinhHg";
    if (s.has("kt") && s.has("dj")) return PD + "/v6/VPNTrinhHg?kidj=" + tok + "#VPNTrinhHg";
    return PD + "/v5/VPNTrinhHg?lidj=" + tok + "#VPNTrinhHg";
  }
  if (p1 === "kt") return PD + "/v3/VPNTrinhHg?top=" + tok + "#VPNTrinhHg";
  if (p1 === "dj") return PD + "/v2/VPNTrinhHg?token=" + tok + "#VPNTrinhHg";
  return PD + "/v1/VPNTrinhHg?OwO=" + tok + "#VPNTrinhHg";
}

// Hàm mở Modal Sửa Nguồn Cấp Cụm (Cây bút chì sửa cụm link)
function openRootEditModal(groupKey){
  const parts = groupKey.split("|");
  const isCombo = (parts[0] === "COMBO");
  const o1 = isCombo ? parts[1] : groupKey;
  const o2 = isCombo ? parts[2] : "";

  $("mREGroupKey").value = groupKey;
  $("mREOrig1").value = o1;
  $("mREOrig2").value = o2;

  // Nạp thông số hiện tại từ Kho sang Modal để sửa
  const p = linkPoolDb.find(x => isCombo ? (x.isCombo && x.url === o1 && x.url2 === o2) : (!x.isCombo && x.url === o1)) || {};
  
  // Thông số Chân 1
  $("mREGb").value = p.gb || "";
  $("mRERemain").value = p.remainGb || "";
  $("mREExp").value = p.exp || "";
  $("mREMax").value = p.max || 30;

  // Thông số Chân 2
  $("mREGb2").value = p.gb2 || "";
  $("mRERemain2").value = p.remainGb2 || "";
  $("mREExp2").value = p.exp2 || "";
  $("mREMax2").value = p.max2 || 30;

  $("mRootEdit").classList.remove("hidden");
}

const saveLinks = () => { healLinks(); return aj("/api/links", { method: "POST", body: linksDb }).then(() => { lastSig.l = JSON.stringify(linksDb); }); };
const savePool = () => aj("/api/link_pool", { method: "POST", body: linkPoolDb }).then(() => { lastSig.p = JSON.stringify(linkPoolDb); });

// Hàm chuyển đổi ẩn/hiện bảng thông số chi tiết (Icon con mắt) của từng cụm
function toggleClusterSpecs(idx) {
  const el = $("cluster-specs-" + idx);
  const icon = $("eye-icon-" + idx);
  if (!el) return;
  const isHidden = el.classList.toggle("hidden");
  if (icon) {
    icon.className = isHidden ? "fas fa-eye text-xs" : "fas fa-eye-slash text-xs text-indigo-600";
  }
}

// 3. Render Danh sách Link Sub (Duy nhất 1 giao diện Cây Link - Thiết kế lại Header chuẩn)
function renderLinks(){
 const c = $("linksViewContainer");
 if(!linksDb.length && !linkPoolDb.length){
   c.innerHTML = `<div class="border border-dashed border-slate-300 p-8 rounded-2xl text-center text-slate-400 font-bold bg-white">Hệ thống chưa có Link nào</div>`;
   return;
 }

 // Gom nhóm các link con theo từng cụm nguồn
 const grps = {};
 linksDb.forEach(l => {
  const k = l.isCombo ? `COMBO|${l.orig}|${l.orig2}` : (l.orig || "?");
  if (!grps[k]) {
    grps[k] = {
      key: k,
      isCombo: !!l.isCombo,
      orig: l.orig || "",
      orig2: l.orig2 || "",
      ch: []
    };
  }
  grps[k].ch.push(l);
 });

 let clusterIndex = 0;
 // Cụm Da_bi_khoa luôn luôn bị ghim ở CUỐI BẢNG dù có link mới chuyển vào
 const sortedGroups = Object.values(grps).sort((a, b) => {
  const aLocked = (a.orig === "Da_bi_khoa" || a.key.includes("Da_bi_khoa"));
  const bLocked = (b.orig === "Da_bi_khoa" || b.key.includes("Da_bi_khoa"));
  if (aLocked && !bLocked) return 1;
  if (!aLocked && bLocked) return -1;
  return 0;
 });

 c.innerHTML = sortedGroups.map(g => {
  clusterIndex++;
  const idxId = clusterIndex;
  
  let networkBadge = "";
  if (g.isCombo) {
    const p1 = detectProvider(g.orig), p2 = detectProvider(g.orig2);
    const s = new Set([p1, p2]);
    let cLabel = "Combo Trộn";
    if (s.has("lx") && s.has("kt")) cLabel = "Liangxin + Kitty (v4)";
    else if (s.has("lx") && s.has("dj")) cLabel = "Liangxin + DJJC (v5)";
    else if (s.has("kt") && s.has("dj")) cLabel = "Kitty + DJJC (v6)";
    networkBadge = `<span class="inline-flex items-center gap-1.5 text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200"><span class="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>${cLabel}</span>`;
  } else {
    const p = detectProvider(g.orig);
    networkBadge = p === "kt" ? `<span class="badge-kt">Kitty</span>` : (p === "lx" ? `<span class="badge-lx">Liangxin</span>` : (p === "dj" ? `<span class="badge-dj">DJJC</span>` : `<span class="badge-ot">Other</span>`));
  }

  // Lấy thông số từ LINK_POOL
  const pItem = linkPoolDb.find(p => g.isCombo ? (p.isCombo && p.url === g.orig && p.url2 === g.orig2) : (!p.isCombo && p.url === g.orig)) || {};
  const expDisplay = g.isCombo ? (pItem.exp || pItem.exp2 || g.ch[0]?.expDate || "") : (pItem.exp || g.ch[0]?.expDate || "");
  const isClusterLifetime = !expDisplay || isLife(expDisplay);

  // Quy tắc HSD cụm: Nếu là Vĩnh viễn (Lifetime) -> ẨN HOÀN TOÀN; Chỉ hiện khi có ngày hết hạn cụ thể
  const expBadgeHtml = isClusterLifetime ? '' : `<span class="bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200"><i class="fas fa-clock mr-1 text-[9px]"></i>${esc(expDisplay)}</span>`;

  // Render các link con trong cụm
  const rows = [...g.ch].sort((a,b) => (parseInt(a.linkIndex||1)) - (parseInt(b.linkIndex||1))).map(l => {
   if (!l.masked) { l.masked = buildMasked(l.orig, true); saveLinks(); }
   const tok = getT(l.masked), locked = !!l.isLocked, idx = parseInt(l.linkIndex||1);
   const bottom = linkBottom(l);
   const nameDisplay = esc(l.email || "Khách");
   
   return `
   <div class="py-2.5 px-3 border rounded-xl mb-2 ${locked ? "bg-red-50/70 border-red-200" : "hover:bg-slate-50 border-slate-100 bg-white"} flex flex-col gap-2 w-full min-w-0">
     <div class="flex items-center justify-between gap-2 min-w-0">
       <div class="flex items-center gap-2 min-w-0">
         ${locked ? '<div class="dot-red" title="Đã khóa"></div>' : '<div class="dot-green" title="Hoạt động"></div>'}
         <span class="text-indigo-600 font-mono text-xs font-black cp shrink-0" onclick="cp('${idx}')">#${idx}</span>
         <span class="font-bold text-xs text-slate-800 cp truncate" onclick="cp(${q(l.email)})">${nameDisplay}</span>
       </div>
     </div>

     <div class="font-mono text-[10px] md:text-xs text-slate-500 cp break-all select-all" onclick="cp(${q(l.masked)})">${esc(l.masked)}</div>

     <div class="flex items-center justify-between mt-0.5 pt-2 border-t border-slate-100">
       <div class="text-[10px] font-bold text-slate-500">${bottom}</div>
       <div class="flex gap-1.5 shrink-0 items-center">
         <button onclick="openLnkModal(${q(l.id)})" title="Sửa link con" class="text-indigo-600 hover:text-white w-7 h-7 flex items-center justify-center bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-600 transition"><i class="fas fa-pen text-xs"></i></button>
         <button onclick="toggleLock(${q(tok)},${locked})" title="${locked ? "Mở khóa" : "Khóa link"}" class="${locked ? "text-white bg-green-500 hover:bg-green-600" : "text-orange-500 bg-orange-50 border-orange-100 border hover:bg-orange-500 hover:text-white"} w-7 h-7 flex items-center justify-center rounded-lg transition"><i class="fas ${locked ? "fa-lock-open" : "fa-lock"} text-xs"></i></button>
         <button onclick="delLink(${q(l.id)})" title="Xóa link" class="text-red-500 hover:text-white w-7 h-7 flex items-center justify-center bg-red-50 border border-red-100 rounded-lg hover:bg-red-500 transition"><i class="fas fa-trash text-xs"></i></button>
       </div>
     </div>
   </div>`;
  }).join("");

  return `
  <div class="bg-white border ${g.isCombo ? 'border-purple-200' : 'border-slate-200'} rounded-2xl overflow-hidden mb-4 shadow-sm">
    <div class="${g.isCombo ? 'bg-purple-50/40 border-purple-200' : 'bg-slate-50 border-slate-200'} p-3 border-b space-y-2">
      <!-- HEADER CỤM: LUÔN HIỂN THỊ CỐ ĐỊNH -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          ${networkBadge}
          <span class="text-[10px] font-black bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">${g.ch.length} LINK</span>
        </div>
        <!-- GÓC PHẢI: Nút Con Mắt (Ẩn/Hiện thông số) + Cây Bút Chì sửa cụm -->
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="toggleClusterSpecs(${idxId})" title="Ẩn/Hiện thông số chi tiết (GB, Tải máy)" class="text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 w-7 h-7 flex items-center justify-center rounded-lg shadow-sm transition">
            <i id="eye-icon-${idxId}" class="fas fa-eye text-xs"></i>
          </button>
          <button onclick="openRootEditModal(${q(g.key)})" title="Sửa nguồn cụm" class="text-indigo-600 hover:bg-indigo-600 hover:text-white bg-white border border-indigo-200 w-7 h-7 flex items-center justify-center rounded-lg shadow-sm transition">
            <i class="fas fa-pen text-xs"></i>
          </button>
        </div>
      </div>

      <!-- URL LINK GỐC: KHUNG ĐẬM NỔI BẬT PHÂN BIỆT RÕ VỚI CARD LINK CON -->
      <div class="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-1.5 shadow-inner">
        <div class="font-mono text-[11px] font-semibold text-emerald-300 break-all cp flex items-start gap-2" onclick="cp('${g.orig}')">
          <span class="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase">Nguồn 1</span>
          <span class="hover:underline flex-1">${esc(g.orig)}</span>
          <i class="far fa-copy text-slate-400 text-xs shrink-0 mt-0.5"></i>
        </div>
        ${g.orig2 ? `
        <div class="font-mono text-[11px] font-semibold text-sky-300 break-all cp flex items-start gap-2 pt-1.5 border-t border-slate-800" onclick="cp('${g.orig2}')">
          <span class="bg-sky-950 text-sky-400 border border-sky-800 text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 uppercase">Nguồn 2</span>
          <span class="hover:underline flex-1">${esc(g.orig2)}</span>
          <i class="far fa-copy text-slate-400 text-xs shrink-0 mt-0.5"></i>
        </div>` : ''}
      </div>
      
      <!-- BẢNG THÔNG SỐ CHI TIẾT (MẶC ĐỊNH ẨN - BẤM CON MẮT ĐỂ MỞ) -->
      <div id="cluster-specs-${idxId}" class="hidden bg-slate-50 border border-slate-200 p-2.5 rounded-xl space-y-2 transition-all">
        <div class="text-[10px] font-bold text-slate-500 uppercase">Thông số chi tiết Node gốc (Kho):</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div class="bg-white p-2 rounded-lg border border-slate-100">
            <div class="text-[10px] font-bold text-emerald-700">Chân 1:</div>
            <div class="text-[11px] text-slate-600 mt-0.5">Dung lượng: <b>${esc(pItem.remainGb || "—")}/${esc(pItem.gb || "—")} GB</b></div>
            <div class="text-[11px] text-slate-600">Tải trọng: <b>${pItem.used || g.ch.length}/${pItem.max || 30} thiết bị</b></div>
          </div>
          ${g.isCombo ? `
          <div class="bg-white p-2 rounded-lg border border-slate-100">
            <div class="text-[10px] font-bold text-blue-700">Chân 2:</div>
            <div class="text-[11px] text-slate-600 mt-0.5">Dung lượng: <b>${esc(pItem.remainGb2 || "—")}/${esc(pItem.gb2 || "—")} GB</b></div>
            <div class="text-[11px] text-slate-600">Tải trọng: <b>${pItem.used || g.ch.length}/${pItem.max2 || 30} thiết bị</b></div>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- DANH SÁCH LINK CON -->
    <div class="p-2 lg:p-3">${rows}</div>
  </div>`;
 }).join("");
}

// 4. Bút chì sửa Nguồn cấp Cụm (Gộp lưu Link và Kho bằng 1 request)
async function saveRootEdit(){
  const gKey = $("mREGroupKey").value;
  const newO1 = $("mREOrig1").value.trim(), newO2 = $("mREOrig2").value.trim();
  if(!newO1 && !newO2) return toast("Vui lòng nhập ít nhất 1 link gốc!", "err");

  let isNowCombo = false, finalO1 = newO1, finalO2 = "";
  if (newO1 && newO2) {
    const p1 = detectProvider(newO1), p2 = detectProvider(newO2);
    if (p1 === p2 && p1 !== "other") {
      return toast("Không thể chuyển cụm sang Combo với 2 link cùng nhà mạng!", "err");
    }
    isNowCombo = true;
    if (p1 === "lx" || p2 === "dj") { finalO1 = newO1; finalO2 = newO2; }
    else { finalO1 = newO2; finalO2 = newO1; }
  } else {
    finalO1 = newO1 || newO2;
  }

  const parts = gKey.split("|");
  const oldIsCombo = (parts[0] === "COMBO");
  const oldO1 = oldIsCombo ? parts[1] : gKey;
  const oldO2 = oldIsCombo ? parts[2] : "";

  const newExp1 = $("mREExp").value.trim();
  const newExp2 = $("mREExp2").value.trim();
  const expToApply = newExp1 || (isNowCombo ? newExp2 : "");

  linksDb.forEach(l => {
    const match = oldIsCombo ? (l.isCombo && l.orig === oldO1 && l.orig2 === oldO2) : (!l.isCombo && l.orig === oldO1);
    if (match) {
      l.orig = finalO1;
      l.isCombo = isNowCombo;
      if (isNowCombo) l.orig2 = finalO2;
      else delete l.orig2;
      if (expToApply) l.expDate = expToApply;
    }
  });

  const poolItem = linkPoolDb.find(x => oldIsCombo ? (x.isCombo && x.url === oldO1 && x.url2 === oldO2) : (!x.isCombo && x.url === oldO1));
  const newSpecs = {
    url: finalO1,
    isCombo: isNowCombo,
    gb: $("mREGb").value.trim(),
    remainGb: $("mRERemain").value.trim(),
    exp: newExp1,
    max: parseInt($("mREMax").value) || 30
  };
  if (isNowCombo) {
    newSpecs.url2 = finalO2;
    newSpecs.gb2 = $("mREGb2").value.trim();
    newSpecs.remainGb2 = $("mRERemain2").value.trim();
    newSpecs.exp2 = newExp2;
    newSpecs.max2 = parseInt($("mREMax2").value) || 30;
  }

  if (poolItem) {
    if (!isNowCombo) {
      delete poolItem.url2; delete poolItem.gb2; delete poolItem.remainGb2; delete poolItem.exp2; delete poolItem.max2;
    }
    Object.assign(poolItem, newSpecs);
  } else {
    linkPoolDb.unshift({ id: "POOL-" + Date.now(), ...newSpecs });
  }

  cm("mRootEdit");
  // Gộp lưu Link và Kho trong 1 request duy nhất (giảm tải KV write)
  await aj("/api/admin/save_links_and_pool", { method: "POST", body: { links: linksDb, pool: linkPoolDb } });
  renderLinks();
  toast("Đã cập nhật cả cụm link & đồng bộ 2 chân sang Kho thành công!");
}

// 6. Tạo Link Thủ Công (Tự động nạp vào Kho nguồn ngầm nếu có thông số khai báo)
async function createLink(){
 const orig1 = $("lkOrig").value.trim(), orig2 = $("lkOrig2") ? $("lkOrig2").value.trim() : "";
 const email = $("lkEmail").value.trim(), expDate = $("lkExp").value.trim(), idxInput = $("lkIdx").value.trim();
 if (!orig1 && !orig2) return toast("Chưa nhập link gốc!","err");

 let isCombo = false, finalOrig1 = orig1, finalOrig2 = "";
 if (orig1 && orig2) {
   const p1 = detectProvider(orig1), p2 = detectProvider(orig2);
   if (p1 === p2 && p1 !== "other") {
     return toast("Không thể tạo Link Trộn với 2 link cùng nhà mạng (" + (p1 === "lx" ? "Liangxin" : "DJJC") + ")!", "err");
   }
   isCombo = true;
   if (p1 === "lx" || p2 === "dj") { finalOrig1 = orig1; finalOrig2 = orig2; }
   else { finalOrig1 = orig2; finalOrig2 = orig1; }
 } else {
   finalOrig1 = orig1 || orig2;
 }

 try { new URL(finalOrig1); if (finalOrig2) new URL(finalOrig2); } catch { return toast("Link không hợp lệ!","err"); }

 // Lấy thông số khai báo ngầm từ nút mở rộng (nếu có)
 const gb1 = $("lkGb1")?.value.trim() || "", remainGb1 = $("lkRemainGb1")?.value.trim() || "";
 const poolExp1 = $("lkPoolExp1")?.value.trim() || expDate, max1 = parseInt($("lkMax1")?.value) || 30;
 const gb2 = $("lkGb2")?.value.trim() || "", remainGb2 = $("lkRemainGb2")?.value.trim() || "";
 const poolExp2 = $("lkPoolExp2")?.value.trim() || expDate, max2 = parseInt($("lkMax2")?.value) || 30;

 if (isCombo) {
   let pFound = linkPoolDb.find(p => p.isCombo && p.url === finalOrig1 && p.url2 === finalOrig2);
   if (!pFound) {
     linkPoolDb.unshift({
       id: "POOL-COMBO-" + Date.now(), isCombo: true,
       url: finalOrig1, gb: gb1, remainGb: remainGb1, exp: poolExp1, max: max1,
       url2: finalOrig2, gb2: gb2, remainGb2: remainGb2, exp2: poolExp2, max2: max2
     });
   }
 } else {
   let pFound = linkPoolDb.find(p => !p.isCombo && p.url === finalOrig1);
   if (!pFound) {
     linkPoolDb.unshift({
       id: "POOL-" + Date.now(), isCombo: false,
       url: finalOrig1, gb: gb1, remainGb: remainGb1, exp: poolExp1, max: max1
     });
   }
 }

 let finalIdx = idxInput;
 if (!finalIdx || parseInt(finalIdx) < 1) {
   const existingIndices = linksDb
     .filter(x => isCombo ? (x.isCombo && x.orig === finalOrig1 && x.orig2 === finalOrig2) : (!x.isCombo && x.orig === finalOrig1))
     .map(x => parseInt(x.linkIndex) || 0);
   const maxIdx = existingIndices.length ? Math.max(...existingIndices) : 0;
   finalIdx = String(maxIdx + 1);
 }

 const masked = isCombo 
   ? buildMasked(finalOrig1, true, finalOrig2)
   : buildMasked(finalOrig1, true);

 linksDb.unshift({
   id: "LNK-" + Date.now() + "-" + genHex(4),
   isCombo, orig: finalOrig1, orig2: finalOrig2 || undefined,
   masked, email: email || "Khách", expDate,
   linkIndex: finalIdx, isLocked: false, createdTs: nowMs(), date: fmtBank(nowMs())
 });

 try {
   // Gộp lưu cả Link và Pool trong 1 lượt ghi duy nhất
   await aj("/api/admin/save_links_and_pool", { method: "POST", body: { links: linksDb, pool: linkPoolDb } });
   toast((isCombo ? "Đã tạo Link Trộn #" + finalIdx : "Đã tạo Link Đơn #" + finalIdx) + "! Nhớ Đồng bộ GitHub.");
   ["lkOrig","lkOrig2","lkEmail","lkExp","lkIdx","lkGb1","lkRemainGb1","lkPoolExp1","lkGb2","lkRemainGb2","lkPoolExp2"].forEach(f => { if ($(f)) $(f).value = ""; });
   renderLinks();
 } catch(e) { toast("Lỗi: " + e.message, "err"); }
}

function openLnkModal(id){
 const l = linksDb.find(x => x.id === id); if (!l) return;
 $("mLId").value = id; $("mLOrig").value = l.orig || "";
 if ($("mLOrig2")) $("mLOrig2").value = l.orig2 || "";
 $("mLEmail").value = l.email || "";
 let expVal = l.expDate || "";
 if (l.orderId) {
   const od = ordersDb.find(o => normId(o.id) === normId(l.orderId));
   if (od && od.expDate) expVal = od.expDate;
 }
 $("mLExp").value = expVal;
 $("mLIdx").value = l.linkIndex || l.machine || "";
 $("mLnk").classList.remove("hidden");
}

// 7. Bút chì con: Sửa Email, HSD, Index VÀ SỬA LINK GỐC / CHUYỂN ĐƠN <-> COMBO cho riêng link đó
async function saveLnkEdit(){
 const l = linksDb.find(x => x.id === $("mLId").value); if (!l) return;
 const o1 = $("mLOrig").value.trim(), o2 = $("mLOrig2") ? $("mLOrig2").value.trim() : "";
 if (!o1 && !o2) return toast("Link gốc không được rỗng!", "err");

 let isCombo = false, finalOrig1 = o1, finalOrig2 = "";
 if (o1 && o2) {
   const p1 = detectProvider(o1), p2 = detectProvider(o2);
   if (p1 === p2 && p1 !== "other") {
     return toast("Không thể sửa thành Combo với 2 link cùng nhà mạng!", "err");
   }
   isCombo = true;
   if (p1 === "lx" || p2 === "dj") { finalOrig1 = o1; finalOrig2 = o2; }
   else { finalOrig1 = o2; finalOrig2 = o1; }
 } else {
   finalOrig1 = o1 || o2;
 }

 Object.assign(l, {
   email: $("mLEmail").value.trim(),
   expDate: $("mLExp").value.trim(),
   linkIndex: $("mLIdx").value.trim(),
   orig: finalOrig1,
   isCombo: isCombo
 });
 if (isCombo) l.orig2 = finalOrig2; else delete l.orig2;
 delete l.machine;

 cm("mLnk"); renderLinks();
 try { await saveLinks(); toast("Đã cập nhật link con thành công! Token khách giữ nguyên."); } catch(e) { toast("Lỗi: " + e.message, "err"); }
}

async function toggleLock(tok, locked){
  if (!tok) return;
  linksDb.forEach(l => {
    if (getT(l.masked) === tok) l.isLocked = !locked;
  });
  renderLinks();
  try {
    await saveLinks();
    toast(locked ? "Đã mở khóa" : "Đã khóa");
  } catch (e) {}
}

async function delLink(id){
  const l = linksDb.find(x => x.id === id || x.masked === id);
  if (!l || !confirm("Xóa link này? Link sẽ vào tab Đã xóa và KHÔNG BAO GIỜ tự quay lại.")) return;
  const dead = { ...l, deadTs: nowMs(), deadDate: new Date(nowMs()).toISOString() };
  addTomb(l);
  deadDb.unshift(dead);
  linksDb = linksDb.filter(x => x.id !== l.id && x.masked !== l.masked);
  renderLinks();
  renderDead();
  try {
    const j = await aj("/api/admin/link/delete", { method: "POST", body: { id: l.id, masked: l.masked, link: dead }, soft: true });
    if (!(j && j.ok)) {
      await aj("/api/deadlinks", { method: "POST", body: deadDb });
      await saveLinks();
    }
    lastSig.l = JSON.stringify(linksDb);
    toast("Đã xóa link vĩnh viễn khỏi Link Sub");
    logEvent("info", "Link Sub", "Xóa link " + (l.email || ""), l.id || l.masked);
  } catch (e) {
    toast("Lỗi xóa link: " + e.message, "err");
  }
}

async function sortAllLinks(){
  const b = $("btnSortLinks"); b.disabled = true;
  // Lấy HSD từ Tab Đơn hàng làm chuẩn duy nhất để so sánh
  const getOrderExp = l => {
    if (l.orderId) {
      const od = ordersDb.find(o => normId(o.id) === normId(l.orderId));
      if (od && od.expDate) return od.expDate;
    }
    return l.expDate || "";
  };
  const pe = s => {
    if (!s || isLife(s)) return 9999999999999;
    return expEnd(s) || 0;
  };

  const g = {};
  linksDb.forEach(l => {
    const k = l.isCombo ? `COMBO|${l.orig}|${l.orig2}` : (l.orig || "?");
    (g[k] = g[k] || []).push(l);
  });

  for (const k in g) {
    const cluster = g[k];
    const isLockedCluster = (k === "Da_bi_khoa" || k.includes("Da_bi_khoa"));
    
    // Tìm node kỹ thuật (nếu có)
    let techNode = null;
    const clientLinks = [];
    cluster.forEach(l => {
      if (isLockedCluster && (l.orig === "Da_bi_khoa" || l.id === "POOL-179017008791528" || String(l.email).toLowerCase() === "auto")) {
        techNode = l;
      } else {
        clientLinks.push(l);
      }
    });

    // Sắp xếp link khách: gần hết hạn nhất lên đầu (#1), lâu hết hạn hơn xếp sau
    clientLinks.sort((a, b) => pe(getOrderExp(a)) - pe(getOrderExp(b)));

    if (techNode) {
      techNode.linkIndex = "1";
      let n = 2;
      clientLinks.forEach(l => { l.linkIndex = String(n++); });
    } else {
      let n = 1;
      clientLinks.forEach(l => { l.linkIndex = String(n++); });
    }
  }
  renderLinks();
  try {
    await saveLinks();
    toast("Đã sắp xếp lại Index từ gần nhất (#1) đến xa nhất");
  } catch (e) {}
  b.disabled = false;
}

async function triggerGitHub(){
  const b = $("btnTriggerGH"); b.disabled = true;
  try {
    await aj("/api/trigger_github", { method: "POST", body: { repo: GH_REPO, workflow: "update.yml" } });
    toast("Đã gửi lệnh Đồng bộ sang GitHub!");
  } catch (e) { toast("Lỗi GH: " + e.message, "err"); }
  b.disabled = false;
}

async function runGC(){
  const b = $("btnRunGC"); b.disabled = true;
  toast("Đang quét KV...");
  try {
    const r = await aj("/api/gc", { method: "POST" });
    await rebuildAllMAP();
    toast(`Dọn xong! Xóa ${r.deleted} key rác.`);
  } catch (e) { toast("Lỗi GC: " + e.message, "err"); }
  b.disabled = false;
}

async function rebuildAllMAP(){
  const b = $("btnRebuildAll"); b.disabled = true;
  try {
    // Thanh lọc toàn bộ link ảo / neo Index #1 Auto cũ
    const initialCount = linksDb.length;
    linksDb = linksDb.filter(l => !(l && (String(l.email).toLowerCase() === "auto" || (l.id && l.id.includes("-ANC")))));
    const purged = initialCount - linksDb.length;

    await saveLinks();
    renderLinks();
    toast("Đã Rebuild MAP thành công" + (purged > 0 ? ` (đã dọn sạch ${purged} link neo ảo #1)` : ""));
  } catch (e) { toast("Lỗi: " + e.message, "err"); }
  b.disabled = false;
}
    
// ===================== LOGIC TAB GÓI CƯỚC & CỬA HÀNG PRO (SORTABLEJS) =====================
const FIXED_PKG_IDS = new Set(["t1", "t2", "c1", "c2", "c3", "d1", "d2", "d3", "custom"]);
let adminPkgsList = [];
let sortablePkgsInstance = null;

function getDefaultAdminPkgs() {
  return [
    { id: "t1", name: "Gói 1 tháng", time: 1, original_vnd: 80000, vnd: 60000, cny: 15.5, usd: 2.5, promo_sticker: "+3 NGÀY", bonus_days: 3, data: "100GB", dev: "1 Thiết bị", tag1: "🔥 BÁN CHẠY", tag2: "✈️ Du lịch", tag3: "", tag4: "", tag1On: true, tag2On: true, tag3On: false, tag4On: false, category: ["cycle", "travel"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "t2", name: "Gói 1 tháng", time: 1, original_vnd: 0, vnd: 70000, cny: 18.0, usd: 3.0, promo_sticker: "", bonus_days: 0, data: "500GB", dev: "3 Thiết bị", tag1: "🔥 BÁN CHẠY", tag2: "✈️ Du lịch", tag3: "", tag4: "", tag1On: true, tag2On: true, tag3On: false, tag4On: false, category: ["cycle", "travel"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "c1", name: "Gói 1 tháng", time: 1, original_vnd: 0, vnd: 80000, cny: 20.5, usd: 3.5, promo_sticker: "", bonus_days: 0, data: "1000GB", dev: "Không giới hạn thiết bị", tag1: "🔥 BÁN CHẠY", tag2: "✈️ Du lịch", tag3: "", tag4: "", tag1On: true, tag2On: true, tag3On: false, tag4On: false, category: ["cycle", "travel"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "c2", name: "Gói Cao Cấp", time: 1, original_vnd: 0, vnd: 200000, cny: 50.0, usd: 8.0, promo_sticker: "", bonus_days: 0, data: "3000GB", dev: "Không giới hạn thiết bị", tag1: "", tag2: "", tag3: "", tag4: "", tag1On: false, tag2On: false, tag3On: false, tag4On: false, category: ["cycle"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "c3", name: "Gói 1 Năm", time: 12, original_vnd: 0, vnd: 799000, cny: 199.0, usd: 30.0, promo_sticker: "", bonus_days: 0, data: "300GB/tháng", dev: "Không giới hạn thiết bị", tag1: "", tag2: "", tag3: "Khuyên dùng", tag4: "", tag1On: false, tag2On: false, tag3On: true, tag4On: false, category: ["cycle"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "d1", name: "Không Giới Hạn", time: "lifetime", original_vnd: 0, vnd: 200000, cny: 52.0, usd: 8.0, promo_sticker: "", bonus_days: 0, data: "200GB", dev: "Không giới hạn thiết bị", tag1: "", tag2: "", tag3: "", tag4: "", tag1On: false, tag2On: false, tag3On: false, tag4On: false, category: ["usage"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "d2", name: "Không Giới Hạn", time: "lifetime", original_vnd: 0, vnd: 399000, cny: 102.0, usd: 16.0, promo_sticker: "", bonus_days: 0, data: "1000GB", dev: "Không giới hạn thiết bị", tag1: "", tag2: "", tag3: "", tag4: "", tag1On: false, tag2On: false, tag3On: false, tag4On: false, category: ["usage"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "d3", name: "Không Giới Hạn", time: "lifetime", original_vnd: 0, vnd: 999000, cny: 256.0, usd: 40.0, promo_sticker: "", bonus_days: 0, data: "5000GB", dev: "Không giới hạn thiết bị", tag1: "", tag2: "", tag3: "", tag4: "", tag1On: false, tag2On: false, tag3On: false, tag4On: false, category: ["usage"], features: ["Băng thông lên đến 3Gbps"] },
    { id: "custom", name: "Gói Tùy Chọn", time: 1, original_vnd: 0, vnd: 0, cny: 0, usd: 0, isCustom: true, data: "100GB - 100,000GB", dev: "Tùy chọn", promo_sticker: "", bonus_days: 0, tag1: "", tag2: "", tag3: "", tag4: "", tag1On: false, tag2On: false, tag3On: false, tag4On: false, category: ["travel", "cycle", "usage"], features: ["Băng thông lên đến 3Gbps"] }
  ];
}

function loadDrawerSettingsUI() {
  const d = (cmsDb && cmsDb.settings && cmsDb.settings.headerDrawer) || {};
  if ($("headerDrawerOn")) $("headerDrawerOn").checked = !!d.enabled;
  if ($("headerDrawerText")) $("headerDrawerText").value = d.text || "";
  if ($("headerDrawerLink")) $("headerDrawerLink").value = d.link || "";
}

function toggleHeaderDrawer(checked) {
  cmsDb.settings = cmsDb.settings || {};
  cmsDb.settings.headerDrawer = cmsDb.settings.headerDrawer || {};
  cmsDb.settings.headerDrawer.enabled = checked;
}

async function saveHeaderDrawer() {
  cmsDb.settings = cmsDb.settings || {};
  cmsDb.settings.headerDrawer = {
    enabled: $("headerDrawerOn") ? $("headerDrawerOn").checked : false,
    text: $("headerDrawerText") ? $("headerDrawerText").value.trim() : "",
    link: $("headerDrawerLink") ? $("headerDrawerLink").value.trim() : ""
  };
  try {
    await saveCmsDb();
    toast("Đã lưu trạng thái thanh thông báo đỉnh web thành công!");
    logEvent("ok", "admin", "Lưu thông báo đỉnh web");
  } catch(e) {
    toast("Lỗi lưu thông báo: " + e.message, "err");
  }
}

async function loadAdminPkgs() {
  loadDrawerSettingsUI();
  try {
    const j = await aj("/api/packages");
    if (Array.isArray(j?.packages) && j.packages.length) {
      adminPkgsList = j.packages;
    } else {
      adminPkgsList = getDefaultAdminPkgs();
    }
  } catch {
    adminPkgsList = getDefaultAdminPkgs();
  }
  renderPkgAdmin();
}

async function toggleHidePkg(idx){
  adminPkgsList[idx].hidden = !adminPkgsList[idx].hidden;
  renderPkgAdmin();
  renderFulfillmentUI();
  const isHidden = adminPkgsList[idx].hidden;
  toast(isHidden ? `Đã ẩn gói ${adminPkgsList[idx].name || adminPkgsList[idx].id} bên Index` : `Đã hiện lại gói bên Index`);
}

function renderPkgAdmin() {
  const container = $("pkgCardsList");
  if (!container) return;
  if (!adminPkgsList.length) adminPkgsList = getDefaultAdminPkgs();

  container.innerHTML = adminPkgsList.map((p, idx) => {
    const isFixed = FIXED_PKG_IDS.has(p.id);
    const feats = Array.isArray(p.features) ? p.features : ["Băng thông lên đến 3Gbps"];
    const isHidden = !!p.hidden;
    
    return `
    <div data-pkg-id="${esc(p.id)}" class="pkg-sort-item bg-white border-2 ${isHidden ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'} rounded-2xl p-4 shadow-sm flex flex-col gap-3 transition hover:border-indigo-300">
      <!-- HÀNG 1: TIÊU ĐỀ, MÃ GÓI & THAO TÁC -->
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <span class="grip-pkg cursor-grab text-slate-400 hover:text-indigo-600 px-1" title="Kéo để đổi thứ tự hiển thị"><i class="fas fa-grip-vertical text-lg"></i></span>
          <span class="text-xs font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">#${idx + 1}</span>
          <span class="bg-indigo-100 text-indigo-700 font-mono font-black text-xs px-2.5 py-0.5 rounded-lg border border-indigo-200">
            ${esc(p.id)} ${isFixed ? '(Cố định)' : '(Tùy chỉnh)'}
          </span>
          <input type="text" value="${esc(p.name || '')}" oninput="adminPkgsList[${idx}].name = this.value" placeholder="Tên gói cước..." class="p-1 text-xs font-extrabold text-slate-800 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white">
          ${isHidden ? '<span class="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded uppercase">ĐÃ ẨN INDEX</span>' : ''}
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick="toggleHidePkg(${idx})" class="font-bold text-xs px-2.5 py-1 rounded-lg border transition ${isHidden ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'}">
            <i class="fas ${isHidden ? 'fa-eye' : 'fa-eye-slash'} mr-1"></i>${isHidden ? 'Hiện gói' : 'Ẩn gói'}
          </button>
          <button type="button" onclick="delPkg(${idx})" class="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition">
            <i class="fas fa-trash mr-1"></i>Xóa
          </button>
        </div>
      </div>

      <!-- HÀNG 2: GIÁ GỐC GẠCH NGANG & GIÁ THỰC BÁN 3 LOẠI TIỀN (Master Plan V1) -->
      <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-0.5">Giá Gốc VND (Gạch đ)</label>
          <input type="number" step="1000" value="${p.original_vnd || 0}" oninput="adminPkgsList[${idx}].original_vnd = Number(this.value)||0" placeholder="VD: 80000" class="w-full p-1.5 border rounded-lg bg-white font-mono text-slate-400">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-emerald-700 mb-0.5">Giá Bán VND Thực Thu</label>
          <input type="number" step="1000" value="${p.vnd || 0}" ${p.isCustom ? 'disabled' : ''} oninput="adminPkgsList[${idx}].vnd = Number(this.value)||0" class="w-full p-1.5 border rounded-lg font-bold text-emerald-600 bg-white">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-0.5">Giá Gốc CNY (Gạch ¥)</label>
          <input type="number" step="0.5" value="${p.original_cny || 0}" oninput="adminPkgsList[${idx}].original_cny = Number(this.value)||0" placeholder="VD: 25" class="w-full p-1.5 border rounded-lg bg-white font-mono text-slate-400">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-blue-700 mb-0.5">Giá Bán CNY (¥)</label>
          <input type="number" step="0.5" value="${p.cny || 0}" ${p.isCustom ? 'disabled' : ''} oninput="adminPkgsList[${idx}].cny = Number(this.value)||0" class="w-full p-1.5 border rounded-lg font-bold text-blue-600 bg-white">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-400 mb-0.5">Giá Gốc USD (Gạch $)</label>
          <input type="number" step="0.5" value="${p.original_usd || 0}" oninput="adminPkgsList[${idx}].original_usd = Number(this.value)||0" placeholder="VD: 4.5" class="w-full p-1.5 border rounded-lg bg-white font-mono text-slate-400">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-indigo-700 mb-0.5">Giá Bán USD ($)</label>
          <input type="number" step="0.5" value="${p.usd || 0}" ${p.isCustom ? 'disabled' : ''} oninput="adminPkgsList[${idx}].usd = Number(this.value)||0" class="w-full p-1.5 border rounded-lg font-bold text-indigo-600 bg-white">
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2 rounded-xl border border-slate-100">
        <div>
          <label class="block text-[10px] font-bold text-rose-600 mb-0.5">Tem Quà Tặng (Sticker góc thẻ)</label>
          <input type="text" value="${esc(p.promo_sticker || '')}" oninput="adminPkgsList[${idx}].promo_sticker = this.value" placeholder="VD: +3 NGÀY" class="w-full p-1.5 border border-rose-200 rounded-lg font-black text-rose-600 bg-rose-50/40">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-purple-700 mb-0.5">Số ngày tặng (+ngày vào HSD)</label>
          <input type="number" min="0" max="365" value="${p.bonus_days || 0}" oninput="adminPkgsList[${idx}].bonus_days = Number(this.value)||0" placeholder="VD: 3" class="w-full p-1.5 border border-purple-200 rounded-lg font-bold text-purple-700 bg-purple-50/40 text-center">
        </div>
      </div>

      <!-- HÀNG 3: THÔNG SỐ GÓI -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div>
          <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Dung lượng hiển thị</label>
          <input type="text" value="${esc(p.data || '')}" oninput="adminPkgsList[${idx}].data = this.value" placeholder="VD: 100GB, 300GB/tháng..." class="w-full p-1.5 border rounded-lg font-bold bg-white outline-none">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Giới hạn thiết bị</label>
          <input type="text" value="${esc(p.dev || '')}" oninput="adminPkgsList[${idx}].dev = this.value" placeholder="VD: 1 Thiết bị, Không giới hạn..." class="w-full p-1.5 border rounded-lg font-bold bg-white outline-none">
        </div>
        <div>
          <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Thời hạn gói (Tháng / Vĩnh viễn)</label>
          <div class="flex items-center gap-2">
            <input type="number" min="1" max="120" value="${p.time === 'lifetime' ? '' : (p.time || 1)}" ${p.time === 'lifetime' ? 'disabled' : ''} id="pkg_time_val_${idx}" oninput="adminPkgsList[${idx}].time = Number(this.value)||1" class="w-20 p-1.5 border rounded-lg text-center font-bold bg-white">
            <label class="flex items-center gap-1 font-bold text-slate-700 cursor-pointer text-xs">
              <input type="checkbox" ${p.time === 'lifetime' ? 'checked' : ''} onchange="toggleLifetimePkg(${idx}, this.checked)" class="accent-indigo-600"> Vĩnh viễn
            </label>
          </div>
        </div>
      </div>

      <!-- HÀNG 4: 4 BADGE TAG GÓC THẺ & BỘ LỌC CATEGORY -->
      <div class="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold text-slate-500 uppercase">4 Badge Tag góc thẻ bên Index:</span>
          <div class="flex items-center gap-3">
            <span class="text-[10px] font-bold text-slate-400 uppercase">Bộ lọc:</span>
            <label class="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"><input type="checkbox" ${(p.category || []).includes('travel') ? 'checked' : ''} onchange="togglePkgCat(${idx}, 'travel', this.checked)" class="accent-indigo-600"> Du lịch</label>
            <label class="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"><input type="checkbox" ${(p.category || []).includes('cycle') ? 'checked' : ''} onchange="togglePkgCat(${idx}, 'cycle', this.checked)" class="accent-indigo-600"> Chu kỳ</label>
            <label class="text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"><input type="checkbox" ${(p.category || []).includes('usage') ? 'checked' : ''} onchange="togglePkgCat(${idx}, 'usage', this.checked)" class="accent-indigo-600"> Dung lượng</label>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border"><input type="checkbox" ${p.tag1On ? 'checked' : ''} onchange="adminPkgsList[${idx}].tag1On = this.checked" class="w-4 h-4 accent-red-600 shrink-0"><input type="text" value="${esc(p.tag1 || '🔥 BÁN CHẠY')}" oninput="adminPkgsList[${idx}].tag1 = this.value" placeholder="Tag 1 (Đỏ)" class="w-full text-xs font-bold text-red-600 outline-none"></div>
          <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border"><input type="checkbox" ${p.tag2On ? 'checked' : ''} onchange="adminPkgsList[${idx}].tag2On = this.checked" class="w-4 h-4 accent-blue-600 shrink-0"><input type="text" value="${esc(p.tag2 || '✈️ Du lịch')}" oninput="adminPkgsList[${idx}].tag2 = this.value" placeholder="Tag 2 (Xanh)" class="w-full text-xs font-bold text-blue-600 outline-none"></div>
          <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border"><input type="checkbox" ${p.tag3On ? 'checked' : ''} onchange="adminPkgsList[${idx}].tag3On = this.checked" class="w-4 h-4 accent-amber-600 shrink-0"><input type="text" value="${esc(p.tag3 || 'Khuyên dùng')}" oninput="adminPkgsList[${idx}].tag3 = this.value" placeholder="Tag 3 (Vàng)" class="w-full text-xs font-bold text-amber-600 outline-none"></div>
          <div class="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border"><input type="checkbox" ${p.tag4On ? 'checked' : ''} onchange="adminPkgsList[${idx}].tag4On = this.checked" class="w-4 h-4 accent-purple-600 shrink-0"><input type="text" value="${esc(p.tag4 || '')}" oninput="adminPkgsList[${idx}].tag4 = this.value" placeholder="Tag 4 (Tím)" class="w-full text-xs font-bold text-purple-600 outline-none"></div>
        </div>
      </div>
    </div>`;
  }).join("");

  // Khởi tạo SortableJS kéo thả mượt mà trên cả PC & Mobile
  if (typeof Sortable !== "undefined") {
    if (sortablePkgsInstance) sortablePkgsInstance.destroy();
    sortablePkgsInstance = new Sortable(container, {
      handle: ".grip-pkg",
      animation: 150,
      ghostClass: "bg-indigo-50",
      onEnd: (evt) => {
        const [movedItem] = adminPkgsList.splice(evt.oldIndex, 1);
        adminPkgsList.splice(evt.newIndex, 0, movedItem);
        renderPkgAdmin();
        toast(`Đã đổi vị trí "${movedItem.name || movedItem.id}" sang #${evt.newIndex + 1}`);
      }
    });
  }
}

function toggleLifetimePkg(idx, checked) {
  adminPkgsList[idx].time = checked ? "lifetime" : 1;
  const inp = $("pkg_time_val_" + idx);
  if (inp) { inp.disabled = checked; inp.value = checked ? "" : "1"; }
}

function togglePkgCat(pkgIdx, cat, checked) {
  let cats = new Set(adminPkgsList[pkgIdx].category || []);
  if (checked) cats.add(cat); else cats.delete(cat);
  adminPkgsList[pkgIdx].category = [...cats];
}

function addNewCustomPkg() {
  const nextNum = adminPkgsList.filter(p => !FIXED_PKG_IDS.has(p.id)).length + 4;
  const newId = "c" + nextNum;
  adminPkgsList.unshift({
    id: newId,
    name: "Gói mới tùy chỉnh",
    time: 1,
    original_vnd: 0,
    vnd: 90000,
    cny: 23.0,
    usd: 4.0,
    promo_sticker: "",
    bonus_days: 0,
    data: "2000GB",
    dev: "Không giới hạn thiết bị",
    tag1: "MỚI",
    tag2: "",
    tag3: "",
    tag4: "",
    tag1On: true,
    tag2On: false,
    tag3On: false,
    tag4On: false,
    category: ["cycle"],
    features: ["Băng thông lên đến 3Gbps", "Hỗ trợ 24/7"]
  });
  renderPkgAdmin();
  toast("Đã thêm gói mới: " + newId);
}

function delPkg(idx) {
  const p = adminPkgsList[idx];
  if (!confirm(`Xóa hoàn toàn gói "${p.name || p.id}" (mã: ${p.id})?`)) return;
  adminPkgsList.splice(idx, 1);
  renderPkgAdmin();
  toast(`Đã xóa gói ${p.id}`);
}
const delCustomPkg = delPkg;

async function saveAllPkgs() {
  const btn = $("btnSaveAllPkgs");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i>ĐANG LƯU...';

  // Lưu cấu hình Banner Header Drawer vào cmsDb
  cmsDb.settings = cmsDb.settings || {};
  cmsDb.settings.headerDrawer = {
    enabled: $("headerDrawerOn") ? $("headerDrawerOn").checked : false,
    text: $("headerDrawerText") ? $("headerDrawerText").value.trim() : "",
    link: $("headerDrawerLink") ? $("headerDrawerLink").value.trim() : ""
  };

  try {
    await Promise.all([
      aj("/api/packages", { method: "POST", body: { packages: adminPkgsList } }),
      saveCmsDb()
    ]);
    toast(`Đã lưu toàn bộ cấu hình Cửa hàng & ${adminPkgsList.length} gói cước thành công!`);
    renderPkgAdmin();
  } catch (e) {
    toast("Lỗi lưu cửa hàng: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save mr-1.5"></i>LƯU TOÀN BỘ CỬA HÀNG';
  }
}
    
// ===================== RÀ QUÉT & MAP LẠI (2 bảng, chỉ chạy khi bấm) =====================
let rsItems=[],rmItems=[],rsLastBody=null,rmLastBody=null;
const rlPicks=cls=>[...document.querySelectorAll("."+cls+":checked")].map(el=>({id:el.dataset.id,field:el.dataset.field}));
const rlAll=(cls,on)=>document.querySelectorAll("."+cls).forEach(el=>el.checked=on);
async function relinkScanRun(){
 const me = getMe();
 const body={action:"scan",mode:"scan",scope:$("rsLink").value,expired:$("rsStatus").value,fields:[me.n],includeManual:$("rsManual").checked};
 $("rsResult").innerHTML='<div class="text-xs text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i>Đang rà quét trên web này...</div>';$("rsApply").classList.add("hidden");
 try{const j=await aj("/api/admin/relink",{method:"POST",body});rsLastBody=body;rsItems=arr(j.items);
  if(!rsItems.length){$("rsResult").innerHTML='<div class="text-xs text-slate-400 italic">Không tìm thấy ô nào khớp bộ lọc.</div>';return;}
  $("rsResult").innerHTML=`<div class="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between"><span>${rsItems.length} mục khớp — bỏ chọn mục không muốn làm sạch</span><label class="flex items-center gap-1 font-bold text-indigo-700 cursor-pointer"><input type="checkbox" checked onchange="rlAll('rs-pick',this.checked)" class="accent-indigo-600">Tất cả</label></div><div class="border border-slate-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">${rsItems.map(it=>`<label class="flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50"><input type="checkbox" class="rs-pick w-3.5 h-3.5 accent-indigo-600" data-id="${esc(it.id)}" data-field="${esc(it.field)}" checked><span class="font-mono font-bold text-indigo-600">${esc(it.id)}</span><span class="font-bold text-slate-500">${esc(it.field.toUpperCase())}</span><span class="text-slate-600 truncate flex-1" title="${esc(it.link)}">${esc(it.email||"")} · ${esc(String(it.link||"").slice(0,38))}</span>${it.dead?'<span class="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded">CHẾT / KHÓA</span>':'<span class="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded">SỐNG</span>'}${it.expired?'<span class="bg-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.5 rounded">HẾT HẠN</span>':""}${it.manual?'<span class="bg-purple-100 text-purple-700 text-[9px] font-black px-1.5 py-0.5 rounded">SỬA TAY</span>':""}</label>`).join("")}</div>`;
  $("rsApply").classList.remove("hidden");
 }catch(e){$("rsResult").innerHTML=`<span class="text-red-600 text-xs">Lỗi: ${esc(e.message)}</span>`;}}

async function relinkMapRun(){
 const me = getMe();
 const body={action:"remap",mode:"scan",fields:[me.n],includeManual:$("rmManual").checked};
 $("rmResult").innerHTML='<div class="text-xs text-slate-400"><i class="fas fa-spinner fa-spin mr-1"></i>Đang quét link còn sống trên web này...</div>';$("rmApply").classList.add("hidden");
 try{const j=await aj("/api/admin/relink",{method:"POST",body});rmLastBody=body;rmItems=arr(j.items);
  if(!rmItems.length){$("rmResult").innerHTML='<div class="text-xs text-slate-400 italic">Không có đơn còn hạn nào cần map lại trên web này.</div>';return;}
  $("rmResult").innerHTML=`<div class="text-[11px] font-bold text-slate-500 mb-1 flex items-center justify-between"><span>${rmItems.length} ô sẽ được map lại</span><label class="flex items-center gap-1 font-bold text-indigo-700 cursor-pointer"><input type="checkbox" checked onchange="rlAll('rm-pick',this.checked)" class="accent-indigo-600">Tất cả</label></div><div class="border border-slate-200 rounded-xl max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white">${rmItems.map(it=>{const od=ordersDb.find(o=>normId(o.id)===normId(it.id));return `<label class="flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-slate-50"><input type="checkbox" class="rm-pick w-3.5 h-3.5 accent-indigo-600" data-id="${esc(it.id)}" data-field="${esc(it.field)}" checked><span class="font-mono font-bold text-indigo-600">${esc(it.id)}</span><span class="text-slate-700 font-semibold truncate flex-1">${esc(it.email||"")}${od&&od.expDate?" · HSD "+esc(od.expDate):""}</span><span class="text-emerald-600 font-mono text-[10px] truncate max-w-[45%]" title="${esc(it.to||"")}">→ ${esc(String(it.to||"").slice(0,36))}…</span></label>`;}).join("")}</div>`;
  $("rmApply").classList.remove("hidden");
 }catch(e){$("rmResult").innerHTML=`<span class="text-red-600 text-xs">Lỗi: ${esc(e.message)}</span>`;}}

async function relinkApply(mode){
 const picks=rlPicks(mode==="scan"?"rs-pick":"rm-pick");if(!picks.length)return toast("Chưa chọn mục nào","err");
 if(!confirm(mode==="scan"?`Làm sạch ${picks.length} ô Info? (chỉ xóa URL khỏi đơn, không xóa Link Sub / đơn / hạn)`:`Map lại ${picks.length} ô Info?`))return;
 const base=mode==="scan"?rsLastBody:rmLastBody;
 try{
  const j=await aj("/api/admin/relink",{method:"POST",body:{...base,action:mode==="scan"?"scan":"remap",mode:"apply",picks}});
  toast(`Đã xử lý ${j.applied} mục`);
  logEvent("ok","admin",mode==="scan"?"Rà quét: làm sạch Info":"Map lại link","áp dụng "+j.applied+" mục");

  // Cập nhật ngay vào RAM ordersDb để Modal Đơn hàng có dữ liệu tức thì
  if (Array.isArray(j.items)) {
    for (const it of j.items) {
      const targetOrder = ordersDb.find(o => normId(o.id) === normId(it.id));
      if (targetOrder) {
        targetOrder[it.field] = it.to || "";
        if (targetOrder.lockInfo) delete targetOrder.lockInfo[it.field];
      }
    }
    lastSig.o = JSON.stringify(ordersDb);
    renderCheckTab();
    renderOrd();
  }

  if(mode==="scan"){
    rsItems=[];$("rsResult").innerHTML='<div class="text-xs text-slate-400 italic">Đã làm sạch. Quét lại để kiểm tra.</div>';$("rsApply").classList.add("hidden");
  }else{
    rmItems=[];$("rmResult").innerHTML='<div class="text-xs text-slate-400 italic">Đã map lại thành công. Chuyển sang Tab Đơn hàng mở Modal đã có link!</div>';$("rmApply").classList.add("hidden");
  }
  setTimeout(fetchAll, 2000);
 }catch(e){toast("Lỗi: "+e.message,"err");}}

// ===================== ĐÃ XÓA (SUB-TAB LINK ĐÃ XÓA & QUẢN LÝ LINK NGUỒN) =====================
let curDeadTab = "links";
function switchDeadSubTab(t){
 curDeadTab = t;
 $("pane-dead-links").classList.toggle("hidden", t !== "links");
 $("pane-dead-sources").classList.toggle("hidden", t !== "sources");
 $("btn-dead-links").classList.toggle("active", t === "links");
 $("btn-dead-sources").classList.toggle("active", t === "sources");
 renderDead();
}

const deadLive=()=>deadDb.filter(l=>nowMs()-(Number(l.deadTs)||parseAny(l.deadDate)||nowMs())<=48*36e5);

function renderDead(){
 if (curDeadTab === "sources") {
   renderDeadSources();
   return;
 }
 const list=deadLive(),tb=$("deadBody");if(!list.length){tb.innerHTML=`<div class="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm font-bold">Không có lịch sử xóa</div>`;return;}
 tb.innerHTML=list.map((l,i)=>{const t=Number(l.deadTs)||parseAny(l.deadDate),left=Math.max(0,Math.ceil((t+48*36e5-nowMs())/36e5));
  return `<div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-2"><div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="font-bold text-xs text-slate-400">#${i+1}</span><span class="font-bold text-slate-800 text-sm cp truncate" onclick="cp(${q(l.email)})">${esc(l.email||"—")}</span></div><button onclick="restoreLink(${q(l.id)})" class="text-emerald-600 font-bold px-3 py-1.5 bg-emerald-50 rounded-lg text-xs hover:bg-emerald-500 hover:text-white border border-emerald-100"><i class="fas fa-rotate-left mr-1"></i>Khôi phục</button></div>
  <div class="text-[10px] font-mono text-slate-500 break-all cp" onclick="cp(${q(l.orig)})">${esc(l.orig||"—")}</div><div class="text-[10px] font-mono text-indigo-500 break-all cp" onclick="cp(${q(l.masked)})">${esc(l.masked||"—")}</div><div class="text-xs text-slate-500 font-bold">Ngắt: ${fmtBank(t)} <span class="text-orange-500 ml-1">(tự xóa hẳn sau ${left}h)</span></div></div>`;}).join("");
}

function renderDeadSources(){
 const container = $("deadSourcesBody");
 if (!container) return;

 // Khử trùng lặp Combo (AB = BA) khi hiển thị
 const dedupedPool = [];
 const seenComboKeys = new Set();
 for (const p of linkPoolDb) {
   if (p.isCombo && p.url && p.url2) {
     const comboKey = [p.url.trim(), p.url2.trim()].sort().join("|");
     if (seenComboKeys.has(comboKey)) continue;
     seenComboKeys.add(comboKey);
   }
   dedupedPool.push(p);
 }

 if ($("deadSourceCountBadge")) $("deadSourceCountBadge").textContent = dedupedPool.length;
 if (!dedupedPool.length) {
   container.innerHTML = `<div class="p-6 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-sm font-bold">Kho link nguồn đang trống</div>`;
   return;
 }

 // Node kỹ thuật Da_bi_khoa luôn luôn ở vị trí đầu tiên (#1) trong kho quản lý nguồn
 dedupedPool.sort((a, b) => {
   const aLocked = (a.url === "Da_bi_khoa" || a.id === "POOL-179017008791528");
   const bLocked = (b.url === "Da_bi_khoa" || b.id === "POOL-179017008791528");
   if (aLocked && !bLocked) return -1;
   if (!aLocked && bLocked) return 1;
   return 0;
 });

 container.innerHTML = dedupedPool.map((p, idx) => {
   const isLockedNode = (p.url === "Da_bi_khoa" || p.id === "POOL-179017008791528");
   const isCombo = !!p.isCombo;

   // Tìm tất cả link sub của khách đang chạy trên nguồn này
   const activeLinks = linksDb.filter(l => {
     if (!l) return false;
     if (isCombo) {
       const ck1 = [p.url.trim(), (p.url2 || "").trim()].sort().join("|");
       const ck2 = [(l.orig || "").trim(), (l.orig2 || "").trim()].sort().join("|");
       return l.isCombo && ck1 === ck2;
     }
     return !l.isCombo && l.orig === p.url;
   });
   const count = activeLinks.length;
   const isUsing = count > 0;
   
   let netTag = "";
   if (isLockedNode) {
     netTag = `<span class="bg-slate-200 text-slate-800 font-black px-2.5 py-0.5 rounded-full text-xs border border-slate-300">🔒 Node Kỹ Thuật (Khóa Link Hệ Thống)</span>`;
   } else if (isCombo) {
     const p1 = detectProvider(p.url), p2 = detectProvider(p.url2);
     const s = new Set([p1, p2]);
     let cTag = "Combo Trộn";
     if (s.has("lx") && s.has("kt")) cTag = "Combo Liangxin + Kitty";
     else if (s.has("lx") && s.has("dj")) cTag = "Combo Liangxin + DJJC";
     else if (s.has("kt") && s.has("dj")) cTag = "Combo Kitty + DJJC";
     netTag = `<span class="inline-flex items-center gap-1 text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">${cTag}</span>`;
   } else {
     const pr = detectProvider(p.url);
     netTag = pr === "kt" ? `<span class="badge-kt">Kitty</span>` : (pr === "lx" ? `<span class="badge-lx">Liangxin</span>` : (pr === "dj" ? `<span class="badge-dj">DJJC</span>` : `<span class="badge-ot">Other</span>`));
   }

   let statusBadge = "";
   if (isLockedNode) {
     statusBadge = `<span class="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-xs border border-slate-300">${count} link đang bị ngắt kết nối</span>`;
   } else if (isUsing) {
     statusBadge = `<span class="bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full text-xs border border-emerald-300 flex items-center gap-1 shrink-0"><i class="fas fa-check-circle text-emerald-600"></i>Đang dùng: ${count} link</span>`;
   } else {
     statusBadge = `<span class="bg-amber-100 text-amber-800 font-black px-2.5 py-0.5 rounded-full text-xs border border-amber-300 flex items-center gap-1 shrink-0"><i class="fas fa-triangle-exclamation text-amber-600"></i>Không có link ẩn</span>`;
   }

   let cardClass = isLockedNode 
     ? "bg-slate-50 border-2 border-slate-300 shadow-sm"
     : isUsing 
       ? "bg-emerald-50/50 border-2 border-emerald-200 hover:border-emerald-300" 
       : "bg-slate-100/70 border-2 border-slate-200 hover:border-amber-300";

   // Nút Xóa hẳn: ẨN HOÀN TOÀN với node Da_bi_khoa
   const deleteBtn = isLockedNode ? '' : `
     <button onclick="hardDeleteSource('${p.id}', '${p.url}', '${p.url2 || ''}')" title="Xóa vĩnh viễn khỏi toàn bộ KV" class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 font-bold px-3 py-1 rounded-xl text-xs shadow-sm transition active:scale-95 flex items-center gap-1">
       <i class="fas fa-trash-can text-xs"></i>Xóa hẳn khỏi KV
     </button>
   `;

   // Cây danh sách link con chạy dưới nguồn này
   let childLinksHtml = "";
   if (activeLinks.length) {
     childLinksHtml = `
       <div class="mt-2 pt-2 border-t border-slate-200/60 space-y-1">
         <div class="text-[10px] font-bold text-slate-500 uppercase">Danh sách link con đang chạy trên nguồn này (${activeLinks.length}):</div>
         <div class="max-h-36 overflow-y-auto space-y-1 pr-1 scroll-hide">
           ${activeLinks.map(l => `
             <div class="flex items-center justify-between gap-2 p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]">
               <div class="flex items-center gap-1.5 truncate">
                 <span class="font-bold text-slate-700">${esc(l.email || "Khách")}</span>
                 <span class="text-slate-400 font-mono text-[10px]">#${l.linkIndex || 1}</span>
                 <span class="font-mono text-indigo-600 text-[10px] break-all select-all flex-1" onclick="cp('${esc(l.masked)}')">${esc(l.masked)}</span>
               </div>
               <span class="text-[10px] text-slate-500 shrink-0">${linkBottom(l)}</span>
             </div>
           `).join("")}
         </div>
       </div>
     `;
   }

   return `
   <div class="${cardClass} rounded-2xl p-3.5 shadow-sm space-y-2.5 transition">
     <div class="flex items-center justify-between gap-2 flex-wrap">
       <div class="flex items-center gap-2">
         <span class="text-xs font-bold text-slate-400">#${idx + 1}</span>
         ${netTag}
         <span class="text-[10px] font-mono font-bold text-slate-500">${esc(p.id)}</span>
       </div>
       <div class="flex items-center gap-2">
         ${statusBadge}
         ${deleteBtn}
       </div>
     </div>

     <!-- URL Nguồn -->
     <div class="bg-slate-900 border border-slate-800 p-2 rounded-xl font-mono text-[11px] text-emerald-300 break-all cp space-y-1" onclick="cp('${p.url}')">
       <div class="flex items-start gap-1.5"><span class="bg-emerald-950 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">Nguồn 1</span><span class="flex-1">${esc(p.url)}</span></div>
       ${p.url2 ? `<div class="flex items-start gap-1.5 pt-1 border-t border-slate-800 text-sky-300" onclick="event.stopPropagation();cp('${p.url2}')"><span class="bg-sky-950 text-sky-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0">Nguồn 2</span><span class="flex-1">${esc(p.url2)}</span></div>` : ''}
     </div>

     <!-- Thông số GB / HSD -->
     <div class="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/60 flex-wrap gap-2">
       <div>Dung lượng: <b>${esc(p.remainGb || '—')} / ${esc(p.gb || '—')} GB</b> · HSD: <b>${esc(p.exp || 'Vĩnh viễn')}</b></div>
       <div class="text-[11px] text-slate-500">Giới hạn tải: <b>${count}/${p.max || 30} thiết bị</b></div>
     </div>

     ${childLinksHtml}
   </div>`;
 }).join("");
}

async function hardDeleteSource(id, url, url2){
 if(!confirm("Xóa vĩnh viễn link nguồn này khỏi Cloudflare KV?\n(Hệ thống sẽ xóa trong LINK_POOL, cache node GLOBAL_SUBS, link neo #1 trong ALL_LINKS và build lại GLOBAL_ROUTER).")) return;
 toast("Đang xóa nguồn khỏi KV...");
 try {
   await aj("/api/admin/source/delete", { method: "POST", body: { id, url, url2 } });
   toast("Đã xóa vĩnh viễn link nguồn khỏi KV!");
   fetchAll();
 } catch(e) {
   toast("Lỗi xóa nguồn: " + e.message, "err");
 }
}

async function cleanUnusedSources(){
 const unused = linkPoolDb.filter(p => {
   const activeLinks = linksDb.filter(l => l && String(l.linkIndex) !== "1" && (l.orig === p.url || l.orig2 === p.url));
   return activeLinks.length === 0;
 });
 if (!unused.length) return toast("Tất cả link nguồn đều đang có link ẩn hoạt động!", "info");
 if (!confirm(`Tìm thấy ${unused.length} link nguồn không có bất kỳ link ẩn nào.\nXóa sạch toàn bộ ${unused.length} nguồn này khỏi Cloudflare KV?`)) return;
 toast("Đang quét dọn các nguồn không dùng...");
 try {
   const res = await aj("/api/admin/source/clean_unused", { method: "POST" });
   toast(`Đã quét sạch ${res.deleted || unused.length} link nguồn không dùng khỏi KV!`);
   fetchAll();
 } catch(e) {
   toast("Lỗi dọn nguồn: " + e.message, "err");
 }
}

async function restoreLink(id){const l=deadDb.find(x=>x.id===id);if(!l)return;const c={...l};delete c.deadDate;delete c.deadTs;
 deadDb=deadDb.filter(x=>x.id!==id);rmTomb(id);linksDb=linksDb.filter(x=>x.id!==id);linksDb.unshift(c);renderDead();renderLinks();
 try{await aj("/api/deadlinks",{method:"POST",body:deadDb});await saveLinks();toast("Đã khôi phục! Nhớ Rebuild MAP.");}catch(e){toast("Lỗi khôi phục: "+e.message,"err");}}
async function clearDeadLinks(){if(!confirm("Xóa hẳn toàn bộ lịch sử đã xóa?"))return;deadDb.forEach(addTomb);deadDb=[];renderDead();try{await api("/api/deadlinks",{method:"DELETE"});toast("Đã xóa lịch sử");}catch(e){}}

// ===================== HƯỚNG DẪN: tab (kéo thả) → bài viết → khối =====================
const DEF_TABS=[{id:"android",name:"Android",ic:"fab fa-android",col:"text-green-500"},{id:"windows",name:"Windows",ic:"fab fa-windows",col:"text-blue-500"},{id:"macos",name:"MacOS",ic:"fab fa-apple",col:"text-slate-800"},{id:"ios",name:"iOS",ic:"fab fa-app-store-ios",col:"text-blue-400"}];
const toSlug=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'bai-viet';
let curArtsReady=false,curCms="android",curArt=null,curArtSlug="",curArtName="",curArtAuthor="",curArtWatermark="";
const guideTabList=()=>{const t=guides._tabs;return Array.isArray(t)&&t.length?t:DEF_TABS.map(x=>({...x}));};
function cmsEnsureTabs(){if(!Array.isArray(guides._tabs)||!guides._tabs.length)guides._tabs=DEF_TABS.map(x=>({...x}));}

function ensureArts(){
 guides._articles=guides._articles&&typeof guides._articles==="object"&&!Array.isArray(guides._articles)?guides._articles:{};
 guideTabList().forEach(t=>{
  if(!Array.isArray(guides._articles[t.id])||!guides._articles[t.id].length){
   const sl=toSlug(t.name);
   guides._articles[t.id]=[{slug:sl,name:t.name,author:"Admin",updated:0,html:"<h2>1. Hướng dẫn cài đặt</h2><p>Bắt đầu nhập nội dung bài viết...</p>"}];
  }else{
   guides._articles[t.id].forEach(a=>{
    if(!a.slug)a.slug=toSlug(a.name||'bai-viet');
    delete a.id;delete a.blocks;
   });
  }
 });
}
const artsOf=tab=>arr((guides._articles||{})[tab]);
function initGuides(){ensureArts();curArtsReady=true;const tabs=guideTabList();if(!tabs.some(t=>t.id===curCms))curCms=tabs[0].id;curArt=null;curArtSlug="";curArtWatermark="";renderGuideAll();}
function renderGuideAll(){
  renderGuideCategoriesTree();
  if (curArt) {
    renderCmsEditor();
  }
}
let curArtHtml="", curArtShowToc=true, curArtFaqs=[], curArtRelated=[];
function copyArtDeepLink(tabId, slug){
 const s=slug||curArtSlug;
 if(!s)return toast("Hãy mở hoặc lưu bài viết trước!","warn");
 const link = `${PD.replace(/\/$/,"")}/portal/guide/${encodeURIComponent(tabId)}/${encodeURIComponent(s)}`;
 cp(link);
}
let quillInst = null;
function getEditorHtml() {
  if (quillInst && quillInst.root) {
    return typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(quillInst.root.innerHTML) : quillInst.root.innerHTML;
  }
  const ed = $("cmsWordEditor");
  return ed ? (typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(ed.innerHTML) : ed.innerHTML) : curArtHtml;
}
function commitCms(){
 if(!curArt)return;
 const a=artsOf(curCms).find(x=>(x.slug||toSlug(x.name))===curArt);if(!a)return;
 curArtHtml = getEditorHtml();
 a.html=curArtHtml;
 a.showToc=curArtShowToc;
 a.name=curArtName;
 a.slug=toSlug(curArtSlug||curArtName);
 a.author=curArtAuthor;
 a.watermark=curArtWatermark;
 a.faqs=arr(curArtFaqs).map(f=>({...f}));
 a.relatedArts=arr(curArtRelated);
 delete a.id;
 delete a.blocks;
}
function setCms(dev){commitCms();ensureArts();const tabs=guideTabList();if(!tabs.some(t=>t.id===dev))dev=tabs[0].id;curCms=dev;curArt=null;curArtSlug="";curBlocks=[];curArtHtml="";curArtWatermark="";cmsSel=-1;renderGuideAll();}
function openArt(slug){
 commitCms();
 const a=artsOf(curCms).find(x=>x.slug===slug||toSlug(x.name)===slug);if(!a)return;
 curArt=a.slug||toSlug(a.name);
 curArtSlug=curArt;
 curArtHtml=a.html||"<p>Bắt đầu viết bài...</p>";
 curArtShowToc=a.showToc!==false;
 curArtName=a.name||"";curArtAuthor=a.author||"";curArtWatermark=a.watermark||"";
 curArtFaqs=arr(a.faqs).map(f=>({...f}));
 curArtRelated=arr(a.relatedArts);
 renderArtList();renderCmsEditor();
}
function artAdd(){
 commitCms();
 const baseSlug="bai-viet-moi-"+Date.now().toString(36);
 const a={slug:baseSlug,name:"Bài mới",author:"Admin",updated:0,html:"<h2>1. Tiêu đề mục đầu tiên</h2><p>Nhập nội dung hướng dẫn tại đây...</p>",showToc:true,watermark:""};
 guides._articles[curCms].push(a);
 openArt(a.slug);
}
function artDel(slug){
 const list=artsOf(curCms);
 if(list.length<=1)return toast("Mỗi tab cần ít nhất 1 bài","err");
 if(!confirm("Xóa bài này? (bấm LƯU BÀI để áp dụng lên các web)"))return;
 guides._articles[curCms]=list.filter(a=>(a.slug||toSlug(a.name))!==slug);
 if(curArt===slug){curArt=null;curArtSlug="";curArtHtml="";curArtWatermark="";}
 renderArtList();renderCmsEditor();
}
function renderArtList(){
 const el = $("cmsArtList");
 if (!el) return;
 const list=artsOf(curCms);
 el.innerHTML=`<div class="flex items-center justify-between mb-2"><div class="font-bold text-sm text-slate-800"><i class="fas fa-newspaper text-indigo-500 mr-1"></i>Bài viết của tab này (${list.length}) <span class="text-[10px] font-normal text-slate-400">— bấm vào bài để soạn · bấm icon Link để lấy link gửi khách</span></div><button onclick="artAdd()" class="bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-indigo-100"><i class="fas fa-plus mr-1"></i>Bài mới</button></div><div class="grid grid-cols-1 md:grid-cols-2 gap-2">${list.map(a=>{
  const s=a.slug||toSlug(a.name);
  const on=s===curArt;
  return `<div onclick="openArt(${q(s)})" class="cursor-pointer border-2 ${on?"border-indigo-500 bg-indigo-50":"border-slate-200 hover:border-indigo-300 bg-white"} rounded-xl p-2.5 flex items-center justify-between gap-2"><div class="min-w-0"><div class="flex items-center gap-1.5"><span class="font-bold text-sm text-slate-800 truncate">${esc(a.name||"(chưa đặt tên)")}</span></div><div class="text-[10px] text-slate-500 mt-0.5">Cập nhật: ${a.updated?fmtBank(a.updated):"chưa lưu"} · Tác giả: ${esc(a.author||"—")}</div></div><div class="flex gap-1 shrink-0"><button title="Copy Link trực tiếp tới bài viết này" onclick="event.stopPropagation();copyArtDeepLink(${q(curCms)},${q(s)})" class="text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-600 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition"><i class="fas fa-link mr-1"></i>Link</button><button onclick="event.stopPropagation();openArt(${q(s)})" class="text-indigo-600 bg-white border border-indigo-100 px-2 py-1 rounded-lg text-xs"><i class="fas fa-pen"></i></button><button onclick="event.stopPropagation();artDel(${q(s)})" class="text-red-500 bg-white border border-red-100 px-2 py-1 rounded-lg text-xs"><i class="fas fa-trash"></i></button></div></div>`;}).join("")}</div>`;}
function renderCmsTabBtns(){
 const tabs=guideTabList();
 $("cmsDevBtns").innerHTML=tabs.map((t,i)=>{const on=t.id===curCms;const ic=t.img?`<img src="${esc(safeUrl(t.img))}" class="w-5 h-5 mr-2 rounded object-contain">`:`<i class="${esc(t.ic||"fas fa-book")} ${on?"":esc(t.col||"")} mr-2"></i>`;
  return `<div data-tabid="${esc(t.id)}" class="flex items-center border-2 rounded-xl transition ${on?"bg-indigo-600 text-white border-indigo-600 shadow-lg":"bg-white border-slate-200 text-slate-600"}"><span class="grip cursor-grab px-2 py-2 ${on?"text-indigo-200":"text-slate-400"}" title="Kéo để đổi thứ tự"><i class="fas fa-grip-vertical"></i></span><button onclick="setCms(${q(t.id)})" class="pr-3 py-1.5 font-bold text-xs flex items-center">${ic}${esc(t.name)}${i===0?`<span class="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded ${on?"bg-white/25":"bg-emerald-100 text-emerald-700"}">Mặc định</span>`:""}</button></div>`;}).join("")+`<button onclick="cmsAddTab()" class="border-2 border-dashed border-indigo-300 text-indigo-600 px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-indigo-50"><i class="fas fa-plus mr-1"></i>Thêm tab</button>`;
 setupSortableCmsTabs();
}
let sortableCmsTabs = null;
function setupSortableCmsTabs() {
  const el = $("cmsDevBtns");
  if (!el || typeof Sortable === "undefined") return;
  if (sortableCmsTabs) sortableCmsTabs.destroy();
  sortableCmsTabs = new Sortable(el, {
    handle: ".grip",
    draggable: "[data-tabid]",
    animation: 150,
    onEnd: async () => {
      cmsEnsureTabs();
      const currentIds = [...el.querySelectorAll("[data-tabid]")].map(d => d.dataset.tabid);
      guides._tabs.sort((a, b) => currentIds.indexOf(a.id) - currentIds.indexOf(b.id));
      renderCmsTabBtns();
      try {
        const g = await aj("/api/guides");
        const s = g && typeof g === "object" && !Array.isArray(g) ? g : {};
        s._tabs = guides._tabs.map(t => ({ ...t }));
        await aj("/api/guides", { method: "POST", body: s });
        toast("Đã lưu thứ tự tab thành công!");
      } catch (e) { toast("Lỗi lưu thứ tự: " + e.message, "err"); }
    }
  });
}
function renderCmsTabEdit(){
 const tabs=guideTabList(),t=tabs.find(x=>x.id===curCms)||tabs[0],isDef=DEF_TABS.some(d=>d.id===t.id);
 $("cmsTabEdit").innerHTML=`<div class="sm:col-span-2"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tên tab đang sửa</label><input value="${esc(t.name)}" oninput="cmsTabSet('name',this.value)" class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"></div><div class="sm:col-span-2"><div class="flex items-end gap-2"><div class="flex-1"><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Link ảnh làm icon tab (để trống = icon mặc định)</label><input value="${esc(t.img||"")}" oninput="cmsTabSet('img',this.value)" placeholder="https://..." class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none font-mono"></div>${isDef?"":`<button onclick="cmsDelTab()" title="Xóa tab này" class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold py-2 px-3.5 rounded-lg text-xs border border-red-200 transition shrink-0"><i class="fas fa-trash mr-1"></i>Xóa</button>`}</div></div>`;}
function cmsTabSet(k,v){cmsEnsureTabs();const t=guides._tabs.find(x=>x.id===curCms);if(t){t[k]=v;renderCmsTabBtns();}}
function cmsAddTab(){const name=prompt("Tên tab mới:","");if(!name||!name.trim())return;commitCms();cmsEnsureTabs();ensureArts();const id="t"+Date.now().toString(36);guides._tabs.push({id,name:name.trim(),img:""});guides[id]=[];guides._articles[id]=[{slug:toSlug(name.trim()),name:name.trim(),author:"Admin",updated:0,blocks:[],html:"<h2>1. Tiêu đề mục đầu tiên</h2><p>Nhập nội dung hướng dẫn tại đây...</p>",showToc:true,watermark:""}];setCms(id);}
function cmsDelTab(){if(!confirm("Xóa tab này và toàn bộ bài viết của nó?"))return;cmsEnsureTabs();guides._tabs=guides._tabs.filter(x=>x.id!==curCms);delete guides[curCms];if(guides._articles)delete guides._articles[curCms];curArt=null;setCms(guides._tabs[0].id);}

// ---- nội dung khối
const safeUrl=u=>/^https?:\/\//i.test(u||"")?u:"#";
const bAlign=b=>b.al==="c"?"center":b.al==="r"?"right":"left";
const dAlign=b=>b.dal==="l"?"left":b.dal==="r"?"right":"center";
const SZ={s:13,m:16,l:20,xl:26};
function bStyle(b,def){let st="";if(b.b)st+="font-weight:800;";if(b.i)st+="font-style:italic;";if(b.ul)st+=`text-decoration:underline;text-decoration-color:${b.ul==="red"?"#dc2626":"#0f172a"};text-underline-offset:3px;`;st+=`font-size:${SZ[b.sz]||def}px;`;return st;}
const bText=b=>esc(b.x).replace(/\n/g,"<br>")||"&nbsp;";
function guideScroll(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}
function openLightbox(u){
 const d=document.createElement("div");
 d.className="lb";
 const prevOverflow=document.body.style.overflow;
 document.body.style.overflow="hidden";
 const closeLb=()=>{document.body.style.overflow=prevOverflow;d.remove();document.removeEventListener("keydown",onKey);};
 const onKey=e=>{if(e.key==="Escape")closeLb();};
 document.addEventListener("keydown",onKey);
 d.innerHTML=`<button type="button" class="lb-close" title="Đóng ảnh (ESC)"><i class="fas fa-xmark"></i></button><img src="${esc(u)}" onclick="event.stopPropagation()">`;
 d.onclick=closeLb;
 d.querySelector(".lb-close").onclick=e=>{e.stopPropagation();closeLb();};
 document.body.appendChild(d);
}
function videoEmbed(u){u=String(u||"");let m;
 if(m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{6,})/))return `<div style="position:relative;width:100%;max-width:600px;margin:0 auto;aspect-ratio:16/9"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}?rel=0" referrerpolicy="strict-origin-when-cross-origin" title="Video" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.1)" allowfullscreen loading="lazy"></iframe></div>`;
 if(m=u.match(/vimeo\.com\/(?:video\/)?(\d+)/))return `<div style="position:relative;width:100%;max-width:600px;margin:0 auto;aspect-ratio:16/9"><iframe src="https://player.vimeo.com/video/${m[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,.1)" allowfullscreen loading="lazy"></iframe></div>`;
 if(/^https?:\/\//i.test(u))return `<div style="width:100%;max-width:600px;margin:0 auto;"><video src="${esc(u)}" controls playsinline style="width:100%;max-height:420px;border-radius:12px;background:#000;box-shadow:0 4px 14px rgba(0,0,0,.1)"></video></div>`;
 return `<div style="padding:14px;background:#f1f5f9;border-radius:8px;color:#94a3b8;font-size:13px;text-align:center">Chưa có URL video hợp lệ</div>`;}
// Khớp 100% ký tự (không trim, không phân biệt-hoa-thường-không, không "contains"): target === nội dung khối
const findTarget=(bl,text)=>{const s=String(text??"");if(s==="")return -1;return bl.findIndex(x=>ANCH.has(x.t)&&String(x.x??"")===s);};
function renderBlocks(bl,gid){
 let n=1,h="";const g=gid||"g";
 bl.forEach((b,idx)=>{const al=bAlign(b),aid=`g-${g}-${idx}`;let x="";
  if(b.t==="header"){n=1;x=`<div style="text-align:${al};margin:6px 0 14px"><div style="background:linear-gradient(90deg,#4f46e5,#8b5cf6);display:inline-block;color:#fff;padding:10px 18px;border-radius:10px;font-weight:800;line-height:1.35;box-shadow:0 4px 10px rgba(79,70,229,.3);${bStyle(b,22)}"><i class="fas fa-star" style="margin-right:8px"></i>${bText(b)}</div></div>`;}
  else if(b.t==="sub"){n=1;x=`<div style="text-align:${al};margin:18px 0 12px"><div style="display:inline-block;background:#e0e7ff;border-left:5px solid #4f46e5;padding:8px 14px;border-radius:5px;font-weight:800;color:#3730a3;line-height:1.35;${bStyle(b,18)}">${bText(b)}</div></div>`;}
  else if(b.t==="step"){const lb=(b.n!==undefined&&String(b.n).trim()!=="")?esc(b.n):n++;const jc=al==="center"?"center":al==="right"?"flex-end":"flex-start";x=`<div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;justify-content:${jc}"><span style="background:#4f46e5;color:#fff;min-width:26px;height:26px;padding:0 7px;display:flex;align-items:center;justify-content:center;border-radius:13px;font-size:14px;font-weight:bold;flex-shrink:0;margin-top:1px">${lb}</span><p style="margin:0;color:#334155;line-height:1.6;text-align:${al};white-space:pre-wrap;${bStyle(b,17)}">${bText(b)}</p></div>`;}
  else if(b.t==="note"){
    const theme = b.theme || 'amber';
    const themeBg = theme==='red'?['#fef2f2','#fca5a5','#ef4444','#991b1b']:theme==='blue'?['#eff6ff','#93c5fd','#3b82f6','#1e40af']:theme==='purple'?['#f5f3ff','#c4b5fd','#8b5cf6','#5b21b6']:theme==='green'?['#f0fdf4','#86efac','#10b981','#065f46']:['#fffbeb','#fde68a','#f59e0b','#92400e'];
    const noteIcon = theme==='red'?'⛔ CHÚ Ý:':theme==='blue'?'💡 HƯỚNG DẪN:':theme==='purple'?'✨ GHI CHÚ:':theme==='green'?'✔ MẸO HAY:':'⚠️ LƯU Ý:';
    x=`<div style="text-align:${al};margin:14px 0"><div style="display:inline-block;max-width:100%;background:${themeBg[0]};border:1px solid ${themeBg[1]};border-left:5px solid ${themeBg[2]};padding:12px 16px;border-radius:10px;text-align:left"><p style="margin:0;color:${themeBg[3]};line-height:1.6;white-space:pre-wrap;${bStyle(b,16)}"><b>${noteIcon}</b> ${bText(b)}</p></div></div>`;
  }
  else if(b.t==="btn")x=`<div style="text-align:${al};margin:14px 0"><a href="${esc(safeUrl(b.u))}" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;padding:12px 24px;border-radius:12px;font-weight:bold;font-size:${SZ[b.sz]||17}px;text-decoration:none;box-shadow:0 4px 15px rgba(109,40,217,.4)"><i class="fas fa-download" style="margin-right:8px"></i>${esc(b.x||"TẢI VỀ")}</a></div>`;
  else if(b.t==="img"){
    const u=safeUrl(b.u);
    x=`<div style="margin:16px 0;text-align:center"><div style="display:inline-block;max-width:100%"><img src="${esc(u)}" onclick="openLightbox(${q(u)})" title="Bấm để phóng to ảnh" style="max-height:360px;width:auto;max-width:100%;object-fit:contain;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:zoom-in" />${String(b.x||"").trim()!==""?`<div style="text-align:center;font-size:13px;color:#64748b;margin-top:6px;line-height:1.5;font-style:italic;white-space:pre-wrap">${esc(b.x)}</div>`:""}</div></div>`;
  }
  else if(b.t==="video"){
    x=`<div style="margin:16px 0;text-align:center"><div style="display:inline-block;width:100%;max-width:640px;margin:auto">${videoEmbed(b.u)}${String(b.x||"").trim()!==""?`<div style="text-align:center;font-size:13px;color:#64748b;margin-top:6px;line-height:1.5;font-style:italic;white-space:pre-wrap">${esc(b.x)}</div>`:""}</div></div>`;
  }
  else if(b.t==="qlink"){const ti=findTarget(bl,b.target);x=`<div style="text-align:${al};margin:8px 0"><a ${ti>=0?`onclick="guideScroll('g-${g}-${ti}')"`:'title="Không tìm thấy mục tiêu khớp 100%"'} style="display:inline-flex;align-items:center;gap:6px;cursor:${ti>=0?"pointer":"not-allowed"};opacity:${ti>=0?1:.5};font-weight:900;font-size:15px;background:-webkit-linear-gradient(0deg, #4f46e5, #9333ea);-webkit-background-clip:text;-webkit-text-fill-color:transparent;border-bottom:2px solid #8b5cf6;padding-bottom:1px;text-decoration:none;"><i class="fas fa-link" style="color:#8b5cf6;-webkit-text-fill-color:initial;"></i>${esc(b.x||"Liên kết nhanh")}</a></div>`;}
  else if(b.t==="qtab")x=`<div style="text-align:${al};margin:8px 0"><a onclick="cmsGoto(${q(b.tab||"")},${q(b.art||"")},${q(b.target||"")})" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:900;font-size:15px;background:-webkit-linear-gradient(0deg, #4f46e5, #9333ea);-webkit-background-clip:text;-webkit-text-fill-color:transparent;border-bottom:2px solid #8b5cf6;padding-bottom:1px;text-decoration:none;"><i class="fas fa-layer-group" style="color:#8b5cf6;-webkit-text-fill-color:initial;"></i>${esc(b.x||"Chuyển tab")}</a></div>`;
  else if(b.t==="qart")x=`<div style="text-align:${al};margin:8px 0"><a onclick="cmsGotoArt(${q(b.tab||"")},${q(b.art||"")})" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-weight:900;font-size:15px;background:-webkit-linear-gradient(0deg, #4f46e5, #9333ea);-webkit-background-clip:text;-webkit-text-fill-color:transparent;border-bottom:2px solid #8b5cf6;padding-bottom:1px;text-decoration:none;"><i class="fas fa-newspaper" style="color:#8b5cf6;-webkit-text-fill-color:initial;"></i>${esc(b.x||"Mở bài viết")}</a></div>`;
  else if(b.t==="spacer")x=`<div style="height:${Math.max(4,Math.min(200,parseInt(b.h)||16))}px"></div>`;
  else if(b.t==="divider")x='<hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0">';
  else if(b.t==="toc"){const items=bl.map((y,i)=>({y,i})).filter(o=>o.y.t==="header"||o.y.t==="sub");x=`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin:12px 0"><div style="font-weight:800;color:#4f46e5;margin-bottom:8px;font-size:16px"><i class="fas fa-list-ul" style="margin-right:6px"></i>${esc(b.x||"Xem nhanh")}</div>${items.map(o=>`<a onclick="guideScroll('g-${g}-${o.i}')" style="display:block;cursor:pointer;padding:6px 0 6px ${o.y.t==="sub"?"18px":"0"};color:${o.y.t==="sub"?"#475569":"#3730a3"};font-weight:${o.y.t==="sub"?"600":"800"};font-size:15px"><i class="fas fa-angle-right" style="margin-right:6px;color:#818cf8"></i>${esc(o.y.x)}</a>`).join("")||'<span style="font-size:13px;color:#94a3b8">Chưa có mục nào</span>'}</div>`;}
  else x=`<p style="margin:0 0 12px;color:#334155;line-height:1.65;text-align:${al};white-space:pre-wrap;min-height:1.2em;${bStyle(b,16)}">${bText(b)}</p>`;
  h+=`<div id="${aid}" style="scroll-margin-top:90px">${x}</div>`;});
 return h;}
// ---- điều hướng Quick Tab / Quick Article (trong admin: giữ nguyên bản đang soạn, không mất chỉnh sửa)
function cmsGoto(tab,artId,detail){commitCms();ensureArts();const tabs=guideTabList();if(!tabs.some(t=>t.id===tab))return toast("Tab đích không tồn tại","warn");curCms=tab;curArt=null;renderCmsTabBtns();renderCmsTabEdit();const list=artsOf(tab),a=list.find(x=>x.id===artId)||list[0];if(!a)return;openArt(a.id);if(detail){const i=findTarget(curBlocks,detail);if(i>=0)setTimeout(()=>guideScroll(`g-${curCms}-${curArt}-${i}`),80);}}
function cmsGotoArt(tab,name){let t=tab,a=artsOf(t).find(x=>x.name===name);if(!a){for(const tt of guideTabList()){const f=artsOf(tt.id).find(x=>x.name===name);if(f){t=tt.id;a=f;break;}}}if(!a)return toast("Không tìm thấy bài khớp 100% tên","warn");cmsGoto(t,a.id,"");}

// ---- trình soạn khối
// Đã loại bỏ hoàn toàn các hàm modal và mảng blocks cũ, Quill.js đảm nhiệm toàn bộ
function buildRichArticleView(rawHtml, showToc, gid){
 const temp=document.createElement("div");
 temp.innerHTML=rawHtml||"";
 const headings=[];
 let h2Count=0, h3Count=0;
 temp.querySelectorAll("h2, h3").forEach((el, idx)=>{
  const txt=(el.textContent||"").trim();
  if(!txt)return;
  const tag=el.tagName.toLowerCase();
  const hid=`toc-${gid}-${idx}`;
  el.id=hid;
  el.style.scrollMarginTop="90px";
  // Giữ nguyên 100% nguyên văn tiêu đề do admin soạn thảo, không tự ý chèn số hay bullet tròn (Ảnh 3)
  headings.push({id:hid,tag,label:txt,raw:txt});
 });
 temp.querySelectorAll("img").forEach(img=>{
  const src=img.getAttribute("src")||"";
  img.setAttribute("onclick",`openLightbox(${q(src)})`);
  img.style.cursor="zoom-in";img.setAttribute("referrerpolicy","no-referrer");img.setAttribute("loading","lazy");
 });
 temp.querySelectorAll("a").forEach(a=>{
  const href=a.getAttribute("href")||"";
  if(!a.getAttribute("data-cta")){
   a.classList.add("word-link");
   a.style.color="#2563eb";
   a.style.textDecoration="underline";
  }
  if(href.startsWith("#anchor:")){
   const tgTxt=decodeURIComponent(href.slice(8));
   a.removeAttribute("href");
   a.setAttribute("onclick",`scrollToHeadingText(${q(tgTxt)})`);
  }else if(href.startsWith("#gototab:")){
   const parts=href.slice(9).split(":");
   const tb=decodeURIComponent(parts[0]||""), ar=decodeURIComponent(parts[1]||"");
   a.removeAttribute("href");
   a.setAttribute("onclick",`cmsGoto(${q(tb)},${q(ar)},'')`);
  }else if(href.startsWith("#gotoart:")){
   const parts=href.slice(9).split(":");
   const tb=decodeURIComponent(parts[0]||""), ar=decodeURIComponent(parts[1]||"");
   a.removeAttribute("href");
   a.setAttribute("onclick",`cmsGotoArt(${q(tb)},${q(ar)})`);
  }else if(/^https?:\/\//i.test(href)){
   a.setAttribute("target","_blank");
   a.setAttribute("rel","noopener");
  }
 });
 let tocHtml="";
 if(showToc && headings.length>0){
  const bodyId=`toc-body-${gid}`;
  const icId=`toc-ic-${gid}`;
  tocHtml=`<div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:14px;padding:14px 18px;margin:0 0 18px;"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><span style="font-weight:800;font-size:15px;color:#4338ca;display:flex;align-items:center;gap:8px;"><i class="fas fa-list-ul"></i>Xem nhanh</span><button type="button" onclick="const b=document.getElementById('${bodyId}'),ic=document.getElementById('${icId}');const h=b.classList.toggle('hidden');ic.className=h?'fas fa-chevron-down text-indigo-400':'fas fa-chevron-up text-indigo-400';" style="background:transparent;border:0;color:#4338ca;cursor:pointer;"><i id="${icId}" class="fas fa-chevron-up text-xs text-indigo-400"></i></button></div><div id="${bodyId}" style="display:flex;flex-direction:column;gap:8px;">${headings.map(h=>{
   if(h.tag==='h2') return `<a onclick="guideScroll('${h.id}')" style="cursor:pointer;color:#1e1b4b;text-decoration:none;font-weight:700;font-size:14px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;"><span style="color:#818cf8;font-weight:bold;font-size:14px;">&gt;</span><span>${esc(h.label)}</span></a>`;
   return `<a onclick="guideScroll('${h.id}')" style="cursor:pointer;color:#334155;text-decoration:none;font-weight:600;font-size:13px;padding-left:20px;display:flex;gap:8px;align-items:flex-start;line-height:1.5;"><span style="color:#818cf8;font-weight:bold;font-size:13px;">&gt;</span><span>${esc(h.label)}</span></a>`;
  }).join("")}</div></div>`;
}
 return tocHtml + temp.innerHTML;
}
function scrollToHeadingText(txt){
 const container=$("cmsPreview");if(!container)return;
 for(const el of container.querySelectorAll("h2, h3")){
  if((el.textContent||"").trim()===txt.trim()){el.scrollIntoView({behavior:"smooth",block:"start"});return;}
 }
}
function cmsPrev(){
  const el=$("cmsPreview");if(!el)return;
  let html=buildRichArticleView(curArtHtml, curArtShowToc, `${curCms}-${curArt}`);
  const faqs=curArtFaqs.filter(f=>(f.q||"").trim());
  if(faqs.length) html+=`<div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0"><div style="font-weight:800;font-size:15px;margin-bottom:10px;color:#1e293b">❓ Câu hỏi thường gặp về bài viết này</div>${faqs.map(f=>`<details style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;margin-bottom:8px"><summary style="font-weight:700;font-size:13px;color:#4338ca;cursor:pointer">${esc(f.q)}</summary><p style="margin:8px 0 0;font-size:13px;color:#475569;line-height:1.6">${esc(f.a)}</p></details>`).join("")}</div>`;
  const rel=guideTabList().flatMap(t=>artsOf(t.id)).filter(x=>curArtRelated.includes(x.id));
  if(rel.length) html+=`<div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0"><div style="font-weight:800;font-size:14px;margin-bottom:10px;color:#1e293b">📰 Bài viết khác có thể bạn quan tâm:</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${rel.map(x=>`<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:12px;font-weight:700;color:#334155">${esc(x.name||x.id)} →</div>`).join("")}</div></div>`;
  el.innerHTML=html;
  const wm=(curArtWatermark||"").trim();
  if(wm){const w=Math.max(240,wm.length*15+90);const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='170'><text x='${w/2}' y='85' text-anchor='middle' dominant-baseline='middle' transform='rotate(-30 ${w/2} 85)' font-family='Arial,sans-serif' font-size='24' font-weight='800' fill='#64748b' fill-opacity='0.13'>${esc(wm)}</text></svg>`;el.style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;el.style.backgroundRepeat="repeat";}
  else el.style.backgroundImage="none";
}
// Đã loại bỏ 100% modal chèn thủ công, thanh công cụ Quill.js xử lý trực tiếp
function addArtFaqRow(){
 curArtFaqs.push({q:"",a:""});
 renderArtFaqsUI();
}
function delArtFaqRow(idx){
 curArtFaqs.splice(idx,1);
 cmsPrev();
 renderArtFaqsUI();
}
function renderArtFaqsUI(){
 const c=$("artFaqsContainer");if(!c)return;
 if(!curArtFaqs.length){c.innerHTML='<div class="text-[11px] text-slate-400 italic">Chưa có câu hỏi thường gặp riêng cho bài này. Bấm nút phía trên để thêm.</div>';return;}
 c.innerHTML=curArtFaqs.map((f,idx)=>`
  <div class="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5">
   <div class="flex items-center justify-between">
    <span class="text-[10px] font-black text-indigo-700 uppercase">Câu hỏi #${idx+1}</span>
    <button type="button" onclick="delArtFaqRow(${idx})" class="text-red-500 hover:text-red-700 text-xs px-1"><i class="fas fa-trash"></i></button>
   </div>
   <input type="text" value="${esc(f.q)}" oninput="curArtFaqs[${idx}].q=this.value;cmsPrev()" placeholder="Nhập câu hỏi riêng cho bài này..." class="w-full p-1.5 text-xs border rounded-lg bg-white font-bold outline-none">
   <textarea rows="2" oninput="curArtFaqs[${idx}].a=this.value;cmsPrev()" placeholder="Nhập câu trả lời..." class="w-full p-1.5 text-xs border rounded-lg bg-white outline-none leading-relaxed">${esc(f.a)}</textarea>
  </div>
 `).join('');
}
function toggleRelatedArtPick(artSlug, checked){
 let s = new Set(curArtRelated);
 if(checked) s.add(artSlug); else s.delete(artSlug);
 curArtRelated = [...s];
 cmsPrev();
}

function renderCmsEditor(){
 const w=$("cmsEditorWrap");if(!curArt){w.classList.add("hidden");return;}w.classList.remove("hidden");
 const a=artsOf(curCms).find(x=>(x.slug||toSlug(x.name))===curArt);
 const deepLink = `${PD.replace(/\/$/,"")}/portal/guide/${encodeURIComponent(curCms)}/${encodeURIComponent(curArtSlug||curArt)}`;
 $("cmsArtMeta").innerHTML=`
  <div><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tên bài viết</label><input value="${esc(curArtName)}" oninput="curArtName=this.value;if(!curArtSlug||curArtSlug.startsWith('bai-viet-moi-')){$('cmsArtSlugInp').value=toSlug(this.value);curArtSlug=toSlug(this.value);}" class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none font-bold"></div>
  <div><label class="block text-[10px] font-bold text-indigo-600 mb-0.5">Slug URL (không dấu, cách nhau dấu -)</label><input id="cmsArtSlugInp" value="${esc(curArtSlug||curArt)}" oninput="this.value=toSlug(this.value);curArtSlug=this.value;" class="w-full p-2 text-xs border border-indigo-200 rounded-lg outline-none font-mono font-bold bg-indigo-50/30"></div>
  <div><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Tác giả</label><input value="${esc(curArtAuthor)}" oninput="curArtAuthor=this.value" class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"></div>
  <div><label class="block text-[10px] font-bold text-slate-500 mb-0.5">Watermark nền</label><input value="${esc(curArtWatermark)}" oninput="curArtWatermark=this.value" placeholder="VD: VPNTrinhHg" class="w-full p-2 text-xs border border-slate-200 rounded-lg outline-none"></div>
  <div class="sm:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-2 border-t border-slate-100 mt-1">
   <label class="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer"><input type="checkbox" ${curArtShowToc?"checked":""} onchange="curArtShowToc=this.checked" class="w-4 h-4 accent-indigo-600">Tự động hiện khung Mục lục (từ H2, H3)</label>
   <div class="flex items-center gap-1.5 w-full min-w-0 justify-start sm:justify-end"><span class="text-[11px] font-bold text-slate-500 shrink-0">Link riêng:</span><code class="text-[11px] bg-slate-100 text-indigo-700 px-2 py-1 rounded border border-slate-200 truncate flex-1 font-mono">${esc(deepLink)}</code><button type="button" onclick="copyArtDeepLink(${q(curCms)},${q(curArtSlug||curArt)})" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shrink-0"><i class="fas fa-copy mr-1"></i>Copy Link</button></div>
  </div>
  <details class="sm:col-span-4 border-t border-slate-100 pt-2"><summary class="cursor-pointer select-none text-xs font-extrabold text-indigo-900 py-1"><i class="fas fa-sliders text-indigo-600 mr-1.5"></i>Nâng cao: FAQ riêng &amp; Bài viết liên quan (bấm để mở)</summary><div class="space-y-3 pt-2">
   <!-- KHỐI FAQ RIÊNG CỦA BÀI VIẾT -->
  <div class="sm:col-span-4 border-t border-slate-100 pt-3 space-y-2">
   <div class="flex items-center justify-between">
    <label class="font-extrabold text-xs text-indigo-900 flex items-center gap-1.5"><i class="fas fa-circle-question text-indigo-600"></i>Câu hỏi thường gặp riêng của bài viết này (FAQ)</label>
    <button type="button" onclick="addArtFaqRow()" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold px-2.5 py-1 rounded-lg text-[11px] transition"><i class="fas fa-plus mr-1"></i>Thêm câu hỏi</button>
   </div>
   <div id="artFaqsContainer" class="space-y-2"></div>
  </div>
  <!-- KHỐI CHỌN BÀI VIẾT LIÊN QUAN -->
  <div class="sm:col-span-4 border-t border-slate-100 pt-3 space-y-2">
   <label class="font-extrabold text-xs text-slate-800 flex items-center gap-1.5"><i class="fas fa-newspaper text-indigo-600"></i>Mục bài viết khác (Khách bấm vào sẽ nhảy sang link bài đó)</label>
   <div class="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5 scroll-hide">
    ${guideTabList().flatMap(t=>artsOf(t.id).filter(x=>(x.slug||toSlug(x.name))!==curArt).map(other=>`
      <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-1.5 rounded-lg border border-slate-100 cursor-pointer hover:bg-indigo-50/50">
       <input type="checkbox" ${curArtRelated.includes(other.slug||toSlug(other.name))?'checked':''} onchange="toggleRelatedArtPick('${esc(other.slug||toSlug(other.name))}', this.checked)" class="accent-indigo-600 w-4 h-4">
       <span class="text-[10px] font-bold text-slate-400">[${esc(t.name)}]</span>
       <span class="truncate flex-1">${esc(other.name||other.slug)}</span>
      </label>
    `)).join('') || '<div class="text-[11px] text-slate-400 italic">Chưa có bài viết khác trên website.</div>'}
   </div>
  </div></div></details>`;
 setTimeout(renderArtFaqsUI, 20);
 $("cmsAddBtns").innerHTML = `
  <div class="flex items-center gap-2">
   <span class="font-extrabold text-xs text-slate-700"><i class="fas fa-pen-nib text-indigo-600 mr-1.5"></i>Trình soạn thảo chuẩn Word (Quill.js)</span>
   <span class="text-[10px] text-slate-400 font-medium">Bấm Ctrl+S để lưu nhanh · H2/H3 tự động lên mục lục</span>
  </div>
  <button type="button" onclick="saveCms()" class="tb-btn !bg-indigo-600 !text-white !border-indigo-600 hover:!bg-indigo-700 shadow-sm text-xs font-bold px-3"><i class="fas fa-floppy-disk mr-1"></i>Lưu bài viết</button>
 `;

 if (typeof Quill !== "undefined" && $("quillEditor")) {
  if (!quillInst) {
   quillInst = new Quill('#quillEditor', {
    theme: 'snow',
    placeholder: 'Bắt đầu soạn thảo hoặc dán bài viết Word vào đây...',
    modules: {
     toolbar: [
      [{ 'header': [2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['clean']
     ]
    }
   });
   quillInst.on('text-change', () => {
    curArtHtml = getEditorHtml();
    cmsPrev();
   });
   quillInst.root.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
     e.preventDefault();
     saveCms();
    }
   });
  }
  const cleanHtml = typeof DOMPurify !== "undefined" ? DOMPurify.sanitize(curArtHtml) : curArtHtml;
  if (quillInst.root.innerHTML !== cleanHtml) {
   quillInst.root.innerHTML = cleanHtml;
  }
 }
 cmsPrev();
}
async function saveCms(){
 if(!curArt)return toast("Chưa mở bài nào để lưu!","err");
 cmsEnsureTabs();
 ensureArts();
 commitCms();
 const a=artsOf(curCms).find(x=>(x.slug||toSlug(x.name))===curArt);
 if(a){
   a.updated=nowMs();
   delete a.id;
   delete a.blocks;
 }
 try{
   await aj("/api/guides",{method:"POST",body:guides});
   toast("Đã lưu bài viết thành công!");
   logEvent("ok","admin","Lưu bài viết hướng dẫn",`${curCms} / ${curArtName||curArtSlug}`);
   if(a) { curArt=a.slug; curArtSlug=a.slug; }
   renderGuideCategoriesTree();
   cmsPrev();
 }catch(e){
   toast("Lỗi lưu bài viết: "+e.message,"err");
 }
}

function closeCmsEditor() {
 commitCms();
 curArt = null;
 curArtSlug = "";
 $("cmsEditorWrap").classList.add("hidden");
 $("cmsCategoriesView").classList.remove("hidden");
 renderGuideCategoriesTree();
}

function openCmsEditorForArt(tabId, slug) {
 curCms = tabId;
 openArt(slug);
 $("cmsCategoriesView").classList.add("hidden");
 $("cmsEditorWrap").classList.remove("hidden");
}

function addArticleToCategory(tabId) {
 curCms = tabId;
 artAdd();
 $("cmsCategoriesView").classList.add("hidden");
 $("cmsEditorWrap").classList.remove("hidden");
}

function renderGuideCategoriesTree() {
 const container = $("cmsCategoriesTree");
 if (!container) return;
 cmsEnsureTabs();
 ensureArts();
 const tabs = guideTabList();

 container.innerHTML = tabs.map((tab, tIdx) => {
   const arts = artsOf(tab.id);
   return `
   <div data-tabid="${esc(tab.id)}" class="cms-cat-box bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
     <!-- Header Mục / Danh mục lớn -->
     <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
       <div class="flex items-center gap-2 flex-1 min-w-[200px]">
         <span class="grip-cat cursor-grab text-slate-400 hover:text-indigo-600 px-1" title="Kéo thả đổi thứ tự"><i class="fas fa-grip-vertical text-lg"></i></span>
         ${tab.img ? `<img src="${esc(safeUrl(tab.img))}" class="w-6 h-6 rounded object-contain">` : `<i class="${esc(tab.ic||'fas fa-book')} ${esc(tab.col||'text-indigo-600')} text-lg"></i>`}
         <input type="text" value="${esc(tab.name)}" oninput="tab.name=this.value;cmsEnsureTabs();guides._tabs[${tIdx}].name=this.value;" placeholder="Tên mục..." class="font-extrabold text-sm md:text-base text-slate-800 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 bg-white">
         <span class="bg-indigo-50 text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-full">${arts.length} bài</span>
       </div>
       <div class="flex items-center gap-2">
         <input type="text" value="${esc(tab.img||'')}" oninput="tab.img=this.value;cmsEnsureTabs();guides._tabs[${tIdx}].img=this.value;" placeholder="URL icon (để trống = mặc định)" class="w-48 p-1.5 text-xs border border-slate-200 rounded-lg outline-none font-mono bg-slate-50">
         <button type="button" onclick="addArticleToCategory('${esc(tab.id)}')" class="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 shadow-sm">
           <i class="fas fa-plus"></i>Thêm bài mới
         </button>
         ${DEF_TABS.some(d=>d.id===tab.id) ? '' : `
         <button type="button" onclick="curCms='${esc(tab.id)}';cmsDelTab()" class="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg text-xs" title="Xóa danh mục"><i class="fas fa-trash"></i></button>
         `}
       </div>
     </div>

     <!-- Danh sách các bài viết con thuộc mục này -->
     <div class="space-y-2">
       ${arts.map(a => {
         const sl = a.slug || toSlug(a.name);
         const timeStr = a.updated ? fmtBank(a.updated) : "Mới";
         return `
         <div onclick="openCmsEditorForArt('${esc(tab.id)}', '${esc(sl)}')" class="cursor-pointer bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 transition">
           <div class="min-w-0">
             <div class="font-bold text-xs md:text-sm text-slate-800 truncate">${esc(a.name || "(Chưa đặt tên)")}</div>
             <div class="text-[10px] text-slate-500 mt-0.5">Được viết bởi: <b>${esc(a.author || "Admin")}</b> · Cập nhật lần cuối: ${timeStr}</div>
           </div>
           <div class="flex items-center gap-1.5 shrink-0" onclick="event.stopPropagation()">
             <button type="button" onclick="copyArtDeepLink('${esc(tab.id)}', '${esc(sl)}')" class="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition"><i class="fas fa-link mr-1"></i>Link</button>
             <button type="button" onclick="openCmsEditorForArt('${esc(tab.id)}', '${esc(sl)}')" class="text-indigo-600 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition"><i class="fas fa-pen mr-1"></i>Sửa bài</button>
             <button type="button" onclick="curCms='${esc(tab.id)}';artDel('${esc(sl)}')" class="text-red-500 bg-white border border-red-200 px-2 py-1 rounded-lg text-xs hover:bg-red-500 hover:text-white transition"><i class="fas fa-trash"></i></button>
           </div>
         </div>
         `;
       }).join('') || '<div class="text-[11px] text-slate-400 italic py-2">Chưa có bài viết nào trong mục này. Bấm "+ Thêm bài mới" để tạo bài đầu tiên.</div>'}
     </div>
   </div>
   `;
 }).join('');

 if (typeof Sortable !== "undefined") {
   new Sortable(container, {
     handle: ".grip-cat",
     animation: 150,
     onEnd: async () => {
       const ids = [...container.querySelectorAll(".cms-cat-box")].map(el => el.dataset.tabid);
       guides._tabs.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
       try {
         await aj("/api/guides", { method: "POST", body: guides });
         toast("Đã lưu thứ tự danh mục thành công!");
       } catch(e) {}
     }
   });
 }
}
// ===================== CÀI ĐẶT =====================
const saveCmsDb = () => aj("/api/cms", { method: "POST", body: cmsDb });
// Điều hướng 2 sub-tab bên trong Tab Kiểm tra (Kiểm tra bù link vs Rà quét & Map lại)
let curCheckSubTab = 'data';
function switchCheckSubTab(tab) {
  curCheckSubTab = tab;
  ['data', 'heal', 'scan'].forEach(t => {
    const btn = $('btn-chk-' + t);
    const pane = $('check-pane-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (pane) pane.classList.toggle('hidden', t !== tab);
  });
  if (tab === 'data') renderDataRequests();
  else if (tab === 'heal') renderHealTab();
  else if (tab === 'scan') renderScanTab();
}

// Điều hướng đúng chuẩn 5 Sub-tab trong Cài đặt - Khớp 100% ID HTML, triệt tiêu lỗi TypeError classList of null
function switchSettingsTab(t){
 const tabs = ["webadmin", "setweb", "log", "dev", "time"];
 tabs.forEach(x => {
   const view = $("settings-view-" + x);
   const btn = $("stab-" + x);
   if (view) view.classList.toggle("hidden", x !== t);
   if (btn) btn.classList.toggle("active", x === t);
 });
 if (t === "webadmin") loadWebAdminUI();
 if (t === "setweb") loadSettingsUI();
 if (t === "log") loadLogs();
 if (t === "dev") renderDev();
 if (t === "time") paintTimeUI();
}
function showCronLog(){switchSettingsTab("log");$("logSrc").value="cron";$("logLvl").value="";loadLogs();}
// Khối 1: Render & Lưu Định tuyến Gốc (Chỉ phục vụ gán ô dán link)
function renderRouteRows(){
  const s = cmsDb.settings;
  $("routeRows").innerHTML = [1, 2, 3].map(i => `
    <div class="bg-slate-50 border border-slate-200 p-2 rounded-xl">
      <label class="block font-bold text-[10px] text-slate-600 mb-1">Web ${i} → Ô Link ${i} (từ khoá domain)</label>
      <input id="routeWeb${i}" type="text" value="${esc(s["routeWeb" + i] || "")}" placeholder="${["doicucden", "onepiece", "lucastanora"][i - 1]}" class="w-full p-1.5 border border-slate-200 rounded-lg outline-none font-mono text-[11px] bg-white">
    </div>
  `).join("");
}

async function saveRouting(){
  const s = cmsDb.settings;
  [1, 2, 3].forEach(i => { s["routeWeb" + i] = $("routeWeb" + i).value.trim(); });
  try {
    await saveCmsDb();
    toast("Đã lưu Định tuyến Gốc");
    logEvent("ok", "Lưu cấu hình", "Định tuyến Gốc");
    renderRouteRows();
  } catch(e) {
    toast("Lỗi lưu: " + e.message, "err");
  }
}

// Khối 2: Render & Lưu Làm mờ (Quy định cứng: doicucden / onepiecechapter / lucastanora)
const BLUR_RULES = { 1: "doicucden", 2: "onepiecechapter", 3: "lucastanora" };

function checkBlurValidity(i) {
  const val = String($("blurRoute" + i)?.value || "").trim().toLowerCase();
  const req = BLUR_RULES[i];
  const badge = $("blurBadge" + i);
  if (!badge) return;
  if (!val) {
    badge.className = "text-[9px] font-bold text-slate-400";
    badge.textContent = "Chưa nhập";
  } else if (val.includes(req)) {
    badge.className = "text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200";
    badge.textContent = "✔ Hợp lệ (" + req + ")";
  } else {
    badge.className = "text-[9px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200";
    badge.textContent = "✘ Phải nhập: " + req;
  }
}

function renderBlurRows(){
  const s = cmsDb.settings;
  $("blurRows").innerHTML = [1, 2, 3].map(i => `
    <div class="flex items-center justify-between bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl">
      <div class="flex-1 mr-3">
        <div class="flex items-center justify-between mb-1">
          <label class="block font-bold text-[10px] text-purple-900">Ô ${i} → Mờ Link ${i}</label>
          <span id="blurBadge${i}"></span>
        </div>
        <input id="blurRoute${i}" type="text" oninput="checkBlurValidity(${i})" value="${esc(s["blurRoute" + i] || "")}" placeholder="Bắt buộc nhập: ${BLUR_RULES[i]}" class="w-full p-1.5 border border-purple-200 rounded-lg outline-none font-mono text-[11px] bg-white font-bold text-purple-950">
      </div>
      <div class="flex flex-col items-center shrink-0">
        <label class="block font-bold text-[10px] text-purple-800 mb-1">Bật mờ</label>
        <div class="toggle-wrap">
          <input type="checkbox" id="blurOn${i}" ${s["blurOn" + i] ? "checked" : ""}>
          <span class="toggle-slider"></span>
        </div>
      </div>
    </div>
  `).join("");
  [1, 2, 3].forEach(checkBlurValidity);
}

async function saveBlur(){
  const s = cmsDb.settings;
  [1, 2, 3].forEach(i => {
    s["blurRoute" + i] = $("blurRoute" + i).value.trim();
    s["blurOn" + i] = $("blurOn" + i).checked;
  });
  try {
    // Chỉ lưu vào KV của web này, KHÔNG bắn đồng bộ đi đâu cả!
    await saveCmsDb();
    toast("Đã lưu cấu hình làm mờ cho web này");
    logEvent("ok", "Lưu cấu hình", "Làm mờ Blur cục bộ");
    renderBlurRows();
    renderOrd();
  } catch(e) {
    toast("Lỗi lưu: " + e.message, "err");
  }
}
// Đã loại bỏ hoàn toàn các hàm đồng bộ Worker Vệ Tinh (Hệ thống chạy độc lập 100% qua Supabase)
// Icon Dock: KHÔNG dùng FontAwesome, KHÔNG màu nền. Icon mặc định chỉ hiện trạng thái; icon tùy chỉnh = tên + URL ảnh (preview ngay) [+ link mở khi bấm, tùy chọn]
function renderDockRows(){
 const list=arr(cmsDb.settings.dock);
 $("dockRows").innerHTML=`<div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5"><div class="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300"><i class="fas fa-layer-group"></i></div><div class="min-w-0"><div class="text-xs font-bold text-slate-700">Icon mặc định của Trang chủ</div><div class="text-[10px] text-emerald-600 font-bold">Đang bật — dùng danh sách có sẵn, không cần URL</div></div></div>`+
 (list.map((it,i)=>{const legacy=!it.img&&it.icon;return `<div class="flex items-center gap-2 border ${legacy?"border-amber-300 bg-amber-50":"border-slate-200 bg-white"} rounded-xl p-2"><div class="w-10 h-10 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center"><img id="dockPv_${i}" src="${esc(it.img||"")}" class="w-full h-full object-contain ${it.img?"":"hidden"}" onerror="this.classList.add('hidden')" onload="this.classList.remove('hidden')"></div><div class="grid grid-cols-1 sm:grid-cols-3 gap-1.5 flex-1 min-w-0"><input id="dockName_${i}" type="text" value="${esc(it.name||"")}" placeholder="Tên icon" class="p-1.5 border border-slate-200 rounded-lg text-[11px] bg-white outline-none"><input id="dockImg_${i}" type="text" value="${esc(it.img||"")}" oninput="dockPv(${i},this.value)" placeholder="URL ảnh icon https://..." class="p-1.5 border border-slate-200 rounded-lg text-[11px] font-mono bg-white outline-none"><input id="dockUrl_${i}" type="text" value="${esc(it.url||"")}" placeholder="Link mở khi bấm (tùy chọn)" class="p-1.5 border border-slate-200 rounded-lg text-[11px] font-mono bg-white outline-none"></div><button onclick="removeDockIcon(${i})" class="shrink-0 bg-red-50 text-red-500 rounded-lg p-2 hover:bg-red-500 hover:text-white"><i class="fas fa-trash text-[11px]"></i></button>${legacy?'<div class="text-[9px] text-amber-700 font-bold w-full">Icon kiểu cũ (FontAwesome) — nhập URL ảnh mới, nếu không sẽ bị bỏ khi lưu</div>':""}</div>`;}).join(""));}
function dockPv(i,v){const im=$("dockPv_"+i);if(!im)return;im.classList.add("hidden");im.src=/^https?:\/\//i.test(v)?v:"";}
function readDockRows(){const a=arr(cmsDb.settings.dock);a.forEach((it,i)=>{if($("dockImg_"+i)){it.name=$("dockName_"+i).value.trim();it.img=$("dockImg_"+i).value.trim();it.url=$("dockUrl_"+i).value.trim();delete it.icon;delete it.bg;}});return a;}
function addDockIcon(){const a=readDockRows();a.push({name:"",img:"",url:""});cmsDb.settings.dock=a;renderDockRows();}
function removeDockIcon(i){const a=readDockRows();a.splice(i,1);cmsDb.settings.dock=a;renderDockRows();}
async function saveDock(){const a=readDockRows().filter(it=>/^https?:\/\//i.test(it.img||""));cmsDb.settings.dock=a;try{await saveCmsDb();toast("Đã lưu Icon Dock ("+a.length+" icon tùy chỉnh)");logEvent("ok","Lưu cấu hình","Icon Dock");renderDockRows();}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
// ===================== LOGIC QUẢN LÝ FAQ =====================
const DEFAULT_FAQS = [
  { id: "faq_1", q: "Làm sao lấy Link cài đặt?", a: "Nhập Mã Đơn hoặc Email vào thanh tìm kiếm trên cùng." },
  { id: "faq_2", q: "VPN hỗ trợ những app nào?", a: "TikTok, Facebook, Messenger, Instagram, Telegram, Zalo, YouTube... Nhắn Admin để test." },
  { id: "faq_3", q: "Có những phương thức thanh toán nào?", a: "Ngân hàng VN (VietQR), Alipay, Weixin." },
  { id: "faq_4", q: "Đổi máy có dùng tiếp được không?", a: "Có. Tra cứu lại Mã Đơn trên web." },
  { id: "refund", q: "Hoàn tiền", a: "Website không áp dụng hoàn tiền cho đơn hàng đã mua, khách hàng vui lòng chú ý và cân nhắc khi thanh toán." }
];

let adminFaqsList = [];

function loadAdminFaqs() {
  if (Array.isArray(cmsDb.faqs) && cmsDb.faqs.length) {
    adminFaqsList = cmsDb.faqs;
  } else {
    adminFaqsList = JSON.parse(JSON.stringify(DEFAULT_FAQS));
  }
}

function renderFaqAdmin() {
  if (!adminFaqsList.length) loadAdminFaqs();
  const c = $("faqListContainer");
  if (!c) return;
  c.innerHTML = adminFaqsList.map((item, idx) => `
    <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
      <div class="flex items-center justify-between border-b border-slate-100 pb-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded">#${idx + 1}</span>
          <span class="font-bold text-xs text-indigo-700 font-mono">${esc(item.id || 'faq')}</span>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" onclick="moveFaq(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="w-7 h-7 rounded bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200"><i class="fas fa-arrow-up text-xs"></i></button>
          <button type="button" onclick="moveFaq(${idx}, 1)" ${idx === adminFaqsList.length - 1 ? 'disabled' : ''} class="w-7 h-7 rounded bg-slate-100 text-slate-600 disabled:opacity-30 hover:bg-slate-200"><i class="fas fa-arrow-down text-xs"></i></button>
          <button type="button" onclick="delFaq(${idx})" class="w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition"><i class="fas fa-trash text-xs"></i></button>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Câu hỏi (Q):</label>
        <input type="text" value="${esc(item.q || '')}" oninput="adminFaqsList[${idx}].q = this.value" class="w-full p-2 text-xs border border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500">
      </div>
      <div>
        <label class="block text-[10px] font-bold text-slate-500 mb-0.5">Câu trả lời (A):</label>
        <textarea rows="2" oninput="adminFaqsList[${idx}].a = this.value" class="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 leading-relaxed">${esc(item.a || '')}</textarea>
      </div>
    </div>
  `).join("");
}

function addNewFaq() {
  const nextId = "faq_" + (adminFaqsList.length + 1);
  adminFaqsList.push({ id: nextId, q: "Câu hỏi thường gặp mới", a: "Câu trả lời..." });
  renderFaqAdmin();
  toast("Đã thêm câu hỏi mới, hãy nhập nội dung và bấm LƯU FAQ.");
}

function delFaq(idx) {
  if (!confirm(`Xóa câu hỏi #${idx + 1}?`)) return;
  adminFaqsList.splice(idx, 1);
  renderFaqAdmin();
  toast("Đã xóa câu hỏi.");
}

function moveFaq(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= adminFaqsList.length) return;
  const [item] = adminFaqsList.splice(idx, 1);
  adminFaqsList.splice(target, 0, item);
  renderFaqAdmin();
}

async function saveFaqs() {
  cmsDb.faqs = JSON.parse(JSON.stringify(adminFaqsList));
  try {
    await saveCmsDb();
    toast(`Đã lưu ${adminFaqsList.length} câu hỏi FAQ và đồng bộ sang Trang chủ thành công!`);
    logEvent("ok", "FAQ", `Lưu ${adminFaqsList.length} câu hỏi`);
  } catch(e) {
    toast("Lỗi lưu FAQ: " + e.message, "err");
  }
}

function switchFaqSubTab(tab){
  const pFaq = $("subpane-faq") || $("pane-faq-list");
  const pFooter = $("subpane-footer") || $("pane-footer-cfg");
  if (pFaq) pFaq.classList.toggle("hidden", tab !== "faq");
  if (pFooter) pFooter.classList.toggle("hidden", tab !== "footer");
  const bFaq = $("btn-sub-faq");
  const bFooter = $("btn-sub-footer");
  if (bFaq) bFaq.classList.toggle("active", tab === "faq");
  if (bFooter) bFooter.classList.toggle("active", tab === "footer");
  if (tab === "footer") loadFooterConfigUI();
}

const DEFAULT_SYS_ROUTES = {
  order: "/portal/order",
  packages: "/portal/packages",
  guide: "/portal/guide",
  policy: "/policy"
};

function normRouteInput(val, def) {
  if (!val || typeof val !== 'string') return def;
  let s = val.trim();
  if (!s) return def;
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/+$/, '');
  return s || def;
}

function loadRoutesConfigUI() {
  const r = (cmsDb && cmsDb.settings && cmsDb.settings.routes) || {};
  if ($("rtOrder")) $("rtOrder").value = r.order || "";
  if ($("rtPackages")) $("rtPackages").value = r.packages || "";
  if ($("rtGuide")) $("rtGuide").value = r.guide || "";
  if ($("rtPolicy")) $("rtPolicy").value = r.policy || "";
}

async function saveRoutesConfig() {
  const o = normRouteInput($("rtOrder")?.value, DEFAULT_SYS_ROUTES.order);
  const p = normRouteInput($("rtPackages")?.value, DEFAULT_SYS_ROUTES.packages);
  const g = normRouteInput($("rtGuide")?.value, DEFAULT_SYS_ROUTES.guide);
  const pol = normRouteInput($("rtPolicy")?.value, DEFAULT_SYS_ROUTES.policy);

  const set = new Set([o, p, g, pol]);
  if (set.size < 4) {
    toast("Lỗi: Các đường dẫn không được trùng nhau!", "err");
    return;
  }

  cmsDb.settings = cmsDb.settings || {};
  cmsDb.settings.routes = { order: o, packages: p, guide: g, policy: pol };
  if ($("rtOrder")) $("rtOrder").value = o === DEFAULT_SYS_ROUTES.order ? "" : o;
  if ($("rtPackages")) $("rtPackages").value = p === DEFAULT_SYS_ROUTES.packages ? "" : p;
  if ($("rtGuide")) $("rtGuide").value = g === DEFAULT_SYS_ROUTES.guide ? "" : g;
  if ($("rtPolicy")) $("rtPolicy").value = pol === DEFAULT_SYS_ROUTES.policy ? "" : pol;

  try {
    await saveCmsDb();
    toast("Đã lưu Cấu hình Đường dẫn Hệ thống thành công!");
    logEvent("ok", "Routes", `Cấu hình routes: ${o}, ${p}, ${g}, ${pol}`);
  } catch(e) {
    toast("Lỗi lưu routes: " + e.message, "err");
  }
}

let ftCols = [];
const FT_TEMPLATE = [
  { title: "Dịch vụ", links: [{ title: "Bảng giá gói cước", url: "/portal/packages" }, { title: "Tra cứu đơn hàng", url: "/portal/order" }, { title: "Kiểm tra dung lượng", url: "/portal/order" }] },
  { title: "Hướng dẫn", links: [{ title: "Cài đặt Android", url: "/portal/guide" }, { title: "Cài đặt iOS (iPhone/iPad)", url: "/portal/guide" }, { title: "Cài đặt Windows", url: "/portal/guide" }, { title: "Cài đặt MacOS", url: "/portal/guide" }] },
  { title: "Pháp lý", links: [{ title: "Chính sách sử dụng", url: "/policy/terms" }, { title: "Miễn trừ trách nhiệm", url: "/policy/disclaimer" }, { title: "Quy định hoàn tiền", url: "/policy/refund" }] }
];
const ftClone = (x) => JSON.parse(JSON.stringify(x));
function ftColsFromDb(ft) {
  if (Array.isArray(ft.columns)) return ftClone(ft.columns);
  return [["Dịch vụ", ft.services], ["Hướng dẫn", ft.guides], ["Pháp lý", ft.legal]].filter(x => Array.isArray(x[1]) && x[1].length).map(x => ({ title: x[0], links: ftClone(x[1]) }));
}

function renderFtCols() {
  const w = $("ftColsWrap"); if (!w) return;
  w.innerHTML = ftCols.map((c, ci) => `
   <div data-col-idx="${ci}" class="ft-col-item border-2 border-slate-200 rounded-2xl p-3.5 bg-slate-50/70 space-y-3 transition hover:border-indigo-300">
    <div class="flex items-center gap-1.5 pb-2 border-b border-slate-200">
     <span class="grip-ft-col cursor-grab text-slate-400 hover:text-indigo-600 px-1" title="Kéo để đổi vị trí cột"><i class="fas fa-grip-vertical"></i></span>
     <input value="${esc(c.title || '')}" oninput="ftCols[${ci}].title=this.value" placeholder="Tên cột" class="flex-1 min-w-0 p-1.5 text-xs font-black border border-slate-200 rounded-lg bg-white uppercase outline-none focus:border-indigo-500">
     <button type="button" onclick="ftDelCol(${ci})" title="Xóa cả cột" class="text-red-500 hover:text-red-700 px-1.5 text-xs"><i class="fas fa-trash"></i></button>
    </div>
    <div class="ft-links-wrap space-y-2" data-col="${ci}">${(c.links || []).map((l, li) => `
     <div class="ft-link-item bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm space-y-1.5 transition hover:border-indigo-300">
      <div class="flex items-center gap-1.5">
       <span class="grip-ft-link cursor-grab text-slate-300 hover:text-indigo-600 px-0.5"><i class="fas fa-grip-vertical text-xs"></i></span>
       <span class="text-[10px] font-bold text-slate-400 shrink-0">Tên:</span>
       <input value="${esc(l.title || '')}" oninput="ftCols[${ci}].links[${li}].title=this.value" placeholder="Tên hiển thị..." class="flex-1 p-1 text-xs border border-slate-200 rounded-lg outline-none font-bold text-slate-800 focus:border-indigo-500">
       <button type="button" onclick="ftDelLink(${ci},${li})" title="Xóa liên kết" class="text-red-400 hover:text-red-600 px-1 text-xs shrink-0"><i class="fas fa-times"></i></button>
      </div>
      <div class="flex items-center gap-1.5 pl-5">
       <span class="text-[10px] font-bold text-indigo-400 shrink-0">URL:</span>
       <input list="ftUrlPresets" value="${esc(l.url || '')}" oninput="ftCols[${ci}].links[${li}].url=this.value" placeholder="URL..." class="flex-1 p-1 text-xs border border-slate-200 rounded-lg outline-none font-mono text-indigo-700 focus:border-indigo-500 bg-slate-50 focus:bg-white">
      </div>
     </div>`).join('') || '<div class="text-[10px] text-slate-400 italic text-center py-2">Cột trống</div>'}</div>
    <button type="button" onclick="ftAddLink(${ci})" class="w-full text-xs font-bold text-indigo-600 border border-dashed border-indigo-300 rounded-xl py-1.5 hover:bg-indigo-50 transition"><i class="fas fa-plus mr-1"></i>Thêm liên kết</button>
   </div>`).join('') || '<div class="col-span-full text-xs text-slate-400 italic p-3 border border-dashed border-slate-300 rounded-xl text-center">Chưa có cột nào.</div>';

  if (typeof Sortable !== "undefined") {
    new Sortable(w, {
      handle: ".grip-ft-col",
      animation: 150,
      onEnd: (evt) => {
        const [moved] = ftCols.splice(evt.oldIndex, 1);
        ftCols.splice(evt.newIndex, 0, moved);
        renderFtCols();
      }
    });
    w.querySelectorAll(".ft-links-wrap").forEach(el => {
      const colIdx = Number(el.dataset.col);
      new Sortable(el, {
        handle: ".grip-ft-link",
        animation: 150,
        onEnd: (evt) => {
          const [movedLink] = ftCols[colIdx].links.splice(evt.oldIndex, 1);
          ftCols[colIdx].links.splice(evt.newIndex, 0, movedLink);
          renderFtCols();
        }
      });
    });
  }
}
function ftAddCol() { ftCols.push({ title: "Cột mới", links: [] }); renderFtCols(); }
function ftDelCol(ci) { if (!confirm("Xóa cả cột này và mọi link trong cột?")) return; ftCols.splice(ci, 1); renderFtCols(); }
function ftMoveCol(ci, d) { const j = ci + d; if (j < 0 || j >= ftCols.length) return; const [x] = ftCols.splice(ci, 1); ftCols.splice(j, 0, x); renderFtCols(); }
function ftAddLink(ci) { (ftCols[ci].links = ftCols[ci].links || []).push({ title: "Liên kết mới", url: "/portal/guide" }); renderFtCols(); }
function ftDelLink(ci, li) { ftCols[ci].links.splice(li, 1); renderFtCols(); }
function ftLoadTemplate() {
  if (ftCols.length && !confirm("Thay toàn bộ cột hiện tại bằng mẫu gợi ý? (chưa lưu cho tới khi bấm LƯU)")) return;
  ftCols = ftClone(FT_TEMPLATE); renderFtCols();
}

function loadFooterConfigUI(){
  loadRoutesConfigUI();
  const ft = cmsDb.footer || {};
  const b = ft.backups || [];
  for(let i=1; i<=3; i++){
    const item = b[i-1] || {};
    if($("ftBackupName"+i)) $("ftBackupName"+i).value = item.name || "";
    if($("ftBackupUrl"+i)) $("ftBackupUrl"+i).value = item.url || "";
  }
  if($("ftTermsText")) $("ftTermsText").value = ft.terms || "";
  if($("ftDisclaimerText")) $("ftDisclaimerText").value = ft.disclaimer || "";
  if($("ftRefundText")) $("ftRefundText").value = ft.refund || "";
  ftCols = ftColsFromDb(ft);
  renderFtCols();
}

async function saveFooterConfig(){
  await saveRoutesConfig();
  const backups = [];
  for(let i=1; i<=3; i++){
    const name = ($("ftBackupName"+i)?.value || "").trim();
    const url = ($("ftBackupUrl"+i)?.value || "").trim();
    if(name || url) backups.push({ name: name || `Web ${i}`, url: url || "#" });
  }
  cmsDb.footer = {
    backups,
    columns: ftCols.map(c => ({ title: (c.title || "").trim(), links: (c.links || []).filter(l => (l.title || "").trim()).map(l => ({ title: l.title.trim(), url: (l.url || "").trim() || "#" })) })),
    terms: ($("ftTermsText")?.value || "").trim(),
    disclaimer: ($("ftDisclaimerText")?.value || "").trim(),
    refund: ($("ftRefundText")?.value || "").trim()
  };
  try {
    await saveCmsDb();
    toast("Đã lưu toàn bộ cấu hình Footer & Đường dẫn thành công!");
    logEvent("ok", "Footer", "Lưu cấu hình Footer & Routes");
  } catch(e) {
    toast("Lỗi lưu footer: " + e.message, "err");
  }
}
async function saveQrExpireSeconds(){
 const val = Math.max(5, Math.min(3600, parseInt($("qrExpireSecondsInp")?.value) || 30));
 cmsDb.settings = cmsDb.settings || {};
 cmsDb.settings.qrExpireSeconds = val;
 if($("qrExpireSecondsInp")) $("qrExpireSecondsInp").value = val;
 try {
   await saveCmsDb();
   toast(`Đã lưu thời gian tự hủy mã QR: ${val} giây!`);
   logEvent("ok", "Lưu cấu hình", `Thời gian tự hủy QR: ${val}s`);
 } catch(e) {
   toast("Lỗi lưu thời gian QR: " + e.message, "err");
 }
}
function switchWebAdminTab(tab){
  $("wpane-ui").classList.toggle("hidden", tab !== "ui");
  $("wpane-footer").classList.toggle("hidden", tab !== "footer");
  $("wtab-ui").classList.toggle("active", tab === "ui");
  $("wtab-footer").classList.toggle("active", tab === "footer");
  if(tab === "footer") loadFooterConfigUI();
}

function loadWebAdminUI(){
  loadDrawerSettingsUI();
  if($("qrExpireSecondsInp")) $("qrExpireSecondsInp").value = Number((cmsDb.settings||{}).qrExpireSeconds) || 30;
  renderBlurRows();
  renderRouteRows();
  renderDockRows();
  renderFaqAdmin();
  loadFooterConfigUI();
}

function loadSettingsUI(){
 const s=cmsDb.settings;renderRouteRows();renderBlurRows();renderDockRows();renderMailProvCards();
 if($("qrExpireSecondsInp")) $("qrExpireSecondsInp").value = Number(s.qrExpireSeconds) || 30;
 const rr=document.querySelector(`input[name=emailRoleRad][value=${s.emailRole==="master"?"master":"slave"}]`);if(rr)rr.checked=true;
 if($("toggleAutoMail")) $("toggleAutoMail").checked=!!s.autoMailEnabled;
 if($("toggleAutoMigrate")) $("toggleAutoMigrate").checked=s.autoMigrateNode!==false;
 if($("toggleLockExpiry")) $("toggleLockExpiry").checked=!!s.lockExpiry;
 updateOrderTogglesUI();
 paintTimeUI();
 initAdminNotifyUI();}
async function saveEmailPerm(){
 const s=cmsDb.settings;s.emailRole=document.querySelector("input[name=emailRoleRad]:checked")?.value||"slave";s.autoMailEnabled=$("toggleAutoMail").checked;
 if(s.autoMailEnabled&&s.emailRole!=="master"){s.autoMailEnabled=false;$("toggleAutoMail").checked=false;toast("Slave không gửi mail — đã tắt Auto Mail","warn");}
 try{await saveCmsDb();const be=await aj("/api/cms"),bs=(be&&be.settings)||{};
  if(bs.emailRole!==s.emailRole||!!bs.autoMailEnabled!==!!s.autoMailEnabled)toast("Backend chưa nhận đúng cấu hình — thử lưu lại","err");else toast("Đã lưu — Worker xác nhận: "+(s.emailRole==="master"?"Master":"Slave"));
  logEvent("ok","Lưu cấu hình","Quyền Email: "+s.emailRole+" · auto nhắc hạn "+(s.autoMailEnabled?"bật":"tắt"));loadStatus();}catch(e){toast("Lỗi lưu: "+e.message,"err");}}

// ===================== THÔNG BÁO MAIL ADMIN TỪ INDEX =====================
function initAdminNotifyUI(){
 const s=(cmsDb&&cmsDb.settings)||{};
 const role=s.adminNotifyRole||"master";
 const rr=document.querySelector(`input[name=adminNotifyRoleRad][value=${role==="slave"?"slave":"master"}]`);
 if(rr)rr.checked=true;
 const ev=s.adminNotifyEvents||{new:true,renew:true,upgrade:true,data:true};
 ["new","renew","upgrade","data"].forEach(k=>{
  const el=$("an-"+k);
  if(el)el.checked=(ev[k]!==false);
 });
 updateAdminNotifyStatusUI();
}

function updateAdminNotifyStatusUI(){
 const role=document.querySelector("input[name=adminNotifyRoleRad]:checked")?.value||"master";
 const badge=$("adminNotifyRoleBadge");
 const be=$("beAdminNotify");
 const wrap=$("adminNotifyCheckboxes");
 if(role==="master"){
  if(badge){badge.textContent="Master";badge.className="text-[10px] px-2 py-0.5 rounded font-black bg-indigo-50 text-indigo-600";}
  if(wrap)wrap.style.opacity="0.5";
  if(be)be.innerHTML='<i class="fas fa-server mr-1"></i>Backend đang áp dụng: <b>Master</b> (Báo tất cả: Đơn mới, Gia hạn, Nâng gói, Tra cứu)';
 }else{
  if(badge){badge.textContent="Slave";badge.className="text-[10px] px-2 py-0.5 rounded font-black bg-amber-50 text-amber-700";}
  if(wrap)wrap.style.opacity="1";
  const ev=["new","renew","upgrade","data"].filter(k=>$(`an-${k}`)?.checked);
  const evNames={new:"Đơn mới",renew:"Gia hạn",upgrade:"Nâng gói",data:"Tra cứu"};
  const listTxt=ev.length?ev.map(k=>evNames[k]).join(", "):"Tắt sạch (Không báo gì)";
  if(be)be.innerHTML=`<i class="fas fa-server mr-1"></i>Backend đang áp dụng: <b>Slave</b> · Chỉ báo: <b class="text-indigo-600">${listTxt}</b>`;
 }
}

async function saveAdminNotifyPerm(){
 const role=document.querySelector("input[name=adminNotifyRoleRad]:checked")?.value||"master";
 const events={
  new:!!$("an-new")?.checked,
  renew:!!$("an-renew")?.checked,
  upgrade:!!$("an-upgrade")?.checked,
  data:!!$("an-data")?.checked
 };
 cmsDb.settings=cmsDb.settings||{};
 cmsDb.settings.adminNotifyRole=role;
 cmsDb.settings.adminNotifyEvents=events;
 try{
  await saveCmsDb();
  updateAdminNotifyStatusUI();
  toast("Đã lưu cấu hình Báo Mail Admin: "+(role==="master"?"Master":"Slave"));
  logEvent("ok","Lưu cấu hình",`Báo Mail Admin: ${role.toUpperCase()}`);
 }catch(e){
  toast("Lỗi lưu: "+e.message,"err");
 }
}
async function saveCronCfg(){cmsDb.settings.autoMigrateNode=$("toggleAutoMigrate").checked;try{await saveCmsDb();toast("Đã lưu cấu hình Cron");logEvent("ok","Lưu cấu hình","Auto Migrate "+(cmsDb.settings.autoMigrateNode?"bật":"tắt"));loadStatus();}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
async function saveLockExpiry(){cmsDb.settings.lockExpiry=$("toggleLockExpiry").checked;try{await saveCmsDb();toast(cmsDb.settings.lockExpiry?"Đã BẬT khóa thông tin hết hạn (expDate & days không đổi)":"Đã tắt khóa thông tin hết hạn");logEvent("warn","Khóa hạn",cmsDb.settings.lockExpiry?"Bật":"Tắt");}catch(e){toast("Lỗi lưu: "+e.message,"err");}}
async function runCronNow(){toast("Đang chạy Cron...");const s=cmsDb.settings||{};try{const j=await aj("/api/admin/cron",{method:"POST",body:{force:true,simMode:!!s.simMode,simOffset:Number(s.simOffset)||0}});const d=j.details||{};toast(`Xong: khóa ${d.locked||0} · luân chuyển ${d.migrated||0} · xóa node ${d.delNodes||0} · mail ${d.mails||0}`);loadStatus();fetchAll();}catch(e){toast("Lỗi: "+e.message,"err");}}
const yn=(v,okTxt,noTxt)=>v?`<b class="text-emerald-700">${okTxt}</b>`:`<b class="text-red-600">${noTxt}</b>`;
async function loadStatus(){
 let j;try{j=await aj("/api/admin/status");}catch(e){return;}
 if(j.web){myWebIndex=j.web;if(PDS[j.web])PD=PDS[j.web];}
 let bs={};try{const be=await aj("/api/cms");bs=(be&&be.settings)||{};}catch(e){}
 const c=j.cron,age=c?nowMs()-c.ts:null,ok=c&&age<90*60000,cb=$("cronBox"),sb=$("statusBox");
 if(cb){cb.className="text-xs rounded-xl border p-3 space-y-1 "+(ok?"bg-emerald-50 border-emerald-200 text-emerald-800":"bg-red-50 border-red-200 text-red-700");
  cb.innerHTML=c?`<div><i class="fas ${ok?"fa-circle-check":"fa-triangle-exclamation"} mr-1"></i><b>Lần chạy cuối:</b> ${fmtBank(c.ts)} (${Math.round(age/60000)} phút trước)${c.sim?" · GIỜ TÙY CHỈNH":""}</div><div class="grid grid-cols-2 gap-x-3"><div>Khóa link: <b>${c.locked||0}</b></div><div>Luân chuyển node: <b>${c.migrated||0}</b></div><div>Xóa node rỗng: <b>${c.delNodes||0}</b></div><div>Mail nhắc hạn: <b>${c.mails||0}</b></div><div>Dọn "Đã xóa": <b>${c.deadDel||0}</b></div><div>Thử lại D1: <b>${c.d1Retry||0}</b></div></div><div>Auto Migrate (backend): ${yn(bs.autoMigrateNode!==false,"BẬT","TẮT")} · chu kỳ 15 phút</div>`:`<div><i class="fas fa-triangle-exclamation mr-1"></i><b>Cron CHƯA từng chạy</b> — kiểm tra Cron Trigger của Worker (*/15 * * * *)</div>`;}
 if(sb){const good=j.d1&&j.hasPassword&&j.hasSecret2;sb.className="text-xs rounded-xl border p-3 space-y-1 "+(good?"bg-emerald-50 border-emerald-200 text-slate-700":"bg-amber-50 border-amber-200 text-slate-700");
  sb.innerHTML=`<div><i class="fas ${j.d1?"fa-circle-check text-emerald-600":"fa-circle-xmark text-red-600"} mr-1"></i><b>D1:</b> ${j.d1?'<b class="text-emerald-700">Connected</b>':`<b class="text-red-600">Disconnected</b> <span class="text-[10px]">(${esc(j.d1Error||"lỗi")})</span>`}</div><div><b>Web số:</b> ${esc(j.web)}</div><div><b>ADMIN_PASSWORD:</b> ${yn(j.hasPassword,"Có","Không")}</div><div><b>WEB_API_SECRET2:</b> ${yn(j.hasSecret2,"Có","Không")}</div>`;}
 const be=$("beEmail");if(be)be.innerHTML=`<i class="fas fa-server mr-1"></i>Backend đang áp dụng: <b>${bs.emailRole==="master"?"Master (gửi)":"Slave (tắt)"}</b> · nhắc hết hạn tự động: <b>${bs.autoMailEnabled&&bs.emailRole==="master"?"Bật (19:00 VN, D-2 / D-1)":"Tắt"}</b>`;}

// ---- System Quota: chỉ hiển thị dữ liệu thật do Worker lấy được; nguồn không cung cấp thì báo rõ, không giả số
const QL={kvW:1000,kvR:100000,kvD:1000,wReq:100000,d1R:5e6,d1W:1e5};
function qBar(used,total,label,unit,reset){
 const pct=total?Math.min(100,Math.round(used/total*100)):0,rem=Math.max(0,total-used),c=pct>=90?["red","text-red-600","bg-red-500"]:pct>=80?["amber","text-amber-600","bg-amber-500"]:["emerald","text-emerald-600","bg-emerald-500"];
 return `<div><div class="flex justify-between text-[11px] font-bold mb-1"><span class="text-slate-600">${label}</span><span class="${c[1]}">${pct}%</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full ${c[2]} rounded-full" style="width:${pct}%"></div></div><div class="text-[10px] text-slate-500 mt-1">Đã dùng <b>${Number(used).toLocaleString("en-US")}</b> / ${Number(total).toLocaleString("en-US")} ${unit} · còn <b>${rem.toLocaleString("en-US")}</b>${reset?" · reset sau ~"+reset:""}</div></div>`;}
const MAIL_PROV_META={
 google:{name:"Google Apps Script",sub:"Gửi qua Gmail — miễn phí",logo:'<svg viewBox="0 0 48 48" class="w-7 h-7 shrink-0"><path fill="#4285F4" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13 17.7 9.5 24 9.5z"/><path fill="#34A853" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.6c-.5 2.9-2.2 5.4-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 19.3c-.5 1.5-.8 3.1-.8 4.7s.3 3.2.8 4.7l-7.9 6.1C1 31.4 0 27.8 0 24s1-7.4 2.6-10.8z"/><path fill="#EA4335" d="M24 48c6.3 0 11.9-2.1 15.9-5.6l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-3.5-13.5-9.3l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>'},
 brevo:{name:"Brevo",sub:"(Sendinblue) — 300 mail/ngày free",logo:'<img src="https://ps.w.org/mailin/assets/icon-256x256.png" class="w-7 h-7 shrink-0 rounded-lg shadow-sm object-contain bg-white">'},
sendpulse:{name:"SendPulse",sub:"SMTP theo gói / balance",logo:'<svg viewBox="0 0 32 32" class="w-7 h-7 shrink-0 rounded-lg shadow-sm bg-white p-0.5"><rect width="32" height="32" rx="6" fill="#007CF0"/><path d="M7 16h3.5l2.5-6 4 13 3-9 2 4H25" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'}};
let mailProvQuota = {}, mailProvCfg = {}, mailProvErr = {}, selectedMailProv = null;

// Thẻ hiển thị: click trực tiếp vào thẻ để chọn (sáng viền tím)
function mailProvCard(id) {
  const m = MAIL_PROV_META[id] || { name: id, sub: "", logo: "" };
  const saved = (cmsDb && cmsDb.settings && cmsDb.settings.mailProvider) 
             || localStorage.getItem(SITE_KEY + "_mailProv") 
             || "google";
  const active = selectedMailProv || saved;
  const isSelected = (active === id);
  const isSaved = (saved === id);
  const ready = id === "google" ? true : !!mailProvCfg[id];
  const err = mailProvErr[id];
  const q = mailProvQuota[id];

  let body = '<div class="text-[10px] text-slate-400">Bấm "Làm mới quota"</div>';
  if (!ready) {
    body = '<div class="text-[10px] text-rose-500 font-bold"><i class="fas fa-circle-exclamation mr-1"></i>Chưa cấu hình biến trên Worker</div>';
  } else if (err) {
    body = `<div class="text-[10px] text-rose-500 font-semibold">${esc(err)}</div>`;
  } else if (id === "google" && q) {
    body = `<div class="text-[11px] text-slate-600">Còn <b class="text-emerald-600">${q.remaining}</b>/${q.limit} người nhận (24h)</div>`;
  } else if (id === "brevo" && q) {
    body = `<div class="text-[11px] text-slate-600">Credits còn: <b class="text-emerald-600">${q.credits ?? "—"}</b>${q.creditsType ? " (" + esc(q.creditsType) + ")" : ""}</div>`;
  } else if (id === "sendpulse" && q) {
    const hSent = Number(q.hourSent) || 0;
    const hLimit = Number(q.hourLimit) || 50;
    const hPct = Math.min(100, Math.round(hSent / hLimit * 100));

    // Quy chuẩn đổi 3 màu cảnh báo hạn mức 1 giờ
    let hColorClass = "bg-emerald-500", hTextClass = "text-emerald-600 font-bold", alertBox = "";
    if (hSent >= 46) {
      hColorClass = "bg-red-600 animate-pulse";
      hTextClass = "text-red-600 font-black";
      alertBox = `
      <div class="mt-2.5 p-2.5 bg-red-50 border-2 border-red-500 rounded-xl text-[11px] text-red-700 leading-snug">
        <div class="font-black flex items-center gap-1 mb-1"><i class="fas fa-triangle-exclamation text-red-600"></i>CẢNH BÁO CHẠM ĐỈNH SENDPULSE!</div>
        Đã gửi <b>${hSent}/50 email</b> trong 1 giờ qua. Hãy chuyển sang <b>Google Apps Script</b> hoặc <b>Brevo</b> ngay để tránh mất email đơn hàng của khách!
      </div>`;
    } else if (hSent >= 35) {
      hColorClass = "bg-amber-500";
      hTextClass = "text-orange-500 font-bold";
    }

    const hourBarHtml = `
      <div class="mt-2 pt-2 border-t border-slate-100">
        <div class="flex justify-between text-[11px] mb-1">
          <span class="font-bold text-slate-700">Hạn mức 1 Giờ: <b class="${hTextClass}">${hSent} / ${hLimit} mail</b></span>
          <span class="${hTextClass}">${hPct}%</span>
        </div>
        <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full ${hColorClass} rounded-full transition-all duration-300" style="width:${hPct}%"></div>
        </div>
        <div class="text-[10px] text-slate-400 mt-1 flex justify-between">
          <span>Còn lại: <b>${Math.max(0, hLimit - hSent)}</b> mail</span>
          <span class="italic">Tự dọn sạch sau 60p</span>
        </div>
        ${alertBox}
      </div>
    `;

    if (q.monthTotal !== undefined && q.monthTotal !== null) {
      const usedMonth = q.monthLeft !== undefined && q.monthLeft !== null ? Math.max(0, q.monthTotal - q.monthLeft) : (q.totalSent || 0);
      body = `<div class="text-[11px] text-slate-600 mb-1.5 font-bold flex justify-between items-center"><span>${esc(q.tariff || "SMTP Free")}</span></div>`
           + qBar(usedMonth, q.monthTotal, "Tháng", "email", "")
           + hourBarHtml;
    } else {
      body = `<div class="text-[11px] text-slate-600">Email tháng: <b class="text-emerald-600">${q.emailsLeftFallback ?? (q.totalSent != null ? q.totalSent + " đã gửi" : "—")}</b></div>`
           + hourBarHtml;
    }
  }

  // Badge góc phải: phân biệt rõ ĐANG DÙNG (đã lưu) vs ĐANG CHỌN (chờ bấm Lưu) — sáng bình thường, không nhấp nháy
  let badgeHtml = "";
  if (isSelected && isSaved) {
    badgeHtml = '<span class="ml-auto bg-emerald-100 text-emerald-700 border border-emerald-300 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm flex items-center gap-1"><i class="fas fa-check text-[8px]"></i>ĐANG DÙNG</span>';
  } else if (isSelected && !isSaved) {
    badgeHtml = '<span class="ml-auto bg-indigo-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm flex items-center gap-1"><i class="fas fa-hand-pointer text-[8px]"></i>ĐANG CHỌN</span>';
  } else if (!isSelected && isSaved) {
    badgeHtml = '<span class="ml-auto bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">HIỆN TẠI</span>';
  } else {
    badgeHtml = '<span class="ml-auto text-slate-400 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 whitespace-nowrap">Bấm để chọn</span>';
  }

  return `
    <div onclick="selectMailProvider('${id}')" class="cursor-pointer border-2 transition-all duration-200 ${isSelected ? "border-indigo-600 bg-indigo-100 text-indigo-700 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"} rounded-2xl p-3 flex flex-col gap-2 select-none">
      <div class="flex items-center gap-2">
        ${m.logo}
        <div class="min-w-0 flex-1">
          <div class="font-extrabold text-xs text-slate-800">${m.name}</div>
          <div class="text-[10px] text-slate-500">${m.sub}</div>
        </div>
        ${badgeHtml}
      </div>
      <div class="min-h-[32px] pt-1">
        ${body}
      </div>
    </div>
  `;
}

// Bấm vào thẻ: cập nhật lựa chọn tạm thời
function selectMailProvider(id) {
  selectedMailProv = id;
  renderMailProvCards();
}
const pickMailProvider = selectMailProvider; // Giữ alias dự phòng

// Bấm nút "LƯU CẤU HÌNH NHÀ CUNG CẤP MAIL" phía dưới
async function saveMailProvider() {
  const saved = (cmsDb && cmsDb.settings && cmsDb.settings.mailProvider) 
             || localStorage.getItem(SITE_KEY + "_mailProv") 
             || "google";
  const target = selectedMailProv || saved;

  if (!cmsDb.settings) cmsDb.settings = {};
  cmsDb.settings.mailProvider = target;
  localStorage.setItem(SITE_KEY + "_mailProv", target);

  const btn = $("btnSaveMailProv");
  const origText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1.5"></i>ĐANG LƯU...';
  }

  try {
    await saveCmsDb();
    selectedMailProv = null;
    const shortName = ({ google: "Google app script", brevo: "Brevo", sendpulse: "Sendpulse" })[target] || target;
    toast("Đã lưu nhà cung cấp gửi mail: " + shortName);
    logEvent("ok", "Lưu cấu hình", "Nhà cung cấp mail: " + target);
    renderMailProvCards();
  } catch (e) {
    toast("Lỗi lưu cấu hình: " + e.message, "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }
}

function renderMailProvCards() {
  if (cmsDb && cmsDb.settings && cmsDb.settings.mailProvider) {
    localStorage.setItem(SITE_KEY + "_mailProv", cmsDb.settings.mailProvider);
  }

  const el = $("mailProvCards");
  if (el) el.innerHTML = ["google", "brevo", "sendpulse"].map(mailProvCard).join("");

  const saved = (cmsDb && cmsDb.settings && cmsDb.settings.mailProvider) 
             || localStorage.getItem(SITE_KEY + "_mailProv") 
             || "google";
  const active = selectedMailProv || saved;
  const btn = $("btnSaveMailProv");
  if (btn) {
    const shortName = ({ google: "Google app script", brevo: "Brevo", sendpulse: "Sendpulse" })[active] || active;
    btn.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition active:scale-95 mt-2 flex items-center justify-center gap-1.5";
    btn.innerHTML = `<i class="fas fa-floppy-disk mr-1.5"></i>Lưu cấu hình: ${shortName}`;
  }
}
async function loadQuota(){
 const el=$("quotaBody");if(!el)return;
 try{
  const j=await aj("/api/admin/quota",{soft:true});
  mailProvCfg=(j&&j.cfg)||{};mailProvErr=(j&&j.err)||{};mailProvQuota={google:j&&j.mail,brevo:j&&j.brevo,sendpulse:j&&j.sendpulse};renderMailProvCards();
  if(!j||!j.ok){el.innerHTML='<div class="text-red-500 font-bold lg:col-span-2">Không lấy được quota (Worker chưa có CF_API_TOKEN / CF_ACCOUNT_ID hoặc endpoint lỗi)</div>';return;}
  const h=j.nextReset?Math.max(0,Math.round((j.nextReset-Date.now())/36e5)):null,rs=h!==null?h+" giờ":"";
  const err=(k,t)=>box(t,`<div class="text-[11px] text-slate-500">Không lấy được số liệu thật: <span class="text-red-500">${esc(j.err&&j.err[k]||"Worker chưa cấu hình nguồn này")}</span></div>`);
  let html="";

  // Thẻ Quota Supabase (Hiển thị đầy đủ cả 2 Cơ chế)
  if (j.supabase && j.supabase.rpc) {
    const s = j.supabase.rpc;
    const mgmt = j.supabase.mgmt || {};
    const hasMgmt = !!j.supabase.hasMgmt;
    const usedBytes = s.db_size_bytes || 0;
    const limitBytes = s.db_limit_bytes || 524288000;
    const pct = Math.min(100, Math.round(usedBytes / limitBytes * 10000) / 100);
    const egressMb = mgmt.egress ? Math.round((mgmt.egress.bandwidth || 0) / 1048576 * 10) / 10 : 0;
    const reqCount = mgmt.requests ? (mgmt.requests.total || 0).toLocaleString("en-US") : "—";

    let mgmtSectionHtml = "";
    if (hasMgmt) {
      mgmtSectionHtml = `
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="text-sm font-black text-indigo-600">${egressMb} MB</div>
            <div class="text-[10px] text-slate-400 font-bold">Băng thông Egress</div>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="text-sm font-black text-slate-700">${reqCount}</div>
            <div class="text-[10px] text-slate-400 font-bold">Số lượt API Requests</div>
          </div>
        </div>
      `;
    } else {
      mgmtSectionHtml = `
        <div class="text-[11px] text-amber-700 italic bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
          (Chưa cấu hình SUPABASE_MGMT_TOKEN trên Worker Secret)
        </div>
      `;
    }

    html += box("Supabase Database (ALL_ORDERS)", `
      <div class="space-y-3">
        <div>
          <div class="flex justify-between text-[11px] font-bold mb-1">
            <span class="text-slate-700">Dung lượng Database thật (Cơ chế 1)</span>
            <span class="text-emerald-600 font-black">${pct}%</span>
          </div>
          <div class="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-500 rounded-full" style="width: ${Math.max(1, pct)}%"></div>
          </div>
          <div class="text-[10px] text-slate-500 mt-1 flex justify-between">
            <span>Đã dùng: <b>${s.db_size_pretty || "—"}</b> / 500 MB</span>
            <span>Kho thật: <b>${s.orders_count || 0}</b> đơn · Kho test: <b>${s.test_orders_count || 0}</b> đơn</span>
          </div>
        </div>
        <div class="border-t border-slate-100 pt-2 text-[11px] text-slate-600">
          <div class="font-bold text-slate-700 mb-1.5">Hạ tầng Supabase (Cơ chế 2 - Management API):</div>
          ${mgmtSectionHtml}
        </div>
      </div>
    `);
  } else {
    html += err("supabase", "Supabase Database (ALL_ORDERS)");
  }

  html+=j.kv?box("Cloudflare KV (chỉ web này, hôm nay)",qBar(j.kv.write||0,QL.kvW,"Write","lượt ghi",rs)+`<div class="h-2"></div>`+qBar(j.kv.read||0,QL.kvR,"Read","lượt đọc",rs)+`<div class="h-2"></div>`+qBar(j.kv.delete||0,QL.kvD,"Delete","lượt xóa",rs)+`<div class="text-[10px] text-slate-400 mt-2">Tổng = giới hạn gói Free của Cloudflare.</div>`):err("kv","Cloudflare KV");
  html+=j.worker?box("Cloudflare Worker (hôm nay)",qBar(j.worker.requests||0,QL.wReq,"Requests","requests",rs)+`<div class="grid grid-cols-2 gap-2 text-center mt-3"><div><div class="text-lg font-black text-red-500">${(j.worker.errors||0).toLocaleString("en-US")}</div><div class="text-[10px] text-slate-400 font-bold">Errors</div></div><div><div class="text-lg font-black text-slate-600">${(j.worker.subrequests||0).toLocaleString("en-US")}</div><div class="text-[10px] text-slate-400 font-bold">Subrequests</div></div></div>`):err("worker","Cloudflare Worker");
  html+=j.d1?box("D1 Database (hôm nay)",qBar(j.d1.rowsRead||0,QL.d1R,"Rows read","rows",rs)+`<div class="h-2"></div>`+qBar(j.d1.rowsWritten||0,QL.d1W,"Rows written","rows",rs)):err("d1","D1 Database");
  el.innerHTML=html;
 }catch(e){el.innerHTML=`<span class="text-red-600 lg:col-span-2">Lỗi tải quota: ${esc(e.message)}</span>`;}}

// ---- nhật ký hợp nhất
async function loadLogs(){try{logsData=await aj("/api/admin/logs");renderLogs();}catch(e){}}
function renderLogs(){
 const now = nowMs(), sevenDays = 7 * 864e5;
 const rows=[...arr(logsData.worker).map(x=>({ts:x.ts,lvl:x.lvl,src:x.src,act:x.act,msg:x.msg,ref:x.ref})),...arr(logsData.d1).map(x=>({ts:parseAny(x.created_at),lvl:x.level||"info",src:"d1",act:x.action,msg:x.details,ref:x.ref}))]
   .filter(r => r.ts && (now - r.ts <= sevenDays))
   .sort((a,b)=>b.ts-a.ts);
 const lv=$("logLvl").value,sr=$("logSrc").value,f=rows.filter(r=>(!lv||r.lvl===lv)&&(!sr||r.src===sr));$("logCount").textContent=`(${f.length}/${rows.length} dòng trong 7 ngày)`;
 const col={ok:"bg-emerald-100 text-emerald-800 border border-emerald-200",info:"bg-blue-100 text-blue-800 border border-blue-200",warn:"bg-amber-100 text-amber-800 border border-amber-200",error:"bg-red-100 text-red-800 border border-red-200"},nm={ok:"Thành công",info:"Thông tin",warn:"Cảnh báo",error:"Lỗi"};
 $("logBody").innerHTML=f.length?f.slice(0,300).map(r=>`<tr><td class="text-xs whitespace-nowrap text-slate-500">${fmtBank(r.ts)}</td><td><span class="${col[r.lvl]||col.info} px-2 py-0.5 rounded text-[10px] font-bold">${nm[r.lvl]||"Thông tin"}</span></td><td class="text-xs font-bold text-slate-600">${esc(r.src)}</td><td class="text-xs font-bold text-slate-700">${esc(r.act)}</td><td class="text-xs text-slate-600 break-words min-w-[200px]">${esc(r.msg||"")}${r.ref?` <span class="font-mono text-indigo-500 cp" onclick="cp(${q(r.ref)})">${esc(r.ref)}</span>`:""}</td></tr>`).join(""):`<tr><td colspan="5" class="text-center py-8 text-slate-400 italic">Chưa có nhật ký</td></tr>`;}

// ---- thiết bị
function renderDev(){
 const tb=$("devBody");if(!devicesDb.length){tb.innerHTML=`<div class="p-6 text-center text-slate-400 bg-white rounded-xl border shadow-sm font-bold">Trống</div>`;return;}
 tb.innerHTML=devicesDb.map(d=>`<div class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3"><div class="min-w-0"><div class="font-mono font-bold text-xs text-indigo-600 cp truncate" onclick="cp(${q(d.id)})">${esc(d.id)}${d.id===myDev?` <span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[9px] font-bold ml-1">Bạn</span>`:""}</div><div class="text-[10px] text-slate-500 truncate my-1">${esc(d.ua||"")}</div><div class="text-[11px] font-bold text-slate-400">Đăng nhập: ${fmtBank(d.ts||d.date)}</div></div><button onclick="delDev(${q(d.id)})" class="text-red-500 font-bold px-3 py-2 bg-red-50 rounded-lg text-xs hover:bg-red-500 hover:text-white shrink-0"><i class="fas fa-trash"></i></button></div>`).join("");}
async function delDev(id){devicesDb=devicesDb.filter(x=>x.id!==id);renderDev();try{await aj("/api/devices",{method:"POST",body:devicesDb});if(id===myDev)doLogout();else toast("Đã xóa");}catch(e){}}

// ---- chuẩn hóa dữ liệu KV (chỉ chạy khi admin bấm; có Quét thử)
async function migrateDates(apply){
 if(apply&&!confirm("Ghi đè định dạng thời gian trong KV (đơn, link, đã xóa, thiết bị, yêu cầu dung lượng)?\nNên bấm Quét thử trước."))return;
 if(apply){
   toast("Đang sao lưu All Orders sang Telegram trước khi chuẩn hóa ngày...");
   await triggerTelegramBackupNow("Sao lưu trước khi Chuẩn hóa định dạng thời gian");
 }
 $("migReport").innerHTML="Đang xử lý...";
 try{const j=await aj("/api/admin/migrate_dates",{method:"POST",body:{apply}});
  $("migReport").innerHTML=(apply?'<div class="font-bold text-emerald-700 mb-1">✔ Đã áp dụng</div>':'<div class="font-bold text-slate-700 mb-1">Kết quả quét thử (chưa ghi gì)</div>')+Object.entries(j.report).map(([k,v])=>`<div><b>${k}:</b> ${v.changed}/${v.total} bản ghi cần đổi${v.sample.length?`<div class="font-mono text-[10px] text-slate-500 pl-3">${v.sample.map(esc).join("<br>")}</div>`:""}</div>`).join("");
  if(apply)fetchAll();}catch(e){$("migReport").innerHTML=`<span class="text-red-600">Lỗi: ${esc(e.message)}</span>`;}}
async function migratePkg(apply){
 if(apply&&!confirm("Ghi đè cách lưu tên gói của các đơn trong KV? Nên bấm Quét thử trước."))return;
 if(apply){
   toast("Đang sao lưu All Orders sang Telegram trước khi chuẩn hóa gói...");
   await triggerTelegramBackupNow("Sao lưu trước khi Chuẩn hóa hiển thị gói");
 }
 $("pkgReport").innerHTML="Đang xử lý...";
 try{const j=await aj("/api/admin/migrate_pkg",{method:"POST",body:{apply}});$("pkgReport").innerHTML=(apply?'<div class="font-bold text-emerald-700 mb-1">✔ Đã áp dụng</div>':'<div class="font-bold text-slate-700 mb-1">Kết quả quét thử (chưa ghi gì)</div>')+`<div><b>Đơn hàng:</b> ${j.changed}/${j.total} bản ghi cần đổi${j.oldPrice?` · <span class="text-orange-500 font-bold">${j.oldPrice} đơn giá cũ được giữ nguyên</span>`:""}${j.sample.length?`<div class="font-mono text-[10px] text-slate-500 pl-3">${j.sample.map(esc).join("<br>")}</div>`:""}</div>`;if(apply)fetchAll();}
 catch(e){$("pkgReport").innerHTML=`<span class="text-red-600">Lỗi: ${esc(e.message)}</span>`;}}

// ===================== LOGIC FULFILLMENT CONFIG & LINK TRỘN =====================
let currentFulfillmentConfig = { mapping: {}, failover_pref: "lx" };

async function loadFulfillmentConfig() {
  try {
    const res = await aj("/api/admin/fulfillment_config");
    if (res && res.config) currentFulfillmentConfig = res.config;
  } catch (e) {
    currentFulfillmentConfig = { mapping: {}, failover_pref: "lx" };
  }
  renderFulfillmentUI();
}

function renderFulfillmentUI() {
  const tb = $("fulfillMappingTableBody");
  if (!tb) return;
  const pkgs = adminPkgsList && adminPkgsList.length ? adminPkgsList : getDefaultAdminPkgs();
  const map = currentFulfillmentConfig.mapping || {};

  tb.innerHTML = pkgs.map(p => {
    const curVal = map[p.id] || "";
    const timeStr = p.time === "lifetime" ? "Vĩnh viễn" : (p.time ? p.time + " Tháng" : "1 Tháng");
    const isHidden = !!p.hidden;
    return `
      <tr class="${isHidden ? 'opacity-40 bg-slate-100 cursor-not-allowed select-none' : ''}">
        <td class="font-mono font-bold ${isHidden ? 'text-slate-400' : 'text-indigo-600'}">
          ${esc(p.id)} ${isHidden ? '<span class="text-[9px] block text-orange-500 font-bold">(Đã ẩn)</span>' : ''}
        </td>
        <td>
          <div class="font-bold text-slate-800 text-xs">${esc(p.name || p.id)}</div>
          <div class="text-[10px] text-slate-500">${esc(p.data || "")} · ${p.vnd ? fmtVnd(p.vnd) + "VND" : ""}</div>
        </td>
        <td class="text-xs font-semibold text-slate-600">${timeStr}</td>
        <td>
          <select id="sel_fulfill_${p.id}" ${isHidden ? 'disabled' : ''} class="w-full p-2 text-xs border border-slate-200 rounded-lg ${isHidden ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white font-bold text-slate-700 outline-none focus:border-indigo-500'}">
            <option value="single_lx" ${curVal === "single_lx" || !curVal ? "selected" : ""}>Link đơn Liangxin (Mặc định)</option>
            <option value="single_dj" ${curVal === "single_dj" ? "selected" : ""}>Link đơn DJJC</option>
            <option value="single_kt" ${curVal === "single_kt" ? "selected" : ""}>Link đơn Kitty (Mới)</option>
            <option value="combo_lidj" ${curVal === "combo_lidj" || curVal === "combo" ? "selected" : ""}>Link Trộn (Liangxin + DJJC)</option>
            <option value="combo_liki" ${curVal === "combo_liki" ? "selected" : ""}>Link Trộn (Liangxin + Kitty)</option>
            <option value="combo_kidj" ${curVal === "combo_kidj" ? "selected" : ""}>Link Trộn (Kitty + DJJC)</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");

  updateFailoverPolicyUI(currentFulfillmentConfig.failover_pref || "lx");
}

function selectFailoverPolicy(pref) {
  currentFulfillmentConfig.failover_pref = pref;
  updateFailoverPolicyUI(pref);
}

function updateFailoverPolicyUI(pref) {
  const btnLx = $("btnFailoverLx"), btnDj = $("btnFailoverDj"), btnKt = $("btnFailoverKt");
  const dotLx = $("radioDotLx"), dotDj = $("radioDotDj"), dotKt = $("radioDotKt");
  const inLx = $("radioInnerLx"), inDj = $("radioInnerDj"), inKt = $("radioInnerKt");

  const setBtn = (btn, dot, inDot, active, color) => {
    if (!btn) return;
    if (active) {
      btn.className = `p-3.5 rounded-2xl border-2 font-bold text-left transition flex items-center justify-between border-${color}-500 bg-${color}-50/60 shadow-sm ring-1 ring-${color}-400`;
      if (dot) dot.className = `w-5 h-5 rounded-full border-2 flex items-center justify-center border-${color}-600 bg-white`;
      if (inDot) inDot.className = `w-2.5 h-2.5 rounded-full bg-${color}-600`;
    } else {
      btn.className = "p-3.5 rounded-2xl border-2 font-bold text-left transition flex items-center justify-between border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 opacity-70";
      if (dot) dot.className = "w-5 h-5 rounded-full border-2 flex items-center justify-center border-slate-400 bg-white";
      if (inDot) inDot.className = "w-2.5 h-2.5 rounded-full bg-transparent";
    }
  };

  setBtn(btnLx, dotLx, inLx, pref === "lx", "emerald");
  setBtn(btnDj, dotDj, inDj, pref === "dj", "blue");
  setBtn(btnKt, dotKt, inKt, pref === "kt", "pink");
}

async function saveFulfillmentMapping() {
  const pkgs = adminPkgsList && adminPkgsList.length ? adminPkgsList : getDefaultAdminPkgs();
  const mapping = {};
  pkgs.forEach(p => {
    const val = $("sel_fulfill_" + p.id)?.value || "";
    if (val) mapping[p.id] = val;
  });
  currentFulfillmentConfig.mapping = mapping;

  const btn = $("btnSaveFulfillMapping");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>ĐANG LƯU...';

  try {
    await aj("/api/admin/fulfillment_config", { method: "POST", body: { config: currentFulfillmentConfig } });
    toast("Đã lưu bảng cấu hình Mapping Fulfillment vào KV!");
    logEvent("ok", "admin", "Lưu Mapping Fulfillment", `${Object.keys(mapping).length} gói cấu hình`);
  } catch (e) {
    toast("Lỗi lưu cấu hình: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save mr-1"></i>LƯU MAPPING FULFILLMENT';
  }
}

async function saveFailoverPolicy() {
  try {
    await aj("/api/admin/fulfillment_config", { method: "POST", body: { config: currentFulfillmentConfig } });
    toast("Đã lưu Chính sách dự phòng (Failover Policy) vào KV!");
    logEvent("ok", "admin", "Lưu Failover Policy", `Ưu tiên: ${currentFulfillmentConfig.failover_pref === "lx" ? "Liangxin" : "DJJC"}`);
  } catch (e) {
    toast("Lỗi lưu chính sách: " + e.message, "err");
  }
}

// ===================== KHỞI ĐỘNG =====================
let started=false;
function startApp(fresh){
 $("loginWrap").classList.add("hidden");
 document.documentElement.classList.add("has-tok");
 $("hdr").classList.remove("hidden");
 $("hdr").style.display="flex";
 $("main").classList.remove("hidden");
 if(started){fetchAll();return;}
 started=true;
 buildTabs();
 go(localStorage.getItem(SITE_KEY+"_lastTab")||"t-ord");
 if(fresh)toast("Đăng nhập thành công!");
 fetchAll();loadTx(true);loadQuota();
setInterval(pollMain,10000);setInterval(loadStatus,120000);setInterval(tickClocks,1000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){pollMain();loadTx();}});
}

let adminScrollTimer = null;
window.addEventListener("scroll", () => {
  clearTimeout(adminScrollTimer);
  adminScrollTimer = setTimeout(() => {
    const curTab = localStorage.getItem(SITE_KEY + "_lastTab") || "t-ord";
    sessionStorage.setItem("adm_scroll_" + curTab, String(window.scrollY));
  }, 150);
});

function restoreAdminScroll(tabId){
  const saved = sessionStorage.getItem("adm_scroll_" + tabId);
  if(saved !== null && !isNaN(Number(saved))){
    setTimeout(() => window.scrollTo({ top: Number(saved), behavior: 'instant' }), 60);
  }
}

// ====================================================================
// LOGIC TEST MODE TRONG TAB CÀI ĐẶT > SET WEB
// ====================================================================
let isTestModeActive = false;

async function checkTestModeStatus() {
  try {
    const res = await aj("/api/admin/test/status");
    isTestModeActive = !!res.active;
    if ($("toggleTestMode")) $("toggleTestMode").checked = isTestModeActive;
    updateTestModeUI();
  } catch {}
}

function updateTestModeUI() {
  const b = $("hdrTestBadge");
  const lbl = $("testStatusLabel");
  if (b) b.classList.toggle("hidden", !isTestModeActive);
  if (lbl) {
    lbl.className = isTestModeActive 
      ? "text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-slate-900" 
      : "text-xs font-black px-2.5 py-1 rounded-full bg-slate-200 text-slate-600";
    lbl.textContent = isTestModeActive ? "ĐANG BẬT (KHO TEST)" : "TẮT (KHO THẬT)";
  }
}

async function toggleTestMode(checked) {
  isTestModeActive = checked;
  updateTestModeUI();
  try {
    await aj("/api/admin/test/toggle", { method: "POST", body: { active: checked } });
    toast(checked ? "Đã BẬT Chế độ Test (ALL_ORDERS_TEST)" : "Đã chuyển về Kho Thật (ALL_ORDERS)");
    fetchAll(true);
  } catch(e) {
    toast("Lỗi chuyển chế độ: " + e.message, "err");
  }
}

// Kiểm tra kết nối Kho Thật (ALL_ORDERS)
async function testPingProd() {
  const logEl = $("prodActionLog");
  const btn = $("btnPingProd");
  if (btn) btn.disabled = true;
  if (logEl) logEl.innerHTML = '<span class="text-emerald-700"><i class="fas fa-spinner fa-spin mr-1"></i>Đang kiểm tra kết nối Kho Thật...</span>';
  try {
    const res = await aj("/api/admin/test/status");
    const p = res.ping_prod || {};
    if (p.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Kết nối Kho Thật thành công (${p.ms}ms) — Hiện có <b>${p.count}</b> đơn hàng trong ALL_ORDERS.</span>`;
      toast(`Kho Thật phản hồi tốt: ${p.ms}ms (${p.count} đơn)`);
    } else {
      const errMsg = p.error || (p.status ? `Mã lỗi HTTP ${p.status}` : "Không kết nối được");
      if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Kết nối Kho Thật thất bại: ${esc(errMsg)}</span>`;
      toast("Kho Thật thất bại: " + errMsg, "err");
    }
  } catch (e) {
    if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Lỗi: ${esc(e.message)}</span>`;
    toast("Lỗi ping: " + e.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Kiểm tra kết nối Kho Test (ALL_ORDERS_TEST)
async function testPingTest() {
  const logEl = $("testActionLog");
  const btn = $("btnPingTest");
  if (btn) btn.disabled = true;
  if (logEl) logEl.innerHTML = '<span class="text-amber-800"><i class="fas fa-spinner fa-spin mr-1"></i>Đang kiểm tra kết nối Kho Test...</span>';
  try {
    const res = await aj("/api/admin/test/status");
    const p = res.ping_test || res.ping || {};
    if (p.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Kết nối Kho Test thành công (${p.ms}ms) — Hiện có <b>${p.count}</b> đơn trong ALL_ORDERS_TEST.</span>`;
      toast(`Kho Test phản hồi tốt: ${p.ms}ms (${p.count} đơn)`);
    } else {
      const errMsg = p.error || (p.status ? `Mã lỗi HTTP ${p.status}` : "Không kết nối được");
      if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Kết nối Kho Test thất bại: ${esc(errMsg)}</span>`;
      toast("Kho Test thất bại: " + errMsg, "err");
    }
  } catch (e) {
    if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Lỗi: ${esc(e.message)}</span>`;
    toast("Lỗi ping: " + e.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
}
const testPingConnection = testPingTest;
async function createFakeTestOrder() {
  const logEl = $("testActionLog");
  if (logEl) logEl.textContent = "Đang tạo đơn giả lập vào Kho Test...";
  try {
    const res = await aj("/api/admin/test/fake_order", { method: "POST" });
    if (res.ok && res.order) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã tạo đơn giả lập ${res.order.id} vào ALL_ORDERS_TEST thành công!</span>`;
      toast(`Đã tạo đơn test ${res.order.id}!`);
      if (isTestModeActive) fetchAll();
    }
  } catch(e) {
    if (logEl) logEl.textContent = "Lỗi tạo đơn giả: " + e.message;
  }
}

async function cloneProdOrdersToTest() {
  if (!confirm("Sao chép toàn bộ đơn hàng thật sang Kho Test? Kho test cũ sẽ bị xóa trắng.")) return;
  const logEl = $("testActionLog");
  if (logEl) logEl.textContent = "Đang nhân bản toàn bộ đơn thật sang Kho Test...";
  try {
    const res = await aj("/api/admin/test/clone", { method: "POST" });
    if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã clone ${res.count} đơn từ kho thật sang ALL_ORDERS_TEST!</span>`;
    toast(`Đã sao chép ${res.count} đơn vào kho test!`);
    if (isTestModeActive) fetchAll();
  } catch(e) {
    if (logEl) logEl.textContent = "Lỗi sao chép: " + e.message;
  }
}

async function clearTestOrders() {
  if (!confirm("Xóa sạch toàn bộ đơn hàng trong Kho Test về 0?")) return;
  const logEl = $("testActionLog");
  if (logEl) logEl.textContent = "Đang dọn sạch Kho Test...";
  try {
    await aj("/api/admin/test/clear", { method: "POST" });
    if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã xóa trắng ALL_ORDERS_TEST thành công!</span>`;
    toast("Đã dọn sạch kho test");
    if (isTestModeActive) fetchAll();
  } catch(e) {
    if (logEl) logEl.textContent = "Lỗi xóa kho test: " + e.message;
  }
}

// ====================================================================
// LOGIC THAO TÁC TELEGRAM TRÊN ADMIN PANEL
// ====================================================================
async function testTelegramBot() {
  const logEl = $("tgActionLog");
  const btn = $("btnTgTest");
  btn.disabled = true;
  if (logEl) logEl.innerHTML = '<span class="text-sky-600"><i class="fas fa-spinner fa-spin mr-1"></i>Đang gửi tin nhắn test sang Telegram Channel...</span>';
  try {
    const res = await aj("/api/admin/telegram/test", { method: "POST" });
    if (res && res.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã gửi tin nhắn test thành công vào Channel Telegram!</span>`;
      toast("Kết nối Telegram Bot thành công!");
    } else {
      if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Gửi thất bại: ${res.description || res.error || "Kiểm tra lại Token/Chat ID"}</span>`;
      toast("Lỗi kết nối Telegram: " + (res.description || res.error), "err");
    }
  } catch(e) {
    if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Lỗi: ${e.message}</span>`;
    toast("Lỗi: " + e.message, "err");
  } finally {
    btn.disabled = false;
  }
}

async function triggerTelegramKvBackupNow() {
  const logEl = $("tgActionLog");
  const btn = $("btnTgKvBackupNow");
  if (btn) btn.disabled = true;
  if (logEl) logEl.innerHTML = '<span class="text-indigo-600"><i class="fas fa-spinner fa-spin mr-1"></i>Đang đóng gói toàn bộ KV Space gửi sang Telegram...</span>';
  try {
    const res = await aj("/api/admin/telegram/backup_kv_now", { method: "POST" });
    if (res && res.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã bắn file sao lưu KV Space (${res.keysCount} keys) [${res.keyTitle}] sang Telegram!</span>`;
      toast(`Đã gửi file sao lưu KV (${res.keysCount} keys)!`);
    } else {
      if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Gửi backup KV thất bại!</span>`;
      toast("Gửi backup KV thất bại!", "err");
    }
  } catch(e) {
    if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Lỗi: ${e.message}</span>`;
    toast("Lỗi: " + e.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function resetTelegramStt() {
  if (!confirm("Reset số thứ tự STT tin nhắn backup về 01? Lượt bắn backup tiếp theo trong ngày hôm nay sẽ có mã _01.")) return;
  const logEl = $("tgActionLog");
  try {
    const res = await aj("/api/admin/telegram/reset_stt", { method: "POST" });
    if (res && res.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã reset STT về 0! Lượt bắn kế tiếp sẽ là _01.</span>`;
      toast("Đã reset STT thành công!");
    }
  } catch(e) {
    toast("Lỗi reset STT: " + e.message, "err");
  }
}

async function triggerTelegramBackupNow(reason = "Admin bấm Bắn Backup ngay", detail = "") {
  const logEl = $("tgActionLog");
  const btn = $("btnTgBackupNow");
  if (btn) btn.disabled = true;
  if (logEl) logEl.innerHTML = '<span class="text-sky-600"><i class="fas fa-spinner fa-spin mr-1"></i>Đang xuất dữ liệu Supabase và gửi file Backup sang Telegram...</span>';
  try {
    const res = await aj("/api/admin/telegram/backup_now", { method: "POST", body: { reason, detail } });
    if (res && res.ok) {
      if (logEl) logEl.innerHTML = `<span class="text-emerald-700 font-bold">✔ Đã gửi 2 file Backup (${res.count} đơn) [${res.keyTitle}] sang Telegram!</span>`;
      toast(`Đã gửi backup (${res.count} đơn) sang Telegram!`);
    } else {
      if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Gửi backup thất bại!</span>`;
      toast("Gửi backup thất bại!", "err");
    }
  } catch(e) {
    if (logEl) logEl.innerHTML = `<span class="text-red-600 font-bold">✘ Lỗi: ${e.message}</span>`;
    toast("Lỗi: " + e.message, "err");
  } finally {
    if (btn) btn.disabled = false;
  }
}

setTimeout(checkTestModeStatus, 1500);

window.onload=()=>{if(TOKEN)startApp(false);else{buildTabs();$("loginWrap").classList.remove("hidden");}};

// Expose all admin functions and state to window for HTML inline event handlers
if (typeof window !== 'undefined') {
  const _exposed = [
    ['toast', typeof toast !== 'undefined' ? toast : undefined],
    ['autoGrow', typeof autoGrow !== 'undefined' ? autoGrow : undefined],
    ['parseAny', typeof parseAny !== 'undefined' ? parseAny : undefined],
    ['tickClocks', typeof tickClocks !== 'undefined' ? tickClocks : undefined],
    ['paintTimeUI', typeof paintTimeUI !== 'undefined' ? paintTimeUI : undefined],
    ['pickTz', typeof pickTz !== 'undefined' ? pickTz : undefined],
    ['applySim', typeof applySim !== 'undefined' ? applySim : undefined],
    ['clearSim', typeof clearSim !== 'undefined' ? clearSim : undefined],
    ['pkgOf', typeof pkgOf !== 'undefined' ? pkgOf : undefined],
    ['ordMonths', typeof ordMonths !== 'undefined' ? ordMonths : undefined],
    ['webLabel', typeof webLabel !== 'undefined' ? webLabel : undefined],
    ['getMe', typeof getMe !== 'undefined' ? getMe : undefined],
    ['linkBottom', typeof linkBottom !== 'undefined' ? linkBottom : undefined],
    ['api', typeof api !== 'undefined' ? api : undefined],
    ['toLogin', typeof toLogin !== 'undefined' ? toLogin : undefined],
    ['doLogin', typeof doLogin !== 'undefined' ? doLogin : undefined],
    ['doLogout', typeof doLogout !== 'undefined' ? doLogout : undefined],
    ['resetAndHardReload', typeof resetAndHardReload !== 'undefined' ? resetAndHardReload : undefined],
    ['setManualEdit', typeof setManualEdit !== 'undefined' ? setManualEdit : undefined],
    ['healLinks', typeof healLinks !== 'undefined' ? healLinks : undefined],
    ['applyPoll', typeof applyPoll !== 'undefined' ? applyPoll : undefined],
    ['fetchAll', typeof fetchAll !== 'undefined' ? fetchAll : undefined],
    ['pollMain', typeof pollMain !== 'undefined' ? pollMain : undefined],
    ['switchPkgSubTab', typeof switchPkgSubTab !== 'undefined' ? switchPkgSubTab : undefined],
    ['buildTabs', typeof buildTabs !== 'undefined' ? buildTabs : undefined],
    ['go', typeof go !== 'undefined' ? go : undefined],
    ['switchOrdTab', typeof switchOrdTab !== 'undefined' ? switchOrdTab : undefined],
    ['ordCard', typeof ordCard !== 'undefined' ? ordCard : undefined],
    ['renderOrd', typeof renderOrd !== 'undefined' ? renderOrd : undefined],
    ['updateOrderTogglesUI', typeof updateOrderTogglesUI !== 'undefined' ? updateOrderTogglesUI : undefined],
    ['toggleLockFulfillBtn', typeof toggleLockFulfillBtn !== 'undefined' ? toggleLockFulfillBtn : undefined],
    ['toggleMailOnSaveBtn', typeof toggleMailOnSaveBtn !== 'undefined' ? toggleMailOnSaveBtn : undefined],
    ['toggleManualEditBtn', typeof toggleManualEditBtn !== 'undefined' ? toggleManualEditBtn : undefined],
    ['autoFillNickname', typeof autoFillNickname !== 'undefined' ? autoFillNickname : undefined],
    ['updMonths', typeof updMonths !== 'undefined' ? updMonths : undefined],
    ['updAmountUi', typeof updAmountUi !== 'undefined' ? updAmountUi : undefined],
    ['fillAmount', typeof fillAmount !== 'undefined' ? fillAmount : undefined],
    ['getOrderAnchorTs', typeof getOrderAnchorTs !== 'undefined' ? getOrderAnchorTs : undefined],
    ['autoFillDays', typeof autoFillDays !== 'undefined' ? autoFillDays : undefined],
    ['onPkgChange', typeof onPkgChange !== 'undefined' ? onPkgChange : undefined],
    ['onMethodChange', typeof onMethodChange !== 'undefined' ? onMethodChange : undefined],
    ['recalcExpFromDays', typeof recalcExpFromDays !== 'undefined' ? recalcExpFromDays : undefined],
    ['recalcDaysFromExp', typeof recalcDaysFromExp !== 'undefined' ? recalcDaysFromExp : undefined],
    ['togSF', typeof togSF !== 'undefined' ? togSF : undefined],
    ['syncUpg', typeof syncUpg !== 'undefined' ? syncUpg : undefined],
    ['readModal', typeof readModal !== 'undefined' ? readModal : undefined],
    ['openOrdModal', typeof openOrdModal !== 'undefined' ? openOrdModal : undefined],
    ['saveOrd', typeof saveOrd !== 'undefined' ? saveOrd : undefined],
    ['delOrd', typeof delOrd !== 'undefined' ? delOrd : undefined],
    ['getMissingOrders', typeof getMissingOrders !== 'undefined' ? getMissingOrders : undefined],
    ['updateCheckBadge', typeof updateCheckBadge !== 'undefined' ? updateCheckBadge : undefined],
    ['renderCheckTab', typeof renderCheckTab !== 'undefined' ? renderCheckTab : undefined],
    ['saveCheckManual', typeof saveCheckManual !== 'undefined' ? saveCheckManual : undefined],
    ['healSingleOrder', typeof healSingleOrder !== 'undefined' ? healSingleOrder : undefined],
    ['healAllMissingWithProgress', typeof healAllMissingWithProgress !== 'undefined' ? healAllMissingWithProgress : undefined],
    ['mailRender', typeof mailRender !== 'undefined' ? mailRender : undefined],
    ['orderVars', typeof orderVars !== 'undefined' ? orderVars : undefined],
    ['sendExpMail', typeof sendExpMail !== 'undefined' ? sendExpMail : undefined],
    ['sendZaloMail', typeof sendZaloMail !== 'undefined' ? sendZaloMail : undefined],
    ['getCentralRates', typeof getCentralRates !== 'undefined' ? getCentralRates : undefined],
    ['revList', typeof revList !== 'undefined' ? revList : undefined],
    ['costSum', typeof costSum !== 'undefined' ? costSum : undefined],
    ['monthTotals', typeof monthTotals !== 'undefined' ? monthTotals : undefined],
    ['renderRevenue', typeof renderRevenue !== 'undefined' ? renderRevenue : undefined],
    ['revOver', typeof revOver !== 'undefined' ? revOver : undefined],
    ['revPay', typeof revPay !== 'undefined' ? revPay : undefined],
    ['saveCentralRates', typeof saveCentralRates !== 'undefined' ? saveCentralRates : undefined],
    ['syncRatesToPackages', typeof syncRatesToPackages !== 'undefined' ? syncRatesToPackages : undefined],
    ['revPayDetail', typeof revPayDetail !== 'undefined' ? revPayDetail : undefined],
    ['revCost', typeof revCost !== 'undefined' ? revCost : undefined],
    ['addCost', typeof addCost !== 'undefined' ? addCost : undefined],
    ['delCost', typeof delCost !== 'undefined' ? delCost : undefined],
    ['tplToMc', typeof tplToMc !== 'undefined' ? tplToMc : undefined],
    ['mcSampleVars', typeof mcSampleVars !== 'undefined' ? mcSampleVars : undefined],
    ['mcRenderTabs', typeof mcRenderTabs !== 'undefined' ? mcRenderTabs : undefined],
    ['mcRenderPresetOptions', typeof mcRenderPresetOptions !== 'undefined' ? mcRenderPresetOptions : undefined],
    ['mcLoadPreset', typeof mcLoadPreset !== 'undefined' ? mcLoadPreset : undefined],
    ['mcSwitchTab', typeof mcSwitchTab !== 'undefined' ? mcSwitchTab : undefined],
    ['renderMailComposer', typeof renderMailComposer !== 'undefined' ? renderMailComposer : undefined],
    ['mcInsertVar', typeof mcInsertVar !== 'undefined' ? mcInsertVar : undefined],
    ['mcRenderEditor', typeof mcRenderEditor !== 'undefined' ? mcRenderEditor : undefined],
    ['mcPreview', typeof mcPreview !== 'undefined' ? mcPreview : undefined],
    ['mcSet', typeof mcSet !== 'undefined' ? mcSet : undefined],
    ['mcAdd', typeof mcAdd !== 'undefined' ? mcAdd : undefined],
    ['mcMove', typeof mcMove !== 'undefined' ? mcMove : undefined],
    ['mcDel', typeof mcDel !== 'undefined' ? mcDel : undefined],
    ['mcPickColor', typeof mcPickColor !== 'undefined' ? mcPickColor : undefined],
    ['mcColorInput', typeof mcColorInput !== 'undefined' ? mcColorInput : undefined],
    ['mcGrad', typeof mcGrad !== 'undefined' ? mcGrad : undefined],
    ['mcSaveTemplate', typeof mcSaveTemplate !== 'undefined' ? mcSaveTemplate : undefined],
    ['mcExtraAction', typeof mcExtraAction !== 'undefined' ? mcExtraAction : undefined],
    ['mcScan', typeof mcScan !== 'undefined' ? mcScan : undefined],
    ['mcRenderRecs', typeof mcRenderRecs !== 'undefined' ? mcRenderRecs : undefined],
    ['mcSend', typeof mcSend !== 'undefined' ? mcSend : undefined],
    ['dataPriceLabel', typeof dataPriceLabel !== 'undefined' ? dataPriceLabel : undefined],
    ['renderDataRequests', typeof renderDataRequests !== 'undefined' ? renderDataRequests : undefined],
    ['sendDataReport', typeof sendDataReport !== 'undefined' ? sendDataReport : undefined],
    ['delDataRequest', typeof delDataRequest !== 'undefined' ? delDataRequest : undefined],
    ['clearDataRequests', typeof clearDataRequests !== 'undefined' ? clearDataRequests : undefined],
    ['switchTxTab', typeof switchTxTab !== 'undefined' ? switchTxTab : undefined],
    ['mergeTx', typeof mergeTx !== 'undefined' ? mergeTx : undefined],
    ['loadTx', typeof loadTx !== 'undefined' ? loadTx : undefined],
    ['deleteTx', typeof deleteTx !== 'undefined' ? deleteTx : undefined],
    ['renderTransactions', typeof renderTransactions !== 'undefined' ? renderTransactions : undefined],
    ['approveTransaction', typeof approveTransaction !== 'undefined' ? approveTransaction : undefined],
    ['detectProvider', typeof detectProvider !== 'undefined' ? detectProvider : undefined],
    ['buildMasked', typeof buildMasked !== 'undefined' ? buildMasked : undefined],
    ['openRootEditModal', typeof openRootEditModal !== 'undefined' ? openRootEditModal : undefined],
    ['toggleClusterSpecs', typeof toggleClusterSpecs !== 'undefined' ? toggleClusterSpecs : undefined],
    ['renderLinks', typeof renderLinks !== 'undefined' ? renderLinks : undefined],
    ['saveRootEdit', typeof saveRootEdit !== 'undefined' ? saveRootEdit : undefined],
    ['createLink', typeof createLink !== 'undefined' ? createLink : undefined],
    ['openLnkModal', typeof openLnkModal !== 'undefined' ? openLnkModal : undefined],
    ['saveLnkEdit', typeof saveLnkEdit !== 'undefined' ? saveLnkEdit : undefined],
    ['toggleLock', typeof toggleLock !== 'undefined' ? toggleLock : undefined],
    ['delLink', typeof delLink !== 'undefined' ? delLink : undefined],
    ['sortAllLinks', typeof sortAllLinks !== 'undefined' ? sortAllLinks : undefined],
    ['triggerGitHub', typeof triggerGitHub !== 'undefined' ? triggerGitHub : undefined],
    ['runGC', typeof runGC !== 'undefined' ? runGC : undefined],
    ['rebuildAllMAP', typeof rebuildAllMAP !== 'undefined' ? rebuildAllMAP : undefined],
    ['getDefaultAdminPkgs', typeof getDefaultAdminPkgs !== 'undefined' ? getDefaultAdminPkgs : undefined],
    ['loadDrawerSettingsUI', typeof loadDrawerSettingsUI !== 'undefined' ? loadDrawerSettingsUI : undefined],
    ['toggleHeaderDrawer', typeof toggleHeaderDrawer !== 'undefined' ? toggleHeaderDrawer : undefined],
    ['saveHeaderDrawer', typeof saveHeaderDrawer !== 'undefined' ? saveHeaderDrawer : undefined],
    ['loadAdminPkgs', typeof loadAdminPkgs !== 'undefined' ? loadAdminPkgs : undefined],
    ['toggleHidePkg', typeof toggleHidePkg !== 'undefined' ? toggleHidePkg : undefined],
    ['renderPkgAdmin', typeof renderPkgAdmin !== 'undefined' ? renderPkgAdmin : undefined],
    ['toggleLifetimePkg', typeof toggleLifetimePkg !== 'undefined' ? toggleLifetimePkg : undefined],
    ['togglePkgCat', typeof togglePkgCat !== 'undefined' ? togglePkgCat : undefined],
    ['addNewCustomPkg', typeof addNewCustomPkg !== 'undefined' ? addNewCustomPkg : undefined],
    ['delPkg', typeof delPkg !== 'undefined' ? delPkg : undefined],
    ['saveAllPkgs', typeof saveAllPkgs !== 'undefined' ? saveAllPkgs : undefined],
    ['relinkScanRun', typeof relinkScanRun !== 'undefined' ? relinkScanRun : undefined],
    ['relinkMapRun', typeof relinkMapRun !== 'undefined' ? relinkMapRun : undefined],
    ['relinkApply', typeof relinkApply !== 'undefined' ? relinkApply : undefined],
    ['switchDeadSubTab', typeof switchDeadSubTab !== 'undefined' ? switchDeadSubTab : undefined],
    ['renderDead', typeof renderDead !== 'undefined' ? renderDead : undefined],
    ['renderDeadSources', typeof renderDeadSources !== 'undefined' ? renderDeadSources : undefined],
    ['hardDeleteSource', typeof hardDeleteSource !== 'undefined' ? hardDeleteSource : undefined],
    ['cleanUnusedSources', typeof cleanUnusedSources !== 'undefined' ? cleanUnusedSources : undefined],
    ['restoreLink', typeof restoreLink !== 'undefined' ? restoreLink : undefined],
    ['clearDeadLinks', typeof clearDeadLinks !== 'undefined' ? clearDeadLinks : undefined],
    ['cmsEnsureTabs', typeof cmsEnsureTabs !== 'undefined' ? cmsEnsureTabs : undefined],
    ['ensureArts', typeof ensureArts !== 'undefined' ? ensureArts : undefined],
    ['initGuides', typeof initGuides !== 'undefined' ? initGuides : undefined],
    ['renderGuideAll', typeof renderGuideAll !== 'undefined' ? renderGuideAll : undefined],
    ['copyArtDeepLink', typeof copyArtDeepLink !== 'undefined' ? copyArtDeepLink : undefined],
    ['getEditorHtml', typeof getEditorHtml !== 'undefined' ? getEditorHtml : undefined],
    ['commitCms', typeof commitCms !== 'undefined' ? commitCms : undefined],
    ['setCms', typeof setCms !== 'undefined' ? setCms : undefined],
    ['openArt', typeof openArt !== 'undefined' ? openArt : undefined],
    ['artAdd', typeof artAdd !== 'undefined' ? artAdd : undefined],
    ['artDel', typeof artDel !== 'undefined' ? artDel : undefined],
    ['renderArtList', typeof renderArtList !== 'undefined' ? renderArtList : undefined],
    ['renderCmsTabBtns', typeof renderCmsTabBtns !== 'undefined' ? renderCmsTabBtns : undefined],
    ['setupSortableCmsTabs', typeof setupSortableCmsTabs !== 'undefined' ? setupSortableCmsTabs : undefined],
    ['renderCmsTabEdit', typeof renderCmsTabEdit !== 'undefined' ? renderCmsTabEdit : undefined],
    ['cmsTabSet', typeof cmsTabSet !== 'undefined' ? cmsTabSet : undefined],
    ['cmsAddTab', typeof cmsAddTab !== 'undefined' ? cmsAddTab : undefined],
    ['cmsDelTab', typeof cmsDelTab !== 'undefined' ? cmsDelTab : undefined],
    ['bStyle', typeof bStyle !== 'undefined' ? bStyle : undefined],
    ['guideScroll', typeof guideScroll !== 'undefined' ? guideScroll : undefined],
    ['openLightbox', typeof openLightbox !== 'undefined' ? openLightbox : undefined],
    ['videoEmbed', typeof videoEmbed !== 'undefined' ? videoEmbed : undefined],
    ['renderBlocks', typeof renderBlocks !== 'undefined' ? renderBlocks : undefined],
    ['cmsGoto', typeof cmsGoto !== 'undefined' ? cmsGoto : undefined],
    ['cmsGotoArt', typeof cmsGotoArt !== 'undefined' ? cmsGotoArt : undefined],
    ['buildRichArticleView', typeof buildRichArticleView !== 'undefined' ? buildRichArticleView : undefined],
    ['scrollToHeadingText', typeof scrollToHeadingText !== 'undefined' ? scrollToHeadingText : undefined],
    ['cmsPrev', typeof cmsPrev !== 'undefined' ? cmsPrev : undefined],
    ['addArtFaqRow', typeof addArtFaqRow !== 'undefined' ? addArtFaqRow : undefined],
    ['delArtFaqRow', typeof delArtFaqRow !== 'undefined' ? delArtFaqRow : undefined],
    ['renderArtFaqsUI', typeof renderArtFaqsUI !== 'undefined' ? renderArtFaqsUI : undefined],
    ['toggleRelatedArtPick', typeof toggleRelatedArtPick !== 'undefined' ? toggleRelatedArtPick : undefined],
    ['renderCmsEditor', typeof renderCmsEditor !== 'undefined' ? renderCmsEditor : undefined],
    ['saveCms', typeof saveCms !== 'undefined' ? saveCms : undefined],
    ['closeCmsEditor', typeof closeCmsEditor !== 'undefined' ? closeCmsEditor : undefined],
    ['openCmsEditorForArt', typeof openCmsEditorForArt !== 'undefined' ? openCmsEditorForArt : undefined],
    ['addArticleToCategory', typeof addArticleToCategory !== 'undefined' ? addArticleToCategory : undefined],
    ['renderGuideCategoriesTree', typeof renderGuideCategoriesTree !== 'undefined' ? renderGuideCategoriesTree : undefined],
    ['switchCheckSubTab', typeof switchCheckSubTab !== 'undefined' ? switchCheckSubTab : undefined],
    ['switchSettingsTab', typeof switchSettingsTab !== 'undefined' ? switchSettingsTab : undefined],
    ['showCronLog', typeof showCronLog !== 'undefined' ? showCronLog : undefined],
    ['renderRouteRows', typeof renderRouteRows !== 'undefined' ? renderRouteRows : undefined],
    ['saveRouting', typeof saveRouting !== 'undefined' ? saveRouting : undefined],
    ['checkBlurValidity', typeof checkBlurValidity !== 'undefined' ? checkBlurValidity : undefined],
    ['renderBlurRows', typeof renderBlurRows !== 'undefined' ? renderBlurRows : undefined],
    ['saveBlur', typeof saveBlur !== 'undefined' ? saveBlur : undefined],
    ['renderDockRows', typeof renderDockRows !== 'undefined' ? renderDockRows : undefined],
    ['dockPv', typeof dockPv !== 'undefined' ? dockPv : undefined],
    ['readDockRows', typeof readDockRows !== 'undefined' ? readDockRows : undefined],
    ['addDockIcon', typeof addDockIcon !== 'undefined' ? addDockIcon : undefined],
    ['removeDockIcon', typeof removeDockIcon !== 'undefined' ? removeDockIcon : undefined],
    ['saveDock', typeof saveDock !== 'undefined' ? saveDock : undefined],
    ['loadAdminFaqs', typeof loadAdminFaqs !== 'undefined' ? loadAdminFaqs : undefined],
    ['renderFaqAdmin', typeof renderFaqAdmin !== 'undefined' ? renderFaqAdmin : undefined],
    ['addNewFaq', typeof addNewFaq !== 'undefined' ? addNewFaq : undefined],
    ['delFaq', typeof delFaq !== 'undefined' ? delFaq : undefined],
    ['moveFaq', typeof moveFaq !== 'undefined' ? moveFaq : undefined],
    ['saveFaqs', typeof saveFaqs !== 'undefined' ? saveFaqs : undefined],
    ['switchFaqSubTab', typeof switchFaqSubTab !== 'undefined' ? switchFaqSubTab : undefined],
    ['normRouteInput', typeof normRouteInput !== 'undefined' ? normRouteInput : undefined],
    ['loadRoutesConfigUI', typeof loadRoutesConfigUI !== 'undefined' ? loadRoutesConfigUI : undefined],
    ['saveRoutesConfig', typeof saveRoutesConfig !== 'undefined' ? saveRoutesConfig : undefined],
    ['ftColsFromDb', typeof ftColsFromDb !== 'undefined' ? ftColsFromDb : undefined],
    ['renderFtCols', typeof renderFtCols !== 'undefined' ? renderFtCols : undefined],
    ['ftAddCol', typeof ftAddCol !== 'undefined' ? ftAddCol : undefined],
    ['ftDelCol', typeof ftDelCol !== 'undefined' ? ftDelCol : undefined],
    ['ftMoveCol', typeof ftMoveCol !== 'undefined' ? ftMoveCol : undefined],
    ['ftAddLink', typeof ftAddLink !== 'undefined' ? ftAddLink : undefined],
    ['ftDelLink', typeof ftDelLink !== 'undefined' ? ftDelLink : undefined],
    ['ftLoadTemplate', typeof ftLoadTemplate !== 'undefined' ? ftLoadTemplate : undefined],
    ['loadFooterConfigUI', typeof loadFooterConfigUI !== 'undefined' ? loadFooterConfigUI : undefined],
    ['saveFooterConfig', typeof saveFooterConfig !== 'undefined' ? saveFooterConfig : undefined],
    ['saveQrExpireSeconds', typeof saveQrExpireSeconds !== 'undefined' ? saveQrExpireSeconds : undefined],
    ['switchWebAdminTab', typeof switchWebAdminTab !== 'undefined' ? switchWebAdminTab : undefined],
    ['loadWebAdminUI', typeof loadWebAdminUI !== 'undefined' ? loadWebAdminUI : undefined],
    ['loadSettingsUI', typeof loadSettingsUI !== 'undefined' ? loadSettingsUI : undefined],
    ['saveEmailPerm', typeof saveEmailPerm !== 'undefined' ? saveEmailPerm : undefined],
    ['initAdminNotifyUI', typeof initAdminNotifyUI !== 'undefined' ? initAdminNotifyUI : undefined],
    ['updateAdminNotifyStatusUI', typeof updateAdminNotifyStatusUI !== 'undefined' ? updateAdminNotifyStatusUI : undefined],
    ['saveAdminNotifyPerm', typeof saveAdminNotifyPerm !== 'undefined' ? saveAdminNotifyPerm : undefined],
    ['saveCronCfg', typeof saveCronCfg !== 'undefined' ? saveCronCfg : undefined],
    ['saveLockExpiry', typeof saveLockExpiry !== 'undefined' ? saveLockExpiry : undefined],
    ['runCronNow', typeof runCronNow !== 'undefined' ? runCronNow : undefined],
    ['loadStatus', typeof loadStatus !== 'undefined' ? loadStatus : undefined],
    ['qBar', typeof qBar !== 'undefined' ? qBar : undefined],
    ['mailProvCard', typeof mailProvCard !== 'undefined' ? mailProvCard : undefined],
    ['selectMailProvider', typeof selectMailProvider !== 'undefined' ? selectMailProvider : undefined],
    ['saveMailProvider', typeof saveMailProvider !== 'undefined' ? saveMailProvider : undefined],
    ['renderMailProvCards', typeof renderMailProvCards !== 'undefined' ? renderMailProvCards : undefined],
    ['loadQuota', typeof loadQuota !== 'undefined' ? loadQuota : undefined],
    ['loadLogs', typeof loadLogs !== 'undefined' ? loadLogs : undefined],
    ['renderLogs', typeof renderLogs !== 'undefined' ? renderLogs : undefined],
    ['renderDev', typeof renderDev !== 'undefined' ? renderDev : undefined],
    ['delDev', typeof delDev !== 'undefined' ? delDev : undefined],
    ['migrateDates', typeof migrateDates !== 'undefined' ? migrateDates : undefined],
    ['migratePkg', typeof migratePkg !== 'undefined' ? migratePkg : undefined],
    ['loadFulfillmentConfig', typeof loadFulfillmentConfig !== 'undefined' ? loadFulfillmentConfig : undefined],
    ['renderFulfillmentUI', typeof renderFulfillmentUI !== 'undefined' ? renderFulfillmentUI : undefined],
    ['selectFailoverPolicy', typeof selectFailoverPolicy !== 'undefined' ? selectFailoverPolicy : undefined],
    ['updateFailoverPolicyUI', typeof updateFailoverPolicyUI !== 'undefined' ? updateFailoverPolicyUI : undefined],
    ['saveFulfillmentMapping', typeof saveFulfillmentMapping !== 'undefined' ? saveFulfillmentMapping : undefined],
    ['saveFailoverPolicy', typeof saveFailoverPolicy !== 'undefined' ? saveFailoverPolicy : undefined],
    ['startApp', typeof startApp !== 'undefined' ? startApp : undefined],
    ['restoreAdminScroll', typeof restoreAdminScroll !== 'undefined' ? restoreAdminScroll : undefined],
    ['checkTestModeStatus', typeof checkTestModeStatus !== 'undefined' ? checkTestModeStatus : undefined],
    ['updateTestModeUI', typeof updateTestModeUI !== 'undefined' ? updateTestModeUI : undefined],
    ['toggleTestMode', typeof toggleTestMode !== 'undefined' ? toggleTestMode : undefined],
    ['testPingProd', typeof testPingProd !== 'undefined' ? testPingProd : undefined],
    ['testPingTest', typeof testPingTest !== 'undefined' ? testPingTest : undefined],
    ['createFakeTestOrder', typeof createFakeTestOrder !== 'undefined' ? createFakeTestOrder : undefined],
    ['cloneProdOrdersToTest', typeof cloneProdOrdersToTest !== 'undefined' ? cloneProdOrdersToTest : undefined],
    ['clearTestOrders', typeof clearTestOrders !== 'undefined' ? clearTestOrders : undefined],
    ['testTelegramBot', typeof testTelegramBot !== 'undefined' ? testTelegramBot : undefined],
    ['triggerTelegramKvBackupNow', typeof triggerTelegramKvBackupNow !== 'undefined' ? triggerTelegramKvBackupNow : undefined],
    ['resetTelegramStt', typeof resetTelegramStt !== 'undefined' ? resetTelegramStt : undefined],
    ['triggerTelegramBackupNow', typeof triggerTelegramBackupNow !== 'undefined' ? triggerTelegramBackupNow : undefined],
    ['SITE_KEY', typeof SITE_KEY !== 'undefined' ? SITE_KEY : undefined],
    ['API', typeof API !== 'undefined' ? API : undefined],
    ['PDS', typeof PDS !== 'undefined' ? PDS : undefined],
    ['PD', typeof PD !== 'undefined' ? PD : undefined],
    ['GH_REPO', typeof GH_REPO !== 'undefined' ? GH_REPO : undefined],
    ['PKG_LIST', typeof PKG_LIST !== 'undefined' ? PKG_LIST : undefined],
    ['TABS', typeof TABS !== 'undefined' ? TABS : undefined],
    ['PKG_DB', typeof PKG_DB !== 'undefined' ? PKG_DB : undefined],
    ['$', typeof $ !== 'undefined' ? $ : undefined],
    ['arr', typeof arr !== 'undefined' ? arr : undefined],
    ['esc', typeof esc !== 'undefined' ? esc : undefined],
    ['q', typeof q !== 'undefined' ? q : undefined],
    ['cm', typeof cm !== 'undefined' ? cm : undefined],
    ['genId', typeof genId !== 'undefined' ? genId : undefined],
    ['genHex', typeof genHex !== 'undefined' ? genHex : undefined],
    ['normId', typeof normId !== 'undefined' ? normId : undefined],
    ['isLife', typeof isLife !== 'undefined' ? isLife : undefined],
    ['normSt', typeof normSt !== 'undefined' ? normSt : undefined],
    ['getT', typeof getT !== 'undefined' ? getT : undefined],
    ['trimNum', typeof trimNum !== 'undefined' ? trimNum : undefined],
    ['VND_SEP', typeof VND_SEP !== 'undefined' ? VND_SEP : undefined],
    ['fmtVnd', typeof fmtVnd !== 'undefined' ? fmtVnd : undefined],
    ['Toast', typeof Toast !== 'undefined' ? Toast : undefined],
    ['cp', typeof cp !== 'undefined' ? cp : undefined],
    ['sleep', typeof sleep !== 'undefined' ? sleep : undefined],
    ['off', typeof off !== 'undefined' ? off : undefined],
    ['TZN', typeof TZN !== 'undefined' ? TZN : undefined],
    ['nowMs', typeof nowMs !== 'undefined' ? nowMs : undefined],
    ['fmtBank', typeof fmtBank !== 'undefined' ? fmtBank : undefined],
    ['oTs', typeof oTs !== 'undefined' ? oTs : undefined],
    ['dmyOf', typeof dmyOf !== 'undefined' ? dmyOf : undefined],
    ['parseDmy', typeof parseDmy !== 'undefined' ? parseDmy : undefined],
    ['expEnd', typeof expEnd !== 'undefined' ? expEnd : undefined],
    ['monthInfo', typeof monthInfo !== 'undefined' ? monthInfo : undefined],
    ['fmtFull', typeof fmtFull !== 'undefined' ? fmtFull : undefined],
    ['OLD_BY_DATA', typeof OLD_BY_DATA !== 'undefined' ? OLD_BY_DATA : undefined],
    ['pkgLabel', typeof pkgLabel !== 'undefined' ? pkgLabel : undefined],
    ['fmtMonths', typeof fmtMonths !== 'undefined' ? fmtMonths : undefined],
    ['myWebIndex', typeof myWebIndex !== 'undefined' ? myWebIndex : undefined],
    ['payOf', typeof payOf !== 'undefined' ? payOf : undefined],
    ['TOKEN', typeof TOKEN !== 'undefined' ? TOKEN : undefined],
    ['myDev', typeof myDev !== 'undefined' ? myDev : undefined],
    ['aj', typeof aj !== 'undefined' ? aj : undefined],
    ['logEvent', typeof logEvent !== 'undefined' ? logEvent : undefined],
    ['ordersDb', typeof ordersDb !== 'undefined' ? ordersDb : undefined],
    ['curOrdTab', typeof curOrdTab !== 'undefined' ? curOrdTab : undefined],
    ['isMailMaster', typeof isMailMaster !== 'undefined' ? isMailMaster : undefined],
    ['expLocked', typeof expLocked !== 'undefined' ? expLocked : undefined],
    ['lockFulfillOn', typeof lockFulfillOn !== 'undefined' ? lockFulfillOn : undefined],
    ['mailOnSaveOn', typeof mailOnSaveOn !== 'undefined' ? mailOnSaveOn : undefined],
    ['manualEditOn', typeof manualEditOn !== 'undefined' ? manualEditOn : undefined],
    ['tombGet', typeof tombGet !== 'undefined' ? tombGet : undefined],
    ['tombSet', typeof tombSet !== 'undefined' ? tombSet : undefined],
    ['addTomb', typeof addTomb !== 'undefined' ? addTomb : undefined],
    ['rmTomb', typeof rmTomb !== 'undefined' ? rmTomb : undefined],
    ['isDeleted', typeof isDeleted !== 'undefined' ? isDeleted : undefined],
    ['isLockedPoolUrl', typeof isLockedPoolUrl !== 'undefined' ? isLockedPoolUrl : undefined],
    ['ordAmountTxt', typeof ordAmountTxt !== 'undefined' ? ordAmountTxt : undefined],
    ['curUpg', typeof curUpg !== 'undefined' ? curUpg : undefined],
    ['healAllMissing', typeof healAllMissing !== 'undefined' ? healAllMissing : undefined],
    ['htmlEscape', typeof htmlEscape !== 'undefined' ? htmlEscape : undefined],
    ['sendMailClient', typeof sendMailClient !== 'undefined' ? sendMailClient : undefined],
    ['mailGrad', typeof mailGrad !== 'undefined' ? mailGrad : undefined],
    ['mailShell', typeof mailShell !== 'undefined' ? mailShell : undefined],
    ['mailIdBox', typeof mailIdBox !== 'undefined' ? mailIdBox : undefined],
    ['mailPortal', typeof mailPortal !== 'undefined' ? mailPortal : undefined],
    ['mailBtn', typeof mailBtn !== 'undefined' ? mailBtn : undefined],
    ['mailSupport', typeof mailSupport !== 'undefined' ? mailSupport : undefined],
    ['TPL_THEME', typeof TPL_THEME !== 'undefined' ? TPL_THEME : undefined],
    ['P0', typeof P0 !== 'undefined' ? P0 : undefined],
    ['SYS_TPL', typeof SYS_TPL !== 'undefined' ? SYS_TPL : undefined],
    ['getTpl', typeof getTpl !== 'undefined' ? getTpl : undefined],
    ['subjVars', typeof subjVars !== 'undefined' ? subjVars : undefined],
    ['mailKeyOf', typeof mailKeyOf !== 'undefined' ? mailKeyOf : undefined],
    ['mailSuccess', typeof mailSuccess !== 'undefined' ? mailSuccess : undefined],
    ['mailFailed', typeof mailFailed !== 'undefined' ? mailFailed : undefined],
    ['mailExp', typeof mailExp !== 'undefined' ? mailExp : undefined],
    ['mailZalo', typeof mailZalo !== 'undefined' ? mailZalo : undefined],
    ['dataVars', typeof dataVars !== 'undefined' ? dataVars : undefined],
    ['mailData', typeof mailData !== 'undefined' ? mailData : undefined],
    ['revTab', typeof revTab !== 'undefined' ? revTab : undefined],
    ['REV_TABS', typeof REV_TABS !== 'undefined' ? REV_TABS : undefined],
    ['setRevTab', typeof setRevTab !== 'undefined' ? setRevTab : undefined],
    ['setRevPayView', typeof setRevPayView !== 'undefined' ? setRevPayView : undefined],
    ['cnyRate', typeof cnyRate !== 'undefined' ? cnyRate : undefined],
    ['curVal', typeof curVal !== 'undefined' ? curVal : undefined],
    ['shortN', typeof shortN !== 'undefined' ? shortN : undefined],
    ['monthLbl', typeof monthLbl !== 'undefined' ? monthLbl : undefined],
    ['kpi', typeof kpi !== 'undefined' ? kpi : undefined],
    ['box', typeof box !== 'undefined' ? box : undefined],
    ['chartRevStacked', typeof chartRevStacked !== 'undefined' ? chartRevStacked : undefined],
    ['gridPkgTable', typeof gridPkgTable !== 'undefined' ? gridPkgTable : undefined],
    ['PAYLBL', typeof PAYLBL !== 'undefined' ? PAYLBL : undefined],
    ['MC_COLORS', typeof MC_COLORS !== 'undefined' ? MC_COLORS : undefined],
    ['MC_BT', typeof MC_BT !== 'undefined' ? MC_BT : undefined],
    ['MC_VARS_BASE', typeof MC_VARS_BASE !== 'undefined' ? MC_VARS_BASE : undefined],
    ['MC_VARS_SYS', typeof MC_VARS_SYS !== 'undefined' ? MC_VARS_SYS : undefined],
    ['MC_SYS_KEYS', typeof MC_SYS_KEYS !== 'undefined' ? MC_SYS_KEYS : undefined],
    ['MC_SYS_NAMES', typeof MC_SYS_NAMES !== 'undefined' ? MC_SYS_NAMES : undefined],
    ['MC_PRESETS', typeof MC_PRESETS !== 'undefined' ? MC_PRESETS : undefined],
    ['mc', typeof mc !== 'undefined' ? mc : undefined],
    ['mcColorName', typeof mcColorName !== 'undefined' ? mcColorName : undefined],
    ['mcClone', typeof mcClone !== 'undefined' ? mcClone : undefined],
    ['mcToTpl', typeof mcToTpl !== 'undefined' ? mcToTpl : undefined],
    ['extractOrder', typeof extractOrder !== 'undefined' ? extractOrder : undefined],
    ['kindBadge', typeof kindBadge !== 'undefined' ? kindBadge : undefined],
    ['delBtn', typeof delBtn !== 'undefined' ? delBtn : undefined],
    ['saveLinks', typeof saveLinks !== 'undefined' ? saveLinks : undefined],
    ['savePool', typeof savePool !== 'undefined' ? savePool : undefined],
    ['FIXED_PKG_IDS', typeof FIXED_PKG_IDS !== 'undefined' ? FIXED_PKG_IDS : undefined],
    ['adminPkgsList', typeof adminPkgsList !== 'undefined' ? adminPkgsList : undefined],
    ['sortablePkgsInstance', typeof sortablePkgsInstance !== 'undefined' ? sortablePkgsInstance : undefined],
    ['delCustomPkg', typeof delCustomPkg !== 'undefined' ? delCustomPkg : undefined],
    ['rsItems', typeof rsItems !== 'undefined' ? rsItems : undefined],
    ['rlPicks', typeof rlPicks !== 'undefined' ? rlPicks : undefined],
    ['rlAll', typeof rlAll !== 'undefined' ? rlAll : undefined],
    ['curDeadTab', typeof curDeadTab !== 'undefined' ? curDeadTab : undefined],
    ['deadLive', typeof deadLive !== 'undefined' ? deadLive : undefined],
    ['DEF_TABS', typeof DEF_TABS !== 'undefined' ? DEF_TABS : undefined],
    ['toSlug', typeof toSlug !== 'undefined' ? toSlug : undefined],
    ['curArtsReady', typeof curArtsReady !== 'undefined' ? curArtsReady : undefined],
    ['guideTabList', typeof guideTabList !== 'undefined' ? guideTabList : undefined],
    ['artsOf', typeof artsOf !== 'undefined' ? artsOf : undefined],
    ['curArtHtml', typeof curArtHtml !== 'undefined' ? curArtHtml : undefined],
    ['quillInst', typeof quillInst !== 'undefined' ? quillInst : undefined],
    ['sortableCmsTabs', typeof sortableCmsTabs !== 'undefined' ? sortableCmsTabs : undefined],
    ['safeUrl', typeof safeUrl !== 'undefined' ? safeUrl : undefined],
    ['bAlign', typeof bAlign !== 'undefined' ? bAlign : undefined],
    ['dAlign', typeof dAlign !== 'undefined' ? dAlign : undefined],
    ['SZ', typeof SZ !== 'undefined' ? SZ : undefined],
    ['bText', typeof bText !== 'undefined' ? bText : undefined],
    ['findTarget', typeof findTarget !== 'undefined' ? findTarget : undefined],
    ['saveCmsDb', typeof saveCmsDb !== 'undefined' ? saveCmsDb : undefined],
    ['curCheckSubTab', typeof curCheckSubTab !== 'undefined' ? curCheckSubTab : undefined],
    ['BLUR_RULES', typeof BLUR_RULES !== 'undefined' ? BLUR_RULES : undefined],
    ['DEFAULT_FAQS', typeof DEFAULT_FAQS !== 'undefined' ? DEFAULT_FAQS : undefined],
    ['adminFaqsList', typeof adminFaqsList !== 'undefined' ? adminFaqsList : undefined],
    ['DEFAULT_SYS_ROUTES', typeof DEFAULT_SYS_ROUTES !== 'undefined' ? DEFAULT_SYS_ROUTES : undefined],
    ['ftCols', typeof ftCols !== 'undefined' ? ftCols : undefined],
    ['FT_TEMPLATE', typeof FT_TEMPLATE !== 'undefined' ? FT_TEMPLATE : undefined],
    ['ftClone', typeof ftClone !== 'undefined' ? ftClone : undefined],
    ['yn', typeof yn !== 'undefined' ? yn : undefined],
    ['QL', typeof QL !== 'undefined' ? QL : undefined],
    ['MAIL_PROV_META', typeof MAIL_PROV_META !== 'undefined' ? MAIL_PROV_META : undefined],
    ['mailProvQuota', typeof mailProvQuota !== 'undefined' ? mailProvQuota : undefined],
    ['pickMailProvider', typeof pickMailProvider !== 'undefined' ? pickMailProvider : undefined],
    ['currentFulfillmentConfig', typeof currentFulfillmentConfig !== 'undefined' ? currentFulfillmentConfig : undefined],
    ['started', typeof started !== 'undefined' ? started : undefined],
    ['adminScrollTimer', typeof adminScrollTimer !== 'undefined' ? adminScrollTimer : undefined],
    ['isTestModeActive', typeof isTestModeActive !== 'undefined' ? isTestModeActive : undefined],
    ['testPingConnection', typeof testPingConnection !== 'undefined' ? testPingConnection : undefined],
  ];
  _exposed.forEach(([k, v]) => {
    if (v !== undefined) window[k] = v;
  });
}
