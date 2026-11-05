/**
 * KWML Marine Ops Tracker - Client Engine (100% Dynamic / Zero Hardcoding)
 */

// Paste your deployed Google Apps Script Web App Exec URL here
const SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbzw0hKiPqW0AoymO1bI4P-fXILLxLc1dgnIapNcP2Vcq8f6M5bDoXSoEcpMjr6BEX5VNw/exec';

const CACHE_KEY = 'KWML_CLIENT_STORE_V1';

const TERMINAL_LOCATIONS = {
  'HCT': { name: 'High Court', query: 'High Court Water Metro Station Kochi' },
  'VYP': { name: 'Vypin', query: 'Vypin Water Metro Station Kochi' },
  'FOK': { name: 'Fort Kochi', query: 'Fort Kochi Water Metro Terminal' },
  'WIL': { name: 'W. Island', query: 'Willingdon Island Water Metro Terminal' },
  'SOC': { name: 'S. Chittoor', query: 'South Chittoor Water Metro Terminal' },
  'CHR': { name: 'Cheranalloor', query: 'Cheranalloor Water Metro Terminal' },
  'KKD': { name: 'Kakkanad', query: 'Kakkanad Water Metro Station' },
  'MAT': { name: 'Mattancherry', query: 'Mattancherry Water Metro Terminal' },
  'VYT': { name: 'Vyttila', query: 'Vyttila Water Metro Station' },
  'OCC': { name: 'Operations Control Centre', query: 'Kochi Water Metro OCC Vyttila' }
};

let appState = {
  data: null,
  currentCalendarDate: new Date(),
  activePayslipMonth: null
};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initAlertDrawer();
  initForceSyncButton();
  hydrateFromCacheOrRemote();
});

function initForceSyncButton() {
  const syncBtn = document.getElementById('forceSyncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      forceLiveSheetSync();
    });
  }
}

async function forceLiveSheetSync() {
  const syncBtn = document.getElementById('forceSyncBtn');
  const btnText = syncBtn.querySelector('.sync-btn-text');
  const lastSyncLabel = document.getElementById('lastSyncTimestamp');
  const statusBanner = document.getElementById('syncStatusBanner');

  // Set loading state
  syncBtn.disabled = true;
  syncBtn.classList.add('loading');
  if (btnText) btnText.textContent = 'Syncing...';
  if (statusBanner) statusBanner.textContent = 'Bypassing cache & fetching live rows from Google Sheets...';

  // Invalidate device storage
  localStorage.removeItem(CACHE_KEY);

  try {
    // Append nocache=true and random timestamp to defeat Google CDN / CacheService
    const separator = SCRIPT_API_URL.includes('?') ? '&' : '?';
    const bypassUrl = `${SCRIPT_API_URL}${separator}nocache=true&_ts=${Date.now()}`;

    const res = await fetch(bypassUrl, { cache: 'no-store' });
    const json = await res.json();

    if (json.status === 'success' && json.data) {
      appState.data = json.data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
      localStorage.setItem('KWML_LAST_SYNC_TIME', new Date().toISOString());

      renderAllViews();
      updateSyncTimestampDisplay();

      if (statusBanner) statusBanner.textContent = 'Google Sheet live sync complete';
    } else {
      throw new Error(json.message || 'Error fetching sheet data');
    }
  } catch (err) {
    console.error('Forced sync failure:', err);
    if (statusBanner) statusBanner.textContent = 'Failed to sync with Google Sheet';
    alert('Sync error: Could not reach Google Sheets. Check Apps Script URL or permissions.');
  } finally {
    syncBtn.disabled = false;
    syncBtn.classList.remove('loading');
    if (btnText) btnText.textContent = 'Force Sync';
  }
}

