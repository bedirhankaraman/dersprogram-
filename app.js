const STORAGE_KEYS = {
  nets: "programTakip.nets.v1",
  questions: "programTakip.questions.v1",
  settings: "programTakip.settings.v1",
  scheduleView: "programTakip.scheduleView.v1",
};

const WEEKDAY_SCHEDULE = [
  { start: "08:00", end: "08:30", title: "Kalkış", detail: "" },
  { start: "08:30", end: "09:00", title: "Kahvaltı & hazırlık", detail: "" },
  { start: "09:00", end: "09:50", title: "1. Ders", detail: "Matematik + Geometri • 40–60 soru" },
  { start: "09:50", end: "10:00", title: "Teneffüs", detail: "" },
  { start: "10:00", end: "10:50", title: "2. Ders", detail: "Matematik + Geometri devam • 40–60 soru" },
  { start: "10:50", end: "11:00", title: "Teneffüs", detail: "" },
  { start: "11:00", end: "11:50", title: "3. Ders", detail: "Fen (Fizik / Kimya / Biyoloji) • 40–50 soru" },
  { start: "11:50", end: "12:00", title: "Teneffüs", detail: "" },
  { start: "12:00", end: "12:40", title: "4. Ders", detail: "Fen devam veya eksik konu çözümü • 40–50 soru" },
  { start: "12:40", end: "12:50", title: "Teneffüs", detail: "" },
  { start: "12:50", end: "13:50", title: "5. Ders", detail: "Fen veya TYT test • 40–50 soru" },
  { start: "13:50", end: "14:40", title: "Öğle arası", detail: "" },
  { start: "14:40", end: "15:00", title: "Analiz / Günün kapanışı", detail: "Yanlış soruları incele, eksik konuları not al" },
  { start: "15:00", end: "16:00", title: "Ek çalışma / Gün kapanışı", detail: "Sosyal sorular veya eksik konu tekrarları" },
];

const WEEKEND_SCHEDULE = [
  { start: "12:00", end: "13:00", title: "Kalkış", detail: "" },
  { start: "13:00", end: "15:00", title: "TYT Denemesi", detail: "Deneme çözümü ve ardından analiz" },
  { start: "15:00", end: "17:00", title: "AYT Denemesi", detail: "Deneme çözümü ve ardından analiz" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatHm(date, showSeconds) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  if (!showSeconds) return `${hh}:${mm}`;
  const ss = pad2(date.getSeconds());
  return `${hh}:${mm}:${ss}`;
}

function formatDateTr(date) {
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });
  return fmt.format(date);
}

function parseTimeToMinutes(hm) {
  const [h, m] = hm.split(":").map((x) => Number(x));
  return h * 60 + m;
}

function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWeekend(date) {
  const d = date.getDay(); // 0 pazar, 6 cumartesi
  return d === 0 || d === 6;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function humanizeMinutes(mins) {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h} sa`;
  return `${h} sa ${r} dk`;
}

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function sortByDateAsc(a, b) {
  return a.date.localeCompare(b.date);
}

function ymd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDaysYmd(dateYmd, deltaDays) {
  const [y, m, d] = dateYmd.split("-").map((x) => Number(x));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return ymd(dt);
}

function sum(nums) {
  return nums.reduce((a, b) => a + b, 0);
}

function groupSumByDate(records) {
  const map = new Map();
  records.forEach((r) => {
    map.set(r.date, (map.get(r.date) || 0) + r.count);
  });
  return map;
}

function groupLessonsByDate(records) {
  const map = new Map();
  records.forEach((r) => {
    const cur = map.get(r.date) || { tr: 0, mat: 0, sos: 0, fen: 0, total: 0 };
    cur.tr += r.tr || 0;
    cur.mat += r.mat || 0;
    cur.sos += r.sos || 0;
    cur.fen += r.fen || 0;
    cur.total += r.count || 0;
    map.set(r.date, cur);
  });
  return map;
}

function fmtLessons(obj) {
  if (!obj) return "—";
  return `TR ${obj.tr} • MAT ${obj.mat} • SOS ${obj.sos} • FEN ${obj.fen}`;
}

function defaultSettings() {
  return {
    showSeconds: false,
  };
}

function computeScheduleState(schedule, now) {
  const nowMin = minutesOfDay(now);
  const items = schedule.map((s) => {
    const startMin = parseTimeToMinutes(s.start);
    const endMin = parseTimeToMinutes(s.end);
    return { ...s, startMin, endMin };
  });

  let currentIndex = -1;
  for (let i = 0; i < items.length; i++) {
    if (nowMin >= items[i].startMin && nowMin < items[i].endMin) {
      currentIndex = i;
      break;
    }
  }

  let nextIndex = -1;
  if (currentIndex !== -1) {
    nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : -1;
  } else {
    for (let i = 0; i < items.length; i++) {
      if (nowMin < items[i].startMin) {
        nextIndex = i;
        break;
      }
    }
  }

  const current = currentIndex !== -1 ? items[currentIndex] : null;
  const next = nextIndex !== -1 ? items[nextIndex] : null;

  return { items, currentIndex, nextIndex, current, next, nowMin };
}

function el(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Eksik element: #${id}`);
  return node;
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function setActivePanel(panelKey) {
  const navButtons = qsa(".nav__item");
  const panels = qsa(".panel");

  navButtons.forEach((b) => b.classList.toggle("nav__item--active", b.dataset.panel === panelKey));
  panels.forEach((p) => p.classList.toggle("panel--active", p.id === `panel-${panelKey}`));
}

