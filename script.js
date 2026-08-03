// Global variables for the Chart and Player Data
let myChart = null;
let playerData = [];

// metrics we will visualize on the chart
const metrics = ['ppg', 'mpg', 'true_shooting_pct', 'effective_fg_pct', 'three_point_rate'];

// 1. Load and Parse the CSV Data when the page loads
function loadData() {
    Papa.parse("transformed_player_metrics.csv", {
        download: true,
        header: true,
        complete: function(results) {
            console.log("CSV Parsed Successfully:", results.data);
            playerData = results.data;
            populateDropdown(results.data);
        }
    });
}

// 2. Populate the Dropdown menu with player names
function populateDropdown(data) {
    const select = document.getElementById("playerSelect");
    
    // Sort players by name
    const sortedPlayers = data.sort((a, b) => a.PLAYER_NAME.localeCompare(b.PLAYER_NAME));

    sortedPlayers.forEach(player => {
        if(player.PLAYER_NAME) { // Ignore any empty rows
            const option = document.createElement("option");
            option.value = player.PLAYER_NAME;
            option.text = `${player.PLAYER_NAME} (${player.TEAM_ABBREVIATION})`;
            select.appendChild(option);
        }
    });
}

// 3. Listen for changes in the dropdown menu
document.getElementById("playerSelect").addEventListener("change", function(event) {
    const selectedPlayer = event.target.value;
    updateChart(selectedPlayer);
});

// 4. Update the Radar Chart with selected player data
function updateChart(playerName) {
    // Find the data for the selected player
    const player = playerData.find(p => p.PLAYER_NAME === playerName);
    if (!player) return; // Exit if no player found

    // Extract the numeric values for the metrics we want to plot
    const chartData = metrics.map(metric => parseFloat(player[metric]));

    // Update or Create the Chart
    const ctx = document.getElementById('impactChart').getContext('2d');

    // If chart exists, destroy it before creating a new one
    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Pts/Game', 'Min/Game', 'True Shooting %', 'Eff. FG %', '3Pt Rate %'],
            datasets: [{
                label: player.PLAYER_NAME,
                data: chartData,
                backgroundColor: 'rgba(56, 189, 248, 0.2)', // Light Blue (accent color)
                borderColor: 'rgba(56, 189, 248, 1)',
                borderWidth: 2,
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(56, 189, 248, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: '#334155' },
                    grid: { color: '#334155' },
                    ticks: { display: false }, // Hide the numbers on the spider lines
                    suggestedMin: 0,
                    suggestedMax: 100 // Adjust based on data ranges
                }
            },
            plugins: {
                legend: { labels: { color: '#f8fafc' } } // Primary Text color
            }
        }
    });
}

// Start the whole process
loadData();