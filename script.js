let globalData = [];
let radarChart = null;

document.addEventListener("DOMContentLoaded", () => {
  Papa.parse("transformed_player_metrics.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: (results) => {
      globalData = results.data.filter(row => row.PLAYER_NAME && row.TEAM_ABBREVIATION);
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

  // Populate team dropdowns
  teams.forEach(team => {
    team1Select.add(new Option(team, team));
    team2Select.add(new Option(team, team));
  });

  // Default initial teams (e.g., GSW vs LAL if present, otherwise first two)
  if (teams.includes("GSW")) team1Select.value = "GSW";
  if (teams.includes("LAL")) team2Select.value = "LAL";

  // Populate player dropdowns based on initial teams
  updatePlayerDropdown(1);
  updatePlayerDropdown(2);
}

function updatePlayerDropdown(playerNum) {
  const teamVal = document.getElementById(`team${playerNum}-select`).value;
  const playerSelect = document.getElementById(`player${playerNum}-select`);

  // Filter dataset by selected team
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
  // Team 1 Change -> update Player 1 dropdown -> refresh chart
  document.getElementById("team1-select").addEventListener("change", () => {
    updatePlayerDropdown(1);
    updateDashboard();
  });

  // Team 2 Change -> update Player 2 dropdown -> refresh chart
  document.getElementById("team2-select").addEventListener("change", () => {
    updatePlayerDropdown(2);
    updateDashboard();
  });

  // Player selections change -> refresh chart
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

  const p1Metrics = [p1.PTS || 0, p1.REB || 0, p1.AST || 0, p1.STL || 0, p1.BLK || 0, (p1.TS_PCT || 0) * 100];
  const p2Metrics = [p2.PTS || 0, p2.REB || 0, p2.AST || 0, p2.STL || 0, p2.BLK || 0, (p2.TS_PCT || 0) * 100];

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