function openSidebar() {
  const sidebar = el("sidebar");
  sidebar.classList.add("sidebar--open");
  sidebar.setAttribute("aria-hidden", "false");

  const menuBtn = el("menuBtn");
  menuBtn.setAttribute("aria-expanded", "true");

  const overlay = el("overlay");
  overlay.hidden = false;
}

function closeSidebar() {
  const sidebar = el("sidebar");
  sidebar.classList.remove("sidebar--open");
  sidebar.setAttribute("aria-hidden", "true");

  const menuBtn = el("menuBtn");
  menuBtn.setAttribute("aria-expanded", "false");

  const overlay = el("overlay");
  overlay.hidden = true;
}

function scheduleLabel(type) {
  return type === "weekend" ? "Hafta Sonu" : "Hafta İçi";
}

function pickDefaultScheduleView(now) {
  return isWeekend(now) ? "weekend" : "weekday";
}

function renderTimeline(scheduleState) {
  const timeline = el("timeline");
  timeline.innerHTML = "";

  const { items, currentIndex, nextIndex } = scheduleState;

  items.forEach((s, idx) => {
    const slot = document.createElement("div");
    slot.className = "slot";

    if (idx === currentIndex) slot.classList.add("slot--current");
    else if (idx === nextIndex) slot.classList.add("slot--next");
    else if (idx < currentIndex) slot.classList.add("slot--past");

    const left = document.createElement("div");
    left.innerHTML = `<div class="slot__time">${s.start} – ${s.end}</div>`;

    const right = document.createElement("div");
    const title = document.createElement("div");
    title.className = "slot__title";
    title.textContent = s.title;

    const detail = document.createElement("div");
    detail.className = "slot__detail";
    detail.textContent = s.detail || "";

    right.appendChild(title);
    if (s.detail) right.appendChild(detail);

    if (idx === currentIndex) {
      const badge = document.createElement("div");
      badge.className = "slot__badge";
      badge.textContent = "Şu an bu aralıktasın";
      right.appendChild(badge);
    }

    slot.appendChild(left);
    slot.appendChild(right);
    timeline.appendChild(slot);
  });
}

function renderSidebarScheduleList(scheduleState) {
  const list = el("sidebarScheduleList");
  list.innerHTML = "";

  const { items, currentIndex } = scheduleState;

  items.forEach((s, idx) => {
    const item = document.createElement("div");
    item.className = "listItem";
    if (idx === currentIndex) item.classList.add("listItem--current");

    const top = document.createElement("div");
    top.className = "listItem__top";
    const time = document.createElement("div");
    time.className = "listItem__time";
    time.textContent = `${s.start}–${s.end}`;
    const title = document.createElement("div");
    title.className = "listItem__title";
    title.textContent = s.title;
    top.appendChild(time);
    top.appendChild(title);

    const detail = document.createElement("div");
    detail.className = "listItem__detail";
    detail.textContent = s.detail || "";

    item.appendChild(top);
    if (s.detail) item.appendChild(detail);
    list.appendChild(item);
  });
}

