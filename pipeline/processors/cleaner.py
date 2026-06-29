"""
Data cleaning and normalization for NBA API responses.
"""
import pandas as pd


def clean_players(raw_players: list[dict]) -> list[dict]:
    df = pd.DataFrame(raw_players)
    df = df.rename(columns={
        "id": "nba_id",
        "full_name": "full_name",
        "first_name": "first_name",
        "last_name": "last_name",
        "is_active": "is_active",
    })
    df["is_active"] = df["is_active"].astype(bool)
    df = df.drop_duplicates(subset=["nba_id"])
    return df.to_dict("records")


def clean_teams(raw_teams: list[dict]) -> list[dict]:
    df = pd.DataFrame(raw_teams)
    df = df.rename(columns={
        "id": "nba_id",
        "full_name": "full_name",
        "abbreviation": "abbreviation",
        "nickname": "nickname",
        "city": "city",
        "state": "state",
        "year_founded": "year_founded",
    })
    df = df.drop_duplicates(subset=["nba_id"])
    return df.to_dict("records")


def clean_games(raw_games: list[dict]) -> list[dict]:
    df = pd.DataFrame(raw_games)
    # nba_api returns one row per team per game; deduplicate by game_id
    df = df.rename(columns={"GAME_ID": "nba_game_id", "GAME_DATE": "game_date"})
    df = df.drop_duplicates(subset=["nba_game_id"])
    return df.to_dict("records")
