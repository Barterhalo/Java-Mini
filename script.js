/* =============================================================================
   CampusShield — script.js  (MySQL-backed version)
   ============================================================================= */

(function () {
  "use strict";

  /* ===========================================================================
     1. AUTH + USER INJECTION
     =========================================================================== */
  const PAGE_USER_KEY = "campusShield_user";

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem(PAGE_USER_KEY)); }
    catch (e) { return null; }
  }

  const currentUser = getCurrentUser() || { name: "Guest", role: "STUDENT", department: "" };
  const CURRENT_STUDENT = currentUser.name;

  function getInitials(name) {
    if (!name) return "??";
    return name.split(" ").map(function(n){ return n[0]; }).join("").slice(0, 2).toUpperCase();
  }

  function injectUser() {
    const initials = getInitials(currentUser.name);
    const roleLabel = currentUser.role === "ADMIN" ? "Administrator" : "Student";
    const sidebarRole = currentUser.role === "ADMIN"
      ? "Super Admin"
      : "Student · " + (currentUser.department || "");

    document.querySelectorAll(".sidebar-footer .user-avatar").forEach(function(el){ el.textContent = initials; });
    document.querySelectorAll(".sidebar-footer .user-name").forEach(function(el){ el.textContent = currentUser.name; });
    document.querySelectorAll(".sidebar-footer .user-role").forEach(function(el){ el.textContent = sidebarRole; });

    document.querySelectorAll(".navbar-profile .avatar-fallback").forEach(function(el){ el.textContent = initials; });
    document.querySelectorAll(".navbar-profile .user-meta span:first-child").forEach(function(el){ el.textContent = currentUser.name; });
    document.querySelectorAll(".navbar-profile .user-meta span:last-child").forEach(function(el){ el.textContent = roleLabel; });

    const pn = document.getElementById("profileName"); if (pn) pn.value = currentUser.name || "";
    const pe = document.getElementById("profileEmail"); if (pe) pe.value = currentUser.email || "";
    const pp = document.getElementById("profilePhone"); if (pp) pp.value = currentUser.phone || "";
    const pd = document.getElementById("profileDepartment");
    if (pd && currentUser.department) pd.value = currentUser.department;

    const dn = document.getElementById("profileDisplayName"); if (dn) dn.textContent = currentUser.name || "";
    const pi = document.getElementById("profilePhotoInitials"); if (pi) pi.textContent = initials;
    const su = document.getElementById("sidebarUserName"); if (su) su.textContent = currentUser.name || "";
    const sr = document.getElementById("sidebarUserRole"); if (sr) sr.textContent = sidebarRole;
    const sa = document.getElementById("sidebarUserAvatar"); if (sa) sa.textContent = initials;
    const na = document.getElementById("navbarUserAvatar"); if (na) na.textContent = initials;
    const nn = document.getElementById("navbarUserName"); if (nn) nn.textContent = currentUser.name || "";

    if (currentUser.role !== "ADMIN") {
      document.querySelectorAll('a[href="admin-dashboard.html"], a[href="manage-incidents.html"]').forEach(function(el){
        if (!el.classList.contains("btn")) el.style.display = "none";
      });
    }
  }

  injectUser();

  /* ===========================================================================
     2. API LAYER
     =========================================================================== */
  const API = "http://localhost:8080/api";

  async function apiGet(path) {
    const res = await fetch(API + path);
    if (!res.ok) throw new Error("GET " + path + " failed");
    return res.json();
  }
  async function apiPost(path, body) {
    const res = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("POST " + path + " failed");
    return res.json();
  }
  async function apiDelete(path) {
    const res = await fetch(API + path, { method: "DELETE" });
    if (!res.ok) throw new Error("DELETE " + path + " failed");
    return true;
  }

  /* ===========================================================================
     3. LIVE DATA
     =========================================================================== */
  let incidents = [];
  let myIncidents = [];

  function refreshMyIncidents() {
    myIncidents = incidents.filter(function (i) { return i.student === CURRENT_STUDENT; });
  }

  async function loadIncidents() {
    try {
      incidents = await apiGet("/incidents");
      refreshMyIncidents();
      return true;
    } catch (e) {
      console.error("Failed to load incidents:", e);
      return false;
    }
  }

  /* ===========================================================================
     4. TOASTS
     =========================================================================== */
  const toastStack = document.getElementById("toastStack");

  function showToast(message, type) {
    if (!toastStack) return;
    type = type || "primary";
    const toast = document.createElement("div");
    toast.className = "toast " + type;
    toast.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>' + message + "</span>";
    toastStack.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(24px)";
      setTimeout(function () { toast.remove(); }, 250);
    }, 3200);
  }

  /* ===========================================================================
     5. SIDEBAR
     =========================================================================== */
  const sidebar = document.getElementById("sidebar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileOverlay = document.getElementById("mobileOverlay");

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.add("mobile-open");
    if (mobileOverlay) mobileOverlay.classList.add("active");
  }
  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (mobileOverlay) mobileOverlay.classList.remove("active");
  }
  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openMobileSidebar);
  if (mobileOverlay) mobileOverlay.addEventListener("click", closeMobileSidebar);
  if (sidebar) {
    sidebar.querySelectorAll(".nav-item").forEach(function (link) {
      link.addEventListener("click", closeMobileSidebar);
    });
  }

  /* ===========================================================================
     6. PASSWORD TOGGLE
     =========================================================================== */
  document.querySelectorAll(".password-toggle-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const input = document.getElementById(btn.getAttribute("data-target"));
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) icon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
    });
  });

  /* ===========================================================================
     7. VALIDATION HELPERS
     =========================================================================== */
  function setFieldError(inputEl, hasError) {
    const wrapper = inputEl.closest(".form-group") || inputEl.closest(".field");
    if (wrapper) wrapper.classList.toggle("error", hasError);
  }
  function isNotEmpty(v) { return v.trim().length > 0; }
  function minLength(v, n) { return v.trim().length >= n; }
  function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

  /* ===========================================================================
     8. REPORT INCIDENT FORM → POST to backend
     =========================================================================== */
  const incidentForm = document.getElementById("incidentForm");
  if (incidentForm) {
    const titleInput = document.getElementById("incidentTitle");
    const categoryInput = document.getElementById("incidentCategory");
    const priorityInput = document.getElementById("incidentPriority");
    const descriptionInput = document.getElementById("incidentDescription");
    const locationInput = document.getElementById("incidentLocation");
    const dateInput = document.getElementById("incidentDate");
    const timeInput = document.getElementById("incidentTime");

    const validators = [
      { input: titleInput, check: function (v) { return minLength(v, 5); } },
      { input: categoryInput, check: isNotEmpty },
      { input: priorityInput, check: isNotEmpty },
      { input: descriptionInput, check: function (v) { return minLength(v, 15); } },
      { input: locationInput, check: isNotEmpty },
      { input: dateInput, check: isNotEmpty },
      { input: timeInput, check: isNotEmpty }
    ];

    // FIX: re-validate on input ALWAYS (not just when error is already shown).
    // This makes the red error clear as soon as the user types valid data.
    validators.forEach(function (rule) {
      if (!rule.input) return;
      rule.input.addEventListener("input", function () {
        setFieldError(rule.input, !rule.check(rule.input.value));
      });
      rule.input.addEventListener("change", function () {
        setFieldError(rule.input, !rule.check(rule.input.value));
      });
    });

    incidentForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      let formIsValid = true;
      validators.forEach(function (rule) {
        if (!rule.input) return;
        const valid = rule.check(rule.input.value);
        setFieldError(rule.input, !valid);
        if (!valid) formIsValid = false;
      });

      if (!formIsValid) {
        showToast("Please fix the highlighted fields.", "danger");
        return;
      }

      const imageEl = document.getElementById("imagePreview");
      const payload = {
        title: titleInput.value.trim(),
        student: CURRENT_STUDENT,
        category: categoryInput.value,
        location: locationInput.value.trim(),
        department: "Campus Security",
        description: descriptionInput.value.trim(),
        priority: priorityInput.value,
        status: "Reported",
        assignedTo: "",
        date: dateInput.value,
        time: timeInput.value,
        image: (imageEl && imageEl.src && imageEl.style.display === "block") ? imageEl.src : ""
      };

      try {
        const saved = await apiPost("/incidents", payload);
        const newId = saved.incidentCode || ("INC-" + saved.id);

        // Clear all error states after successful submit
        validators.forEach(function (rule) {
          if (rule.input) setFieldError(rule.input, false);
        });

        const successModal = document.getElementById("successModal");
        const successIncidentId = document.getElementById("successIncidentId");
        if (successIncidentId) successIncidentId.textContent = newId;
        if (successModal) successModal.classList.add("active");

        showToast("Incident report submitted successfully.", "success");
      } catch (err) {
        console.error(err);
        showToast("Cannot reach server. Is the backend running?", "danger");
      }
    });
  }

  /* ===========================================================================
     9. PROFILE FORM
     =========================================================================== */
  const personalInfoForm = document.getElementById("personalInfoForm");
  if (personalInfoForm) {
    const nameInput = document.getElementById("profileName");
    const emailInput = document.getElementById("profileEmail");
    const phoneInput = document.getElementById("profilePhone");
    const deptInput = document.getElementById("profileDepartment");

    const profileValidators = [
      { input: nameInput, check: function (v) { return minLength(v, 3); } },
      { input: emailInput, check: isValidEmail },
      { input: phoneInput, check: function (v) { return v.trim().replace(/\D/g, "").length >= 10; } },
      { input: deptInput, check: isNotEmpty }
    ];

    profileValidators.forEach(function (rule) {
      if (!rule.input) return;
      rule.input.addEventListener("input", function () {
        setFieldError(rule.input, !rule.check(rule.input.value));
      });
      rule.input.addEventListener("change", function () {
        setFieldError(rule.input, !rule.check(rule.input.value));
      });
    });

    // Clear initial error state on page load (profile fields are pre-filled)
    profileValidators.forEach(function (rule) {
      if (rule.input) setFieldError(rule.input, false);
    });

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    if (saveProfileBtn) {
      saveProfileBtn.addEventListener("click", function () {
        let ok = true;
        profileValidators.forEach(function (rule) {
          if (!rule.input) return;
          const valid = rule.check(rule.input.value);
          setFieldError(rule.input, !valid);
          if (!valid) ok = false;
        });
        if (!ok) { showToast("Please fix the highlighted fields.", "danger"); return; }
        showToast("Profile updated successfully.", "success");
      });
    }

    const cancelProfileBtn = document.getElementById("cancelProfileBtn");
    if (cancelProfileBtn) {
      cancelProfileBtn.addEventListener("click", function () {
        personalInfoForm.reset();
        const pf = document.getElementById("passwordForm");
        if (pf) pf.reset();
        document.querySelectorAll(".form-group.error").forEach(function (el) { el.classList.remove("error"); });
        showToast("Changes discarded.", "primary");
      });
    }
  }

  /* ===========================================================================
     10. IMAGE PREVIEW
     =========================================================================== */
  const incidentImageInput = document.getElementById("incidentImage");
  if (incidentImageInput) {
    const imagePreview = document.getElementById("imagePreview");
    const imagePlaceholder = document.getElementById("imagePlaceholder");
    const removeImageBtn = document.getElementById("removeImageBtn");

    incidentImageInput.addEventListener("change", function () {
      const file = incidentImageInput.files && incidentImageInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        if (imagePreview) { imagePreview.src = e.target.result; imagePreview.style.display = "block"; }
        if (imagePlaceholder) imagePlaceholder.style.display = "none";
        if (removeImageBtn) removeImageBtn.style.display = "flex";
      };
      reader.readAsDataURL(file);
    });

    if (removeImageBtn) {
      removeImageBtn.addEventListener("click", function () {
        incidentImageInput.value = "";
        if (imagePreview) { imagePreview.src = ""; imagePreview.style.display = "none"; }
        if (imagePlaceholder) imagePlaceholder.style.display = "flex";
        removeImageBtn.style.display = "none";
      });
    }
  }

  const profilePhotoInput = document.getElementById("profilePhotoInput");
  if (profilePhotoInput) {
    const profilePhotoImg = document.getElementById("profilePhotoImg");
    const profilePhotoInitials = document.getElementById("profilePhotoInitials");
    const removePhotoBtn = document.getElementById("removePhotoBtn");

    profilePhotoInput.addEventListener("change", function () {
      const file = profilePhotoInput.files && profilePhotoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        if (profilePhotoImg) { profilePhotoImg.src = e.target.result; profilePhotoImg.style.display = "block"; }
        if (profilePhotoInitials) profilePhotoInitials.style.display = "none";
        if (removePhotoBtn) removePhotoBtn.style.display = "inline-flex";
      };
      reader.readAsDataURL(file);
    });

    if (removePhotoBtn) {
      removePhotoBtn.addEventListener("click", function () {
        profilePhotoInput.value = "";
        if (profilePhotoImg) { profilePhotoImg.src = ""; profilePhotoImg.style.display = "none"; }
        if (profilePhotoInitials) profilePhotoInitials.style.display = "block";
        removePhotoBtn.style.display = "none";
      });
    }
  }

  /* ===========================================================================
     11. STATS / CHARTS
     =========================================================================== */
  function isStudentPage() {
    return document.getElementById("newIncidentBtn") !== null;
  }
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const interval = setInterval(function () {
      current += step;
      if (current >= target) { current = target; clearInterval(interval); }
      el.textContent = current;
    }, 30);
  }

  function renderStatCards() {
    const data = isStudentPage() ? myIncidents : incidents;
    animateCount("statTotal", data.length);
    animateCount("statReported", data.filter(function (i) { return i.status === "Reported"; }).length);
    animateCount("statAssigned", data.filter(function (i) { return i.status === "Assigned"; }).length);
    animateCount("statInProgress", data.filter(function (i) { return i.status === "In Progress"; }).length);
    animateCount("statResolved", data.filter(function (i) { return i.status === "Resolved"; }).length);
    animateCount("statCritical", data.filter(function (i) { return i.priority === "Critical"; }).length);
    setText("openIncidentsBadge", data.filter(function (i) { return i.status !== "Resolved"; }).length);
  }

  function renderBarChart() {
    const barChart = document.getElementById("barChart");
    if (!barChart) return;
    const counts = {};
    incidents.forEach(function (i) { counts[i.category] = (counts[i.category] || 0) + 1; });
    const shortLabels = {
      "Safety & Security": "Safety", "Harassment": "Harass.", "Theft": "Theft",
      "Infrastructure": "Infra.", "Fire & Electrical": "Fire", "Health & Medical": "Health"
    };
    const vals = Object.values(counts);
    if (vals.length === 0) { barChart.innerHTML = ""; return; }
    const maxCount = Math.max.apply(null, vals);
    barChart.innerHTML = "";
    Object.keys(counts).forEach(function (cat) {
      const count = counts[cat];
      const h = Math.max(10, Math.round((count / maxCount) * 100));
      const col = document.createElement("div");
      col.className = "bar-col";
      col.innerHTML = "<strong>" + count + "</strong>" +
        '<div class="bar" style="height:' + h + '%;" title="' + cat + ": " + count + '"></div>' +
        "<span>" + (shortLabels[cat] || cat) + "</span>";
      barChart.appendChild(col);
    });
  }

  function renderStatusDonut() {
    const donut = document.getElementById("statusDonut");
    const legend = document.getElementById("donutLegend");
    if (!donut || !legend) return;
    const order = ["Reported", "In Progress", "Assigned", "Resolved"];
    const colors = {
      "Reported": "var(--color-primary)",
      "In Progress": "var(--color-warning)",
      "Assigned": "var(--color-danger)",
      "Resolved": "var(--color-success)"
    };
    const total = incidents.length || 1;
    let run = 0;
    const stops = [];
    order.forEach(function (s) {
      run += (incidents.filter(function (i) { return i.status === s; }).length / total) * 100;
      stops.push(run);
    });
    donut.style.setProperty("--seg-1", stops[0] + "%");
    donut.style.setProperty("--seg-2", stops[1] + "%");
    donut.style.setProperty("--seg-3", stops[2] + "%");
    setText("donutTotal", incidents.length);
    legend.innerHTML = "";
    order.forEach(function (s) {
      const count = incidents.filter(function (i) { return i.status === s; }).length;
      const row = document.createElement("div");
      row.className = "legend-item";
      row.innerHTML = '<span class="legend-dot" style="background:' + colors[s] + ';"></span>' +
        "<span>" + s + "</span><strong>" + count + "</strong>";
      legend.appendChild(row);
    });
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  }

  function renderActivityFeed() {
    const feed = document.getElementById("activityFeed");
    if (!feed) return;
    const icons = {
      "Reported": { i: "fa-flag", c: "reported" },
      "Assigned": { i: "fa-user-tag", c: "assigned" },
      "In Progress": { i: "fa-hourglass-half", c: "progress" },
      "Resolved": { i: "fa-circle-check", c: "resolved" }
    };
    const verbs = {
      "Reported": "reported a new incident",
      "Assigned": "was assigned an incident",
      "In Progress": "is investigating an incident",
      "Resolved": "resolved an incident"
    };
    feed.innerHTML = "";
    incidents.slice(0, 6).forEach(function (inc) {
      const meta = icons[inc.status] || icons["Reported"];
      const row = document.createElement("div");
      row.className = "activity-item";
      row.innerHTML =
        '<div class="activity-icon ' + meta.c + '"><i class="fa-solid ' + meta.i + '"></i></div>' +
        '<div class="activity-content"><p><strong>' + inc.student + "</strong> " + verbs[inc.status] +
        " — " + inc.title + "</p><time>" + (inc.incidentCode || inc.id) + " · " + formatDate(inc.date) + "</time></div>";
      feed.appendChild(row);
    });
  }

  /* ===========================================================================
     12. TABLES
     =========================================================================== */
  const tableRefreshers = [];

  function setupIncidentTable(config) {
    const tableBody = document.getElementById(config.tableBodyId);
    if (!tableBody) return;
    const searchInput = config.searchInputId ? document.getElementById(config.searchInputId) : null;
    const filters = (config.filterIds || []).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    const summaryEl = config.summaryId ? document.getElementById(config.summaryId) : null;

    function fieldFromId(id) {
      if (id.indexOf("status") !== -1) return "status";
      if (id.indexOf("priority") !== -1) return "priority";
      if (id.indexOf("department") !== -1) return "department";
      return "status";
    }
    function getData() { return typeof config.data === "function" ? config.data() : config.data; }

    function filtered() {
      const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
      const data = getData();
      return data.filter(function (inc) {
        const hay = [inc.id, inc.incidentCode, inc.title, inc.location, inc.category, inc.student].join(" ").toLowerCase();
        if (q && hay.indexOf(q) === -1) return false;
        for (let i = 0; i < filters.length; i++) {
          const f = filters[i];
          if (f.value && inc[fieldFromId(f.id)] !== f.value) return false;
        }
        return true;
      });
    }

    function render() {
      const rows = filtered();
      const all = getData();
      tableBody.innerHTML = "";
      if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--color-text-muted);">No incidents yet.</td></tr>';
      } else {
        rows.forEach(function (inc) { tableBody.appendChild(config.renderRow(inc)); });
      }
      if (summaryEl) summaryEl.textContent = "Showing " + rows.length + " of " + all.length + " incidents";
      animateNewRows(tableBody);
    }

    if (searchInput) searchInput.addEventListener("input", render);
    filters.forEach(function (f) { f.addEventListener("change", render); });
    config._render = render;
    tableRefreshers.push(render);
    render();
  }

  function priorityBadgeClass(priority) {
    return { Low: "badge-gray", Medium: "badge-blue", High: "badge-orange", Critical: "badge-danger" }[priority] || "badge-gray";
  }
  function statusBadgeClass(status) {
    return { Reported: "badge-gray", Assigned: "badge-blue", "In Progress": "badge-orange", Resolved: "badge-success" }[status] || "badge-gray";
  }

  setupIncidentTable({
    tableBodyId: "incidentsTableBody",
    searchInputId: "searchInput",
    summaryId: "tableSummary",
    data: function () { return myIncidents; },
    renderRow: function (inc) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (inc.incidentCode || inc.id) + "</td>" +
        "<td>" + inc.title + "</td>" +
        "<td>" + inc.location + "</td>" +
        '<td><span class="badge ' + priorityBadgeClass(inc.priority) + '">' + inc.priority + "</span></td>" +
        '<td><span class="badge ' + statusBadgeClass(inc.status) + '">' + inc.status + "</span></td>" +
        "<td>" + formatDate(inc.date) + "</td>";
      return tr;
    }
  });

  setupIncidentTable({
    tableBodyId: "myIncidentsTableBody",
    searchInputId: "myIncidentsSearch",
    filterIds: ["priorityFilter", "statusFilter"],
    summaryId: "myIncidentsSummary",
    data: function () { return myIncidents; },
    renderRow: function (inc) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (inc.incidentCode || inc.id) + "</td>" +
        "<td>" + inc.title + "</td>" +
        "<td>" + inc.category + "</td>" +
        "<td>" + inc.location + "</td>" +
        '<td><span class="badge ' + priorityBadgeClass(inc.priority) + '">' + inc.priority + "</span></td>" +
        '<td><span class="badge ' + statusBadgeClass(inc.status) + '">' + inc.status + "</span></td>" +
        "<td>" + formatDate(inc.date) + "</td>" +
        '<td><button class="btn btn-outline btn-sm view-incident-btn" data-id="' + inc.id + '">View</button></td>';
      return tr;
    }
  });

  setupIncidentTable({
    tableBodyId: "manageIncidentsTableBody",
    searchInputId: "manageSearch",
    filterIds: ["statusFilter", "priorityFilter", "departmentFilter"],
    summaryId: "manageTableSummary",
    data: function () { return incidents; },
    renderRow: function (inc) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (inc.incidentCode || inc.id) + "</td>" +
        "<td>" + inc.student + "</td>" +
        "<td>" + inc.title + "</td>" +
        "<td>" + inc.location + "</td>" +
        '<td><span class="badge ' + priorityBadgeClass(inc.priority) + '">' + inc.priority + "</span></td>" +
        '<td><span class="badge ' + statusBadgeClass(inc.status) + '">' + inc.status + "</span></td>" +
        "<td>" + (inc.assignedTo || "Unassigned") + "</td>" +
        "<td>" + formatDate(inc.date) + "</td>" +
        '<td>' +
          '<button class="action-btn view view-incident-btn" data-id="' + inc.id + '" title="View"><i class="fa-solid fa-eye"></i></button> ' +
          '<button class="action-btn delete delete-incident-btn" data-id="' + inc.id + '" title="Delete"><i class="fa-solid fa-trash-can"></i></button>' +
        "</td>";
      return tr;
    }
  });

  setupIncidentTable({
    tableBodyId: "adminIncidentsTableBody",
    summaryId: "adminTableSummary",
    data: function () { return incidents.slice(0, 6); },
    renderRow: function (inc) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (inc.incidentCode || inc.id) + "</td>" +
        "<td>" + inc.title + "</td>" +
        "<td>" + inc.student + "</td>" +
        '<td><span class="badge ' + priorityBadgeClass(inc.priority) + '">' + inc.priority + "</span></td>" +
        '<td><span class="badge ' + statusBadgeClass(inc.status) + '">' + inc.status + "</span></td>" +
        "<td>" + formatDate(inc.date) + "</td>";
      return tr;
    }
  });

  /* ===========================================================================
     13. DELETE
     =========================================================================== */
  const deleteConfirmModal = document.getElementById("deleteConfirmModal");
  const deleteIncidentLabel = document.getElementById("deleteIncidentLabel");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  let pendingDeleteId = null;

  function openDeleteModal(incidentId) {
    if (!deleteConfirmModal) return;
    pendingDeleteId = incidentId;
    if (deleteIncidentLabel) deleteIncidentLabel.textContent = incidentId;
    deleteConfirmModal.classList.add("active");
  }
  function closeDeleteModal() {
    if (deleteConfirmModal) deleteConfirmModal.classList.remove("active");
    pendingDeleteId = null;
  }

  document.addEventListener("click", function (e) {
    const deleteBtn = e.target.closest(".delete-incident-btn");
    if (deleteBtn) openDeleteModal(deleteBtn.dataset.id);
  });

  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener("click", function (e) {
      if (e.target === deleteConfirmModal) closeDeleteModal();
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async function () {
      if (!pendingDeleteId) return;
      try {
        await apiDelete("/incidents/" + pendingDeleteId);
        showToast("Incident deleted.", "danger");
        closeDeleteModal();
        await loadIncidents();
        refreshAllViews();
      } catch (err) {
        console.error(err);
        showToast("Could not delete. Try again.", "danger");
      }
    });
  }

  /* ===========================================================================
     14. VIEW MODAL
     =========================================================================== */
  const viewIncidentModal = document.getElementById("viewIncidentModal");
  if (viewIncidentModal) {
    document.addEventListener("click", function (e) {
      const viewBtn = e.target.closest(".view-incident-btn");
      if (!viewBtn) return;
      const inc = incidents.find(function (i) { return String(i.id) === String(viewBtn.dataset.id); });
      if (!inc) return;

      setText("viewModalId", inc.incidentCode || inc.id);
      setText("viewModalTitle", inc.title);
      setText("viewModalCategory", inc.category);
      setText("viewModalLocation", inc.location);
      setText("viewModalDate", formatDate(inc.date));
      setText("viewModalDescription", inc.description || "No additional description provided.");
      if (document.getElementById("viewModalStudent")) setText("viewModalStudent", inc.student);
      if (document.getElementById("viewModalDepartment")) setText("viewModalDepartment", inc.department);
      if (document.getElementById("viewModalAssignedTo")) setText("viewModalAssignedTo", inc.assignedTo || "Unassigned");

      const pb = document.getElementById("viewModalPriority");
      if (pb) { pb.textContent = inc.priority; pb.className = "badge " + priorityBadgeClass(inc.priority); }
      const sb = document.getElementById("viewModalStatus");
      if (sb) { sb.textContent = inc.status; sb.className = "badge " + statusBadgeClass(inc.status); }

      const fd = document.getElementById("viewModalFullDetailsLink");
      if (fd) fd.href = "incident-details.html?id=" + encodeURIComponent(inc.id);

      viewIncidentModal.classList.add("active");
    });

    const closeViewModal = function () { viewIncidentModal.classList.remove("active"); };
    const cvb = document.getElementById("closeViewModal");
    const vcf = document.getElementById("viewModalCloseFooterBtn");
    if (cvb) cvb.addEventListener("click", closeViewModal);
    if (vcf) vcf.addEventListener("click", closeViewModal);
    viewIncidentModal.addEventListener("click", function (e) {
      if (e.target === viewIncidentModal) closeViewModal();
    });
  }

  /* ===========================================================================
     15. REFRESH
     =========================================================================== */
  function refreshAllViews() {
    renderStatCards();
    renderBarChart();
    renderStatusDonut();
    renderActivityFeed();
    tableRefreshers.forEach(function (r) { r(); });
  }

  /* ===========================================================================
     16. ANIMATIONS
     =========================================================================== */
  document.querySelectorAll(".fade-in").forEach(function (el, index) {
    el.style.animationDelay = (index * 70) + "ms";
  });
  function animateNewRows(tableBody) {
    Array.from(tableBody.children).forEach(function (row, index) {
      row.style.animation = "fadeIn var(--transition-base) both";
      row.style.animationDelay = (index * 35) + "ms";
    });
  }

  /* ===========================================================================
     17. NAV / LOGOUT / MISC
     =========================================================================== */
  const newIncidentBtn = document.getElementById("newIncidentBtn");
  if (newIncidentBtn) {
    newIncidentBtn.addEventListener("click", function () {
      window.location.href = "report-incident.html";
    });
  }

  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", function (e) {
      e.preventDefault();
      localStorage.removeItem("campusShield_user");
      showToast("Signing you out...", "warning");
      setTimeout(function () { window.location.href = "index.html"; }, 700);
    });
  }

  const notificationBtn = document.getElementById("notificationBtn");
  const notificationDot = document.getElementById("notificationDot");
  if (notificationBtn) {
    notificationBtn.addEventListener("click", function () {
      if (notificationDot) notificationDot.style.display = "none";
      showToast("You have new notifications.", "primary");
    });
  }

  const successModal = document.getElementById("successModal");
  if (successModal) {
    const ok = document.getElementById("successModalOkBtn");
    const closeBtn = document.getElementById("closeSuccessModal");
    if (ok) ok.addEventListener("click", function () { window.location.href = "student-dashboard.html"; });
    if (closeBtn) closeBtn.addEventListener("click", function () { successModal.classList.remove("active"); });
  }

  const comingSoonSelector = '.nav-item[href="#"]:not(#reportIncidentLink):not(#logoutLink), .bottom-nav-item[href="#"]';
  document.querySelectorAll(comingSoonSelector).forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const label = link.querySelector(".nav-label");
      const name = label ? label.textContent.trim() : link.textContent.trim();
      showToast(name + " is coming soon.", "primary");
    });
  });

  /* ===========================================================================
     18. BOOT
     =========================================================================== */
  (async function boot() {
    const ok = await loadIncidents();
    if (!ok) {
      showToast("Cannot reach backend. Is it running on port 8080?", "danger");
    }
    refreshAllViews();
  })();

})();