function updateSyncTimestampDisplay() {
  const lastSyncLabel = document.getElementById('lastSyncTimestamp');
  if (!lastSyncLabel) return;

  const storedTime = localStorage.getItem('KWML_LAST_SYNC_TIME');
  if (storedTime) {
    const d = new Date(storedTime);
    lastSyncLabel.textContent = `Last synced: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } else {
    lastSyncLabel.textContent = 'Last synced: Just now';
  }
}

function initNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
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

async function hydrateFromCacheOrRemote() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      appState.data = JSON.parse(cached);
      renderAllViews();
    } catch (e) {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  await fetchRemoteData();
}

async function fetchRemoteData() {
  const statusBanner = document.getElementById('syncStatusBanner');
  if (statusBanner) statusBanner.textContent = 'Syncing ledger with Google Sheets...';

  if (!SCRIPT_API_URL || SCRIPT_API_URL.includes('YOUR_DEPLOYED_WEBAPP_ID')) {
    if (statusBanner) statusBanner.textContent = 'Waiting for Apps Script URL in tracker-sync.js';
    return;
  }

  try {
    const res = await fetch(SCRIPT_API_URL, { cache: 'no-store' });
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      appState.data = json.data;
      localStorage.setItem(CACHE_KEY, JSON.stringify(json.data));
      if (statusBanner) statusBanner.textContent = 'Ledger up to date';
      renderAllViews();
    } else {
      throw new Error(json.message || 'Malformed sheet response');
    }
  } catch (err) {
    console.error('Remote fetch error:', err);
    if (statusBanner) statusBanner.textContent = 'Offline — viewing cached ledger';
  }
}

function renderAllViews() {
  if (!appState.data) return;
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const dateOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  document.getElementById('heroDate').textContent = now.toLocaleDateString('en-GB', dateOptions);

  const shifts = appState.data.shifts || [];
  const todayShift = shifts.find(s => s.date === todayStr);

  const heroShiftCode = document.getElementById('heroShiftCode');
  const heroTerminal = document.getElementById('heroTerminal');
  const heroHours = document.getElementById('heroHours');
  const heroStatus = document.getElementById('heroStatus');
  const heroAction = document.getElementById('heroActionContainer');
  heroAction.innerHTML = '';

  if (todayShift) {
    heroShiftCode.textContent = `Shift ${todayShift.shiftCode}`;
    heroTerminal.textContent = `${todayShift.terminal} (${getTerminalFullName(todayShift.terminal)})`;
    heroHours.textContent = `Shift Timing: ${todayShift.startTime} to ${todayShift.endTime}`;
    heroStatus.textContent = todayShift.status || 'Scheduled';

    const isCompleted = String(todayShift.status || '').toLowerCase().includes('completed');
    const isWorkingShift = ['A', 'B', 'G'].includes(todayShift.shiftCode);

    if (isWorkingShift && !isCompleted) {
      const termInfo = TERMINAL_LOCATIONS[todayShift.terminal];
      const query = termInfo ? encodeURIComponent(termInfo.query) : encodeURIComponent(`${todayShift.terminal} Water Metro`);
      const navBtn = document.createElement('a');
      navBtn.className = 'nav-pill';
      navBtn.href = `https://www.google.com/maps/search/?api=1&query=${query}`;
      navBtn.target = '_blank';
      navBtn.rel = 'noopener noreferrer';
      navBtn.innerHTML = '<span>🧭 Navigate</span>';
      heroAction.appendChild(navBtn);
    }
  } else {
    heroShiftCode.textContent = 'REST / WO';
    heroTerminal.textContent = 'No duty rostered for today';
    heroHours.textContent = 'Shift Timing: --:--';
    heroStatus.textContent = 'Off Duty';
  }

  // KPIs strictly from sheet stats
  const stats = appState.data.statistics || {};
  document.getElementById('kpiWorked').textContent = stats.daysWorked ?? 0;
  document.getElementById('kpiOffs').textContent = stats.totalOffsAvailed ?? 0;
  document.getElementById('kpiCoffs').textContent = stats.coffsAvailed ?? 0;
  document.getElementById('kpiEL').textContent = stats.emergencyLeaves ?? 0;

  // Leave balances strictly from sheet leave data
  const lb = appState.data.leaveBalances || {};
  document.getElementById('balPL').textContent = lb.pl ? lb.pl.balance : 0;
  document.getElementById('subPL').textContent = lb.pl ? `Earned: ${lb.pl.earned} | Availed: ${lb.pl.availed}` : '';

  document.getElementById('balCL').textContent = lb.cl ? lb.cl.balance : 0;
  document.getElementById('subCL').textContent = lb.cl ? `Active: ${lb.cl.earned} | Availed: ${lb.cl.availed}` : '';

  document.getElementById('balCOFF').textContent = lb.coff ? lb.coff.balance : 0;
  document.getElementById('balRH').textContent = lb.rh ? lb.rh.balance : 0;
}

