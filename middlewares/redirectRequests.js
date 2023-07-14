const redirectRequests = (req, res, next) => {
    if (!req.url.startsWith('/api')) {
        return res.redirect('/');
    }
    next()
}

module.exports = {
    redirectRequests
}