function updateNowCard(scheduleState, now) {
  const currentSlotTitle = el("currentSlotTitle");
  const currentSlotDetail = el("currentSlotDetail");
  const countdownLabel = el("countdownLabel");
  const countdownValue = el("countdownValue");
  const dayMeta = el("dayMeta");

  const { current, next, nowMin } = scheduleState;

  dayMeta.textContent = current ? `Şu an: ${current.start}–${current.end}` : next ? `Sıradaki: ${next.start}–${next.end}` : "Bugün program tamamlandı";

  if (current) {
    currentSlotTitle.textContent = current.title;
    currentSlotDetail.textContent = current.detail || "Devam et.";
    const remaining = current.endMin - nowMin;
    countdownLabel.textContent = "Bitmesine";
    countdownValue.textContent = humanizeMinutes(remaining);
    return;
  }

  if (next) {
    currentSlotTitle.textContent = "Program dışında";
    const until = next.startMin - nowMin;
    currentSlotDetail.textContent = `Sıradaki: ${next.title}${next.detail ? ` • ${next.detail}` : ""}`;
    countdownLabel.textContent = "Başlamasına";
    countdownValue.textContent = humanizeMinutes(until);
    return;
  }

  currentSlotTitle.textContent = "Program bitti";
  currentSlotDetail.textContent = "Bugünkü akış tamamlandı. Yarın yeniden devam.";
  countdownLabel.textContent = "Durum";
  countdownValue.textContent = "Tamamlandı";
}

function bindProgramToggle(state) {
  const weekdayBtn = el("weekdayBtn");
  const weekendBtn = el("weekendBtn");

  function setView(view) {
    state.scheduleView = view;
    saveJson(STORAGE_KEYS.scheduleView, view);
    weekdayBtn.classList.toggle("segmented__btn--active", view === "weekday");
    weekendBtn.classList.toggle("segmented__btn--active", view === "weekend");
  }

  weekdayBtn.addEventListener("click", () => setView("weekday"));
  weekendBtn.addEventListener("click", () => setView("weekend"));

  setView(state.scheduleView);
}

