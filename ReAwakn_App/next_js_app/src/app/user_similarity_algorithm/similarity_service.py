import json
import os
import pickle
import sys
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.preprocessing import MultiLabelBinarizer, OneHotEncoder
from supabase import Client, create_client


def cosine_similarity(user_1_data, user_2_data):

    user_1_data = np.asarray(user_1_data)
    user_2_data = np.asarray(user_2_data)

    if user_1_data.ndim == 1:
        user_1_data = user_1_data.reshape(1, -1)
    if user_2_data.ndim == 1:
        user_2_data = user_2_data.reshape(1, -1)

    dot_product = np.dot(user_1_data, user_2_data.T)

    norm_user_1 = np.linalg.norm(user_1_data, axis=1).reshape(-1, 1)
    norm_user_2 = np.linalg.norm(user_2_data, axis=1).reshape(-1, 1)

    norm_user_1 = np.maximum(norm_user_1, np.finfo(float).eps)
    norm_user_2 = np.maximum(norm_user_2, np.finfo(float).eps)

    similarities = dot_product / (np.dot(norm_user_1, norm_user_2.T))

    return similarities


load_dotenv()


def get_supabase_client() -> Client:
    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return create_client(url, key)


def fetch_all_users():
    try:
        supabase = get_supabase_client()
        users_table = supabase.table("users").select("*").execute()
        df = pd.DataFrame(users_table.data)
        return df
    except Exception as e:
        raise RuntimeError(f"Error fetching user data: {e}")


def preprocess_availability_data(df):
    availability_lists = []
    for index, row in df.iterrows():
        availability = row["availability"]
        if isinstance(availability, str):
            try:
                hours_avaliable = json.loads(availability)
                availability_lists.append(hours_avaliable)
            except Exception as e:
                raise RuntimeError(f"Error adding user Hours: {e}")
        elif isinstance(availability, list):
            availability_lists.append(availability)
    return availability_lists


def create_encoders_and_hashmap():
    users_df = fetch_all_users()
    if users_df.empty:
        return None, None, None

    encoders = {}
    encoded_dfs = {}

    simple_columns = ["communication_style", "time_zone", "chronotype"]

    for behavioral_attribute in simple_columns:
        if behavioral_attribute in users_df.columns:
            encoder = OneHotEncoder(sparse_output=False, handle_unknown="ignore")
            col_data = users_df[behavioral_attribute].values.reshape(-1, 1)
            encoded_data = encoder.fit_transform(col_data)
            feature_names = [
                f"{behavioral_attribute}_{category}"
                for category in encoder.categories_[0]
            ]
            encoded_df = pd.DataFrame(
                encoded_data, columns=feature_names, index=users_df.index
            )

            encoders[behavioral_attribute] = encoder
            encoded_dfs[behavioral_attribute] = encoded_df

    if "availability" in users_df.columns:
        availability_lists = preprocess_availability_data(users_df)
        mlb = MultiLabelBinarizer()
        availability_encoded = mlb.fit_transform(availability_lists)
        feature_names = [f"availability_{label}" for label in mlb.classes_]
        availability_df = pd.DataFrame(
            availability_encoded, columns=feature_names, index=users_df.index
        )

        encoders["availability"] = mlb
        encoded_dfs["availability"] = availability_df

    all_encoded_features = []
    feature_names = []

    for user_trait in [
        "communication_style",
        "time_zone",
        "chronotype",
        "availability",
    ]:
        if user_trait in encoded_dfs and not encoded_dfs[user_trait].empty:
            all_encoded_features.append(encoded_dfs[user_trait])
            feature_names.extend(encoded_dfs[user_trait].columns.tolist())

    if not all_encoded_features:
        return encoders, {}, []

    combined_matrix = pd.concat(all_encoded_features, axis=1)

    user_encodings = {}
    for index, row in users_df.iterrows():
        user_id = row["id"]
        encoded_vector = combined_matrix.iloc[index].values
        user_encodings[user_id] = encoded_vector
    return encoders, user_encodings, feature_names


def calculate_user_similarity(
    user1_id: str, user2_id: str, user_encodings: Dict
) -> float:
    if user1_id not in user_encodings or user2_id not in user_encodings:
        raise RuntimeError("user not found")

    user1_vector = user_encodings[user1_id].reshape(1, -1)
    user2_vector = user_encodings[user2_id].reshape(1, -1)

    return cosine_similarity(user1_vector, user2_vector)[0][0]


def cache_data(
    encoders: Dict,
    user_encodings: Dict,
    feature_names: List[str],
    filepath: str = "user_similarity_data.pkl",
):
    data = {
        "encoders": encoders,
        "user_encodings": user_encodings,
        "feature_names": feature_names,
    }

    with open(filepath, "wb") as f:
        pickle.dump(data, f)


def load_encoders_and_data(
    filepath: str = "user_similarity_data.pkl",
) -> Tuple[Dict, Dict, List[str]]:
    try:
        with open(filepath, "rb") as f:
            data = pickle.load(f)
        return data["encoders"], data["user_encodings"], data["feature_names"]
    except FileNotFoundError as e:
        raise FileNotFoundError(f"Couldn't find `{filepath}`") from e


class SimilarityService:
    def __init__(self):

        self.cache_file = "user_similarity_data.pkl"
        self.encoders = None
        self.user_encodings = None
        self.feature_names = None
        self._load_data()

    def _load_data(self):
        self.encoders, self.user_encodings, self.feature_names = load_encoders_and_data(
            self.cache_file
        )

    def refresh_data(self):
        self.encoders, self.user_encodings, self.feature_names = (
            create_encoders_and_hashmap()
        )

        cache_data(
            self.encoders, self.user_encodings, self.feature_names, self.cache_file
        )

    def get_similarity(self, user1_id: str, user2_id: str) -> float:
        if not self.user_encodings:
            return 0.0
        return calculate_user_similarity(user1_id, user2_id, self.user_encodings)


similarity_service = SimilarityService()
