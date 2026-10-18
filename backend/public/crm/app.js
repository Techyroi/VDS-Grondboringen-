const $ = (id) => document.getElementById(id);
const statusOptions = ["New Lead", "Contacted", "Qualified", "Appointment Booked", "Proposal Sent", "Won", "Lost"];
let allLeads = [];

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function showDashboard() {
  $("loginPanel").hidden = true;
  $("dashboard").hidden = false;
  loadLeads();
}

async function checkSession() {
  try {
    await api("/api/auth/me");
    showDashboard();
  } catch {
    $("loginPanel").hidden = false;
    $("dashboard").hidden = true;
  }
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("loginError").textContent = "";
  try {
    await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: $("username").value, password: $("password").value })
    });
    $("password").value = "";
    showDashboard();
  } catch (error) {
    $("loginError").textContent = error.message;
  }
});

$("logoutBtn").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST", body: "{}" }); } catch {}
  $("dashboard").hidden = true;
  $("loginPanel").hidden = false;
});

$("refreshBtn").addEventListener("click", loadLeads);
$("searchInput").addEventListener("input", renderLeads);
$("statusFilter").addEventListener("change", renderLeads);

async function loadLeads() {
  $("message").textContent = "Loading leads…";
  try {
    const result = await api("/api/leads");
    allLeads = result.data || [];
    $("message").textContent = `${allLeads.length} lead(s) loaded.`;
    renderLeads();
  } catch (error) {
    $("message").textContent = error.message;
    if (error.message.toLowerCase().includes("log in")) checkSession();
  }
}

function renderLeads() {
  const q = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const leads = allLeads.filter((lead) => {
    const matchesQ = !q || [lead.name, lead.email, lead.phone].some((v) => String(v || "").toLowerCase().includes(q));
    return matchesQ && (!status || lead.status === status);
  });

  $("totalCount").textContent = allLeads.length;
  $("newCount").textContent = allLeads.filter((lead) => lead.status === "New Lead").length;
  $("appointmentCount").textContent = allLeads.filter((lead) => lead.status === "Appointment Booked").length;

  const body = $("leadsBody");
  body.replaceChildren();
  if (!leads.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 6;
    td.className = "empty";
    td.textContent = "No leads found.";
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  for (const lead of leads) {
    const tr = document.createElement("tr");
    const name = document.createElement("td");
    name.textContent = lead.name;
    const type = document.createElement("small");
    type.textContent = lead.customerType || "Other";
    name.appendChild(type);

    const contact = document.createElement("td");
    contact.textContent = `${lead.email}\n${lead.phone}`;
    contact.style.whiteSpace = "pre-line";

    const enquiry = document.createElement("td");
    enquiry.textContent = lead.message || "No message provided";
    const preferred = document.createElement("small");
    preferred.textContent = lead.preferredDay ? `Preferred day: ${lead.preferredDay}` : "";
    enquiry.appendChild(preferred);

    const created = document.createElement("td");
    created.textContent = new Date(lead.createdAt).toLocaleString();

    const statusCell = document.createElement("td");
    const select = document.createElement("select");
    for (const value of statusOptions) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      option.selected = value === lead.status;
      select.appendChild(option);
    }
    statusCell.appendChild(select);

    const saveCell = document.createElement("td");
    const save = document.createElement("button");
    save.className = "save-row";
    save.textContent = "Save";
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        await api(`/api/leads/${encodeURIComponent(lead._id)}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value })
        });
        $("message").textContent = `Updated ${lead.name}.`;
        await loadLeads();
      } catch (error) {
        $("message").textContent = error.message;
      } finally {
        save.disabled = false;
      }
    });
    saveCell.appendChild(save);

    tr.append(name, contact, enquiry, created, statusCell, saveCell);
    body.appendChild(tr);
  }
}

checkSession();
