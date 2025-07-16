import sys
import os
import pandas as pd
import numpy as np
from supabase import create_client, Client
from dotenv import load_dotenv
from sklearn.preprocessing import OneHotEncoder, MultiLabelBinarizer
from sklearn.metrics.pairwise import cosine_similarity
import ast
import json
import pickle
from typing import Dict, List, Tuple, Optional

load_dotenv()

def get_supabase_client() -> Client:# gets client

    url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return create_client(url, key)

def fetch_all_users(): #gets users table data and makes it a dataframe
    try:
        supabase = get_supabase_client()
        users_table = supabase.table('users').select('*').execute()
        df = pd.DataFrame(users_table.data)
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return pd.DataFrame()

def preprocess_availability_data(df): # makes data format consistent

    availability_lists = []

    for idx, row in df.iterrows():
        availability = row['availability']

        if isinstance(availability, str): # case for one avaliability chosen
            try:
                parsed = json.loads(availability)
                availability_lists.append(parsed if isinstance(parsed, list) else [])
            except:
                try:
                    parsed = ast.literal_eval(availability)
                    availability_lists.append(parsed if isinstance(parsed, list) else [])
                except:
                    availability_lists.append([])
        elif isinstance(availability, list): # case for multiple
            availability_lists.append(availability)
        else:
            availability_lists.append([])

    return availability_lists

def create_encoders_and_hashmap():
    """
    Create encoders and user encoding hashmap
    Returns: (encoders, user_encodings_hashmap, feature_names)
    """
    users_df = fetch_all_users()

    if users_df.empty:
        return None, None, None

    # Dictionary to store OHE's and encoded data
    encoders = {}
    encoded_dfs = {}


    simple_columns = ['communication_style', 'time_zone', 'chronotype']

    for col in simple_columns:
        if col in users_df.columns:
            encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            col_data = users_df[col].values.reshape(-1, 1) # makes it a 2d OHE array
            encoded_data = encoder.fit_transform(col_data)
            feature_names = [f"{col}_{category}" for category in encoder.categories_[0]]
            encoded_df = pd.DataFrame(encoded_data, columns=feature_names, index=users_df.index)

            encoders[col] = encoder
            encoded_dfs[col] = encoded_df

    if 'availability' in users_df.columns:
        availability_lists = preprocess_availability_data(users_df)
        mlb = MultiLabelBinarizer()
        availability_encoded = mlb.fit_transform(availability_lists)
        feature_names = [f"availability_{label}" for label in mlb.classes_]
        availability_df = pd.DataFrame(availability_encoded, columns=feature_names, index=users_df.index)

        encoders['availability'] = mlb
        encoded_dfs['availability'] = availability_df

    # Combine all encoded features
    all_encoded_features = []
    feature_names = []

    for col_name in ['communication_style', 'time_zone', 'chronotype', 'availability']:
        if col_name in encoded_dfs and not encoded_dfs[col_name].empty:
            all_encoded_features.append(encoded_dfs[col_name])
            feature_names.extend(encoded_dfs[col_name].columns.tolist())

    if not all_encoded_features:
        return encoders, {}, []

    combined_encoded = pd.concat(all_encoded_features, axis=1)

    # Create hashmap: user_id: encoded_vector
    user_encodings = {}
    for idx, row in users_df.iterrows():
        user_id = row['id']
        encoded_vector = combined_encoded.iloc[idx].values
        user_encodings[user_id] = encoded_vector

    return encoders, user_encodings, feature_names

def calculate_user_similarity(user1_id: str, user2_id: str, user_encodings: Dict) -> float:
    if user1_id not in user_encodings or user2_id not in user_encodings:
        return 0.0

    user1_vector = user_encodings[user1_id].reshape(1, -1)
    user2_vector = user_encodings[user2_id].reshape(1, -1)

    similarity = cosine_similarity(user1_vector, user2_vector)[0][0]
    return float(similarity)

