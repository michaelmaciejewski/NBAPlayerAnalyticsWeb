let globalData = [];
let radarChart = null;

document.addEventListener("DOMContentLoaded", () => {
  Papa.parse("transformed_player_metrics.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!results.data || results.data.length === 0) {
        console.error("CSV empty or failed to parse");
        return;
      }

      // Normalize keys to find player name and team columns regardless of casing
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
          PTS: row[ptsKey] || 0,
          REB: row[rebKey] || 0,
          AST: row[astKey] || 0,
          STL: row[stlKey] || 0,
          BLK: row[blkKey] || 0,
          TS_PCT: row[tsKey] || 0
        };
      }).filter(d => d.PLAYER_NAME);

      initTeams();
      setupEventListeners();
      updateDashboard();
    }
  });
});

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
  }
}

function renderRadarChart(p1, p2) {
  const ctx = document.getElementById("radarChart").getContext("2d");

  const labels = ["Points (PTS)", "Rebounds (REB)", "Assists (AST)", "Steals (STL)", "Blocks (BLK)", "True Shooting % (TS%)"];

  const p1Metrics = [p1.PTS, p1.REB, p1.AST, p1.STL, p1.BLK, (p1.TS_PCT > 1 ? p1.TS_PCT : p1.TS_PCT * 100)];
  const p2Metrics = [p2.PTS, p2.REB, p2.AST, p2.STL, p2.BLK, (p2.TS_PCT > 1 ? p2.TS_PCT : p2.TS_PCT * 100)];

  if (radarChart) {
    radarChart.destroy();
  }

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: `${p1.PLAYER_NAME} (${p1.TEAM_ABBREVIATION})`,
          data: p1Metrics,
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        },
        {
          label: `${p2.PLAYER_NAME} (${p2.TEAM_ABBREVIATION})`,
          data: p2Metrics,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
          grid: { color: 'rgba(255, 255, 255, 0.2)' },
          pointLabels: { color: '#ffffff', font: { size: 12 } },
          ticks: { backdropColor: 'transparent', color: '#aaaaaa' }
        }
      },
      plugins: {
        legend: { labels: { color: '#ffffff', font: { size: 14 } } }
      }
    }
  });
}