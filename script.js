// =======================================
// JOBPROFIT PRO - SELLABLE VERSION
// Local, no server, no subscription.
// =======================================

let clients = [];
let jobs = [];

const CLIENTS_KEY = "jobprofit_pro_clients_v2";
const JOBS_KEY = "jobprofit_pro_jobs_v2";

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupNavigation();
  setupForms();
  setupActions();
  renderAll();
});

function loadData() {
  clients = JSON.parse(localStorage.getItem(CLIENTS_KEY)) || [];
  jobs = JSON.parse(localStorage.getItem(JOBS_KEY)) || [];

  if (clients.length === 0) {
    clients.push({
      id: generateId(),
      name: "Sample Client",
      phone: "+1 555 000 0000",
      address: "Austin, TX"
    });
    saveData();
  }
}

function saveData() {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
}

function generateId() {
  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-btn");
  const quickButtons = document.querySelectorAll("[data-section-target]");
  const sections = document.querySelectorAll(".section");
  const pageTitle = document.getElementById("pageTitle");

  function goToSection(sectionId) {
    navButtons.forEach(btn => btn.classList.remove("active"));
    sections.forEach(section => section.classList.remove("active"));

    const targetSection = document.getElementById(sectionId);
    const targetButton = document.querySelector(`.nav-btn[data-section="${sectionId}"]`);

    if (targetSection) targetSection.classList.add("active");
    if (targetButton) targetButton.classList.add("active");
    if (pageTitle && targetButton) pageTitle.textContent = targetButton.textContent;
  }

  navButtons.forEach(button => {
    button.addEventListener("click", () => goToSection(button.dataset.section));
  });

  quickButtons.forEach(button => {
    button.addEventListener("click", () => goToSection(button.dataset.sectionTarget));
  });
}

function setupForms() {
  const clientForm = document.getElementById("clientForm");
  const jobForm = document.getElementById("jobForm");

  clientForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("clientName").value.trim();
    if (!name) return showToast("Client name is required.");

    clients.push({
      id: generateId(),
      name,
      phone: document.getElementById("clientPhone").value.trim(),
      address: document.getElementById("clientAddress").value.trim()
    });

    saveData();
    clientForm.reset();
    renderAll();
    showToast("Client saved.");
  });

  jobForm.addEventListener("submit", event => {
    event.preventDefault();

    if (clients.length === 0) {
      showToast("Add a client first.");
      return;
    }

    const editingJobId = document.getElementById("editingJobId").value;
    const revenue = getNumber("jobRevenue");
    const material = getNumber("jobMaterial");
    const fuel = getNumber("jobFuel");
    const other = getNumber("jobOther");
    const hours = getNumber("jobHours");
    const hourlyRate = getNumber("jobHourlyRate");

    const laborCost = hours * hourlyRate;
    const totalCost = material + fuel + other + laborCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const jobData = {
      clientId: document.getElementById("jobClient").value,
      title: document.getElementById("jobTitle").value.trim(),
      revenue,
      material,
      fuel,
      other,
      hours,
      hourlyRate,
      laborCost,
      totalCost,
      profit,
      margin,
      status: document.getElementById("jobStatus").value,
      dueDate: document.getElementById("jobDueDate").value,
      notes: document.getElementById("jobNotes").value.trim()
    };

    if (!jobData.title) return showToast("Job title is required.");
    if (revenue <= 0) return showToast("Revenue must be greater than zero.");

    if (editingJobId) {
      jobs = jobs.map(job =>
        job.id === editingJobId
          ? { ...job, ...jobData, updatedAt: new Date().toISOString() }
          : job
      );
      showToast("Job updated.");
    } else {
      jobs.push({
        id: generateId(),
        ...jobData,
        createdAt: new Date().toISOString()
      });
      showToast("Job saved.");
    }

    saveData();
    resetJobForm();
    renderAll();
  });
}

