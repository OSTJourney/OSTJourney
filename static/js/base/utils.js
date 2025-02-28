function copyTextToClipboard(text) {
	if (!navigator.clipboard) {
		fallbackCopyTextToClipboard(text);
		return;
	}

	navigator.clipboard.writeText(text)
		.then(() => {
			alert('Text copied to clipboard');
		})
		.catch(err => {
			console.error('Error copying text: ', err);
			alert('Failed to copy text. Trying alternative method.');
			fallbackCopyTextToClipboard(text);
		});
}

function fallbackCopyTextToClipboard(text) {
	const textArea = document.createElement("textarea");
	textArea.value = text;
	textArea.style.position = "fixed";
	textArea.style.opacity = 0;
	document.body.appendChild(textArea);
	textArea.select();
	try {
		document.execCommand('copy');
		alert('Text copied to clipboard (fallback method)');
	} catch (err) {
		console.error('Fallback: Unable to copy', err);
		alert('Clipboard copy failed.');
	}
	document.body.removeChild(textArea);
}

function formatDuration(duration) {
	let formatted = "";
	let hours = Math.floor(duration / 3600);
	if (hours > 0) {
		duration -= hours * 3600;
		formatted = hours + ":";
	}
	let minutes = Math.floor(duration / 60);
	duration -= minutes * 60;
	formatted += (minutes < 10 ? "0" : "") + minutes + ":";
	formatted += (duration < 10 ? "0" : "") + Math.floor(duration);
	return formatted;
}