function renderNetsTable(nets, canEdit, onDelete) {
  const table = el("netsTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  nets
    .slice()
    .sort(sortByDateAsc)
    .reverse()
    .forEach((r) => {
      const tr = document.createElement("tr");
      const tdDate = document.createElement("td");
      tdDate.textContent = r.date;
      const tdTyt = document.createElement("td");
      tdTyt.textContent = String(r.tyt);
      const tdAyt = document.createElement("td");
      tdAyt.textContent = String(r.ayt);
      const tdAct = document.createElement("td");
      if (canEdit) {
        const btn = document.createElement("button");
        btn.className = "dangerBtn";
        btn.type = "button";
        btn.textContent = "Sil";
        btn.addEventListener("click", () => onDelete(r.id));
        tdAct.appendChild(btn);
      }

      tr.appendChild(tdDate);
      tr.appendChild(tdTyt);
      tr.appendChild(tdAyt);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
}

function calcAvg(nums) {
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return sum / nums.length;
}

function formatNet(n) {
  if (n === null || n === undefined) return "—";
  const s = Number(n).toFixed(2);
  return s.endsWith("00") ? String(Number(n).toFixed(0)) : s.replace(/0+$/, "").replace(/\.$/, "");
}

function renderNetStats(nets) {
  const statCount = el("statCount");
  const statTytAvg = el("statTytAvg");
  const statAytAvg = el("statAytAvg");
  const statLast = el("statLast");

  statCount.textContent = String(nets.length);

  const tytAvg = calcAvg(nets.map((x) => x.tyt));
  const aytAvg = calcAvg(nets.map((x) => x.ayt));
  statTytAvg.textContent = formatNet(tytAvg);
  statAytAvg.textContent = formatNet(aytAvg);

  const last = nets.slice().sort(sortByDateAsc).at(-1);
  if (!last) {
    statLast.textContent = "—";
  } else {
    statLast.textContent = `${last.date} • TYT ${formatNet(last.tyt)} / AYT ${formatNet(last.ayt)}`;
  }
}

function drawNetChart(canvas, nets) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const data = nets.slice().sort(sortByDateAsc).slice(-8);
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // background grid
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.fillRect(0, 0, w, h);

  const pad = 34;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  const tyt = data.map((d) => d.tyt);
  const ayt = data.map((d) => d.ayt);
  const all = [...tyt, ...ayt];
  const minV = all.length ? Math.min(...all) : 0;
  const maxV = all.length ? Math.max(...all) : 1;
  const range = Math.max(1, maxV - minV);

  function xy(i, v) {
    const x = pad + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = pad + (1 - (v - minV) / range) * innerH;
    return { x, y };
  }

  // axes
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.stroke();

  // y labels
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px " + getComputedStyle(document.body).fontFamily;
  const yTop = maxV;
  const yMid = minV + range / 2;
  const yBot = minV;
  ctx.fillText(formatNet(yTop), 8, pad + 4);
  ctx.fillText(formatNet(yMid), 8, pad + innerH / 2 + 4);
  ctx.fillText(formatNet(yBot), 8, h - pad + 4);

  function drawLine(values, stroke, fill) {
    if (!values.length) return;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const p = xy(i, v);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // points
    values.forEach((v, i) => {
      const p = xy(i, v);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  // no data
  if (!data.length) {
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "14px " + getComputedStyle(document.body).fontFamily;
    ctx.fillText("Grafik için henüz kayıt yok.", pad, h / 2);
    return;
  }

  drawLine(tyt, "rgba(124,92,255,0.95)", "rgba(124,92,255,0.85)");
  drawLine(ayt, "rgba(24,193,255,0.95)", "rgba(24,193,255,0.80)");

  // legend
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "12px " + getComputedStyle(document.body).fontFamily;
  ctx.fillText("TYT", w - pad - 70, pad + 2);
  ctx.fillText("AYT", w - pad - 30, pad + 2);
  ctx.fillStyle = "rgba(124,92,255,0.95)";
  ctx.fillRect(w - pad - 90, pad - 8, 10, 10);
  ctx.fillStyle = "rgba(24,193,255,0.95)";
  ctx.fillRect(w - pad - 50, pad - 8, 10, 10);
}

function renderQuestionsTable(records, canEdit, onDelete) {
  const table = el("questionsTable");
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";

  records
    .slice()
    .sort(sortByDateAsc)
    .reverse()
    .forEach((r) => {
      const tr = document.createElement("tr");
      const tdDate = document.createElement("td");
      tdDate.textContent = r.date;
      const tdTr = document.createElement("td");
      tdTr.textContent = String(r.tr || 0);
      const tdMat = document.createElement("td");
      tdMat.textContent = String(r.mat || 0);
      const tdSos = document.createElement("td");
      tdSos.textContent = String(r.sos || 0);
      const tdFen = document.createElement("td");
      tdFen.textContent = String(r.fen || 0);
      const tdTotal = document.createElement("td");
      tdTotal.textContent = String(r.count || 0);
      const tdAct = document.createElement("td");
      if (canEdit) {
        const btn = document.createElement("button");
        btn.className = "dangerBtn";
        btn.type = "button";
        btn.textContent = "Sil";
        btn.addEventListener("click", () => onDelete(r.id));
        tdAct.appendChild(btn);
      }

      tr.appendChild(tdDate);
      tr.appendChild(tdTr);
      tr.appendChild(tdMat);
      tr.appendChild(tdSos);
      tr.appendChild(tdFen);
      tr.appendChild(tdTotal);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
}

function renderQuestionStats(records) {
  const qStatTodayTotal = el("qStatTodayTotal");
  const qStatTodayByLesson = el("qStatTodayByLesson");
  const qStat7dTotal = el("qStat7dTotal");
  const qStat7dAvg = el("qStat7dAvg");
  const qStat7dByLesson = el("qStat7dByLesson");
  const qStatBest = el("qStatBest");

  const today = ymd(new Date());
  const groupedLessons = groupLessonsByDate(records);

  const todayObj = groupedLessons.get(today) || { tr: 0, mat: 0, sos: 0, fen: 0, total: 0 };
  qStatTodayTotal.textContent = String(todayObj.total);
  qStatTodayByLesson.textContent = fmtLessons(todayObj);

  const last7DaysTotals = [];
  const last7Agg = { tr: 0, mat: 0, sos: 0, fen: 0, total: 0 };
  for (let i = 0; i < 7; i++) {
    const day = addDaysYmd(today, -i);
    const obj = groupedLessons.get(day) || { tr: 0, mat: 0, sos: 0, fen: 0, total: 0 };
    last7DaysTotals.push(obj.total);
    last7Agg.tr += obj.tr;
    last7Agg.mat += obj.mat;
    last7Agg.sos += obj.sos;
    last7Agg.fen += obj.fen;
    last7Agg.total += obj.total;
  }
  qStat7dTotal.textContent = String(last7Agg.total);
  qStat7dAvg.textContent = String(Math.round(last7Agg.total / 7));
  qStat7dByLesson.textContent = fmtLessons(last7Agg);

  // best day from grouped totals
  let best = null;
  groupedLessons.forEach((v, k) => {
    if (!best || v.total > best.total) best = { date: k, total: v.total };
  });
  qStatBest.textContent = best ? `${best.date} • ${best.total}` : "—";
}

function initQuestions(state) {
  const questionForm = el("questionForm");
  const questionDate = el("questionDate");
  const qTurkce = el("qTurkce");
  const qMat = el("qMat");
  const qSosyal = el("qSosyal");
  const qFen = el("qFen");
  const qTotalPreview = el("qTotalPreview");
  const clearQuestionsBtn = el("clearQuestionsBtn");
  const clearTodayQuestionsBtn = el("clearTodayQuestionsBtn");
  const canEdit = state.role === "student";

  function readNonNegInt(input) {
    const raw = String(input.value || "").trim();
    if (!raw) return 0;
    const n = Number(raw);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.floor(n));
  }

  function updatePreview() {
    const tr = readNonNegInt(qTurkce);
    const mat = readNonNegInt(qMat);
    const sos = readNonNegInt(qSosyal);
    const fen = readNonNegInt(qFen);
    qTotalPreview.textContent = String(tr + mat + sos + fen);
  }

  function render() {
    renderQuestionStats(state.questions);
    renderQuestionsTable(state.questions, canEdit, async (id) => {
      if (!canEdit) return;
      if (state.remoteEnabled) {
        await window.Sync.deleteQuestion(state.session, id);
        return;
      }
      state.questions = state.questions.filter((x) => x.id !== id);
      saveJson(STORAGE_KEYS.questions, state.questions);
      render();
    });
  }

  const today = new Date();
  questionDate.valueAsDate = today;
  updatePreview();

  [qTurkce, qMat, qSosyal, qFen].forEach((inp) => inp.addEventListener("input", updatePreview));

  questionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const date = questionDate.value;
    const tr = readNonNegInt(qTurkce);
    const mat = readNonNegInt(qMat);
    const sos = readNonNegInt(qSosyal);
    const fen = readNonNegInt(qFen);
    const count = tr + mat + sos + fen;
    if (!date) return;
    if (count <= 0) return;

    const rec = {
      id: crypto.randomUUID(),
      date,
      tr,
      mat,
      sos,
      fen,
      count,
      createdAt: Date.now(),
    };
    if (state.remoteEnabled) {
      window.Sync.addQuestion(state.session, rec);
    } else {
      state.questions.push(rec);
      saveJson(STORAGE_KEYS.questions, state.questions);
      render();
    }

    qTurkce.value = "";
    qMat.value = "";
    qSosyal.value = "";
    qFen.value = "";
    updatePreview();
    qTurkce.focus();
  });

  clearTodayQuestionsBtn.addEventListener("click", () => {
    if (!canEdit) return;
    const todayKey = ymd(new Date());
    const todayTotal = state.questions.filter((x) => x.date === todayKey).reduce((a, b) => a + (b.count || 0), 0);
    if (!todayTotal) return;
    const ok = confirm(`Bugünkü kayıtları sıfırlamak istediğine emin misin? (Toplam: ${todayTotal})`);
    if (!ok) return;
    if (state.remoteEnabled) {
      state.questions
        .filter((x) => x.date === todayKey)
        .forEach((x) => window.Sync.deleteQuestion(state.session, x.id));
      return;
    }
    state.questions = state.questions.filter((x) => x.date !== todayKey);
    saveJson(STORAGE_KEYS.questions, state.questions);
    render();
  });

  clearQuestionsBtn.addEventListener("click", () => {
    if (!canEdit) return;
    const ok = confirm("Tüm soru kayıtlarını silmek istediğine emin misin?");
    if (!ok) return;
    if (state.remoteEnabled) {
      state.questions.forEach((x) => window.Sync.deleteQuestion(state.session, x.id));
      return;
    }
    state.questions = [];
    saveJson(STORAGE_KEYS.questions, state.questions);
    render();
  });

  // watcher mode: disable inputs/buttons
  if (!canEdit) {
    qsa("#questionForm input, #questionForm button").forEach((n) => n.setAttribute("disabled", "true"));
    clearQuestionsBtn.setAttribute("disabled", "true");
    clearTodayQuestionsBtn.setAttribute("disabled", "true");
  }

  render();
}

function initNets(state) {
  const netForm = el("netForm");
  const netDate = el("netDate");
  const tytNet = el("tytNet");
  const aytNet = el("aytNet");
  const clearNetsBtn = el("clearNetsBtn");
  const canvas = el("netChart");
  const canEdit = state.role === "student";

  function render() {
    renderNetStats(state.nets);
    renderNetsTable(state.nets, canEdit, async (id) => {
      if (!canEdit) return;
      if (state.remoteEnabled) {
        await window.Sync.deleteNet(state.session, id);
        return;
      }
      state.nets = state.nets.filter((x) => x.id !== id);
      saveJson(STORAGE_KEYS.nets, state.nets);
      render();
    });
    drawNetChart(canvas, state.nets);
  }

  const today = new Date();
  netDate.valueAsDate = today;

  netForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const date = netDate.value;
    const tyt = Number(tytNet.value);
    const ayt = Number(aytNet.value);
    if (!date || Number.isNaN(tyt) || Number.isNaN(ayt)) return;

    const rec = {
      id: crypto.randomUUID(),
      date,
      tyt,
      ayt,
      createdAt: Date.now(),
    };
    if (state.remoteEnabled) {
      window.Sync.addNet(state.session, rec);
    } else {
      state.nets.push(rec);
      saveJson(STORAGE_KEYS.nets, state.nets);
      render();
    }

    tytNet.value = "";
    aytNet.value = "";
    tytNet.focus();
  });

  clearNetsBtn.addEventListener("click", () => {
    if (!canEdit) return;
    const ok = confirm("Tüm net kayıtlarını silmek istediğine emin misin?");
    if (!ok) return;
    if (state.remoteEnabled) {
      state.nets.forEach((x) => window.Sync.deleteNet(state.session, x.id));
      return;
    }
    state.nets = [];
    saveJson(STORAGE_KEYS.nets, state.nets);
    render();
  });

  if (!canEdit) {
    qsa("#netForm input, #netForm button").forEach((n) => n.setAttribute("disabled", "true"));
    clearNetsBtn.setAttribute("disabled", "true");
  }

  render();
}

function initSettings(state) {
  const showSeconds = el("showSeconds");
  showSeconds.checked = !!state.settings.showSeconds;

  showSeconds.addEventListener("change", () => {
    state.settings.showSeconds = showSeconds.checked;
    saveJson(STORAGE_KEYS.settings, state.settings);
  });
}

function initSidebarNavigation() {
  const navButtons = qsa(".nav__item");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      setActivePanel(btn.dataset.panel || "program");
    });
  });
}

