const http = require("http");
const fs = require("fs");

const host = "localhost";
const port = 8000;

const GET = "GET";
const POST = "POST";
const DELETE = "DELETE";

//МОК объект
const user = {
  id: 123,
  username: "testuser",
  password: "qwerty",
};

//сервисные функции
const types = {
  object: JSON.stringify,
  string: (s) => s,
  number: (n) => n.toString(),
  undefined: () => "not found",
};

const returnFilename = () => {
  return fs.readdirSync(__dirname + "/files").join(", ");
};

const writeFilename = (res, file, content) => {
  if (!fs.existsSync(`${__dirname}/files/${file}.txt`)) {
    fs.writeFileSync(`${__dirname}/files/${file}.txt`, content, "utf8");
  } else {
    res.statusCode = 400;
    res.end("Файл существует");
  }
};

const deleteFilename = (res, file) => {
  if (fs.existsSync(`${__dirname}/files/${file}.txt`)) {
    fs.unlink(`${__dirname}/files/${file}.txt`, (err) => {
      if (err) throw err;
      // не удалось удалить файл
      console.log("Файл успешно удалён");
      res.statusCode = 200;
      res.end("Файл успешно удален");
    });
  } else {
    res.statusCode = 400;
    res.end("Файла не существует");
  }
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
    return { body: "<h1>HTTP method not allowed</h1>", head: "405" };
  }
};

const setCookie = (user) => {
  let date = new Date(Date.now() + 86400e3 * 2);
  date = date.toUTCString();
  let httpOnly = false;
  let preparedCookie = [];
  const expires = `expires=${date}`;
  let cookie = `userId=${user.id}; ${expires}; Path=/; Domain=${host}`;
  let cookieauthorized = `authorized=true; ${expires}; Path=/; Domain=${host}`;
  if (httpOnly) {
    cookie += "; HttpOnly";
    cookieauthorized += "; HttpOnly";
  }
  preparedCookie.push(cookie);
  preparedCookie.push(cookieauthorized);
  return preparedCookie;
};

const parseCookie = (client) => {
  const { req } = client;
  const { cookie } = req.headers;
  const getcookie = {};
  if (!cookie) return;
  const items = cookie.split(";");
  for (const item of items) {
    const parts = item.split("=");
    const key = parts[0].trim();
    const val = parts[1] || "";
    getcookie[key] = val.trim();
  }
  return getcookie;
};

//Контроллеры
const getController = (body) => {
  return async (client) => {
    const cookie = parseCookie(client);
    console.log(cookie);
    return getResult(client.method, permissionResponse(body, 200, GET));
  };
};
const postController = () => {
  return async (client) => {
    const { res, req } = client;
    const { authorized, userId } = parseCookie(client);
    if (authorized == "true" && userId == user.id) {
      req.on("data", (chunk) => {
        let filename = JSON.parse(chunk).filename;
        let content = JSON.parse(chunk).content;
        writeFilename(res, filename, content);
      });
      return getResult(client.method, permissionResponse("success", 200, POST));
    } else {
      return getResult(
        client.method,
        permissionResponse("нет доступа", 400, POST)
      );
    }
  };
};
const deleteController = () => {
  return async (client) => {
    const { res, req } = client;
    const { authorized, userId } = parseCookie(client);
    if (authorized == "true" && userId == user.id) {
      req.on("data", (chunk) => {
        let filename = JSON.parse(chunk).filename;
        deleteFilename(res, filename);
      });
      return getResult(
        client.method,
        permissionResponse("success", 200, DELETE)
      );
    } else {
      return getResult(
        client.method,
        permissionResponse("нет доступа", 400, DELETE)
      );
    }
  };
};
const redirectController = (redirected) => {
  return async (client) => {
    const { res, method } = client;
    res.setHeader("Location", redirected);
    return getResult(
      method,
      permissionResponse(
        "The resource is located at the new address",
        301,
        GET,
        redirected
      )
    );
  };
};
const authController = () => {
  return async (client) => {
    const { method, req, res } = client;
    req.on("data", (chunk) => {
      if (
        JSON.parse(chunk).username == user.username &&
        JSON.parse(chunk).password == user.password
      ) {
        res.setHeader("Set-Cookie", setCookie(user));
      } else {
        res.statusCode = 400;
        res.end("Неверный логин или пароль");
      }
    });
    return getResult(method, permissionResponse("success", 200, POST));
  };
};

//Маршрутизация
const routing = {
  "/get": getController(returnFilename()),
  "/post": postController(),
  "/delete": deleteController(),
  "/redirect": redirectController("/redirected"),
  "/redirected": getController("New address"),
  "/auth": authController(),
};

//Сервер и обработчик
async function requestListener(req, res) {
  const { method, url, headers } = req;
  const client = { method: method, req: req, res: res };
  console.log(`${method} ${url} ${headers.cookie}`);
  const handler = routing[url];
  if (!handler) {
    res.statusCode = 404;
    res.end("Not found 404");
    return;
  }
  handler(client).then(
    (data) => {
      const type = typeof data.body;
      const serializer = types[type];
      const result = serializer(data.body);
      console.log(`Ответ ${data.head}`);
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
