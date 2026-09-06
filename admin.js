// Supabase Configuration
const SUPABASE_URL = 'https://teusfncayuljkoomerql.supabase.co';
const SUPABASE_KEY = 'sb_publishable_1WNxp6aaYVzrrNilg7pAAA_gG_XDx55';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Create a Class
async function createClass() {
  const className = document.getElementById('className').value.trim();
  const joinCode = document.getElementById('joinCode').value.trim().toUpperCase();

  if (!className || !joinCode) {
    alert("Please enter both a Class Name and Join Code.");
    return;
  }

  const { error } = await supabaseClient
    .from('classes')
    .insert([{ class_name: className, join_code: joinCode }]);

  if (error) {
    alert("Error creating class: " + error.message);
  } else {
    alert(`Class "${className}" (${joinCode}) created successfully!`);
    document.getElementById('className').value = '';
    document.getElementById('joinCode').value = '';
  }
}

// 2. Bulk Add Pupils (Name, Code format)
async function bulkAddPupils() {
  const code = document.getElementById('bulkClassCode').value.trim().toUpperCase();
  const rawInput = document.getElementById('bulkPupilData').value.trim();

  if (!code || !rawInput) {
    alert("Please enter a class code and paste pupil entries.");
    return;
  }

  const lines = rawInput.split('\n').filter(l => l.trim().length > 0);
  const pupilRecords = [];

  for (let line of lines) {
    const parts = line.split(',');
    if (parts.length < 2) {
      alert(`Format error on line: "${line}". Must be "Name, PupilCode".`);
      return;
    }
    pupilRecords.push({
      class_id: code,
      pupil_name: parts[0].trim(),
      pupil_code: parts[1].trim().toUpperCase()
    });
  }

  const { error } = await supabaseClient.from('pupils').insert(pupilRecords);

  if (error) {
    alert("Error adding pupils: " + error.message);
  } else {
    alert(`Successfully added ${pupilRecords.length} pupils to class ${code}!`);
    document.getElementById('bulkPupilData').value = '';
  }
}

// 3. Manage Pupils (Load Roster)
async function loadPupils() {
  const code = document.getElementById('manageClassCode').value.trim().toUpperCase();
  const roster = document.getElementById('pupilRoster');

  if (!code) {
    alert("Please enter a class code.");
    return;
  }

  const { data, error } = await supabaseClient
    .from('pupils')
    .select('*')
    .eq('class_id', code);

  if (error || !data || data.length === 0) {
    roster.innerHTML = "<p>No pupils found for code: " + code + "</p>";
    return;
  }

  roster.innerHTML = data.map(p => `
    <div class="pupil-item">
      <div>
        <strong>${p.pupil_name}</strong> (Code: <code>${p.pupil_code}</code>)
        <br><small>Password set: ${p.password ? 'Yes' : 'No (First Login Pending)'}</small>
      </div>
      <div>
        <button class="btn-warning" onclick="resetPassword('${p.pupil_code}')">Reset Password</button>
        <button class="btn-danger" onclick="deletePupil('${p.pupil_code}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// 3a. Reset Pupil Password
async function resetPassword(pupilCode) {
  const { error } = await supabaseClient
    .from('pupils')
    .update({ password: null })
    .eq('pupil_code', pupilCode);

  if (error) {
    alert("Error resetting password: " + error.message);
  } else {
    alert(`Password reset for ${pupilCode}. Student can set a new password on their next login.`);
    loadPupils();
  }
}

// 3b. Delete Pupil Entry
async function deletePupil(pupilCode) {
  if (!confirm(`Are you sure you want to delete pupil ${pupilCode}?`)) return;

  const { error } = await supabaseClient
    .from('pupils')
    .delete()
    .eq('pupil_code', pupilCode);

  if (error) {
    alert("Error deleting pupil: " + error.message);
  } else {
    alert(`Pupil ${pupilCode} removed successfully.`);
    loadPupils();
  }
}

// 4. Post New Task Entry for Pupils
async function createFeedbackTask() {
  const code = document.getElementById('taskClassCode').value.trim().toUpperCase();
  const topic = document.getElementById('taskTopic').value;
  const title = document.getElementById('taskTitle').value.trim();

  if (!code || !title) {
    alert("Please enter both a class code and task title.");
    return;
  }

  const { error } = await supabaseClient.from('feedback').insert([{
    class_id: code,
    pupil_id: `[TASK] ${topic}`,
    notes: title,
    status_color: 'amber'
  }]);

  if (error) {
    alert("Error posting task: " + error.message);
  } else {
    alert(`Posted new task "${topic}: ${title}" to class ${code}!`);
    document.getElementById('taskTitle').value = '';
    loadFeedback();
  }
}

// 5. Load Live Feedback Stream
async function loadFeedback() {
  const code = document.getElementById('viewCode').value.trim().toUpperCase();
  const list = document.getElementById('feedbackList');

  if (!code) {
    alert("Please enter a class code.");
    return;
  }

  const { data, error } = await supabaseClient
    .from('feedback')
    .select('*')
    .eq('class_id', code)
    .order('created_at', { ascending: false });

  if (error) {
    list.innerHTML = "<p>Error loading feedback: " + error.message + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = "<p>No feedback entries found for code: " + code + "</p>";
    return;
  }

  list.innerHTML = data.map(f => `
    <div class="feedback-item">
      <div>
        <span class="badge ${f.status_color}">${(f.status_color || '').toUpperCase()}</span>
        <strong>${f.pupil_id}</strong>: ${f.notes || 'No notes added'}
      </div>
    </div>
  `).join('');
}