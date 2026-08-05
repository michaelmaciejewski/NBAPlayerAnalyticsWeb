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

        return {
          PLAYER_NAME: row[playerKey],
          TEAM_ABBREVIATION: row[teamKey] || "NBA",
          PTS: Number(row[ptsKey] || 0),
          REB: Number(row[rebKey] || 0),
          AST: Number(row[astKey] || 0),
          STL: Number(row[stlKey] || 0),
          BLK: Number(row[blkKey] || 0),
          TS_PCT: Number(row[tsKey] || 0)
        };
      }).filter(d => d.PLAYER_NAME);

      calculatePercentiles();
      initTeams();
      setupEventListeners();
      updateDashboard();
    }
  });
});

// Calculates 0-100 percentile rank for every metric across the dataset
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
    renderStatCards(player1, player2);
  }
}

function renderStatCards(p1, p2) {
  const statsContainer = document.getElementById("stats-grid");
  const metrics = [
    { label: "Points (PTS)", key: "PTS", format: v => v.toFixed(1) },
    { label: "Rebounds (REB)", key: "REB", format: v => v.toFixed(1) },
    { label: "Assists (AST)", key: "AST", format: v => v.toFixed(1) },
    { label: "Steals (STL)", key: "STL", format: v => v.toFixed(1) },
    { label: "Blocks (BLK)", key: "BLK", format: v => v.toFixed(1) },
    { label: "True Shooting %", key: "TS_PCT", format: v => (v > 1 ? v : v * 100).toFixed(1) + "%" }
  ];

  statsContainer.innerHTML = metrics.map(m => {
    const v1 = p1[m.key];
    const v2 = p2[m.key];
    const p1Leader = v1 > v2 ? "leader-p1" : "";
    const p2Leader = v2 > v1 ? "leader-p2" : "";

    return `
      
        ${m.label}
        
          ${m.format(v1)}
          |
          ${m.format(v2)}
        
      
    `;
  }).join("");
}

function renderRadarChart(p1, p2) {
  const ctx = document.getElementById("radarChart").getContext("2d");
  const labels = ["Points", "Rebounds", "Assists", "Steals", "Blocks", "Efficiency (TS%)"];

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
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 20, display: false },
          angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
          grid: { color: 'rgba(255, 255, 255, 0.08)' },
          pointLabels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { family: 'Plus Jakarta Sans', size: 13, weight: '600' } }
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