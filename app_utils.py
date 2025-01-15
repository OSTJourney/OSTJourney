def format_duration(seconds):
    days, seconds = divmod(seconds, 86400)
    hours, seconds = divmod(seconds, 3600)
    minutes, seconds = divmod(seconds, 60)

    duration_parts = []
    if days > 0:
        duration_parts.append(f"{round(days)} day{'s' if days > 1 else ''}")
    if hours > 0:
        duration_parts.append(f"{round(hours)} hour{'s' if hours > 1 else ''}")
    if minutes > 0:
        duration_parts.append(f"{round(minutes)} minute{'s' if minutes > 1 else ''}")
    if seconds > 0:
        duration_parts.append(f"{round(seconds)} second{'s' if seconds > 1 else ''}")

    return ', '.join(duration_parts) if duration_parts else "0 seconds"
