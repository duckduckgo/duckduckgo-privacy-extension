module.exports = {
    parseQueryString: (qs) => {
        if (typeof qs !== 'string') {
            throw new Error('tried to parse a non-string query string');
        }

        const parsed = {};

        if (qs[0] === '?') {
            qs = qs.substr(1);
        }

        const parts = qs.split('&');

        parts.forEach((part) => {
            const [key, val] = part.split('=');

            if (key && val) {
                parsed[key] = val;
            }
        });

        return parsed;
    },
};
