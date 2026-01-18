import secrets
with open("jwt_secret.txt", "w") as f:
    f.write(secrets.token_hex(64))
