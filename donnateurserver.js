const http = require('http');

const server = http.createServer((req, res) => {
  res.end("Votre PC fonctionne comme un serveur !");
});

server.listen(8080, '0.0.0.0', () => {
  console.log("Serveur lancé sur http://localhost:8080");
});