function setupActions() {
  const searchInput = document.getElementById("jobSearch");
  const cancelEditJob = document.getElementById("cancelEditJob");
  const periodFilter = document.getElementById("periodFilter");
  const statusFilter = document.getElementById("statusFilter");

  if (searchInput) searchInput.addEventListener("input", renderJobsList);
  if (cancelEditJob) cancelEditJob.addEventListener("click", resetJobForm);
  if (periodFilter) periodFilter.addEventListener("change", renderAll);
  if (statusFilter) statusFilter.addEventListener("change", renderAll);

  document.getElementById("exportCSVBtn")?.addEventListener("click", exportCSV);
  document.getElementById("exportBackupBtn")?.addEventListener("click", exportBackup);
  document.getElementById("importBackupInput")?.addEventListener("change", importBackup);
  document.getElementById("clearDataBtn")?.addEventListener("click", clearAllData);
  document.getElementById("loadDemoBtn")?.addEventListener("click", loadDemoData);
  document.getElementById("printReportBtn")?.addEventListener("click", () => window.print());
}

function renderAll() {
  renderClientSelect();
  renderClientsList();
  renderJobsList();
  renderDashboard();
  renderRecentJobs();
  renderUnpaidJobs();
  renderReports();
}

function getFilteredJobs() {
  const period = document.getElementById("periodFilter")?.value || "all";
  const status = document.getElementById("statusFilter")?.value || "all";

  return jobs.filter(job => {
    const dateOk = matchesPeriod(job, period);
    const statusOk = status === "all" || job.status === status;
    return dateOk && statusOk;
  });
}

function matchesPeriod(job, period) {
  if (period === "all") return true;

  const jobDate = new Date(job.createdAt || Date.now());
  const now = new Date();

  if (period === "thisMonth") {
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
  }

  if (period === "lastMonth") {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return jobDate.getMonth() === last.getMonth() && jobDate.getFullYear() === last.getFullYear();
  }

  if (period === "last90") {
    const limit = new Date();
    limit.setDate(limit.getDate() - 90);
    return jobDate >= limit;
  }

  if (period === "year") {
    return jobDate.getFullYear() === now.getFullYear();
  }

  return true;
}

function renderDashboard() {
  const filtered = getFilteredJobs();
  const totalRevenue = sum(filtered, "revenue");
  const hardCosts = filtered.reduce((sum, job) => sum + job.material + job.fuel + job.other, 0);
  const laborCosts = sum(filtered, "laborCost");
  const totalProfit = sum(filtered, "profit");
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  setText("totalRevenue", formatMoney(totalRevenue));
  setText("totalCosts", formatMoney(hardCosts));
  setText("laborCosts", formatMoney(laborCosts));
  setText("avgMargin", `${avgMargin.toFixed(1)}%`);
  setText("heroProfit", formatMoney(totalProfit));
  setText("sidebarProfit", formatMoney(sum(jobs, "profit")));
  setText("sidebarMargin", `${getAverageMargin(jobs).toFixed(1)}% margin`);
  setText("marginQuality", getMarginQuality(avgMargin));

  renderPremiumMetrics(filtered);
  renderMonthlyBars(filtered);
  renderProfitScore(filtered);
}


