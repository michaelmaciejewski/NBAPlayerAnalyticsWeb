let globalData = [];
let radarChart = null;

document.addEventListener("DOMContentLoaded", () => {
  Papa.parse("transformed_player_metrics.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) return;

      globalData = results.data.map(row => {
        const keys = Object.keys(row);
        const playerKey = keys.find(k => k.toLowerCase().includes("player") || k.toLowerCase().includes("name"));
        const teamKey = keys.find(k => k.toLowerCase().includes("team") || k.toLowerCase().includes("abbreviation"));
        const ptsKey = keys.find(k => k.toUpperCase() === "PTS" || k.toLowerCase().includes("pts"));
        const rebKey = keys.find(k => k.toUpperCase() === "REB" || k.toLowerCase().includes("reb"));
        const astKey = keys.find(k => k.toUpperCase() === "AST" || k.toLowerCase().includes("ast"));
        const stlKey = keys.find(k => k.toUpperCase() === "STL" || k.toLowerCase().includes("stl"));
        const blkKey = keys.find(k => k.toUpperCase() === "BLK" || k.toLowerCase().includes("blk"));
        const tsKey = keys.find(k => k.toLowerCase().includes("ts") || k.toLowerCase().includes("true"));
        const minKey = keys.find(k => k.toLowerCase().includes("min"));
        const usgKey = keys.find(k => k.toLowerCase().includes("usg") || k.toLowerCase().includes("usage"));
        const tovKey = keys.find(k => k.toLowerCase().includes("tov") || k.toLowerCase().includes("turnover"));

        return {
          PLAYER_NAME: row[playerKey],
          TEAM_ABBREVIATION: row[teamKey] || "NBA",
          PTS: Number(row[ptsKey] || 0),
          REB: Number(row[rebKey] || 0),
          AST: Number(row[astKey] || 0),
          STL: Number(row[stlKey] || 0),
          BLK: Number(row[blkKey] || 0),
          TS_PCT: Number(row[tsKey] || 0),
          MIN: Number(row[minKey] || 0),
          USG_PCT: Number(row[usgKey] || 0),
          TOV: Number(row[tovKey] || 0)
        };
      }).filter(d => d.PLAYER_NAME);

      calculatePercentiles();
      initTeams();
      setupEventListeners();
      updateDashboard();
    }
  });
});

function calculatePercentiles() {
  const metrics = ['PTS', 'REB', 'AST', 'STL', 'BLK', 'TS_PCT'];
  const total = globalData.length;

  metrics.forEach(metric => {
    const sorted = [...globalData].map(d => d[metric]).sort((a, b) => a - b);
    globalData.forEach(player => {
      const rank = sorted.filter(v => v <= player[metric]).length;
      player[`${metric}_pct`] = Math.round((rank / total) * 100);
    });
  });
}

function initTeams() {
  const teams = [...new Set(globalData.map(d => d.TEAM_ABBREVIATION))].sort();
  const team1Select = document.getElementById("team1-select");
  const team2Select = document.getElementById("team2-select");

  team1Select.innerHTML = "";
  team2Select.innerHTML = "";

  teams.forEach(team => {
    team1Select.add(new Option(team, team));
    team2Select.add(new Option(team, team));
  });

  if (teams.length > 0) {
    team1Select.selectedIndex = 0;
    team2Select.selectedIndex = teams.length > 1 ? 1 : 0;
  }

  updatePlayerDropdown(1);
  updatePlayerDropdown(2);
}

function updatePlayerDropdown(playerNum) {
  const teamVal = document.getElementById(`team${playerNum}-select`).value;
  const playerSelect = document.getElementById(`player${playerNum}-select`);

  const filteredPlayers = globalData
    .filter(d => d.TEAM_ABBREVIATION === teamVal)
    .map(d => d.PLAYER_NAME)
    .sort();

  playerSelect.innerHTML = "";
  filteredPlayers.forEach(name => {
    playerSelect.add(new Option(name, name));
  });
}

function setupEventListeners() {
  document.getElementById("team1-select").addEventListener("change", () => {
    updatePlayerDropdown(1);
    updateDashboard();
  });

  document.getElementById("team2-select").addEventListener("change", () => {
    updatePlayerDropdown(2);
    updateDashboard();
  });

  document.getElementById("player1-select").addEventListener("change", updateDashboard);
  document.getElementById("player2-select").addEventListener("change", updateDashboard);
}

function updateDashboard() {
  const p1Name = document.getElementById("player1-select").value;
  const p2Name = document.getElementById("player2-select").value;

  const player1 = globalData.find(d => d.PLAYER_NAME === p1Name);
  const player2 = globalData.find(d => d.PLAYER_NAME === p2Name);

  if (player1 && player2) {
    renderRadarChart(player1, player2);
    renderPlayerCards(player1, player2);
  }
}

