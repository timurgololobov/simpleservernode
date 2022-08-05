const http = require("http");
const host = "localhost";
const port = 8000;
const fs = require("fs");
const filename = fs.readdirSync(__dirname + "/files").join(", ");

const requestListener = (req, res) => {
  if (req.url === "/get" && req.method === "GET") {
    res.writeHead(200);
    res.end(filename);
  } else if (req.url === "/get" && req.method !== "GET") {
    res.writeHead(500);
    res.end("Internal server error");
  } else if (req.url === "/delete" && req.method === "DELETE") {
    res.writeHead(200);
    res.end("success");
  } else if (req.url === "/post" && req.method === "POST") {
    res.writeHead(200);
    res.end("success");
  } else if (req.url === "/redirect") {
    res.writeHead(308);
    res.end("The resource is located at the new address");
  } else if (req.url === "/redirected") {
    res.writeHead(200);
    res.end("New address");
  } else {
    res.writeHead(405);
    res.end("HTTP method not allowed");
  }
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Сервер запущен и доступен по адресу http://${host}:${port}`);
});
