#!/usr/bin/env python3

import json
import sys

from similarity_service import similarity_service


def main():
    if len(sys.argv) < 2:
        sys.exit(1)
    action = sys.argv[1]

    try:
        if action == "similarity":
            if len(sys.argv) != 4:
                sys.exit(1)

            user1_id = sys.argv[2]
            user2_id = sys.argv[3]

            similarity = similarity_service.get_similarity(user1_id, user2_id)

        elif action == "similar_users":
            if len(sys.argv) < 3:
                sys.exit(1)

            user_id = sys.argv[2]
            top_n = int(sys.argv[3]) if len(sys.argv) > 3 else 10

            similar_users = similarity_service.get_similar_users(user_id, top_n)

        elif action == "detailed_compatibility":
            if len(sys.argv) != 4:
                sys.exit(1)

            user1_id = sys.argv[2]
            user2_id = sys.argv[3]

            compatibility = similarity_service.get_user_compatibility_score(
                user1_id, user2_id
            )

        elif action == "refresh":
            similarity_service.refresh_data()

        else:
            sys.exit(1)

    except Exception as e:
        sys.exit(1)


if __name__ == "__main__":
    main()