function renderPremiumMetrics(filtered) {
  const now = new Date();
  const currentMonthJobs = jobs.filter(job => {
    const d = new Date(job.createdAt || Date.now());
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const thisMonthRevenue = sum(currentMonthJobs, "revenue");
  const thisMonthProfit = sum(currentMonthJobs, "profit");
  const overdueRevenue = jobs
    .filter(job => isOverdue(job))
    .reduce((total, job) => total + job.revenue, 0);

  const openJobs = jobs.filter(job => job.status !== "Paid");
  const openRevenue = openJobs.reduce((total, job) => total + job.revenue, 0);

  setText("thisMonthRevenue", formatMoney(thisMonthRevenue));
  setText("thisMonthProfit", formatMoney(thisMonthProfit));
  setText("overdueRevenue", formatMoney(overdueRevenue));
  setText("openRevenue", formatMoney(openRevenue));
  setText("openRevenueJobs", `${openJobs.length} unpaid job${openJobs.length === 1 ? "" : "s"}`);

  const losingJobs = jobs.filter(job => job.profit < 0).length;
  const avgMargin = getAverageMargin(jobs);
  const openJobsCount = openJobs.length;

  let title = "Add your first job to unlock insights.";
  let text = "JobProfit Pro will show you where profit is leaking, which jobs are worth repeating and which jobs need better pricing.";

  if (jobs.length > 0) {
    if (losingJobs > 0) {
      title = `${losingJobs} job${losingJobs > 1 ? "s are" : " is"} losing money.`;
      text = "Open the Reports tab and review your lowest profit jobs. You may be undercharging, missing costs or not pricing labor correctly.";
    } else if (overdueRevenue > 0) {
      title = `${formatMoney(overdueRevenue)} in overdue revenue needs attention.`;
      text = "Follow up on overdue jobs to protect cash flow and avoid letting completed work turn into unpaid work.";
    } else if (avgMargin >= 35) {
      title = "Your profit margin looks strong.";
      text = "Use your most profitable jobs as a pricing reference and repeat the type of work that produces the highest margins.";
    } else if (openJobs > 0) {
      title = `${openJobs} open job${openJobs > 1 ? "s" : ""} still need to be closed or paid.`;
      text = "Keep your open jobs moving. Completed but unpaid work can hide cash flow problems.";
    } else {
      title = "Your jobs are tracked and under control.";
      text = "Keep adding each job with real costs so you always know what your business is truly earning.";
    }
  }

  setText("profitInsightTitle", title);
  setText("profitInsightText", text);
}

function renderMonthlyBars(filtered) {
  const container = document.getElementById("monthlyBars");
  if (!container) return;
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `<div class="item-sub">No monthly data yet.</div>`;
    return;
  }

  const months = {};

  filtered.forEach(job => {
    const d = new Date(job.createdAt || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) months[key] = { revenue: 0, profit: 0 };
    months[key].revenue += job.revenue;
    months[key].profit += job.profit;
  });

  const entries = Object.entries(months).sort().slice(-6);
  const maxRevenue = Math.max(...entries.map(([, data]) => data.revenue), 1);

  entries.forEach(([month, data]) => {
    const width = Math.max(3, (data.revenue / maxRevenue) * 100);
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${formatMonth(month)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      <strong class="${data.profit >= 0 ? "profit" : "loss"}">${formatMoney(data.profit)}</strong>
    `;
    container.appendChild(row);
  });
}

function renderProfitScore(filtered) {
  const scoreElement = document.getElementById("profitScore");
  const ring = document.querySelector(".score-ring");
  const pill = document.getElementById("profitScorePill");
  const title = document.getElementById("profitScoreTitle");
  const text = document.getElementById("profitScoreText");

  if (!scoreElement || !ring) return;

  if (filtered.length === 0) {
    scoreElement.textContent = "0";
    pill.textContent = "0/100";
    title.textContent = "Add your first job";
    text.textContent = "Your score improves with higher margins, fewer unpaid jobs and fewer money-losing jobs.";
    ring.style.background = `radial-gradient(circle, #0f172a 54%, transparent 55%), conic-gradient(var(--green) 0deg, rgba(255,255,255,0.08) 0deg)`;
    return;
  }

  const margin = getAverageMargin(filtered);
  const unpaid = filtered.filter(j => j.status !== "Paid").length;
  const losing = filtered.filter(j => j.profit < 0).length;

  let score = 50;
  score += Math.min(35, Math.max(0, margin));
  score -= unpaid * 3;
  score -= losing * 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  scoreElement.textContent = score;
  pill.textContent = `${score}/100`;
  ring.style.background = `radial-gradient(circle, #0f172a 54%, transparent 55%), conic-gradient(var(--green) ${score * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;

  if (score >= 80) {
    title.textContent = "Strong profit control";
    text.textContent = "Your margins look healthy. Keep watching unpaid jobs and low-margin work.";
  } else if (score >= 55) {
    title.textContent = "Good, but can improve";
    text.textContent = "Review your lowest profit jobs and make sure labor is priced correctly.";
  } else {
    title.textContent = "Profit leakage detected";
    text.textContent = "You may be undercharging, missing costs, or carrying too many unpaid jobs.";
  }
}

function renderRecentJobs() {
  const container = document.getElementById("recentJobs");
  if (!container) return;
  container.innerHTML = "";

  const recentJobs = [...jobs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  if (recentJobs.length === 0) {
    container.innerHTML = `<div class="item-sub">No jobs yet.</div>`;
    return;
  }

  recentJobs.forEach(job => container.appendChild(createJobMiniItem(job)));
}

function renderUnpaidJobs() {
  const container = document.getElementById("unpaidJobs");
  const unpaidCounter = document.getElementById("unpaidCount");
  if (!container) return;

  container.innerHTML = "";
  const unpaidJobs = jobs.filter(job => job.status !== "Paid");

  if (unpaidCounter) unpaidCounter.textContent = `${unpaidJobs.length} open`;

  if (unpaidJobs.length === 0) {
    container.innerHTML = `<div class="item-sub">No open jobs. Nice work.</div>`;
    return;
  }

  unpaidJobs
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)
    .forEach(job => {
      const item = createJobMiniItem(job);
      if (isOverdue(job)) {
        item.querySelector(".status")?.remove();
        item.querySelector(".item-row > div:last-child").insertAdjacentHTML("beforeend", `<div class="pill warning">OVERDUE</div>`);
      }
      container.appendChild(item);
    });
}

function createJobMiniItem(job) {
  const item = document.createElement("div");
  item.className = "item";

  item.innerHTML = `
    <div class="item-row">
      <div>
        <div class="item-title">${escapeHTML(job.title)}</div>
        <div class="item-sub">${escapeHTML(getClientName(job.clientId))}</div>
        <div class="item-sub">Revenue: ${formatMoney(job.revenue)} | Margin: ${job.margin.toFixed(1)}%</div>
      </div>
      <div>
        <div class="${job.profit >= 0 ? "profit" : "loss"}">${formatMoney(job.profit)}</div>
        <span class="status ${getStatusClass(job.status)}">${job.status}</span>
      </div>
    </div>
  `;

  return item;
}

function renderClientSelect() {
  const select = document.getElementById("jobClient");
  if (!select) return;
  select.innerHTML = "";

  if (clients.length === 0) {
    select.innerHTML = `<option value="">Add a client first</option>`;
    return;
  }

  clients.forEach(client => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    select.appendChild(option);
  });
}

function renderClientsList() {
  const list = document.getElementById("clientsList");
  if (!list) return;
  list.innerHTML = "";

  if (clients.length === 0) {
    list.innerHTML = `<p class="item-sub">No clients added yet.</p>`;
    return;
  }

  clients.forEach(client => {
    const clientJobs = jobs.filter(job => job.clientId === client.id);
    const revenue = sum(clientJobs, "revenue");
    const profit = sum(clientJobs, "profit");

    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHTML(client.name)}</div>
          <div class="item-sub">${escapeHTML(client.phone || "No phone")}</div>
          <div class="item-sub">${escapeHTML(client.address || "No address")}</div>
          <div class="item-sub">Jobs: ${clientJobs.length} | Revenue: ${formatMoney(revenue)}</div>
        </div>
        <div class="${profit >= 0 ? "profit" : "loss"}">${formatMoney(profit)}</div>
      </div>
      <div class="actions">
        <button class="small-action delete" onclick="deleteClient('${client.id}')">Delete Client</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function renderJobsList() {
  const list = document.getElementById("jobsList");
  if (!list) return;

  const search = document.getElementById("jobSearch")?.value.toLowerCase() || "";
  list.innerHTML = "";

  const filteredJobs = jobs.filter(job => {
    const clientName = getClientName(job.clientId).toLowerCase();
    return (
      clientName.includes(search) ||
      job.title.toLowerCase().includes(search) ||
      job.status.toLowerCase().includes(search)
    );
  });

  if (filteredJobs.length === 0) {
    list.innerHTML = `<p class="item-sub">No jobs found.</p>`;
    return;
  }

  filteredJobs
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach(job => {
      const item = document.createElement("div");
      item.className = "item";

      item.innerHTML = `
        <div class="item-row">
          <div>
            <div class="item-title">${escapeHTML(job.title)}</div>
            <div class="item-sub">${escapeHTML(getClientName(job.clientId))}</div>
            <div class="item-sub">Revenue: ${formatMoney(job.revenue)} | Costs: ${formatMoney(job.totalCost)} | Margin: ${job.margin.toFixed(1)}%</div>
            <div class="item-sub">Labor: ${job.hours}h × ${formatMoney(job.hourlyRate)} = ${formatMoney(job.laborCost)}</div>
            ${job.dueDate ? `<div class="item-sub">Due: ${formatDate(job.dueDate)} ${isOverdue(job) ? "• OVERDUE" : ""}</div>` : ""}
            ${job.notes ? `<div class="item-sub">${escapeHTML(job.notes)}</div>` : ""}
          </div>
          <div>
            <div class="${job.profit >= 0 ? "profit" : "loss"}">${formatMoney(job.profit)}</div>
            <span class="status ${getStatusClass(job.status)}">${job.status}</span>
          </div>
        </div>

        <div class="actions">
          <button class="small-action" onclick="editJob('${job.id}')">Edit</button>
          <button class="small-action" onclick="markPaid('${job.id}')">Mark Paid</button>
          <button class="small-action delete" onclick="deleteJob('${job.id}')">Delete</button>
        </div>
      `;

      list.appendChild(item);
    });
}

function renderReports() {
  renderInsightCards();
  renderTopJobs();
  renderLowJobs();
  renderProfitByClient();
}

function renderInsightCards() {
  const bestClient = getBestClient();
  const bestJob = getBestJob();
  const worstJob = getWorstJob();
  const losingJobs = jobs.filter(job => job.profit < 0).length;

  setText("bestClient", bestClient ? bestClient.name : "-");
  setText("bestJob", bestJob ? bestJob.title : "-");
  setText("worstJob", worstJob ? worstJob.title : "-");
  setText("losingJobs", losingJobs);
}

function renderTopJobs() {
  const container = document.getElementById("topJobs");
  if (!container) return;
  container.innerHTML = "";

  const topJobs = [...jobs].sort((a, b) => b.profit - a.profit).slice(0, 8);

  if (topJobs.length === 0) {
    container.innerHTML = `<div class="item-sub">No jobs yet.</div>`;
    return;
  }

  topJobs.forEach((job, index) => container.appendChild(createRankedJob(job, index)));
}

function renderLowJobs() {
  const container = document.getElementById("lowJobs");
  if (!container) return;
  container.innerHTML = "";

  const lowJobs = [...jobs].sort((a, b) => a.profit - b.profit).slice(0, 8);

  if (lowJobs.length === 0) {
    container.innerHTML = `<div class="item-sub">No jobs yet.</div>`;
    return;
  }

  lowJobs.forEach((job, index) => container.appendChild(createRankedJob(job, index)));
}

function createRankedJob(job, index) {
  const item = document.createElement("div");
  item.className = "item";
  item.innerHTML = `
    <div class="item-row">
      <div>
        <div class="item-title">#${index + 1} ${escapeHTML(job.title)}</div>
        <div class="item-sub">${escapeHTML(getClientName(job.clientId))}</div>
        <div class="item-sub">Revenue: ${formatMoney(job.revenue)} | Costs: ${formatMoney(job.totalCost)} | Margin: ${job.margin.toFixed(1)}%</div>
      </div>
      <div class="${job.profit >= 0 ? "profit" : "loss"}">${formatMoney(job.profit)}</div>
    </div>
  `;
  return item;
}

function renderProfitByClient() {
  const container = document.getElementById("profitByClient");
  if (!container) return;
  container.innerHTML = "";

  const rows = clients.map(client => {
    const clientJobs = jobs.filter(job => job.clientId === client.id);
    return {
      name: client.name,
      jobs: clientJobs.length,
      revenue: sum(clientJobs, "revenue"),
      profit: sum(clientJobs, "profit")
    };
  }).filter(row => row.jobs > 0).sort((a, b) => b.profit - a.profit);

  if (rows.length === 0) {
    container.innerHTML = `<div class="item-sub">No client profit data yet.</div>`;
    return;
  }

  rows.forEach(row => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item-row">
        <div>
          <div class="item-title">${escapeHTML(row.name)}</div>
          <div class="item-sub">Jobs: ${row.jobs} | Revenue: ${formatMoney(row.revenue)}</div>
        </div>
        <div class="${row.profit >= 0 ? "profit" : "loss"}">${formatMoney(row.profit)}</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function editJob(jobId) {
  const job = jobs.find(job => job.id === jobId);
  if (!job) return;

  setValue("editingJobId", job.id);
  setValue("jobClient", job.clientId);
  setValue("jobTitle", job.title);
  setValue("jobRevenue", job.revenue);
  setValue("jobMaterial", job.material);
  setValue("jobFuel", job.fuel);
  setValue("jobOther", job.other);
  setValue("jobHours", job.hours);
  setValue("jobHourlyRate", job.hourlyRate);
  setValue("jobStatus", job.status);
  setValue("jobDueDate", job.dueDate || "");
  setValue("jobNotes", job.notes || "");

  setText("jobFormTitle", "Edit Job");
  document.getElementById("cancelEditJob").classList.remove("hidden");
  document.getElementById("jobForm").scrollIntoView({ behavior: "smooth" });
}

function deleteJob(jobId) {
  if (!confirm("Delete this job?")) return;
  jobs = jobs.filter(job => job.id !== jobId);
  saveData();
  renderAll();
  showToast("Job deleted.");
}

function markPaid(jobId) {
  jobs = jobs.map(job => job.id === jobId ? { ...job, status: "Paid", updatedAt: new Date().toISOString() } : job);
  saveData();
  renderAll();
  showToast("Job marked as paid.");
}

function deleteClient(clientId) {
  const relatedJobs = jobs.filter(job => job.clientId === clientId).length;
  const message = relatedJobs > 0
    ? `This client has ${relatedJobs} job(s). Deleting the client will also delete those jobs. Continue?`
    : "Delete this client?";

  if (!confirm(message)) return;

  clients = clients.filter(client => client.id !== clientId);
  jobs = jobs.filter(job => job.clientId !== clientId);
  saveData();
  renderAll();
  showToast("Client deleted.");
}

function resetJobForm() {
  const jobForm = document.getElementById("jobForm");
  jobForm.reset();

  setValue("editingJobId", "");
  setValue("jobMaterial", 0);
  setValue("jobFuel", 0);
  setValue("jobOther", 0);
  setValue("jobHours", 0);
  setValue("jobHourlyRate", 0);

  setText("jobFormTitle", "Add New Job");
  document.getElementById("cancelEditJob").classList.add("hidden");
}

function exportCSV() {
  if (jobs.length === 0) return showToast("No jobs to export.");

  const headers = [
    "Client", "Job Title", "Revenue", "Material Cost", "Fuel Cost", "Other Costs",
    "Hours Worked", "Hourly Labor Cost", "Labor Cost", "Total Cost", "Profit",
    "Margin", "Status", "Due Date", "Notes", "Created At"
  ];

  const rows = jobs.map(job => [
    getClientName(job.clientId), job.title, job.revenue, job.material, job.fuel,
    job.other, job.hours, job.hourlyRate, job.laborCost, job.totalCost, job.profit,
    `${job.margin.toFixed(1)}%`, job.status, job.dueDate || "", job.notes || "", job.createdAt || ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
  ].join("\n");

  downloadFile(csvContent, "jobprofit-pro-jobs.csv", "text/csv");
}

function exportBackup() {
  const backup = {
    app: "JobProfit Pro",
    version: "2.0",
    exportedAt: new Date().toISOString(),
    clients,
    jobs
  };

  downloadFile(JSON.stringify(backup, null, 2), "jobprofit-pro-backup.json", "application/json");
}

function importBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);

      if (!Array.isArray(backup.clients) || !Array.isArray(backup.jobs)) {
        showToast("Invalid backup file.");
        return;
      }

      if (!confirm("Importing this backup will replace your current data. Continue?")) return;

      clients = backup.clients;
      jobs = backup.jobs;
      saveData();
      renderAll();
      showToast("Backup imported successfully.");
    } catch (error) {
      showToast("Could not import backup file.");
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

function clearAllData() {
  if (!confirm("Are you sure you want to delete all clients and jobs?")) return;
  if (!confirm("This cannot be undone. Do you really want to continue?")) return;

  clients = [];
  jobs = [];
  localStorage.removeItem(CLIENTS_KEY);
  localStorage.removeItem(JOBS_KEY);
  saveData();
  renderAll();
  showToast("All data cleared.");
}

function loadDemoData() {
  if (jobs.length > 0 && !confirm("Load demo data? This will replace your current data.")) return;

  const c1 = { id: generateId(), name: "Miller Home Services", phone: "+1 512 555 0148", address: "Austin, TX" };
  const c2 = { id: generateId(), name: "Sarah Johnson", phone: "+1 512 555 8821", address: "Round Rock, TX" };
  const c3 = { id: generateId(), name: "Lakeside Property Group", phone: "+1 512 555 7710", address: "Cedar Park, TX" };

  clients = [c1, c2, c3];

  const samples = [
    ["Bathroom plumbing repair", c2.id, 850, 180, 35, 20, 5, 45, "Paid", -24],
    ["Rental property repaint", c3.id, 2400, 620, 80, 55, 18, 40, "Completed", -14],
    ["Emergency leak repair", c1.id, 690, 120, 25, 0, 4, 50, "Paid", -7],
    ["Kitchen fixture install", c2.id, 1150, 380, 42, 35, 9, 45, "In Progress", -4],
    ["Garage drywall patch", c1.id, 420, 150, 20, 15, 5, 45, "Completed", 2],
    ["Small fence repair", c3.id, 360, 210, 30, 15, 4, 45, "Estimate", 5]
  ];

  jobs = samples.map(row => {
    const [title, clientId, revenue, material, fuel, other, hours, hourlyRate, status, dayOffset] = row;
    const laborCost = hours * hourlyRate;
    const totalCost = material + fuel + other + laborCost;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const created = new Date();
    created.setDate(created.getDate() + dayOffset);
    const due = new Date();
    due.setDate(due.getDate() + dayOffset + 14);

    return {
      id: generateId(),
      clientId, title, revenue, material, fuel, other, hours, hourlyRate,
      laborCost, totalCost, profit, margin, status,
      dueDate: due.toISOString().slice(0, 10),
      notes: "Demo job. Replace with your real service details.",
      createdAt: created.toISOString()
    };
  });

  saveData();
  renderAll();
  showToast("Demo data loaded. Explore the dashboard, reports and unpaid jobs.");
}

function getBestClient() {
  if (clients.length === 0 || jobs.length === 0) return null;

  let best = null;
  clients.forEach(client => {
    const clientJobs = jobs.filter(job => job.clientId === client.id);
    const profit = sum(clientJobs, "profit");

    if (!best || profit > best.profit) {
      best = { name: client.name, profit };
    }
  });

  return best;
}

function getBestJob() {
  if (jobs.length === 0) return null;
  return [...jobs].sort((a, b) => b.profit - a.profit)[0];
}

function getWorstJob() {
  if (jobs.length === 0) return null;
  return [...jobs].sort((a, b) => a.profit - b.profit)[0];
}

function getClientName(clientId) {
  const client = clients.find(client => client.id === clientId);
  return client ? client.name : "Unknown Client";
}

function getNumber(id) {
  return Number(document.getElementById(id).value) || 0;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function sum(arr, key) {
  return arr.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

function getAverageMargin(arr) {
  const revenue = sum(arr, "revenue");
  const profit = sum(arr, "profit");
  return revenue > 0 ? (profit / revenue) * 100 : 0;
}

function getMarginQuality(margin) {
  if (margin >= 45) return "Excellent margin";
  if (margin >= 30) return "Healthy margin";
  if (margin >= 15) return "Needs attention";
  if (margin > 0) return "Low margin";
  return "No profit yet";
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value || 0);
}

function formatDate(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US");
}

function formatMonth(key) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit"
  });
}

function getStatusClass(status) {
  if (status === "Estimate") return "status-estimate";
  if (status === "In Progress") return "status-progress";
  if (status === "Completed") return "status-completed";
  if (status === "Paid") return "status-paid";
  return "";
}

function isOverdue(job) {
  if (!job.dueDate || job.status === "Paid") return false;

  const today = new Date();
  const dueDate = new Date(job.dueDate);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 2600);
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}