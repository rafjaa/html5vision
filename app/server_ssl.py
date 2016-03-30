import BaseHTTPServer, SimpleHTTPServer, ssl,sys

# Generating self-signed certificate
# sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.key -out certificate.crt

if len(sys.argv) != 2:
	port = 8000
else:
	port = int(sys.argv[1])

web_server = BaseHTTPServer.HTTPServer(('', port), SimpleHTTPServer.SimpleHTTPRequestHandler)
web_server.socket = ssl.wrap_socket (web_server.socket, 
                                     server_side=True,
                                     certfile='certificate.crt',
                                     keyfile='key.key')

print 'Serving HTTPS on localhost port', str(port), ' ...'
web_server.serve_forever()
