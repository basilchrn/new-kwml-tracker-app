/**
 * KWML Marine Ops Tracker - Client Architecture & Sync
 * Pure Vanilla JS, zero dependencies.
 */

// Replace this URL with your deployed Google Apps Script Web App exec URL
const SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbzw0hKiPqW0AoymO1bI4P-fXILLxLc1dgnIapNcP2Vcq8f6M5bDoXSoEcpMjr6BEX5VNw/exec';

// Terminal Location Dictionary for direct Google Maps Navigation
const TERMINAL_LOCATIONS = {
  'HCT': { name: 'High Court', query: 'High Court Water Metro Station Kochi' },
  'VYP': { name: 'Vypin', query: 'Vypin Water Metro Station Kochi' },
  'FOK': { name: 'Fort Kochi', query: 'Fort Kochi Water Metro Terminal' },
  'WIL': { name: 'W. Island', query: 'Willingdon Island Water Metro Terminal' },
  'SCT': { name: 'S. Chittoor', query: 'South Chittoor Water Metro Terminal' },
  'CHR': { name: 'Cheranalloor', query: 'Cheranalloor Water Metro Terminal' },
  'KAK': { name: 'Kakkanad', query: 'Kakkanad Water Metro Station' },
  'MAT': { name: 'Mattancherry', query: 'Mattancherry Water Metro Terminal' },
  'VYT': { name: 'Vyttila', query: 'Vyttila Water Metro Station' },
  'OCC': { name: 'Operations Control Centre', query: 'Kochi Water Metro OCC Vyttila' }
};

// Fallback dataset for immediate offline rendering and testing
const FALLBACK_DATA = {
  employee: {
    name: "Basil Cherian",
    empId: "WM-10246",
    designation: "Terminal Controller",
    department: "Marine Operations",
    doj: "15-07-2026",
    grade: "S1 (10,750 - 29,000)"
  },
  statistics: {
    daysWorked: 94,
    totalOffsAvailed: 18,
    coffsAvailed: 3,
    emergencyLeaves: 1
  },
  leaveBalances: {
    pl: { earned: 5, availed: 1, balance: 4 },
    cl: { earned: 4, availed: 1, balance: 3 },
    rh: { total: 2, availed: 1, balance: 1 },
    coff: { balance: 2 }
  },
  coffs: [
    { id: "COFF-01", holiday: "Independence Day", dutyDate: "2026-08-15", shift: "A", expiryDate: "2026-11-13", daysRemaining: 9, status: "Available", hrApprovalRef: "" },
    { id: "COFF-02", holiday: "First Onam", dutyDate: "2026-08-27", shift: "B", expiryDate: "2026-11-25", daysRemaining: 21, status: "Available", hrApprovalRef: "" },
    { id: "COFF-03", holiday: "Thiruvonam", dutyDate: "2026-08-28", shift: "G", expiryDate: "2026-12-26", daysRemaining: 52, status: "Extended", hrApprovalRef: "HR/EXT/2026/09" },
    { id: "COFF-04", holiday: "Gandhi Jayanthi", dutyDate: "2026-10-02", shift: "A", expiryDate: "2026-12-31", daysRemaining: 57, status: "Available", hrApprovalRef: "" }
  ],
  holidays: [
    { name: "Independence Day", date: "2026-08-15", day: "Saturday", status: "Worked (+1 C-Off)" },
    { name: "First Onam", date: "2026-08-27", day: "Thursday", status: "Worked (+1 C-Off)" },
    { name: "Thiruvonam", date: "2026-08-28", day: "Friday", status: "Worked (+1 C-Off)" },
    { name: "Gandhi Jayanthi", date: "2026-10-02", day: "Friday", status: "Worked (+1 C-Off)" },
    { name: "Deepavali", date: "2026-11-08", day: "Sunday", status: "Scheduled" }
  ],
  shifts: [
    { date: "2026-11-03", day: "Tuesday", shiftCode: "B", terminal: "HCT", startTime: "13:00", endTime: "21:00", summary: "Duty at High Court", status: "Completed" },
    { date: "2026-11-04", day: "Wednesday", shiftCode: "A", terminal: "VYP", startTime: "07:00", endTime: "15:00", summary: "Morning shift Vypin", status: "Upcoming / Scheduled" },
    { date: "2026-11-05", day: "Thursday", shiftCode: "A", terminal: "VYP", startTime: "07:00", endTime: "15:00", summary: "Morning shift Vypin", status: "Upcoming / Scheduled" },
    { date: "2026-11-06", day: "Friday", shiftCode: "WO", terminal: "-", startTime: "-", endTime: "-", summary: "Weekly Off", status: "Completed" },
    { date: "2026-11-07", day: "Saturday", shiftCode: "G", terminal: "OCC", startTime: "09:00", endTime: "17:00", summary: "OCC Operations", status: "Upcoming / Scheduled" }
  ],
  payslips: [
    { month: "August 2026", payDays: 31, basic: 10750, hra: 2150, vda: 1800, uniformAllowance: 1000, lateAttendanceRefund: 0, grossPay: 15700, epf: 1290, lateAttendanceDeduction: 0, professionalTax: 200, totalDeductions: 1490, netPay: 14210, processedDate: "2026-09-02" },
    { month: "September 2026", payDays: 30, basic: 10750, hra: 2150, vda: 1800, uniformAllowance: 1000, lateAttendanceRefund: 0, grossPay: 15700, epf: 1290, lateAttendanceDeduction: 0, professionalTax: 200, totalDeductions: 1490, netPay: 14210, processedDate: "2026-10-02" },
    { month: "October 2026", payDays: 31, basic: 10750, hra: 2150, vda: 1800, uniformAllowance: 1000, lateAttendanceRefund: 0, grossPay: 15700, epf: 1290, lateAttendanceDeduction: 0, professionalTax: 200, totalDeductions: 1490, netPay: 14210, processedDate: "2026-11-02" }
  ]
};

