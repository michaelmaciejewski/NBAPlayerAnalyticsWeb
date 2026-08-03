import pandas as pd
from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import playergamelog, shotchartdetail, leaguedashplayerstats
import time

print("--- Starting NBA Data Extraction ---")

# ==========================================
# 1. FETCH LEAGUE-WIDE PLAYER STATS (2024-25)
# ==========================================
print("\nFetching league-wide player totals...")
# Pulls season totals, advanced shooting, and efficiency numbers for all players
league_stats = leaguedashplayerstats.LeagueDashPlayerStats(
    season='2024-25',
    per_mode_detailed='PerGame'
)
df_league = league_stats.get_data_frames()[0]

# Save to CSV
df_league.to_csv('nba_league_player_stats_2024_25.csv', index=False)
print(f"✅ Saved 'nba_league_player_stats_2024_25.csv' ({len(df_league)} players)")

# Pause briefly so stats.nba.com doesn't rate-limit your requests
time.sleep(1)

# ==========================================
# 2. FETCH SPECIFIC PLAYER GAME LOGS (e.g., Stephen Curry)
# ==========================================
print("\nFetching Stephen Curry's 2024-25 Game Logs...")

# Find Stephen Curry's internal NBA Player ID
nba_players = players.get_players()
curry = [p for p in nba_players if p['full_name'] == 'Stephen Curry'][0]
curry_id = curry['id']

# Pull game logs for Curry
curry_logs = playergamelog.PlayerGameLog(player_id=curry_id, season='2024-25')
df_curry = curry_logs.get_data_frames()[0]

# Save to CSV
df_curry.to_csv('stephen_curry_gamelogs_2024_25.csv', index=False)
print(f"✅ Saved 'stephen_curry_gamelogs_2024_25.csv' ({len(df_curry)} games)")

time.sleep(1)

# ==========================================
# 3. FETCH SHOT CHART DATA (Coordinates for Visualizations)
# ==========================================
print("\nFetching Stephen Curry's Shot Locations (X, Y Coordinates)...")

shot_chart = shotchartdetail.ShotChartDetail(
    team_id=0,
    player_id=curry_id,
    season_nullable='2024-25',
    context_measure_simple='FGA'  # Field Goal Attempts
)

# ShotChartDetail returns shot location rows [LOC_X, LOC_Y, SHOT_MADE_FLAG, etc.]
df_shots = shot_chart.get_data_frames()[0]

# Save to CSV
df_shots.to_csv('stephen_curry_shots_2024_25.csv', index=False)
print(f"✅ Saved 'stephen_curry_shots_2024_25.csv' ({len(df_shots)} shot attempts)")

print("\n--- All Extraction Complete! ---")