function initSidebarControls() {
  el("menuBtn").addEventListener("click", () => {
    const isOpen = el("sidebar").classList.contains("sidebar--open");
    if (isOpen) closeSidebar();
    else openSidebar();
  });
  el("closeSidebarBtn").addEventListener("click", closeSidebar);
  el("overlay").addEventListener("click", closeSidebar);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSidebar();
  });
}

function tick(state) {
  const now = new Date();

  el("clockTime").textContent = formatHm(now, state.settings.showSeconds);
  el("clockDate").textContent = formatDateTr(now);
  el("todayLabel").textContent = isWeekend(now) ? "Bugün hafta sonu" : "Bugün hafta içi";

  const schedule = state.scheduleView === "weekend" ? WEEKEND_SCHEDULE : WEEKDAY_SCHEDULE;
  const scheduleState = computeScheduleState(schedule, now);

  el("scheduleTypePill").textContent = scheduleLabel(state.scheduleView);
  el("nowTitle").textContent = scheduleState.current ? "Şu an" : scheduleState.next ? "Sıradaki" : "Durum";

  updateNowCard(scheduleState, now);
  renderTimeline(scheduleState);
  renderSidebarScheduleList(scheduleState);
}

function init() {
  const now = new Date();
  const storedView = loadJson(STORAGE_KEYS.scheduleView, null);
  const scheduleView = storedView === "weekday" || storedView === "weekend" ? storedView : pickDefaultScheduleView(now);

  const session = window.Sync && window.Sync.getSession ? window.Sync.getSession() : null;
  const remoteEnabled = !!(session && window.Sync && window.Sync.ensureFirebase && window.Sync.ensureFirebase().ok);
  const role = session ? session.role : "student";

  const state = {
    scheduleView,
    nets: loadJson(STORAGE_KEYS.nets, []),
    questions: loadJson(STORAGE_KEYS.questions, []),
    settings: { ...defaultSettings(), ...loadJson(STORAGE_KEYS.settings, {}) },
    session,
    remoteEnabled,
    role,
  };

  // session UI
  const sessionRoleLabel = el("sessionRoleLabel");
  const sessionGroupLabel = el("sessionGroupLabel");
  const syncHint = el("syncHint");
  const logoutBtn = el("logoutBtn");
  sessionRoleLabel.textContent = session ? (role === "watcher" ? "Gözetici" : "Öğrenci") : "—";
  sessionGroupLabel.textContent = session ? session.groupCode : "—";
  syncHint.style.display = remoteEnabled ? "none" : "block";
  logoutBtn.addEventListener("click", () => {
    if (window.Sync && window.Sync.clearSession) window.Sync.clearSession();
    location.href = "./index.html";
  });

  initSidebarControls();
  initSidebarNavigation();
  bindProgramToggle(state);
  initNets(state);
  initQuestions(state);
  initSettings(state);

  // Remote subscriptions (live sync)
  if (remoteEnabled) {
    window.Sync.subscribeNets(session, (nets) => {
      state.nets = (nets || []).map((x) => ({
        id: x.id || x._docId,
        date: x.date,
        tyt: Number(x.tyt),
        ayt: Number(x.ayt),
        createdAt: x.createdAt || 0,
      }));
      // local cache for offline-ish
      saveJson(STORAGE_KEYS.nets, state.nets);
      // re-render panels if visible
      try {
        renderNetStats(state.nets);
        renderNetsTable(state.nets, state.role === "student", (id) => window.Sync.deleteNet(session, id));
        drawNetChart(el("netChart"), state.nets);
      } catch {}
    });

    window.Sync.subscribeQuestions(session, (qs) => {
      state.questions = (qs || []).map((x) => ({
        id: x.id || x._docId,
        date: x.date,
        tr: Number(x.tr || 0),
        mat: Number(x.mat || 0),
        sos: Number(x.sos || 0),
        fen: Number(x.fen || 0),
        count: Number(x.count || 0),
        createdAt: x.createdAt || 0,
      }));
      saveJson(STORAGE_KEYS.questions, state.questions);
      try {
        renderQuestionStats(state.questions);
        renderQuestionsTable(state.questions, state.role === "student", (id) => window.Sync.deleteQuestion(session, id));
      } catch {}
    });
  }

  // initial panel
  setActivePanel("program");

  // keep the segmented UI in sync if auto-selected
  el("weekdayBtn").classList.toggle("segmented__btn--active", state.scheduleView === "weekday");
  el("weekendBtn").classList.toggle("segmented__btn--active", state.scheduleView === "weekend");

  const dayLabel = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(now);
  el("dayMeta").textContent = `Bugün: ${dayLabel}`;

  // tick rate
  let lastShowSeconds = state.settings.showSeconds;
  let timer = null;

  function startTimer() {
    if (timer) clearInterval(timer);
    const interval = state.settings.showSeconds ? 1000 : 15000;
    timer = setInterval(() => tick(state), interval);
    tick(state);
  }

  startTimer();

  // watch seconds toggle to adjust timer
  setInterval(() => {
    if (state.settings.showSeconds !== lastShowSeconds) {
      lastShowSeconds = state.settings.showSeconds;
      startTimer();
    }
  }, 800);

  // If day changes, suggest default view (but keep user's manual choice)
  setInterval(() => {
    // no-op: reserved for future
  }, 60000);
}

document.addEventListener("DOMContentLoaded", init);