let appState = {
  data: FALLBACK_DATA,
  currentCalendarDate: new Date(2026, 10, 1), // November 2026
  activePayslipMonth: null
};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAlertDrawer();
  fetchRemoteData();
  renderAllViews();
});

function initNavigation() {
  const buttons = document.querySelectorAll('.tab-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      window.scrollTo(0, 0);
    });
  });

  document.getElementById('prevMonthBtn').addEventListener('click', () => {
    appState.currentCalendarDate.setMonth(appState.currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('nextMonthBtn').addEventListener('click', () => {
    appState.currentCalendarDate.setMonth(appState.currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });

  document.getElementById('resetFYBtn').addEventListener('click', () => {
    appState.activePayslipMonth = null;
    document.querySelectorAll('.payslip-card').forEach(c => c.classList.remove('active-month'));
    document.getElementById('resetFYBtn').classList.add('hidden');
    renderSalaryAnalytics();
  });
}

function initAlertDrawer() {
  const bellBtn = document.getElementById('alertBellBtn');
  const drawer = document.getElementById('alertDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const closeBtn = document.getElementById('closeDrawerBtn');

  const toggle = (show) => {
    drawer.classList.toggle('active', show);
    overlay.classList.toggle('active', show);
  };

  bellBtn.addEventListener('click', () => toggle(true));
  closeBtn.addEventListener('click', () => toggle(false));
  overlay.addEventListener('click', () => toggle(false));
}

async function fetchRemoteData() {
  if (SCRIPT_API_URL.includes('YOUR_DEPLOYED_WEBAPP_ID')) return;
  try {
    const res = await fetch(SCRIPT_API_URL);
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      appState.data = json.data;
      renderAllViews();
    }
  } catch (err) {
    console.warn('Live sync fallback to local cache:', err);
  }
}

function renderAllViews() {
  renderTab1Summary();
  renderTab2COff();
  renderCalendar();
  renderSalaryAnalytics();
  renderTab5Profile();
  evaluateOperationalAlerts();
}

/**
 * Tab 1: Today's Duty Hero, Metrics & Balances
 */
function renderTab1Summary() {
  const todayStr = '2026-11-04'; // Synced current operations date
  const shiftList = appState.data.shifts || [];
  const todayShift = shiftList.find(s => s.date === todayStr);

  const heroDate = document.getElementById('heroDate');
  const heroShiftCode = document.getElementById('heroShiftCode');
  const heroTerminal = document.getElementById('heroTerminal');
  const heroAction = document.getElementById('heroActionContainer');
  const heroHours = document.getElementById('heroHours');
  const heroStatus = document.getElementById('heroStatus');

  heroDate.textContent = 'Wed, 04 Nov 2026';

  if (todayShift) {
    heroShiftCode.textContent = `Shift ${todayShift.shiftCode}`;
    heroTerminal.textContent = `${todayShift.terminal} (${getTerminalFullName(todayShift.terminal)})`;
    heroHours.textContent = `Shift Timing: ${todayShift.startTime} to ${todayShift.endTime}`;
    heroStatus.textContent = todayShift.status;

    // Direct Navigation Pill Button (Suppressed on completed duty)
    heroAction.innerHTML = '';
    const isCompleted = todayShift.status.toLowerCase().includes('completed');
    const isWorkingShift = ['A', 'B', 'G'].includes(todayShift.shiftCode);

    if (isWorkingShift && !isCompleted) {
      const termInfo = TERMINAL_LOCATIONS[todayShift.terminal];
      const query = termInfo ? encodeURIComponent(termInfo.query) : encodeURIComponent(`${todayShift.terminal} Water Metro`);
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      
      const navBtn = document.createElement('a');
      navBtn.className = 'nav-pill';
      navBtn.href = mapsUrl;
      navBtn.target = '_blank';
      navBtn.rel = 'noopener noreferrer';
      navBtn.innerHTML = `<span>🧭 Navigate</span>`;
      heroAction.appendChild(navBtn);
    }
  } else {
    heroShiftCode.textContent = 'REST / WO';
    heroTerminal.textContent = 'No active duty rostered';
    heroHours.textContent = 'Shift Timing: --:--';
    heroStatus.textContent = 'Off Duty';
    heroAction.innerHTML = '';
  }

  // KPIs
  const stats = appState.data.statistics || {};
  document.getElementById('kpiWorked').textContent = stats.daysWorked || 0;
  document.getElementById('kpiOffs').textContent = stats.totalOffsAvailed || 0;
  document.getElementById('kpiCoffs').textContent = stats.coffsAvailed || 0;
  document.getElementById('kpiEL').textContent = stats.emergencyLeaves || 0;

  // Balances
  const lb = appState.data.leaveBalances || {};
  document.getElementById('balPL').textContent = lb.pl ? lb.pl.balance : 0;
  document.getElementById('subPL').textContent = lb.pl ? `Earned: ${lb.pl.earned} | Used: ${lb.pl.availed}` : '';

  document.getElementById('balCL').textContent = lb.cl ? lb.cl.balance : 0;
  document.getElementById('subCL').textContent = lb.cl ? `Active: ${lb.cl.earned} | Used: ${lb.cl.availed}` : '';

  document.getElementById('balCOFF').textContent = lb.coff ? lb.coff.balance : 0;
  document.getElementById('balRH').textContent = lb.rh ? lb.rh.balance : 0;
}

/**
 * Tab 2: C-Off Expiry Hub
 */
function renderTab2COff() {
  const container = document.getElementById('coffCardList');
  container.innerHTML = '';
  const coffs = appState.data.coffs || [];

  coffs.forEach(c => {
    const card = document.createElement('div');
    card.className = 'coff-card';

    let badgeClass = 'safe';
    let badgeLabel = `${c.daysRemaining}d Left`;

    if (c.status.toLowerCase() === 'availed') {
      badgeClass = 'availed';
      badgeLabel = 'Availed';
    } else if (c.status.toLowerCase().includes('extended')) {
      badgeClass = 'extended';
      badgeLabel = `+30d HR Extended (${c.daysRemaining}d)`;
    } else if (c.daysRemaining <= 15) {
      badgeClass = 'critical';
      badgeLabel = `Critical: ${c.daysRemaining}d`;
    } else if (c.daysRemaining <= 30) {
      badgeClass = 'warning';
      badgeLabel = `Warning: ${c.daysRemaining}d`;
    }

    card.innerHTML = `
      <div class="coff-info">
        <h4>${c.holiday}</h4>
        <p>Worked: ${c.dutyDate} (Shift ${c.shift}) • Expires: ${c.expiryDate}</p>
      </div>
      <div class="badge-status ${badgeClass}">${badgeLabel}</div>
    `;
    container.appendChild(card);
  });

  // Gazetted Register
  const holList = document.getElementById('holidayList');
  holList.innerHTML = '';
  const holidays = appState.data.holidays || [];
  holidays.forEach(h => {
    const row = document.createElement('div');
    row.className = 'holiday-item';
    row.innerHTML = `
      <span>${h.name} (${h.date})</span>
      <b>${h.status}</b>
    `;
    holList.appendChild(row);
  });
}

/**
 * Tab 3: Roster Calendar
 */
function renderCalendar() {
  const year = appState.currentCalendarDate.getFullYear();
  const month = appState.currentCalendarDate.getMonth();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  document.getElementById('calendarMonthTitle').textContent = `${monthNames[month]} ${year}`;

  const daysGrid = document.getElementById('calendarDaysGrid');
  daysGrid.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Shift lookup map
  const shiftsMap = {};
  (appState.data.shifts || []).forEach(s => {
    shiftsMap[s.date] = s;
  });

  // Empty leading cells
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell empty';
    daysGrid.appendChild(emptyCell);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shift = shiftsMap[dayStr];

    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const dayNumber = document.createElement('span');
    dayNumber.className = 'cell-day';
    dayNumber.textContent = d;
    cell.appendChild(dayNumber);

    if (shift) {
      const badge = document.createElement('div');
      badge.className = 'badge-2line';
      const code = shift.shiftCode;

      // Color Hierarchy Logic
      if (code === 'A') badge.classList.add('shift-a');
      else if (code === 'B') badge.classList.add('shift-b');
      else if (code === 'G') badge.classList.add('shift-g');
      else if (code === 'EL') badge.classList.add('unpaid');
      else if (['WO', 'REST'].includes(code)) {
        cell.classList.add('non-duty');
      } else {
        badge.classList.add('leave');
      }

      badge.innerHTML = `<div>${code}</div><div>${getTerminalAbbrev(shift.terminal)}</div>`;
      cell.appendChild(badge);

      if (!cell.classList.contains('non-duty')) {
        cell.addEventListener('click', () => {
          document.querySelectorAll('.calendar-cell').forEach(c => c.classList.remove('selected'));
          cell.classList.add('selected');
          renderInspectionCard(shift);
        });
      }
    } else {
      cell.classList.add('non-duty');
    }

    daysGrid.appendChild(cell);
  }
}

function renderInspectionCard(shift) {
  document.getElementById('inspectDate').textContent = `${shift.date} (${shift.day})`;
  const details = document.getElementById('inspectDetails');

  const termFull = getTerminalFullName(shift.terminal);
  const isWorking = ['A', 'B', 'G'].includes(shift.shiftCode);
  const isUpcoming = !shift.status.toLowerCase().includes('completed');

  let navMarkup = '';
  if (isWorking && isUpcoming) {
    const termInfo = TERMINAL_LOCATIONS[shift.terminal];
    const query = termInfo ? encodeURIComponent(termInfo.query) : encodeURIComponent(`${shift.terminal} Water Metro`);
    navMarkup = `<a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" class="nav-pill" style="margin-top: 10px; display: inline-flex;">🧭 Navigate to Terminal</a>`;
  }

  details.innerHTML = `
    <div style="font-size: 14px; line-height: 1.6;">
      <p><b>Duty:</b> Shift ${shift.shiftCode} — ${termFull}</p>
      <p><b>Hours:</b> ${shift.startTime} to ${shift.endTime}</p>
      <p><b>Status:</b> ${shift.status}</p>
      <p><b>Summary:</b> ${shift.summary || 'Standard Terminal Operations'}</p>
      ${navMarkup}
    </div>
  `;
}

/**
 * Tab 4: Salary & SVG Donut Chart (Indian FY Dynamic Bound)
 */
function renderSalaryAnalytics() {
  const payslips = appState.data.payslips || [];
  const container = document.getElementById('payslipCardsContainer');
  container.innerHTML = '';

  // Determine current financial year (April 1 to March 31)
  const today = new Date(2026, 10, 4);
  const currMonth = today.getMonth() + 1; // 1-12
  const currYear = today.getFullYear();
  const fyStart = currMonth >= 4 ? currYear : currYear - 1;
  const fyEnd = fyStart + 1;

  document.getElementById('chartTitle').textContent = `Financial Year ${fyStart}-${fyEnd}`;

  // Monthly cards
  payslips.forEach(p => {
    const card = document.createElement('div');
    card.className = `payslip-card ${appState.activePayslipMonth === p.month ? 'active-month' : ''}`;
    card.innerHTML = `
      <div class="payslip-header-line">
        <h4>${p.month}</h4>
        <span class="payslip-net">₹${p.netPay.toLocaleString('en-IN')}</span>
      </div>
      <div class="payslip-details-line">
        <span>Gross: ₹${p.grossPay.toLocaleString('en-IN')}</span>
        <span>Deductions: ₹${p.totalDeductions.toLocaleString('en-IN')}</span>
        <span>Days: ${p.payDays}</span>
      </div>
    `;

    card.addEventListener('click', () => {
      if (appState.activePayslipMonth === p.month) {
        appState.activePayslipMonth = null;
        card.classList.remove('active-month');
        document.getElementById('resetFYBtn').classList.add('hidden');
      } else {
        appState.activePayslipMonth = p.month;
        document.querySelectorAll('.payslip-card').forEach(c => c.classList.remove('active-month'));
        card.classList.add('active-month');
        document.getElementById('resetFYBtn').classList.remove('hidden');
      }
      renderSalaryAnalyticsChart();
    });

    container.appendChild(card);
  });

  renderSalaryAnalyticsChart();
}

function renderSalaryAnalyticsChart() {
  const payslips = appState.data.payslips || [];
  let basic = 0, hra = 0, vda = 0, allow = 0, gross = 0;

  if (appState.activePayslipMonth) {
    const selected = payslips.find(p => p.month === appState.activePayslipMonth);
    if (selected) {
      basic = selected.basic;
      hra = selected.hra;
      vda = selected.vda;
      allow = selected.uniformAllowance + selected.lateAttendanceRefund;
      gross = selected.grossPay;
      document.getElementById('chartSubtitle').textContent = `Salary Breakdown for ${selected.month}`;
    }
  } else {
    payslips.forEach(p => {
      basic += p.basic;
      hra += p.hra;
      vda += p.vda;
      allow += (p.uniformAllowance + p.lateAttendanceRefund);
      gross += p.grossPay;
    });
    document.getElementById('chartSubtitle').textContent = 'FY Combined Earnings Profile';
  }

  document.getElementById('donutGrossVal').textContent = `₹${gross.toLocaleString('en-IN')}`;
  document.getElementById('legBasic').textContent = `₹${basic.toLocaleString('en-IN')}`;
  document.getElementById('legHRA').textContent = `₹${hra.toLocaleString('en-IN')}`;
  document.getElementById('legVDA').textContent = `₹${vda.toLocaleString('en-IN')}`;
  document.getElementById('legAllow').textContent = `₹${allow.toLocaleString('en-IN')}`;

  drawDonutChart([
    { value: basic, color: '#0A84FF' },
    { value: hra, color: '#BF5AF2' },
    { value: vda, color: '#30D158' },
    { value: allow, color: '#FF9F0A' }
  ], gross);
}

function drawDonutChart(segments, total) {
  const svg = document.getElementById('donutSvg');
  svg.innerHTML = '';
  if (total === 0) return;

  const radius = 15.91549430918954; // Circumference = 100
  let accumulatedPercent = 0;

  segments.forEach(seg => {
    const percent = (seg.value / total) * 100;
    if (percent <= 0) return;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '50');
    circle.setAttribute('cy', '50');
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('fill', 'transparent');
    circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-width', '7');
    circle.setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
    circle.setAttribute('stroke-dashoffset', `${-accumulatedPercent}`);
    svg.appendChild(circle);

    accumulatedPercent += percent;
  });
}

/**
 * Tab 5: Profile Data Binding
 */
function renderTab5Profile() {
  const emp = appState.data.employee || {};
  document.getElementById('profName').textContent = emp.name || 'Basil Cherian';
  document.getElementById('profDesig').textContent = emp.designation || 'Terminal Controller';
  document.getElementById('profEmpId').textContent = emp.empId || 'WM-10246';
  document.getElementById('profDept').textContent = emp.department || 'Marine Operations';
  document.getElementById('profDoj').textContent = emp.doj || '15-07-2026';
  document.getElementById('profGrade').textContent = emp.grade || 'S1 (10,750 - 29,000)';
}

/**
 * Operational Alerts: Expirations, Fatigue, Duty Streaks
 */
function evaluateOperationalAlerts() {
  const alerts = [];
  const coffs = appState.data.coffs || [];
  const shifts = appState.data.shifts || [];

  // 1. Urgent C-Off Expirations (<= 15 days)
  coffs.forEach(c => {
    if (c.status !== 'Availed' && c.daysRemaining <= 15 && c.daysRemaining >= 0) {
      alerts.push({
        type: 'critical',
        title: `C-Off Expiring in ${c.daysRemaining} Days`,
        desc: `${c.holiday} (Earned: ${c.dutyDate}) will lapse on ${c.expiryDate}. Avail immediately or request +30d HR Extension.`
      });
    }
  });

  // 2. Fatigue & Quick Turnaround Detection (Shift B -> Shift A next day < 10 hrs)
  for (let i = 0; i < shifts.length - 1; i++) {
    const cur = shifts[i];
    const nxt = shifts[i + 1];
    if (cur.shiftCode === 'B' && nxt.shiftCode === 'A') {
      alerts.push({
        type: 'warning',
        title: `Quick Turnaround Fatigue Warning`,
        desc: `Shift B on ${cur.date} (ends 21:00) is followed by Shift A on ${nxt.date} (starts 07:00). Turnaround window is only 10 hours.`
      });
    }
  }

  // 3. Duty Streaks (>6 consecutive shifts without WO)
  let streak = 0;
  shifts.forEach(s => {
    if (['A', 'B', 'G'].includes(s.shiftCode)) {
      streak++;
      if (streak > 6) {
        alerts.push({
          type: 'warning',
          title: `Consecutive Shift Alert (${streak} Days)`,
          desc: `Working ${streak} consecutive shifts without a rostered rest day (WO). Monitor fatigue.`
        });
      }
    } else {
      streak = 0;
    }
  });

  // Update Badge & Drawer
  const badge = document.getElementById('alertCountBadge');
  const alertList = document.getElementById('alertList');
  alertList.innerHTML = '';

  if (alerts.length > 0) {
    badge.style.display = 'block';
    badge.textContent = alerts.length;

    alerts.forEach(a => {
      const item = document.createElement('div');
      item.className = `alert-item ${a.type}`;
      item.innerHTML = `<h4>${a.title}</h4><p>${a.desc}</p>`;
      alertList.appendChild(item);
    });
  } else {
    badge.style.display = 'none';
    alertList.innerHTML = '<p class="placeholder-text">All operational parameters normal. No fatigue or expiration warnings.</p>';
  }
}

function getTerminalAbbrev(term) {
  if (!term || term === '-') return '-';
  const clean = term.trim().toUpperCase();
  if (TERMINAL_LOCATIONS[clean]) return clean;
  for (const [key, val] of Object.entries(TERMINAL_LOCATIONS)) {
    if (val.name.toUpperCase().includes(clean)) return key;
  }
  return clean.substring(0, 3);
}

function getTerminalFullName(code) {
  const c = (code || '').trim().toUpperCase();
  return TERMINAL_LOCATIONS[c] ? TERMINAL_LOCATIONS[c].name : code;
}
