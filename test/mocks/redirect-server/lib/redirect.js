var http = require('http');
var url = require('url');

// module.exports is a middleware
module.exports = function (redirects, port) {
  return http.createServer(function (req, res) {
    var redirect;
    if (req.headers.host) {
      var requestHost = req.headers.host.split(':')[0];
      redirect = redirects[requestHost];
    }
    
    // if the host is not found in the configuration, we default to the catch all
    if (!redirect){
      redirect = redirects['*'];
    }
    
    if (redirect){
      var newUrl = redirect.host + url.parse(req.url).pathname;

      res.statusCode = redirect.code || 302;
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Location', newUrl);
      res.end('Redirecting to '+newUrl);
    } else {
      // there is no catch all, we will just show an error message
      res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
        res.end('Host not found');
    }
    
  }).listen(port);
}
