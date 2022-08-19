const http = require("http");
const fs = require("fs");

const host = "localhost";
const port = 8000;

const GET = "GET";
const POST = "POST";
const DELETE = "DELETE";
const PUT = "PUT";

const returnFilename = () => {
  return fs.readdirSync(__dirname + "/files").join(", ");
};

const permissionResponse = (body, head, method, redirected) => {
  return {
    body: body,
    head: head,
    method: method,
    redirected: redirected,
  };
};

const getResult = (method, ...permissionResponse) => {
  const permissionMethod = [...permissionResponse];
  const resultIndex = permissionMethod.findIndex(
    (item) => item.method == method
  );
  if (resultIndex != -1) {
    return permissionMethod[resultIndex];
  } else {
    return { body: "HTTP method not allowed", head: "405" };
  }
};

const routing = {
  "/get": async (method) => {
    return getResult(method, permissionResponse(returnFilename(), 200, GET));
  },
  "/post": async (method) => {
    return getResult(method, permissionResponse("success", 200, POST));
  },
  "/delete": async (method) => {
    return getResult(method, permissionResponse("success", 200, DELETE));
  },
  "/redirect": async (method) => {
    return getResult(
      method,
      permissionResponse(
        "The resource is located at the new address",
        301,
        GET,
        "/redirected"
      )
    );
  },
  "/redirected": async (method) => {
    return getResult(method, permissionResponse("New address", 200, GET));
  },
};

const types = {
  object: JSON.stringify,
  string: (s) => s,
  number: (n) => n.toString(),
  undefined: () => "not found",
};

async function requestListener(req, res) {
  const { method, url, headers } = req;
  console.log(`${method} ${url}`);
  const handler = routing[url];
  if (!handler) {
    res.statusCode = 404;
    res.end("Not found 404");
    return;
  }
  handler(method).then(
    (data) => {
      const type = typeof data.body;
      const serializer = types[type];
      const result = serializer(data.body);
      console.log(`Ответ ${data.head}`);
      if (!!data.redirected) {
        res.setHeader("Location", data.redirected);
      }
      res.writeHead(data.head);
      res.end(result);
    },
    (err) => {
      res.statusCode = 500;
      res.end("Internal Server Error 500");
      console.log(err);
    }
  );
}

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Сервер запущен и доступен по адресу http://${host}:${port}`);
});
