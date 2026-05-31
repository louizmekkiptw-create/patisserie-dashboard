const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjNhZDuFI4aS7kmkzxuyHQExyCDnm-HQBlo1C_Hoe0gfjdxUecHELKU6-IHF3dn70qsg/exec";

const PRIX = {
  "Tarte aux fraises": 4.5,
  "Mille-feuille": 4,
  "Éclair au chocolat": 3.5,
  "Paris-Brest": 4.5,
  "Opéra": 5,
  "Saint-Honoré": 5.5
};

let orders = [];
let chart1, chart2, chart3;

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekDates() {
  const now = new Date();
  const day = now.getDay() || 7;
  const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] };
}

function statusClass(s) {
  return s === "En cours" ? "encours" : s === "Prêt" ? "pret" : "livre";
}

function formatDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

async function loadOrders() {
  try {
    const res = await fetch(APPS_SCRIPT_URL + "?action=getOrders");
    const data = await res.json();
    orders = data.map((row, i) => ({
      id: i,
      dateCommande: row[0] || "",
      name: row[1] || "",
      phone: row[2] || "",
      date: row[3] || "",
      time: row[4] || "",
      product: row[5] || "",
      qty: parseInt(row[6]) || 1,
      type: row[7] || "catalogue",
      address: row[8] || "",
      status: row[9] || "En cours",
      row: i + 2
    }));
    refreshDashboard();
  } catch (e) {
    document.getElementById("all-list").innerHTML = '<div class="error">Erreur de connexion. Vérifiez l\'URL Apps Script.</div>';
  }
}

async function updateStatus(rowNum, newStatus) {
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateStatus", row: rowNum, status: newStatus })
    });
  } catch (e) {
    console.error("Erreur mise à jour statut", e);
  }
}

function buildCard(o, container) {
  const d = document.createElement("div");
  d.className = "order-card";
  const prix = (PRIX[o.product] || 0) * o.qty;
  d.innerHTML = `
    <div class="order-left">
      <div class="order-time">${o.time || "—"}</div>
      <div class="order-date">${formatDate(o.date)}</div>
    </div>
    <div class="order-info">
      <div class="order-name">${o.name}</div>
      <div class="order-prod">${o.product} × ${o.qty}${prix ? " · " + prix + "€" : ""}${o.address ? " · " + o.address : ""}</div>
    </div>
    <select class="status-sel ${statusClass(o.status)}" data-row="${o.row}">
      <option${o.status === "En cours" ? " selected" : ""}>En cours</option>
      <option${o.status === "Prêt" ? " selected" : ""}>Prêt</option>
      <option${o.status === "Livré" ? " selected" : ""}>Livré</option>
    </select>`;
  container.appendChild(d);
  d.querySelector("select").addEventListener("change", async function () {
    const ord = orders.find(x => x.row === parseInt(this.dataset.row));
    if (ord) ord.status = this.value;
    this.className = "status-sel " + statusClass(this.value);
    await updateStatus(parseInt(this.dataset.row), this.value);
    refreshDashboard();
  });
}

function refreshDashboard() {
  const todayStr = getTodayStr();
  const { start, end } = getWeekDates();

  const todayOrders = orders.filter(o => o.date === todayStr);
  const weekOrders = orders.filter(o => o.date >= start && o.date <= end);
  const encours = orders.filter(o => o.status === "En cours").length;
  const ca = weekOrders.reduce((s, o) => s + (PRIX[o.product] || 0) * o.qty, 0);

  document.getElementById("s-today").textContent = todayOrders.length;
  document.getElementById("s-week").textContent = weekOrders.length;
  document.getElementById("s-encours").textContent = encours;
  document.getElementById("s-ca").textContent = Math.round(ca) + "€";

  const tl = document.getElementById("today-list");
  tl.innerHTML = "";
  if (!todayOrders.length) tl.innerHTML = '<div class="empty">Aucune commande aujourd\'hui</div>';
  else todayOrders.forEach(o => buildCard(o, tl));

  const al = document.getElementById("alerts-list");
  al.innerHTML = "";
  const urgent = todayOrders.filter(o => o.status === "En cours");
  if (!urgent.length) al.innerHTML = '<div class="empty">Aucune alerte</div>';
  else urgent.forEach(o => {
    const d = document.createElement("div");
    d.className = "alert-card";
    d.innerHTML = `⚠ <strong>${o.name}</strong> — ${o.product} × ${o.qty} à ${o.time} · En cours`;
    al.appendChild(d);
  });

  const allList = document.getElementById("all-list");
  allList.innerHTML = "";
  const sorted = [...orders].sort((a, b) => a.date > b.date ? 1 : -1);
  if (!sorted.length) allList.innerHTML = '<div class="empty">Aucune commande</div>';
  else sorted.forEach(o => buildCard(o, allList));

  updateCharts(weekOrders);
}

function updateCharts(weekOrders) {
  const prodCount = {};
  weekOrders.forEach(o => { prodCount[o.product] = (prodCount[o.product] || 0) + o.qty; });
  const prods = Object.keys(prodCount);
  const prodVals = prods.map(p => prodCount[p]);
  const colors1 = ["#D85A30","#BA7517","#0F6E56","#533AB7","#D4537E","#185FA5"];

  const statusCount = {
    "En cours": orders.filter(o => o.status === "En cours").length,
    "Prêt": orders.filter(o => o.status === "Prêt").length,
    "Livré": orders.filter(o => o.status === "Livré").length,
  };
  const colors2 = ["#FFC107","#28A745","#17A2B8"];

  const { start } = getWeekDates();
  const days = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  const weekDates = Array.from({length:7}, (_,i) => {
    const d = new Date(start+"T12:00:00"); d.setDate(d.getDate()+i);
    return d.toISOString().split("T")[0];
  });
  const dayVals = weekDates.map(d => orders.filter(o => o.date === d).length);

  document.getElementById("leg1").innerHTML = prods.map((p,i) =>
    `<span><span class="leg-sq" style="background:${colors1[i%colors1.length]}"></span>${p}</span>`).join("");
  document.getElementById("leg2").innerHTML = Object.keys(statusCount).map((s,i) =>
    `<span><span class="leg-sq" style="background:${colors2[i]}"></span>${s} (${statusCount[s]})</span>`).join("");

  const opts = { responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} } };

  if (chart1) chart1.destroy();
  chart1 = new Chart(document.getElementById("chart1"), {
    type:"bar",
    data:{ labels:prods, datasets:[{ data:prodVals, backgroundColor:colors1, borderRadius:4 }] },
    options:{...opts, scales:{x:{ticks:{font:{size:10}}}, y:{ticks:{stepSize:1}}}}
  });

  if (chart2) chart2.destroy();
  chart2 = new Chart(document.getElementById("chart2"), {
    type:"doughnut",
    data:{ labels:Object.keys(statusCount), datasets:[{ data:Object.values(statusCount), backgroundColor:colors2, borderWidth:2 }] },
    options:{...opts, cutout:"65%"}
  });

  if (chart3) chart3.destroy();
  chart3 = new Chart(document.getElementById("chart3"), {
    type:"bar",
    data:{ labels:days, datasets:[{ data:dayVals, backgroundColor:"#D85A30", borderRadius:4, label:"Commandes" }] },
    options:{...opts, scales:{x:{ticks:{font:{size:11}}}, y:{ticks:{stepSize:1}}}}
  });
}

document.getElementById("today-date").textContent = new Date().toLocaleDateString("fr-FR", {
  weekday:"long", day:"numeric", month:"long", year:"numeric"
});

loadOrders();
setInterval(loadOrders, 60000);
