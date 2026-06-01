import re


def to_camel(snake_str: str) -> str:
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def keys_to_camel(data):
    if isinstance(data, list):
        return [keys_to_camel(item) for item in data]
    if isinstance(data, dict):
        return {to_camel(k): keys_to_camel(v) for k, v in data.items()}
    return data
