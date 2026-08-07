let globalData = [];
let radarChart = null;

const TEAM_IDS = {
  ATL: "1610612737", BOS: "1610612738", BKN: "1610612751", CHA: "1610612766",
  CHI: "1610612741", CLE: "1610612739", DAL: "1610612742", DEN: "1610612743",
  DET: "1610612765", GSW: "1610612744", HOU: "1610612745", IND: "1610612754",
  LAC: "1610612746", LAL: "1610612747", MEM: "1610612763", MIA: "1610612748",
  MIL: "1610612749", MIN: "1610612750", NOP: "1610612740", NYK: "1610612752",
  OKC: "1610612760", ORL: "1610612753", PHI: "1610612755", PHX: "1610612756",
  POR: "1610612757", SAC: "1610612758", SAS: "1610612759", TOR: "1610612761",
  UTA: "1610612762", WAS: "1610612764"
};

function getTeamLogoUrl(teamAbbr) {
  const teamId = TEAM_IDS[teamAbbr];
  return teamId ? `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg` : '';
}

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

        const findKey = (patterns) => keys.find(k => 
          patterns.some(p => k.trim().toLowerCase() === p.toLowerCase() || k.trim().toLowerCase().includes(p.toLowerCase()))
        );

        const playerKey = findKey(["player_name", "player", "name"]);
        const teamKey = findKey(["team_abbreviation", "team", "abbr"]);
        const ptsKey = findKey(["pts", "points", "pts_per_game"]);
        const rebKey = findKey(["reb", "rebounds", "reb_per_game", "trb"]);
        const astKey = findKey(["ast", "assists", "ast_per_game"]);
        const stlKey = findKey(["stl", "steals", "stl_per_game"]);
        const blkKey = findKey(["blk", "blocks", "blk_per_game"]);
        const tsKey = findKey(["ts_pct", "ts%", "ts", "true_shooting"]);
        const minKey = findKey(["min", "minutes", "min_per_game"]);
        const usgKey = findKey(["usg_pct", "usg%", "usg", "usage"]);
        const tovKey = findKey(["tov", "turnovers", "tov_per_game"]);

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
          USG_PCT: row[usgKey] !== undefined && row[usgKey] !== null ? Number(row[usgKey]) : null,
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
  if (total === 0) return;

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

  if (!team1Select || !team2Select) return;

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
  const teamElem = document.getElementById(`team${playerNum}-select`);
  const playerSelect = document.getElementById(`player${playerNum}-select`);
  if (!teamElem || !playerSelect) return;

  const teamVal = teamElem.value;
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
  const t1 = document.getElementById("team1-select");
  const t2 = document.getElementById("team2-select");
  const p1 = document.getElementById("player1-select");
  const p2 = document.getElementById("player2-select");

  if (t1) t1.addEventListener("change", () => { updatePlayerDropdown(1); updateDashboard(); });
  if (t2) t2.addEventListener("change", () => { updatePlayerDropdown(2); updateDashboard(); });
  if (p1) p1.addEventListener("change", updateDashboard);
  if (p2) p2.addEventListener("change", updateDashboard);
}

function updateDashboard() {
  const p1Elem = document.getElementById("player1-select");
  const p2Elem = document.getElementById("player2-select");
  if (!p1Elem || !p2Elem) return;

  const p1Name = p1Elem.value;
  const p2Name = p2Elem.value;

  const player1 = globalData.find(d => d.PLAYER_NAME === p1Name);
  const player2 = globalData.find(d => d.PLAYER_NAME === p2Name);

  if (player1 && player2) {
    renderRadarChart(player1, player2);
    renderPlayerCards(player1, player2);
  }
}

