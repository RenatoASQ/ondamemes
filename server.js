const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const saltRounds = 15;
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://ondamemeswebapp.s3-website.eu-west-3.amazonaws.com"],
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
const db = mysql.createConnection({
  host: "ondamemes.cpby2zv5jtag.eu-west-3.rds.amazonaws.com",
  user: "root",
  database: "ondamemes",
  password: "ondamemes123",
});
const jwtSecret = "RenatoHenriqueMemePage";
db.connect((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Connected to MySQL Database!");
  }
});
app.post("/register", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      throw err;
    }
    db.query(
      "INSERT INTO users (username, password) VALUES (?,?)",
      [username, hash],
      (err, result) => {
        if (err) throw err;
        res.send({ ack: true });
      }
    );
  });
});

const verifyJWT = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    res.status(403).json({ auth: false });
  } else {
    try {
      jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
          res.status(403).json({ auth: false });
        } else {
          next();
        }
      });
    } catch (err) {
      throw err;
    }
  }
};
app.get("/imgPreview", verifyJWT, (req, res) => {
  res.sendFile(__dirname + "/uploads/" + req.query.filename);
});
app.get("/getAllMemes", verifyJWT, (req, res) => {
  db.query(
    "SELECT posts.pid, CONVERT(posts.imagecode USING utf8) as imagecode,posts.title,posts.description FROM posts",
    (err, result) => {
      if (err) throw err;
      res.send(result);
    }
  );
});
app.post("/postComment", verifyJWT, (req, res) => {
  const pid = req.body.pid;
  const username = req.body.username;
  const text = req.body.text;
  db.query(
    "INSERT INTO comments (pid,username,text) VALUES (?,?,?)",
    [pid, username, text],
    (err, result) => {
      if (err) throw err;
      res.send(result);
    }
  );
});

app.get("/getComments", verifyJWT, (req, res) => {
  const pid = req.query.pid;
  db.query("SELECT * FROM comments WHERE pid=?", [pid], (err, result) => {
    if (err) throw err;
    res.send(result);
  });
});
app.get("/isUserAuthed", verifyJWT, (req, res) => {
  res.json({ auth: true });
});

app.get("/logout", (req, res) => {
  res.status(202).clearCookie("token").json({ ack: true });
});
app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    (err, result) => {
      if (err) {
        throw err;
      }
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (error, response) => {
          if (response) {
            const id = result[0].id;
            const username = result[0].username;
            let payload = { uid: id, username: username };
            const token = jwt.sign(payload, jwtSecret, {
              noTimestamp: true,
              expiresIn: "24h",
            });
            res
              .json({ ack: true, id: id, username: username, token: token });
          } else {
            res.json({ ack: false, message: "Wrong Credentials!" });
          }
        });
      } else {
        res.json({ ack: false, message: "Wrong Credentials!" });
      }
    }
  );
});

app.post("/meme/upload", verifyJWT, function (req, res) {
  let title = req.body.title;
  let description = req.body.description;
  let image = req.body.image;

  db.query(
    "INSERT INTO posts (title,description,imagecode) VALUES (?,?,?)",
    [title, description, image],
    (err, result) => {
      if (err) throw err;
      res.json({ ack: true });
    }
  );
});

app.get("getUserInfo", verifyJWT, (req, res) => {
  res.json({ id: req.id, username: req.username });
});

app.listen(4000, () => {
  console.log("Web Server Running on 4000");
});
