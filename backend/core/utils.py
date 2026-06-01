import re

from django.contrib.auth import authenticate
from django.contrib.auth.models import User


def authenticate_login(identifier: str, password: str):
    """Authenticate with username or email (case-insensitive email)."""
    identifier = (identifier or "").strip()
    if not identifier or not password:
        return None

    user = authenticate(username=identifier, password=password)
    if user is not None:
        return user

    if "@" in identifier:
        match = User.objects.filter(email__iexact=identifier).first()
        if match:
            return authenticate(username=match.username, password=password)
    return None


def to_camel(snake_str: str) -> str:
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def keys_to_camel(data):
    if isinstance(data, list):
        return [keys_to_camel(item) for item in data]
    if isinstance(data, dict):
        return {to_camel(k): keys_to_camel(v) for k, v in data.items()}
    return data
