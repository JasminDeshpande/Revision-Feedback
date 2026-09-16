let user,pupil,tasks=[],topics=[],notes=[],editingNoteId=null;
const noteTypes={general_feedback:"General feedback",class_note:"Class note",revision_tip:"Revision tip",assignment_feedback:"Assignment feedback"};
const noteMessage=document.getElementById("note-message");

function selectOptions(items,labelFn){return items.map(item=>`<option value="${item.id}">${escapeHtml(labelFn(item))}</option>`).join("");}
function fillTaskAndTopicSelects(){
 document.getElementById("note-task").innerHTML='<option value="">-- Select task --</option>'+selectOptions(tasks,item=>item.title);
 document.getElementById("note-topic").innerHTML='<option value="">-- Select topic --</option>'+selectOptions(topics,item=>item.topic_name);
}
function resetNoteForm(){editingNoteId=null;document.getElementById("note-form").reset();document.getElementById("note-form-title").textContent="Add an action point";document.getElementById("note-submit").textContent="Save action point";document.getElementById("cancel-note-edit").classList.add("hidden");showMessage(noteMessage,"");}
document.getElementById("cancel-note-edit").addEventListener("click",resetNoteForm);
document.getElementById("note-task").addEventListener("change",event=>{const task=tasks.find(item=>item.id===event.target.value);if(task)document.getElementById("note-topic").value=task.topic_id||"";});

async function loadReferenceData(){
 const[{data:taskData,error:taskError},{data:topicData,error:topicError}]=await Promise.all([
  db.from("action_point_tasks").select("id,title,topic_id").eq("class_id",pupil.class_id).order("created_at",{ascending:false}),
  db.from("topics").select("id,topic_name").order("topic_name")
 ]);
 if(taskError||topicError)throw taskError||topicError;
 tasks=taskData||[];topics=topicData||[];fillTaskAndTopicSelects();
}
async function loadNotes(){
 const{data,error}=await db.from("pupil_action_points").select("*,action_point_tasks(title),topics(topic_name)").eq("pupil_id",user.id).order("created_at",{ascending:false});
 if(error)throw error;notes=data||[];
 document.getElementById("download-notes-pdf").disabled=!notes.length;
 const openCount=notes.filter(item=>!item.actioned).length;
 const count=document.getElementById("open-count");count.textContent=`${openCount} to action`;count.className=`badge ${openCount?"amber":"green"}`;
 document.getElementById("notes-body").innerHTML=notes.map(item=>`<tr class="${item.actioned?"actioned-row":""}"><td>${escapeHtml(noteTypes[item.note_type])}</td><td>${escapeHtml(item.action_point_tasks?.title||"–")}</td><td>${escapeHtml(item.topics?.topic_name||"–")}</td><td class="note-comment">${escapeHtml(item.revision_comment)}</td><td><input class="action-checkbox" type="checkbox" aria-label="Mark action point as completed" ${item.actioned?"checked":""} onchange="setActioned('${item.id}',this.checked)"></td><td><button class="secondary" type="button" onclick="editNote('${item.id}')">Edit</button></td></tr>`).join("")||"<tr><td colspan='6'>No notes or action points yet.</td></tr>";
}
document.getElementById("note-form").addEventListener("submit",async event=>{
 event.preventDefault();
 const row={pupil_id:user.id,note_type:document.getElementById("note-type").value,action_task_id:document.getElementById("note-task").value,topic_id:document.getElementById("note-topic").value,revision_comment:document.getElementById("note-comment").value.trim(),actioned:document.getElementById("note-actioned").checked};
 if(!row.action_task_id||!row.topic_id||!row.revision_comment){showMessage(message,"Select a task and topic, then enter your action point.");return;}
 if(!row.revision_comment)return showMessage(noteMessage,"Enter a revision comment or action point.");
 const wasEditing=Boolean(editingNoteId);
 const result=wasEditing?await db.from("pupil_action_points").update(row).eq("id",editingNoteId).eq("pupil_id",user.id):await db.from("pupil_action_points").insert(row);
 if(result.error)return showMessage(noteMessage,result.error.message);
 resetNoteForm();showMessage(noteMessage,wasEditing?"Action point updated.":"Action point saved.","success");await loadNotes();
});
function editNote(id){const item=notes.find(note=>note.id===id);if(!item)return;editingNoteId=id;document.getElementById("note-type").value=item.note_type;document.getElementById("note-task").value=item.action_task_id||"";document.getElementById("note-topic").value=item.topic_id||"";document.getElementById("note-comment").value=item.revision_comment;document.getElementById("note-actioned").checked=item.actioned;document.getElementById("note-form-title").textContent="Edit action point";document.getElementById("note-submit").textContent="Save changes";document.getElementById("cancel-note-edit").classList.remove("hidden");document.getElementById("note-form").scrollIntoView({behavior:"smooth",block:"start"});}
async function setActioned(id,actioned){const{error}=await db.from("pupil_action_points").update({actioned}).eq("id",id).eq("pupil_id",user.id);if(error)return showMessage(noteMessage,error.message);await loadNotes();}
document.getElementById("download-notes-pdf").addEventListener("click",()=>{if(!notes.length)return;const{jsPDF}=window.jspdf||{};if(!jsPDF)return alert("The PDF tool did not load. Refresh the page and try again.");const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});doc.setFontSize(18);doc.setTextColor(15,23,42);doc.text("Revision Notes and Action Points",14,16);doc.setFontSize(11);doc.text(`Downloaded: ${new Date().toLocaleDateString("en-GB")}`,230,16);const rows=notes.map(item=>[new Date(item.created_at).toLocaleDateString("en-GB"),noteTypes[item.note_type]||"",item.action_point_tasks?.title||"-",item.topics?.topic_name||"-",item.revision_comment,item.actioned?"Actioned":"To action"]);doc.autoTable({startY:24,head:[["Date","Type","Task","Topic","Revision comment / action point","Status"]],body:rows,theme:"grid",styles:{fontSize:8.5,cellPadding:2.2,overflow:"linebreak",valign:"top"},headStyles:{fillColor:[15,23,42],textColor:255},columnStyles:{0:{cellWidth:22},1:{cellWidth:35},2:{cellWidth:45},3:{cellWidth:38},4:{cellWidth:"auto"},5:{cellWidth:25}},margin:{left:10,right:10}});doc.save("revision-notes-and-action-points.pdf");});

(async()=>{const result=await db.auth.getUser();user=result.data.user;if(!user)return window.location.replace("index.html");const{data:profile}=await db.from("profiles").select("role,must_change_password").eq("id",user.id).single();if(profile?.role!=="pupil")return signOut();if(profile.must_change_password)return window.location.replace("pupil.html");const{data,error}=await db.from("pupils").select("id,class_id").eq("id",user.id).single();if(error)return showMessage(noteMessage,error.message);pupil=data;try{await loadReferenceData();await loadNotes();}catch(loadError){showMessage(noteMessage,loadError.message);}})();