def get_similar_users(target_user_id: str, user_encodings: Dict, top_n: int = 10) -> List[Tuple[str, float]]:

    if target_user_id not in user_encodings:
        return []

    target_vector = user_encodings[target_user_id].reshape(1, -1)
    similarities = []

    for user_id, user_vector in user_encodings.items():
        if user_id != target_user_id:
            other_vector = user_vector.reshape(1, -1)
            similarity = cosine_similarity(target_vector, other_vector)[0][0]
            similarities.append((user_id, float(similarity)))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_n]

def save_encoders_and_data(encoders: Dict, user_encodings: Dict, feature_names: List[str],
                          filepath: str = "user_similarity_data.pkl"):
    #Save encoders and user encodings to a file
    data = {
        'encoders': encoders,
        'user_encodings': user_encodings,
        'feature_names': feature_names
    }

    with open(filepath, 'wb') as f:
        pickle.dump(data, f)


def load_encoders_and_data(filepath: str = "user_similarity_data.pkl") -> Tuple[Dict, Dict, List[str]]:
    #load data from a file
    try:
        with open(filepath, 'rb') as f:
            data = pickle.load(f)

        return data['encoders'], data['user_encodings'], data['feature_names']
    except FileNotFoundError:
        return create_encoders_and_hashmap()

class SimilarityService:
    def __init__(self, use_cache: bool = True):
        self.use_cache = use_cache
        self.cache_file = "user_similarity_data.pkl"
        self.encoders = None
        self.user_encodings = None
        self.feature_names = None
        self._load_data()

    def _load_data(self):
        if self.use_cache:
            self.encoders, self.user_encodings, self.feature_names = load_encoders_and_data(self.cache_file)
        else:
            self.encoders, self.user_encodings, self.feature_names = create_encoders_and_hashmap()

    def refresh_data(self):
        self.encoders, self.user_encodings, self.feature_names = create_encoders_and_hashmap()
        if self.use_cache:
            save_encoders_and_data(self.encoders, self.user_encodings, self.feature_names, self.cache_file)

    def get_similarity(self, user1_id: str, user2_id: str) -> float:
        if not self.user_encodings:
            return 0.0
        return calculate_user_similarity(user1_id, user2_id, self.user_encodings)

    def get_similar_users(self, user_id: str, top_n: int = 10) -> List[Tuple[str, float]]:
        if not self.user_encodings:
            return []
        return get_similar_users(user_id, self.user_encodings, top_n)

    def get_user_compatibility_score(self, user1_id: str, user2_id: str) -> Dict:
        if not self.user_encodings or user1_id not in self.user_encodings or user2_id not in self.user_encodings:
            return {'overall_similarity': 0.0, 'feature_breakdown': {}}

        overall_similarity = self.get_similarity(user1_id, user2_id)

        feature_breakdown = {}
        user1_vector = self.user_encodings[user1_id]
        user2_vector = self.user_encodings[user2_id]

        start_idx = 0
        for category in ['communication_style', 'time_zone', 'chronotype', 'availability']:
            if category in self.encoders:
                if category == 'availability':
                    n_features = len(self.encoders[category].classes_)
                else:
                    n_features = len(self.encoders[category].categories_[0])

                if n_features > 0:
                    end_idx = start_idx + n_features
                    cat_user1 = user1_vector[start_idx:end_idx].reshape(1, -1)
                    cat_user2 = user2_vector[start_idx:end_idx].reshape(1, -1)
                    cat_similarity = cosine_similarity(cat_user1, cat_user2)[0][0]
                    feature_breakdown[category] = float(cat_similarity)
                    start_idx = end_idx

        return {
            'overall_similarity': overall_similarity,
            'feature_breakdown': feature_breakdown
        }

similarity_service = SimilarityService()




if __name__ == "__main__":
    similarity_service.refresh_data()
    user_ids = list(similarity_service.user_encodings.keys())

    if len(user_ids) >= 2:
        user1, user2 = user_ids[0], user_ids[1]
        similarity = similarity_service.get_similarity(user1, user2)
        compatibility = similarity_service.get_user_compatibility_score(user1, user2)
        similar_users = similarity_service.get_similar_users(user1, top_n=5)
