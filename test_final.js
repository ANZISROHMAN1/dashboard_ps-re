
    var globalData = null;
    var chartHBar = null;

    // Start fetching data immediately
    setTimeout(function () {
      google.script.run
        .withSuccessHandler(initDashboard)
        .withFailureHandler(showError)
        .getDashboardData();
    }, 100);

    // Fallback if google.script.run never responds
    setTimeout(function () {
      var el = document.getElementById('app');
      if (el && el.innerHTML.includes('Loading Dashboard Data')) {
        showError({ message: 'Request Timeout. Jaringan Anda mungkin memblokir script, atau backend sangat lambat.' });
      }
    }, 45000);

    function showError(error) {
      document.getElementById('app').innerHTML =
        '<div style="text-align: center; color: #ef4444; padding: 4rem; font-size: 18px;">' +
        'Error loading data: ' + error.message +
        '</div>';
    }

    function exportToPNG() {
      var btn = document.getElementById('btnExport');
      var originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Menyimpan...';
      btn.disabled = true;

      // Sembunyikan section tabel sementara
      var tableSection = document.getElementById('tableExportSection');
      if (tableSection) tableSection.style.display = 'none';

      // Tunggu sebentar agar tulisan tombol sempat berubah
      setTimeout(function () {
        html2canvas(document.body, {
          backgroundColor: '#0f172a',
          scale: 2 // High resolution
        }).then(function (canvas) {
          var link = document.createElement('a');
          var dateStr = new Date().toISOString().slice(0, 10);
          link.download = 'Dashboard_PS_RE_' + dateStr + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();

          btn.innerHTML = originalText;
          btn.disabled = false;
          if (tableSection) tableSection.style.display = '';
        }).catch(function (err) {
          alert("Gagal meng-export gambar: " + err);
          btn.innerHTML = originalText;
          btn.disabled = false;
          if (tableSection) tableSection.style.display = '';
        });
      }, 100);
    }

    function exportTableToPNG() {
      var btn = document.getElementById('btnExportTable');
      btn.style.display = 'none';

      var tableContainer = document.getElementById('tableWrapper');
      var originalOverflow = tableContainer.style.overflow;
      tableContainer.style.overflow = 'visible';

      // Fix html2canvas cropping issue when scrolled down
      var originalScrollY = window.scrollY;
      var originalScrollX = window.scrollX;
      window.scrollTo(0, 0);

      // Tunggu sebentar agar render selesai
      setTimeout(function () {
        var tableSection = document.getElementById('tableExportSection');
        html2canvas(tableSection, {
          backgroundColor: '#0f172a',
          scale: 3, // Higher resolution specifically for the table to prevent blurriness
          windowHeight: document.documentElement.scrollHeight,
          windowWidth: document.documentElement.scrollWidth
        }).then(function (canvas) {
          var link = document.createElement('a');
          var dateStr = new Date().toISOString().slice(0, 10);
          link.download = 'Detail_Table_PS_RE_' + dateStr + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();

          btn.style.display = '';
          tableContainer.style.overflow = originalOverflow;
          window.scrollTo(originalScrollX, originalScrollY);
        }).catch(function (err) {
          alert("Gagal meng-export gambar: " + err);
          btn.style.display = '';
          tableContainer.style.overflow = originalOverflow;
          window.scrollTo(originalScrollX, originalScrollY);
        });
      }, 100);
    }

    // --- FITUR ALARM OTOMATIS ---
    var lastAlarmTime = "";
    setInterval(function () {
      var now = new Date();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      var timeStr = (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes);

      // Target times: 03:30, 15:30, 20:30
      if ((timeStr === '03:30' || timeStr === '15:30' || timeStr === '20:30') && lastAlarmTime !== timeStr) {
        lastAlarmTime = timeStr;
        showAlarmModal(timeStr);
      }
    }, 30000); // Cek setiap 30 detik

    function showAlarmModal(timeStr) {
      // Mainkan suara notifikasi
      var audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(function (e) { console.log('Browser memblokir suara otomatis.'); });

      // Buat Modal Tampilan
      var modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
      modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
      modal.style.zIndex = '99999';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';

      var box = document.createElement('div');
      box.style.backgroundColor = 'var(--card-bg)';
      box.style.padding = '40px';
      box.style.borderRadius = '16px';
      box.style.textAlign = 'center';
      box.style.boxShadow = '0 0 30px var(--color-primary)';
      box.style.border = '2px solid var(--color-primary)';
      box.style.maxWidth = '400px';

      box.innerHTML = '<div style="font-size: 60px; margin-bottom: 20px; animation: pulse 1s infinite;">⏰</div>' +
        '<h2 style="margin: 0 0 10px 0; color: white;">WAKTUNYA SCRAPING!</h2>' +
        '<p style="color: var(--text-muted); margin-bottom: 30px; line-height: 1.5;">Saat ini pukul <b>' + timeStr + '</b>.<br>Silakan minimize browser ini dan klik ganda <b>UPDATE_DASHBOARD_KPRO</b> di Desktop Anda.</p>' +
        '<button onclick="this.parentElement.parentElement.remove()" style="background: var(--color-primary); color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold; width: 100%;">Tutup Peringatan</button>';

      modal.appendChild(box);
      document.body.appendChild(modal);
    }

    // Tambahkan style animasi untuk jam
    var style = document.createElement('style');
    style.innerHTML = '@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }';
    document.head.appendChild(style);

    // --- FITUR THEME TOGGLE (DARK/LIGHT) ---
    var isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');

    function toggleTheme() {
      isDarkMode = !isDarkMode;
      var icon = isDarkMode ? '☀️' : '🌙';
      document.getElementById('themeIcon').innerText = icon;
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');

      // Update charts
      renderBar();
      renderDonut(document.querySelector('select[onchange="renderDonut(this.value)"]').value);
      renderHBar(window.currentHBarDistrict, window.currentHBarType);
    }
    
    // --- REAL-TIME CLOCK ---
    function updateClock() {
      var now = new Date();
      var days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
      var months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      var dayName = days[now.getDay()];
      var dayNum = now.getDate();
      var monthName = months[now.getMonth()];
      var year = now.getFullYear();
      var hr = now.getHours().toString().padStart(2, '0');
      var min = now.getMinutes().toString().padStart(2, '0');
      var sec = now.getSeconds().toString().padStart(2, '0');
      
      var clockElem = document.getElementById('realTimeClock');
      if(clockElem) {
        clockElem.innerText = dayName + ", " + dayNum + " " + monthName + " " + year + " | " + hr + ":" + min + ":" + sec;
      }
    }
    setInterval(updateClock, 1000);
    // Initialize immediately
    setTimeout(updateClock, 500);

    function formatPercent(value) {
      if (!value || isNaN(value)) return "0.0%";
      return (value * 100).toFixed(1) + "%";
    }

    function formatPercentTable(value) {
      if (!value || isNaN(value)) return "0,0%";
      return (value * 100).toFixed(1).replace('.', ',') + "%";
    }

    function initDashboard(response) {
      if (!response.success) {
        showError({ message: response.error || "Failed to load data." });
        return;
      }
      globalData = response;
      try {
        renderApp();
      } catch (e) {
        showError({ message: "Render Error: " + e.message + " | Stack: " + e.stack });
      }
    }

    function renderApp() {
      var data = globalData.data;
      var dateStr = globalData.dateStr;
      var lastUpdateStr = globalData.lastUpdateStr || "N/A";

      var g_reMTD = 0, g_psMTD = 0, g_psMTDHomeId = 0, g_reMTDHomeId = 0;
      var g_reHI = 0, g_psHI = 0, g_psHIHomeId = 0, g_reHIHomeId = 0;

      var districts = Object.keys(data).sort();
      var districtStats = [];
      var serviceAreaStats = [];

      for (var i = 0; i < districts.length; i++) {
        var d = districts[i];
        var d_reMTD = 0, d_psMTD = 0, d_psMTDHomeId = 0, d_reMTDHomeId = 0, d_reHI = 0, d_psHI = 0, d_reHIHomeId = 0, d_psHIHomeId = 0;

        for (var key in data[d]) {
          var row = data[d][key];
          d_reHI += row.reHI; d_reMTD += row.reMTD;
          d_psHI += row.psHI; d_psMTD += row.psMTD;
          d_reHIHomeId += row.reHIHomeId; d_reMTDHomeId += row.reMTDHomeId;
          d_psHIHomeId += row.psHIHomeId; d_psMTDHomeId += row.psMTDHomeId;

          serviceAreaStats.push({
            district: d,
            serviceArea: row.serviceArea,
            reMTD: row.reMTD,
            psMTD: row.psMTD
          });
        }

        g_reMTD += d_reMTD; g_psMTD += d_psMTD;
        g_psMTDHomeId += d_psMTDHomeId; g_reMTDHomeId += d_reMTDHomeId;
        g_reHI += d_reHI; g_psHI += d_psHI;
        g_psHIHomeId += d_psHIHomeId; g_reHIHomeId += d_reHIHomeId;

        districtStats.push({
          district: d,
          reMTD: d_reMTD, psMTD: d_psMTD,
          reMTDHomeId: d_reMTDHomeId, psMTDHomeId: d_psMTDHomeId
        });
      }

      serviceAreaStats.sort(function (a, b) { return b.reMTD - a.reMTD; });

      var g_psReMTD = g_reMTD > 0 ? (g_psMTD / g_reMTD) : 0;
      var g_psReMTDHomeId = g_reMTDHomeId > 0 ? (g_psMTDHomeId / g_reMTDHomeId) : 0;
      var g_psReHI = g_reHI > 0 ? (g_psHI / g_reHI) : 0;
      var g_psReHIHomeId = g_reHIHomeId > 0 ? (g_psHIHomeId / g_reHIHomeId) : 0;

      var appDiv = document.getElementById('app');

      var filterButtonsHtml = `<button class="filter-btn active" onclick="filterData('ALL')">Semua</button>`;
      for (var j = 0; j < districts.length; j++) {
        filterButtonsHtml += `<button class="filter-btn" onclick="filterData('${districts[j]}')">${districts[j]}</button>`;
      }

      appDiv.innerHTML =
        '<div class="header">' +
        '<div>' +
        '<div class="header-title">' +
        '<div class="header-logo">R</div>' +
        '<div>' +
        'Monitoring PS/RE' +
        '<div class="header-subtitle">Indihome Region Eastern Jabotabek</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
          '<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">' +
            '<div style="display: flex; gap: 12px; align-items: center;">' +
              '<button id="btnTheme" onclick="toggleTheme()" style="background: transparent; color: var(--text-main); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px;"><span id="themeIcon">☀️</span> Mode</button>' +
              '<button id="btnExport" onclick="exportToPNG()" style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">📸 Export PNG</button>' +
              '<div class="header-badge">● LIVE</div>' +
              '<div id="realTimeClock" style="color: var(--text-main); font-size: 14px; font-weight: 700; background: var(--glass-bg); padding: 6px 12px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">...</div>' +
            '</div>' +
            '<div style="color: var(--text-muted); font-size: 10px; font-weight: 600; padding-right: 4px; text-transform: uppercase; letter-spacing: 0.5px;">🗓 Posisi Data (Tgl & Waktu Scraping KPRO): <span style="color: var(--color-primary);">' + lastUpdateStr + '</span></div>' +
          '</div>' +
        '</div>' +

        '<div class="cards-grid">' +
        '<div class="card card-1">' +
        '<div class="card-icon" style="color: var(--color-info)">📦</div>' +
        '<div class="card-title">TOTAL RE MTD</div>' +
        '<div class="card-value">' + g_reMTD + '</div>' +
        '<div class="card-label">Eastern Jabotabek</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,20 Q10,10 20,25 T40,15 T60,20 T80,5 T100,10 L100,30 Z" fill="var(--color-info)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-2">' +
        '<div class="card-icon" style="color: var(--color-success)">📈</div>' +
        '<div class="card-title">TOTAL PS MTD</div>' +
        '<div class="card-value">' + g_psMTD + '</div>' +
        '<div class="card-label">Indihome - All</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,25 Q15,10 25,20 T45,5 T70,15 T90,2 T100,8 L100,30 Z" fill="var(--color-success)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-3">' +
        '<div class="card-icon" style="color: var(--color-primary)">⏱</div>' +
        '<div class="card-title">PS/RE MTD</div>' +
        '<div class="card-value" style="color: var(--color-primary)">' + formatPercent(g_psReMTD) + '</div>' +
        '<div class="card-label">Indihome - All</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,15 Q20,25 35,10 T60,15 T85,5 T100,12 L100,30 Z" fill="var(--color-primary)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-4">' +
        '<div class="card-icon" style="color: var(--color-secondary)">🏠</div>' +
        '<div class="card-title">HOMEID PS/RE MTD</div>' +
        '<div class="card-value highlight">' + formatPercent(g_psReMTDHomeId) + '</div>' +
        '<div class="card-label">' + g_psMTDHomeId + ' PS MTD</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,5 Q10,15 30,5 T50,20 T75,10 T100,5 L100,30 Z" fill="var(--color-secondary)"/>' +
        '</svg>' +
        '</div>' +
        '</div>' +

        '<div class="cards-grid" style="margin-top: 16px;">' +
        '<div class="card card-1">' +
        '<div class="card-icon" style="color: var(--color-info)">📦</div>' +
        '<div class="card-title">TOTAL RE HI</div>' +
        '<div class="card-value">' + g_reHI + '</div>' +
        '<div class="card-label">Eastern Jabotabek</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,20 Q10,10 20,25 T40,15 T60,20 T80,5 T100,10 L100,30 Z" fill="var(--color-info)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-2">' +
        '<div class="card-icon" style="color: var(--color-success)">📈</div>' +
        '<div class="card-title">TOTAL PS HI</div>' +
        '<div class="card-value">' + g_psHI + '</div>' +
        '<div class="card-label">Indihome - All</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,25 Q15,10 25,20 T45,5 T70,15 T90,2 T100,8 L100,30 Z" fill="var(--color-success)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-3">' +
        '<div class="card-icon" style="color: var(--color-primary)">⏱</div>' +
        '<div class="card-title">PS/RE HI</div>' +
        '<div class="card-value" style="color: var(--color-primary)">' + formatPercent(g_psReHI) + '</div>' +
        '<div class="card-label">Indihome - All</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,15 Q20,25 35,10 T60,15 T85,5 T100,12 L100,30 Z" fill="var(--color-primary)"/>' +
        '</svg>' +
        '</div>' +
        '<div class="card card-4">' +
        '<div class="card-icon" style="color: var(--color-secondary)">🏠</div>' +
        '<div class="card-title">HOMEID PS/RE HI</div>' +
        '<div class="card-value highlight">' + formatPercent(g_psReHIHomeId) + '</div>' +
        '<div class="card-label">' + g_psHIHomeId + ' PS HI</div>' +
        '<svg viewBox="0 0 100 30" preserveAspectRatio="none" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; opacity: 0.15; pointer-events: none;">' +
        '<path d="M0,30 L0,5 Q10,15 30,5 T50,20 T75,10 T100,5 L100,30 Z" fill="var(--color-secondary)"/>' +
        '</svg>' +
        '</div>' +
        '</div>' +

        '<div class="charts-grid-top">' +
        '<div class="chart-container">' +
        '<div class="chart-title">PS/RE MTD per District</div>' +
        '<canvas id="chartBar"></canvas>' +
        '</div>' +
        '<div class="chart-container">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
        '<div class="chart-title" style="margin-bottom: 0;">Distribusi PS MTD</div>' +
        '<select onchange="renderDonut(this.value)" style="background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 12px; font-size: 12px; cursor: pointer; outline: none;">' +
        '<option value="ALL">Indihome All</option>' +
        '<option value="HOMEID">HomeID</option>' +
        '</select>' +
        '</div>' +
        '<canvas id="chartDonut"></canvas>' +
        '<div style="position: absolute; top: 55%; left: 50%; transform: translate(-50%, -50%); text-align: center;">' +
        '<div id="donutCenterText" style="font-size: 24px; font-weight: bold; color: var(--text-main);">' + g_psMTD + '</div>' +
        '<div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Total PS MTD</div>' +
        '</div>' +
        '</div>' +
        '</div>' +

        '<div class="charts-grid-bottom">' +
        '<div class="chart-container">' +
        '<div class="filter-tabs" id="filterTabs">' +
        filterButtonsHtml +
        '<select onchange="changeHBarType(this.value)" style="background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 20px; padding: 4px 12px; font-size: 12px; cursor: pointer; margin-left: 8px; outline: none;">' +
        '<option value="ALL">Indihome All</option>' +
        '<option value="HOMEID">HomeID</option>' +
        '</select>' +
        '</div>' +
        '<div class="chart-title">RE MTD vs PS MTD per Service Area</div>' +
        '<canvas id="chartHBar" style="max-height: 400px;"></canvas>' +
        '</div>' +
        '</div>' +

        '<div id="tableExportSection" style="padding: 16px; border-radius: 12px; margin-top: 16px; background: transparent; padding-bottom: 0;">' +
          '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">' +
            '<div class="chart-title" style="margin-top: 0; margin-bottom: 0;">Data Detail (Table)</div>' +
            '<button id="btnExportTable" onclick="exportTableToPNG()" style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">📸 Export Table PNG</button>' +
          '</div>' +
          '<div class="table-container" id="tableWrapper"></div>' +
        '</div>';

      window.districtStats = districtStats;
      window.g_psMTD = g_psMTD;
      window.g_psMTDHomeId = g_psMTDHomeId;

      renderBar();
      renderDonut('ALL');
      window.allServiceAreaStats = serviceAreaStats;
      renderHBar(window.currentHBarDistrict || 'ALL', window.currentHBarType || 'ALL');
      renderTable();
    }

    var chartBar = null;
    function renderBar() {
      if (chartBar) chartBar.destroy();
      var districtStats = window.districtStats;
      chartBar = new Chart(document.getElementById('chartBar'), {
        type: 'bar',
        data: {
          labels: districtStats.map(function (d) { return d.district; }),
          datasets: [
            {
              label: 'Indihome All',
              data: districtStats.map(function (d) { return d.reMTD > 0 ? (d.psMTD / d.reMTD) * 100 : 0; }),
              backgroundColor: '#8b5cf6',
              borderRadius: 4
            },
            {
              label: 'HomeID',
              data: districtStats.map(function (d) { return d.reMTDHomeId > 0 ? (d.psMTDHomeId / d.reMTDHomeId) * 100 : 0; }),
              backgroundColor: '#ec4899',
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true, color: '#94a3b8' } } },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: function (v) { return v + '%'; }, color: '#94a3b8' }, grid: { color: function () { return getComputedStyle(document.documentElement).getPropertyValue('--grid-color'); } } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    var chartDonut = null;
    function renderDonut(type) {
      if (chartDonut) chartDonut.destroy();

      var districtStats = window.districtStats;
      var dataValues = type === 'HOMEID' ? districtStats.map(function (d) { return d.psMTDHomeId; }) : districtStats.map(function (d) { return d.psMTD; });
      var totalValue = type === 'HOMEID' ? window.g_psMTDHomeId : window.g_psMTD;

      document.getElementById('donutCenterText').innerText = totalValue;

      chartDonut = new Chart(document.getElementById('chartDonut'), {
        type: 'doughnut',
        data: {
          labels: districtStats.map(function (d) { return d.district; }),
          datasets: [{
            data: dataValues,
            backgroundColor: ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'],
            borderWidth: 0,
            cutout: '75%'
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, color: '#94a3b8' } } }
        }
      });
    }

    window.currentHBarDistrict = 'ALL';
    window.currentHBarType = 'ALL';

    function filterData(district) {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      event.target.classList.add('active');
      window.currentHBarDistrict = district;
      renderHBar(window.currentHBarDistrict, window.currentHBarType);
    }

    function changeHBarType(type) {
      window.currentHBarType = type;
      renderHBar(window.currentHBarDistrict, window.currentHBarType);
    }

    function renderHBar(districtFilter, typeFilter) {
      var dataToRender = window.allServiceAreaStats;
      if (districtFilter !== 'ALL') {
        dataToRender = dataToRender.filter(function (d) { return d.district === districtFilter; });
      }

      var dataRE = typeFilter === 'HOMEID' ? dataToRender.map(function (d) { return d.reMTDHomeId; }) : dataToRender.map(function (d) { return d.reMTD; });
      var dataPS = typeFilter === 'HOMEID' ? dataToRender.map(function (d) { return d.psMTDHomeId; }) : dataToRender.map(function (d) { return d.psMTD; });
      var titleRE = typeFilter === 'HOMEID' ? 'RE MTD (HomeID)' : 'RE MTD';
      var titlePS = typeFilter === 'HOMEID' ? 'PS MTD (HomeID)' : 'PS MTD';

      if (chartHBar) chartHBar.destroy();

      chartHBar = new Chart(document.getElementById('chartHBar'), {
        type: 'bar',
        data: {
          labels: dataToRender.map(function (d) { return d.serviceArea; }),
          datasets: [
            { label: titleRE, data: dataRE, backgroundColor: '#8b5cf6', borderRadius: 4 },
            { label: titlePS, data: dataPS, backgroundColor: '#10b981', borderRadius: 4 }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true, color: '#94a3b8' } } },
          scales: {
            x: { grid: { color: function () { return getComputedStyle(document.documentElement).getPropertyValue('--grid-color'); } }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }

    function renderTable() {
      var data = globalData.data;
      var html =
        '<table id="dataTable">' +
        '<thead>' +
        '<tr>' +
        '<th rowspan="2" class="bg-dark-blue">DISTRICT</th>' +
        '<th rowspan="2" class="bg-dark-blue">SERVICE AREA</th>' +
        '<th rowspan="2" class="bg-dark-blue">MITRA</th>' +
        '<th colspan="6" class="bg-dark-red">INDIHOME - ALL</th>' +
        '<th colspan="6" class="bg-dark-gray">HOMEID</th>' +
        '</tr>' +
        '<tr>' +
        '<th class="bg-orange">RE HI</th><th class="bg-orange">RE MTD</th>' +
        '<th class="bg-green">PS HI</th><th class="bg-green">PS MTD</th>' +
        '<th class="bg-purple">PS/RE HI</th><th class="bg-purple">PS/RE MTD</th>' +
        '<th class="bg-orange">RE HI</th><th class="bg-orange">RE MTD</th>' +
        '<th class="bg-green">PS HI</th><th class="bg-green">PS MTD</th>' +
        '<th class="bg-purple">PS/RE HI</th><th class="bg-purple">PS/RE MTD</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody>';

      var g_reHI = 0, g_reMTD = 0, g_psHI = 0, g_psMTD = 0;
      var g_reHIHomeId = 0, g_reMTDHomeId = 0, g_psHIHomeId = 0, g_psMTDHomeId = 0;
      var districtKeys = Object.keys(data).sort();

      for (var i = 0; i < districtKeys.length; i++) {
        var districtName = districtKeys[i];
        var areaData = data[districtName];
        var d_reHI = 0, d_reMTD = 0, d_psHI = 0, d_psMTD = 0;
        var d_reHIHomeId = 0, d_reMTDHomeId = 0, d_psHIHomeId = 0, d_psMTDHomeId = 0;
        var rowsHtml = '';
        var areaKeys = Object.keys(areaData).sort(function (a, b) { return a.localeCompare(b); });

        for (var j = 0; j < areaKeys.length; j++) {
          var key = areaKeys[j];
          var row = areaData[key];
          d_reHI += row.reHI; d_reMTD += row.reMTD; d_psHI += row.psHI; d_psMTD += row.psMTD;
          d_reHIHomeId += row.reHIHomeId; d_reMTDHomeId += row.reMTDHomeId; d_psHIHomeId += row.psHIHomeId; d_psMTDHomeId += row.psMTDHomeId;

          var psReHI = row.reHI > 0 ? (row.psHI / row.reHI) : 0;
          var psReMTD = row.reMTD > 0 ? (row.psMTD / row.reMTD) : 0;
          var psReHIHomeId = row.reHIHomeId > 0 ? (row.psHIHomeId / row.reHIHomeId) : 0;
          var psReMTDHomeId = row.reMTDHomeId > 0 ? (row.psMTDHomeId / row.reMTDHomeId) : 0;

          rowsHtml +=
            '<tr>' +
            '<td class="bg-light-blue"></td>' +
            '<td class="bg-light-blue"><strong>' + row.serviceArea + '</strong></td>' +
            '<td class="bg-light-blue">' + row.mitra + '</td>' +
            '<td class="bg-light-orange text-re">' + (row.reHI || 0) + '</td>' +
            '<td class="bg-light-orange text-re">' + (row.reMTD || 0) + '</td>' +
            '<td class="bg-light-green text-ps">' + (row.psHI || 0) + '</td>' +
            '<td class="bg-light-green text-ps">' + (row.psMTD || 0) + '</td>' +
            '<td class="bg-light-purple text-ratio">' + formatPercentTable(psReHI) + '</td>' +
            '<td class="bg-light-purple text-ratio">' + formatPercentTable(psReMTD) + '</td>' +
            '<td class="bg-light-orange text-re">' + (row.reHIHomeId || 0) + '</td>' +
            '<td class="bg-light-orange text-re">' + (row.reMTDHomeId || 0) + '</td>' +
            '<td class="bg-light-green text-ps">' + (row.psHIHomeId || 0) + '</td>' +
            '<td class="bg-light-green text-ps">' + (row.psMTDHomeId || 0) + '</td>' +
            '<td class="bg-light-purple text-ratio">' + formatPercentTable(psReHIHomeId) + '</td>' +
            '<td class="bg-light-purple text-ratio">' + formatPercentTable(psReMTDHomeId) + '</td>' +
            '</tr>';
        }

        g_reHI += d_reHI; g_reMTD += d_reMTD; g_psHI += d_psHI; g_psMTD += d_psMTD;
        g_reHIHomeId += d_reHIHomeId; g_reMTDHomeId += d_reMTDHomeId; g_psHIHomeId += d_psHIHomeId; g_psMTDHomeId += d_psMTDHomeId;

        var d_psReHI = d_reHI > 0 ? (d_psHI / d_reHI) : 0;
        var d_psReMTD = d_reMTD > 0 ? (d_psMTD / d_reMTD) : 0;
        var d_psReHIHomeId = d_reHIHomeId > 0 ? (d_psHIHomeId / d_reHIHomeId) : 0;
        var d_psReMTDHomeId = d_reMTDHomeId > 0 ? (d_psMTDHomeId / d_reMTDHomeId) : 0;

        html +=
          '<tr class="row-district">' +
          '<td>' + districtName + '</td>' +
          '<td></td><td></td>' +
          '<td>' + d_reHI + '</td><td>' + d_reMTD + '</td><td>' + d_psHI + '</td><td>' + d_psMTD + '</td>' +
          '<td>' + formatPercentTable(d_psReHI) + '</td><td>' + formatPercentTable(d_psReMTD) + '</td>' +
          '<td>' + d_reHIHomeId + '</td><td>' + d_reMTDHomeId + '</td><td>' + d_psHIHomeId + '</td><td>' + d_psMTDHomeId + '</td>' +
          '<td>' + formatPercentTable(d_psReHIHomeId) + '</td><td>' + formatPercentTable(d_psReMTDHomeId) + '</td>' +
          '</tr>' + rowsHtml;
      }

      var g_psReHI = g_reHI > 0 ? (g_psHI / g_reHI) : 0;
      var g_psReMTD = g_reMTD > 0 ? (g_psMTD / g_reMTD) : 0;
      var g_psReHIHomeId = g_reHIHomeId > 0 ? (g_psHIHomeId / g_reHIHomeId) : 0;
      var g_psReMTDHomeId = g_reMTDHomeId > 0 ? (g_psMTDHomeId / g_reMTDHomeId) : 0;

      html +=
        '<tr class="row-grand-total">' +
        '<td colspan="3">EASTERN JABOTABEK</td>' +
        '<td>' + g_reHI + '</td><td>' + g_reMTD + '</td><td>' + g_psHI + '</td><td>' + g_psMTD + '</td>' +
        '<td>' + formatPercentTable(g_psReHI) + '</td><td>' + formatPercentTable(g_psReMTD) + '</td>' +
        '<td>' + g_reHIHomeId + '</td><td>' + g_reMTDHomeId + '</td><td>' + g_psHIHomeId + '</td><td>' + g_psMTDHomeId + '</td>' +
        '<td>' + formatPercentTable(g_psReHIHomeId) + '</td><td>' + formatPercentTable(g_psReMTDHomeId) + '</td>' +
        '</tr>' +
        '</tbody></table>';

      document.getElementById('tableWrapper').innerHTML = html;
    }
  