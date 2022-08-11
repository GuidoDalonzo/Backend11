const express = require("express");
const session = require("express-session");
const exphbs = require("express-handlebars");
const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");

const app = express();
const httpServer = new HttpServer(app);
const io = new IOServer(httpServer);

const optionsMDB = require("./options/mariaDB");
const knexMDB = require("knex")(optionsMDB);
const optionsSQL3 = require("./options/SQLite3");
const knexSQL3 = require("knex")(optionsSQL3);

const data = require("./api/dataBase.js");
const mdb = new data(knexMDB, "products");
const sql3 = new data(knexSQL3, "messages");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("./public"));
app.use(
  session({
    secret: "cursoBackend",
    resave: false,
    saveUninitialized: false,
  })
);

/* -------------------------------------------------------------------------- */
/*                                    RUTAS                                   */
/* -------------------------------------------------------------------------- */

app.get("/", (req, res) => {
  if (req.session == true) {
    res.sendFile("index.html", { root: __dirname });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { nombre, password } = req.body;
  const usuario = usuariosDB.find(
    (usuario) => usuario.nombre == nombre && usuario.password == password
  );
  if (!usuario) {
    res.render("login-error");
  } else {
    req.session.nombre = nombre;
    res.redirect("/datos");
  }
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { nombre, password, direccion } = req.body;
  const usuario = usuariosDB.find((usuario) => usuario.nombre == nombre);
  if (usuario) {
    res.render("register-error");
  } else {
    usuariosDB.push({ nombre, password, direccion });
    res.redirect("/login");
  }
});

app.get("/datos", (req, res) => {
  if (req.session.nombre) {
    const datosUsuario = usuariosDB.find(
      (usuario) => usuario.nombre == req.session.nombre
    );
    res.render("datos", {
      datos: datosUsuario,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    res.redirect("/login");
  });
});

/* -------------------------------------------------------------------------- */
/*                               conexion socket                              */
/* -------------------------------------------------------------------------- */
io.on("connection", async (socket) => {
  console.log("Usuario conectado !!!!!!!!!");

  // PRODUCTOS
  socket.emit("productos", await mdb.getAll());

  socket.on("actualizar", async (producto) => {
    mdb.save(producto);
    io.sockets.emit("productos", await mdb.getAll());
  });

  // MENSAJES
  socket.emit("mensajes", await sql3.getAll());

  socket.on("mensajeNuevo", async (mensaje) => {
    mensaje.fyh = new Date().toLocaleString();
    sql3.save(mensaje);
    io.sockets.emit("mensajes", await sql3.getAll());
  });
});

const PORT = 8080 || process.env.PORT;

const server = httpServer.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${server.address().port}`);
});
server.on("error", (error) => console.log(`Error en servidor ${error}`));
