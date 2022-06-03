async function get(url) {
    try {
        return await fetch(url);
    } catch (error) {
        return null;
    }
}

async function post(url, data) {
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch (error) {
        return null;
    }
}

export { get, post };
