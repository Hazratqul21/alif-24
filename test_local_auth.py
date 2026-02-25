import requests

print("--- REGISTER ---")
try:
    reg_data = {
        "email": "test@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "User",
        "role": "student"
    }
    r = requests.post("http://localhost:8000/api/v1/auth/register", json=reg_data)
    print("Status:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print(e)

print("\n--- LOGIN ---")
try:
    log_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    r = requests.post("http://localhost:8000/api/v1/auth/login", json=log_data)
    print("Status:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print(e)
