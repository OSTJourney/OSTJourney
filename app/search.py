import re

from flask import request

from .models import Songs

def SearchParseTerms(s: str) -> list[str]:
	"""
	Extract terms from a string, handling quoted strings and spaces.
	"""
	pattern = re.compile(r'"([^"]+)"|\'([^\']+)\'|(\S+)')
	return [m.group(1) or m.group(2) or m.group(3)
			for m in pattern.finditer(s)]

def SafeInt(value):
	"""
	Convert a string to an integer, returning None if the string is empty.
	Raises ValueError if the string cannot be converted to an integer.
	"""
	if not value:
		return None
	try:
		return int(value)
	except ValueError:
		raise ValueError("must be an integer")
	

def SearchGetRawArgs() -> dict[str, str]:
	"""
	Extract and clean the raw arguments from the request.
	"""
	return {
		name: request.args.get(name, '').strip()
		for name in ('query', 'title', 'artist', 'album', 'min', 'max')
	}

def SearchBuildFilters(raw: dict[str, str], min_t: int|None, max_t: int|None) -> list:
	"""
	Build a list of filters based on the raw arguments and min/max duration.
	"""
	filters = []
	field_map = {
		'query': Songs.tags,
		'title': Songs.title,
		'artist': Songs.artist,
		'album': Songs.album,
	}
	for key, column in field_map.items():
		if raw[key]:
			for term in SearchParseTerms(raw[key]):
				filters.append(column.ilike(f'%{term}%'))

	if min_t is not None:
		filters.append(Songs.duration >= min_t)
	if max_t is not None:
		filters.append(Songs.duration <= max_t)

	return filters