function renderPlayerCards(p1, p2) {
  const logo1 = getTeamLogoUrl(p1.TEAM_ABBREVIATION);
  const logo2 = getTeamLogoUrl(p2.TEAM_ABBREVIATION);

  const setSrc = (id, src) => { const el = document.getElementById(id); if (el) el.src = src; };
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };

  setSrc("p1-control-logo", logo1);
  setSrc("p2-control-logo", logo2);
  setSrc("p1-card-logo", logo1);
  setSrc("p2-card-logo", logo2);

  setText("p1-card-name", p1.PLAYER_NAME);
  setText("p1-card-team", p1.TEAM_ABBREVIATION);
  setText("p2-card-name", p2.PLAYER_NAME);
  setText("p2-card-team", p2.TEAM_ABBREVIATION);

  const metrics = [
    { label: "Points/Game", key: "PTS", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Rebounds/Game", key: "REB", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Assists/Game", key: "AST", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Steals/Game", key: "STL", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "Blocks/Game", key: "BLK", fmt: v => v.toFixed(1), higherBetter: true },
    { label: "True Shooting %", key: "TS_PCT", fmt: v => (v > 1 ? v : v * 100).toFixed(1) + "%", higherBetter: true },
    { label: "Minutes/Game", key: "MIN", fmt: v => (v !== null && v >= 0) ? v.toFixed(1) : "N/A", higherBetter: true },
    { label: "Usage Rate %", key: "USG_PCT", fmt: v => (v !== null && !isNaN(v)) ? (v > 1 ? v : v * 100).toFixed(1) + "%" : "N/A", higherBetter: true },
    { label: "Turnovers/Game", key: "TOV", fmt: v => (v !== null && v >= 0) ? v.toFixed(1) : "N/A", higherBetter: false }
  ];

  const p1List = document.getElementById("p1-stats-list");
  const p2List = document.getElementById("p2-stats-list");

  if (p1List) p1List.innerHTML = "";
  if (p2List) p2List.innerHTML = "";

  metrics.forEach(m => {
    const v1 = p1[m.key];
    const v2 = p2[m.key];

    let p1IsLeader = false;
    let p2IsLeader = false;

    if (v1 !== undefined && v2 !== undefined && v1 !== v2 && v1 !== null && v2 !== null) {
      if (m.higherBetter) {
        p1IsLeader = v1 > v2;
        p2IsLeader = v2 > v1;
      } else {
        p1IsLeader = v1 < v2;
        p2IsLeader = v2 < v1;
      }
    }

    if (p1List) {
      p1List.innerHTML += `
        <div class="stat-box">
          <span class="stat-title">${m.label}</span>
          <span class="stat-val ${p1IsLeader ? 'leader' : ''}">${m.fmt(v1)}</span>
        </div>
      `;
    }

    if (p2List) {
      p2List.innerHTML += `
        <div class="stat-box">
          <span class="stat-title">${m.label}</span>
          <span class="stat-val ${p2IsLeader ? 'leader' : ''}">${m.fmt(v2)}</span>
        </div>
      `;
    }
  });
}

function renderRadarChart(p1, p2) {
  const canvas = document.getElementById("radarChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const labels = ["Points", "Rebounds", "Assists", "Steals", "Blocks", "Efficiency"];

  // Matches metric keys calculated in calculatePercentiles()
  const p1Percentiles = [p1.PTS_pct || 0, p1.REB_pct || 0, p1.AST_pct || 0, p1.STL_pct || 0, p1.BLK_pct || 0, p1.TS_PCT_pct || 0];
  const p2Percentiles = [p2.PTS_pct || 0, p2.REB_pct || 0, p2.AST_pct || 0, p2.STL_pct || 0, p2.BLK_pct || 0, p2.TS_PCT_pct || 0];

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
              const rawVal = context.dataset.rawStats[idx] || 0;
              const formattedRaw = idx === 5 ? (rawVal > 1 ? rawVal.toFixed(1) : (rawVal * 100).toFixed(1)) + '%' : rawVal.toFixed(1);
              return `${context.dataset.label}: ${pct}th percentile (${formattedRaw})`;
            }
          }
        }
      }
    }
  });
}