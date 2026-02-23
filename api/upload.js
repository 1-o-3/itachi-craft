const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { filename, data } = req.body;

    if (!filename || !data) {
        return res.status(400).json({ error: 'filename and data are required' });
    }

    // Base64 → Buffer
    const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const ext = (filename.split('.').pop() || 'jpg').toLowerCase();
    const uniqueName = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;

    const blob = await put(uniqueName, buffer, {
        access: 'public',
        contentType,
    });

    return res.status(200).json({ url: blob.url });
};
