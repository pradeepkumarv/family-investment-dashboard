// ----- CONFIGURE YOUR SUPABASE -----//
const SUPABASE_URL = 'https://tqjwhbwcteuvmreldgae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxandoYndjdGV1dm1yZWxkZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MDQwODksImV4cCI6MjA3MTE4MDA4OX0.g4ksBnP-IjpIdu6l0zaiOTJGMTCDoh32kNG9GFGzdTw';

let supabase = null;
let familyMembers = [];
let investmentsData = {};
let currentMemberId = null;
let editingMemberId = null;

// Initialize Supabase
function init() {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
// Call init on load
window.onload = () => {
  init();
  checkAuthAndLoad();
};
async function checkAuthAndLoad() {
  // Simple auth check
  const session = await supabase.auth.getSession();
  if (session.data.session) {
    showDashboard();
    loadFamilyMembers();
  } else {
    // Not logged in
    document.getElementById('landing-page').style.display = 'flex';
  }
}

// ----------- Login / Logout --------------
async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('Login failed: ' + error.message);
    } else {
      showDashboard();
      loadFamilyMembers();
    }
  } catch(e){ alert('Error: ' + e.message);}
}
async function handleLogout() {
  await supabase.auth.signOut();
  document.getElementById('landing-page').style.display='flex';
  document.getElementById('main-dashboard').style.display='none';
}
// ---------- Load & Render Family Members ------------------
async function loadFamilyMembers() {
  // get from DB
  const { data, error } = await supabase.from('family_members').select('*');
  if(error){
    familyMembers = [];
  } else {
    familyMembers = data;
  }
  renderFamilyMembers();
  populateMemberDropdowns();
}
function renderFamilyMembers() {
  const container = document.getElementById('members-container');
  container.innerHTML = '';
  familyMembers.forEach(m => {
    const card = document.createElement('div');
    card.style.border = '1px solid #888'; card.style.padding='1rem'; card.style.borderRadius='8px'; card.style.marginBottom='0.5rem';
    card.innerHTML = `
      <div style="font-weight:bold;">${m.name} (${m.relationship}) ${m.is_primary?'👑':''}</div>
      <div>
        <button onclick="editMember('${m.id}')">Edit</button>
        <button onclick="deleteMember('${m.id}')">Delete</button>
        <button onclick="viewMemberDetails('${m.id}')">View Details</button>
      </div>
    `;
    container.appendChild(card);
  });
}
function openMemberModal() {
  editingMemberId = null; 
  document.getElementById('member-form').reset();
  document.getElementById('member-modal-title').innerText='Add Member';
  document.getElementById('member-modal').style.display='flex';
}
function closeMemberModal() {
  document.getElementById('member-modal').style.display='none';
}
async function saveMember(e) {
  e.preventDefault();
  const name = document.getElementById('member-name').value;
  const rel = document.getElementById('member-relationship').value;
  const isPrim = document.getElementById('member-primary').checked;
  if(!name || !rel) return;
  if (editingMemberId) {
    await supabase.from('family_members').update({ name, relationship: rel, is_primary:isPrim }).eq('id', editingMemberId);
  } else {
    await supabase.from('family_members').insert({ name, relationship:rel, is_primary: isPrim });
  }
  closeMemberModal(); loadFamilyMembers();
}
async function editMember(id) {
  editingMemberId = id;
  const m = familyMembers.find(f => f.id===id);
  document.getElementById('member-name').value = m.name;
  document.getElementById('member-relationship').value = m.relationship;
  document.getElementById('member-primary').checked = m.is_primary;
  document.getElementById('member-modal-title').innerText='Edit Member';
  document.getElementById('member-modal').style.display='flex';
}
async function deleteMember(id) {
  await supabase.from('family_members').delete().eq('id',id);
  loadFamilyMembers();
}
function viewMemberDetails(id) {
  currentMemberId = id;
  showMemberSection(id);
}
function showMemberSection(id) {
  document.getElementById('members-sections').innerHTML='';
  const member = familyMembers.find(m=>m.id===id);
  // create sections: FD, Insurance
  const container = document.createElement('div');
  container.innerHTML=`
    <h3>${member.name} (${member.relationship})</h3>
    <button onclick="openFDModal('${id}')">Add FD</button>
    <button onclick="openInsuranceModal('${id}')">Add Insurance</button>
    <div id="fd-list"></div>
    <div id="insurance-list"></div>
  `;
  document.getElementById('members-sections').appendChild(container);
  loadFDs(id);
  loadInsurances(id);
}
async function loadFDs(memberId) {
  const { data, error } = await supabase.from('fixed_deposits').select('*').eq('member_id', memberId);
  const listDiv = document.getElementById('fd-list');
  listDiv.innerHTML='';
  if(error){ listDiv.innerHTML='Error loading FD'; return;}
  data.forEach(fd => {
    const div = document.createElement('div');
    div.style.border='1px solid #666'; div.style.padding='0.5rem'; div.style.borderRadius='5px'; div.style.marginBottom='0.5rem';
    div.innerHTML=`<strong>${fd.institution_name}</strong> | Amount: ₹${fd.invested_amount} | Rate: ${fd.interest_rate}% | Maturity: ${fd.maturity_date} | Premium: ₹${fd.premium_amount}`;
    listDiv.appendChild(div);
  });
}
async function loadInsurances(memberId) {
  const { data, error } = await supabase.from('insurance_policies').select('*').eq('member_id', memberId);
  const listDiv = document.getElementById('insurance-list');
  listDiv.innerHTML='';
  if(error){ listDiv.innerHTML='Error loading Insurances'; return;}
  data.forEach(ip => {
    const div = document.createElement('div');
    div.style.border='1px solid #666'; div.style.padding='0.5rem'; div.style.borderRadius='5px'; div.style.marginBottom='0.5rem';
    div.innerHTML=`<strong>${ip.insurer}</strong> | Type: ${ip.policy_type} | Premium: ₹${ip.premium_amount} | Maturity: ${ip.policy_end_date} | Returns: ${ip.premium_amount ? ((ip.premium_amount/100)*(ip.premium_amount)).toFixed(2)+'%' :'N/A'}`;
    listDiv.appendChild(div);
  });
}
// ----------- FD & Insurance Modals ----------------
function openFDModal(memberId) {
  document.getElementById('fd-form').reset();
  document.getElementById('fd-member').value=memberId;
  document.getElementById('fd-interest').value=''; // auto calc
  document.getElementById('fd-modal').style.display='flex';
}
function closeFDModal() { document.getElementById('fd-modal').style.display='none'; }
async function saveFD(e){
  e.preventDefault();
  const member_id = document.getElementById('fd-member').value;
  const institution = document.getElementById('fd-institution').value;
  const invested_in = document.getElementById('fd-invested-in').value;
  const amount = parseFloat(document.getElementById('fd-amount').value);
  const rate = parseFloat(document.getElementById('fd-rate').value);
  const maturity = document.getElementById('fd-maturity').value;
  const payout = document.getElementById('fd-payout').value;
  const interestAmt = (amount * rate/100).toFixed(2);
  await supabase.from('fixed_deposits').insert({
    member_id, institution_name: institution,
    invested_in, invested_amount: amount,
    interest_rate: rate, maturity_date: maturity,
    interest_payout: payout
  });
  closeFDModal(); loadFDs(member_id);
}
function openInsuranceModal(memberId){
  document.getElementById('insurance-form').reset();
  document.getElementById('ins-member').value=memberId;
  document.getElementById('ins-returns').value='';
  document.getElementById('insurance-modal').style.display='flex';
}
function closeInsuranceModal() { document.getElementById('insurance-modal').style.display='none'; }
async function saveInsurance(e){
  e.preventDefault();
  const member_id = document.getElementById('ins-member').value;
  const insurer = document.getElementById('insurer').value;
  const type = document.getElementById('ins-type').value;
  const freq = document.getElementById('ins-frequency').value;
  const premium = parseFloat(document.getElementById('ins-premium').value);
  const maturity = document.getElementById('ins-maturity').value;
  const returns = parseFloat(document.getElementById('ins-returns').value);
  await supabase.from('insurance_policies').insert({
    member_id, insurer, policy_type: type,
    premium_amount: premium,
    policy_end_date:maturity,
    insurance_type: type,
  });
  closeInsuranceModal();
  loadInsurances(member_id);
}
// ----------- Add new member ----------------
function openMemberModal(){ /* same as above */ }
function closeMemberModal(){ /* as above */ }
document.getElementById('member-form').onsubmit=saveMember; // assign handler
document.getElementById('fd-form').onsubmit=saveFD;
document.getElementById('insurance-form').onsubmit=saveInsurance;
// ----------- Convenience functions -----------
function showDashboard(){ 
  document.getElementById('landing-page').style.display='none'; 
  document.getElementById('main-dashboard').style.display='block'; 
}
function handleLogout(){ 
  localStorage.clear(); 
  document.getElementById('landing-page').style.display='flex'; 
  document.getElementById('main-dashboard').style.display='none'; 
}
function populateMemberDropdowns() {
  const sel1=document.getElementById('fd-member'); 
  const sel2=document.getElementById('ins-member');
  sel1.innerHTML=''; sel2.innerHTML='';
  familyMembers.forEach(m=>{
    const o=document.createElement('option'); o.value=m.id; o.innerHTML=m.name; 
    sel1.appendChild(o); o2=document.createElement('option'); o2.value=m.id; o2.innerHTML=m.name; sel2.appendChild(o2);
  });
}
// Additional functions: e.g., auto calculation of interest, etc., can be added
