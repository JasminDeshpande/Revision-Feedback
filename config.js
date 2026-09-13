const SUPABASE_URL="https://teusfncayuljkoomerql.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_1WNxp6aaYVzrrNilg7pAAA_gG_XDx55";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
function pupilEmail(code){return `${code.trim().toLowerCase()}@pupils.feedback.invalid`;}
async function signOut(){await db.auth.signOut();window.location.replace("index.html");}
function showMessage(element,text,type="error"){element.textContent=text||"";element.className=`message ${text?type:""}`;}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);}
