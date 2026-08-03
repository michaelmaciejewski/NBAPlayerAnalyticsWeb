import duckdb

# Connect to a local database file (it creates 'nba_analytics.db' automatically)
con = duckdb.connect('nba_analytics.db')

print("Creating views and calculating player metrics...")

# 1. Query your CSV file directly using DuckDB SQL
con.execute("""
    CREATE OR REPLACE TABLE stg_nba_player_stats AS 
    SELECT * FROM read_csv_auto('nba_league_player_stats_2024_25.csv');
""")

# 2. Build your Portfolio Transformation View
con.execute("""
    CREATE OR REPLACE VIEW vw_player_impact_metrics AS
    SELECT 
        PLAYER_NAME,
        TEAM_ABBREVIATION,
        GP AS games_played,
        ROUND(MIN, 1) AS mpg,
        ROUND(PTS, 1) AS ppg,
        
        -- True Shooting Percentage (TS%)
        ROUND(
            PTS / NULLIF(2 * (FGA + (0.44 * FTA)), 0) * 100, 
            1
        ) AS true_shooting_pct,

        -- Effective Field Goal Percentage (eFG%)
        ROUND(
            (FGM + (0.5 * FG3M)) / NULLIF(FGA, 0) * 100, 
            1
        ) AS effective_fg_pct,

        -- Assist-to-Turnover Ratio
        ROUND(AST / NULLIF(TOV, 0), 2) AS ast_to_tov_ratio,

        -- 3-Point Rate
        ROUND(FG3A / NULLIF(FGA, 0) * 100, 1) AS three_point_rate,

        ROUND(PLUS_MINUS, 1) AS avg_plus_minus
    FROM stg_nba_player_stats
    WHERE GP >= 10 AND MIN >= 12.0
    ORDER BY true_shooting_pct DESC;
""")

# 3. Export the transformed metrics to a clean CSV for Tableau / Web Visuals
con.execute("""
    COPY (SELECT * FROM vw_player_impact_metrics) 
    TO 'transformed_player_metrics.csv' (HEADER, DELIMITER ',');
""")

print("✅ Success! Output saved to 'transformed_player_metrics.csv'")