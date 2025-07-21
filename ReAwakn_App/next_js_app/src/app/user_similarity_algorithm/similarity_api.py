#!/usr/bin/env python3

import sys
try:
    from .similarity_service import similarity_service
except ImportError:
    from similarity_service import similarity_service


def main():
    if len(sys.argv) < 2:
        print("error", file=sys.stderr)
        sys.exit(1)
    action = sys.argv[1]
    try:
        if action == "similarity":
            if len(sys.argv) != 4:
                sys.exit(1)

            user1_id = sys.argv[2]
            user2_id = sys.argv[3]

            similarity = similarity_service.get_similarity(user1_id, user2_id)
            print(similarity)

        elif action == "refresh":
            similarity_service.refresh_data()

        else:
            sys.exit(1)

    except Exception as e:
        sys.exit(1)


if __name__ == "__main__":
    main()