/**
 * Tab 2: C-Off Expiry Ledger & Gazetted Holidays
 */
function renderTab2COff() {
  const container = document.getElementById('coffCardList');
  container.innerHTML = '';
  const coffs = appState.data.coffs || [];

  if (coffs.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No Compensatory Offs recorded in sheet.</p>';
  }

  coffs.forEach(c => {
    const card = document.createElement('div');
    card.className = 'coff-card';

    let badgeClass = 'safe';
    let badgeLabel = `${c.daysRemaining}d Left`;

    if (String(c.status).toLowerCase() === 'availed') {
      badgeClass = 'availed';
      badgeLabel = 'Availed';
    } else if (String(c.status).toLowerCase().includes('extended')) {
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
        <h4>${c.holiday || 'Gazetted Duty C-Off'}</h4>
        <p>Duty: ${c.dutyDate} (Shift ${c.shift}) • Expires: ${c.expiryDate}</p>
      </div>
      <div class="badge-status ${badgeClass}">${badgeLabel}</div>
    `;
    container.appendChild(card);
  });

  const holList = document.getElementById('holidayList');
  holList.innerHTML = '';
  const holidays = appState.data.holidays || [];

  if (holidays.length === 0) {
    holList.innerHTML = '<p class="placeholder-text">No holiday data entered in sheet.</p>';
  }

  holidays.forEach(h => {
    const row = document.createElement('div');
    row.className = 'holiday-item';
    row.innerHTML = `
      <span>${h.name} (${h.date})</span>
      <b>${h.status || 'Gazetted'}</b>
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

  const shiftsMap = {};
  (appState.data.shifts || []).forEach(s => {
    shiftsMap[s.date] = s;
  });

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

      if (code === 'A') badge.classList.add('shift-a');
      else if (code === 'B') badge.classList.add('shift-b');
      else if (code === 'G') badge.classList.add('shift-g');
      else if (code === 'EL') badge.classList.add('unpaid');
      else if (['WO', 'REST'].includes(code)) cell.classList.add('non-duty');
      else badge.classList.add('leave');

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
  const isUpcoming = !String(shift.status || '').toLowerCase().includes('completed');

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
      <p><b>Status:</b> ${shift.status || 'Active'}</p>
      <p><b>Summary:</b> ${shift.summary || 'Operational Shift Duty'}</p>
      ${navMarkup}
    </div>
  `;
}

/**
 * Tab 4: Salary & Dynamic FY Analytics
 */
function renderSalaryAnalytics() {
  const payslips = appState.data.payslips || [];
  const container = document.getElementById('payslipCardsContainer');
  container.innerHTML = '';

  const now = new Date();
  const currMonth = now.getMonth() + 1;
  const currYear = now.getFullYear();
  const fyStart = currMonth >= 4 ? currYear : currYear - 1;
  const fyEnd = fyStart + 1;

  document.getElementById('chartTitle').textContent = `Financial Year ${fyStart}-${fyEnd}`;

  if (payslips.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No synced payslip rows in spreadsheet.</p>';
    renderSalaryAnalyticsChart();
    return;
  }

  payslips.forEach(p => {
    const card = document.createElement('div');
    card.className = `payslip-card ${appState.activePayslipMonth === p.month ? 'active-month' : ''}`;
    card.innerHTML = `
      <div class="payslip-header-line">
        <h4>${p.month}</h4>
        <span class="payslip-net">₹${(p.netPay || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="payslip-details-line">
        <span>Gross: ₹${(p.grossPay || 0).toLocaleString('en-IN')}</span>
        <span>Deductions: ₹${(p.totalDeductions || 0).toLocaleString('en-IN')}</span>
        <span>Days: ${p.payDays || 0}</span>
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
    const sel = payslips.find(p => p.month === appState.activePayslipMonth);
    if (sel) {
      basic = sel.basic || 0;
      hra = sel.hra || 0;
      vda = sel.vda || 0;
      allow = (sel.uniformAllowance || 0) + (sel.lateAttendanceRefund || 0);
      gross = sel.grossPay || (basic + hra + vda + allow);
      document.getElementById('chartSubtitle').textContent = `Breakdown for ${sel.month}`;
    }
  } else {
    payslips.forEach(p => {
      basic += (p.basic || 0);
      hra += (p.hra || 0);
      vda += (p.vda || 0);
      allow += ((p.uniformAllowance || 0) + (p.lateAttendanceRefund || 0));
      gross += (p.grossPay || 0);
    });
    document.getElementById('chartSubtitle').textContent = payslips.length > 0 
      ? 'FY Combined Earnings Profile' 
      : 'No payslip entries found in sheet';
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
  if (total <= 0) return;

  const radius = 15.91549430918954;
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
 * Tab 5: Profile Data
 */
function renderTab5Profile() {
  const emp = appState.data.employee || {};
  document.getElementById('profName').textContent = emp.name || '--';
  document.getElementById('profDesig').textContent = emp.designation || '--';
  document.getElementById('profEmpId').textContent = emp.empId || '--';
  document.getElementById('profDept').textContent = emp.department || 'Marine Operations';
  document.getElementById('profDoj').textContent = emp.doj || '--';
  document.getElementById('profGrade').textContent = emp.grade || '--';

  // Compute initials for avatar badge
  const initials = (emp.name || 'KW')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const avatar = document.querySelector('.avatar-circle');
  if (avatar) avatar.textContent = initials;
}

/**
 * Operational Alerts: Expirations, Fatigue, Duty Streaks
 */
function evaluateOperationalAlerts() {
  const alerts = [];
  const coffs = appState.data.coffs || [];
  const shifts = appState.data.shifts || [];

  coffs.forEach(c => {
    if (String(c.status).toLowerCase() !== 'availed' && c.daysRemaining <= 15 && c.daysRemaining >= 0) {
      alerts.push({
        type: 'critical',
        title: `C-Off Expiring in ${c.daysRemaining} Days`,
        desc: `${c.holiday || 'C-Off'} will lapse on ${c.expiryDate}. Avail duty or request HR Extension.`
      });
    }
  });

  for (let i = 0; i < shifts.length - 1; i++) {
    const cur = shifts[i];
    const nxt = shifts[i + 1];
    if (cur.shiftCode === 'B' && nxt.shiftCode === 'A') {
      alerts.push({
        type: 'warning',
        title: 'Quick Turnaround Warning',
        desc: `Shift B on ${cur.date} is followed by Shift A on ${nxt.date}. Turnaround is under 10 hours.`
      });
    }
  }

  let streak = 0;
  shifts.forEach(s => {
    if (['A', 'B', 'G'].includes(s.shiftCode)) {
      streak++;
      if (streak > 6) {
        alerts.push({
          type: 'warning',
          title: `Duty Streak (${streak} Days)`,
          desc: `Working ${streak} consecutive duties without a rostered rest day (WO).`
        });
      }
    } else {
      streak = 0;
    }
  });

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
    alertList.innerHTML = '<p class="placeholder-text">All operational parameters normal.</p>';
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