function renderPlayerCards(p1, p2) {
  document.getElementById("p1-card-name").innerText = p1.PLAYER_NAME;
  document.getElementById("p1-card-team").innerText = p1.TEAM_ABBREVIATION;
  
  document.getElementById("p2-card-name").innerText = p2.PLAYER_NAME;
  document.getElementById("p2-card-team").innerText = p2.TEAM_ABBREVIATION;

  const metrics = [
    { label: "Points/Game", key: "PTS", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Rebounds/Game", key: "REB", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Assists/Game", key: "AST", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Steals/Game", key: "STL", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Blocks/Game", key: "BLK", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "True Shooting %", key: "TS_PCT", fmt: v => (v > 1 ? v : v * 100).toFixed(1) + "%", higherBetter: true },
    { label: "Minutes/Game", key: "MIN", fmt: v => v ? v.toFixed(1) : "N/A", higherBetter: true },
    { label: "Usage Rate %", key: "USG_PCT", fmt: v => v ? (v > 1 ? v : v * 100).toFixed(1) + "%" : "N/A", higherBetter: true },
    { label: "Turnovers/Game", key: "TOV", fmt: v => v ? v.toFixed(1) : "N/A", higherBetter: false }
  ];

  const p1List = document.getElementById("p1-stats-list");
  const p2List = document.getElementById("p2-stats-list");

  p1List.innerHTML = "";
  p2List.innerHTML = "";

  metrics.forEach(m => {
    const v1 = p1[m.key];
    const v2 = p2[m.key];

    let p1IsLeader = false;
    let p2IsLeader = false;

    if (v1 !== undefined && v2 !== undefined && v1 !== v2) {
      if (m.higherBetter) {
        p1IsLeader = v1 > v2;
        p2IsLeader = v2 > v1;
      } else {
        p1IsLeader = v1 < v2;
        p2IsLeader = v2 < v1;
      }
    }

    p1List.innerHTML += `
      <div class="stat-box">
        <span class="stat-title">${m.label}</span>
        <span class="stat-val ${p1IsLeader ? 'leader' : ''}">${m.fmt(v1)}</span>
      </div>
    `;

    p2List.innerHTML += `
      <div class="stat-box">
        <span class="stat-title">${m.label}</span>
        <span class="stat-val ${p2IsLeader ? 'leader' : ''}">${m.fmt(v2)}</span>
      </div>
    `;
  });
}

function renderRadarChart(p1, p2) {
  const ctx = document.getElementById("radarChart").getContext("2d");
  const labels = ["Points", "Rebounds", "Assists", "Steals", "Blocks", "Efficiency"];

  const p1Percentiles = [p1.PTS_pct, p1.REB_pct, p1.AST_pct, p1.STL_pct, p1.BLK_pct, p1.TS_PCT_pct];
  const p2Percentiles = [p2.PTS_pct, p2.REB_pct, p2.AST_pct, p2.STL_pct, p2.BLK_pct, p2.TS_PCT_pct];

  if (radarChart) {
    radarChart.destroy();
  }

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: p1.PLAYER_NAME,
          data: p1Percentiles,
          rawStats: [p1.PTS, p1.REB, p1.AST, p1.STL, p1.BLK, p1.TS_PCT],
          backgroundColor: 'rgba(56, 189, 248, 0.2)',
          borderColor: '#38bdf8',
          pointBackgroundColor: '#38bdf8',
          pointBorderColor: '#fff',
          borderWidth: 2
        },
        {
          label: p2.PLAYER_NAME,
          data: p2Percentiles,
          rawStats: [p2.PTS, p2.REB, p2.AST, p2.STL, p2.BLK, p2.TS_PCT],
          backgroundColor: 'rgba(244, 63, 94, 0.2)',
          borderColor: '#f43f5e',
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: '#fff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: 10,
          right: 10
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, display: false },
          angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: { 
            color: '#94a3b8', 
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } 
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          labels: { 
            color: '#f8fafc', 
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
            boxWidth: 12,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const pct = context.raw;
              const idx = context.dataIndex;
              const rawVal = context.dataset.rawStats[idx];
              const formattedRaw = idx === 5 ? (rawVal > 1 ? rawVal.toFixed(1) : (rawVal * 100).toFixed(1)) + '%' : rawVal.toFixed(1);
              return `${context.dataset.label}: ${pct}th percentile (${formattedRaw})`;
            }
          }
        }
      }
    }
  });
}