import bcrypt from "bcrypt";
import MongoStore from "connect-mongo";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import fs from "fs";
import { Server } from "socket.io";
import { sendMatchRequest, isMatchRequest } from "./matchingService";
import { HistoryItem, Question, User, UserWithoutPassword } from "./types";

dotenv.config();

// ============================================================================
// Global constants
// ============================================================================

if (
  process.env.AUTH_MONGODB_URI === undefined ||
  process.env.AUTH_SESSION_SECRET === undefined
) {
  throw new Error("dotenv is not configured!");
}

const PORT = process.env.PORT !== undefined ? Number(process.env.PORT) : 8080;

const AUTH_MONGODB_URI = fs.existsSync(process.env.AUTH_MONGODB_URI)
  ? fs.readFileSync(process.env.AUTH_MONGODB_URI, "utf8").trim()
  : process.env.AUTH_MONGODB_URI;
const AUTH_SESSION_SECRET = fs.existsSync(process.env.AUTH_SESSION_SECRET)
  ? fs.readFileSync(process.env.AUTH_SESSION_SECRET, "utf8").trim()
  : process.env.AUTH_SESSION_SECRET;

const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL ?? "http://localhost:3219";
const QUESTION_SERVICE_URL =
  process.env.QUESTION_SERVICE_URL ?? "http://localhost:3001";
const HISTORY_SERVICE_URL =
  process.env.HISTORY_SERVICE_URL ?? "http://localhost:7999";

const EVENT_FIND_MATCH = "match";
const EVENT_MATCH_FOUND = "match found";

// ============================================================================
// set up passport
// ============================================================================

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const response = await fetch(`${USER_SERVICE_URL}/api/users/${username}`);

      if (response.status === 204) {
        // username does not exist
        return done(null, false);
      }

      const json = await response.json();
      const user = json as User;

      // check for correct password
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      if (isPasswordMatch) {
        return done(null, user);
      }

      // wrong password
      return done(null, false);
    } catch (error) {
      console.error(error);
      return done(error, false);
    }
  })
);

// convert user (expressUser) to username (id)
passport.serializeUser((expressUser, done) => {
  const user = expressUser as User;
  return done(null, user.username);
});

// convert username (id) to user (expressUser)
passport.deserializeUser(async (username: string, done) => {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/api/users/${username}`);

    if (response.status === 204) {
      // username does not exist
      return done(null, false);
    }

    const json = await response.json();
    const user = json as User;

    return done(null, user);
  } catch (error) {
    console.error(error);
    return done(error, false);
  }
});

// ============================================================================
// initialise express server
// ============================================================================

const app = express();
app.use(cors());
app.use(express.json());

// express-session middleware must be set up before passport middleware
app.use(
  session({
    secret: AUTH_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
    store: MongoStore.create({
      mongoUrl: AUTH_MONGODB_URI,
      dbName: "main-db",
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ============================================================================
// authentication
// ============================================================================

app.post("/api/auth/log-in", passport.authenticate("local"), (req, res) => {
  const expressUser = req.user;
  const user = expressUser as User;

  const userWithoutPassword: UserWithoutPassword = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  return res.status(200).json(userWithoutPassword);
});

app.post("/api/auth/sign-up", async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const response = await fetch(`${USER_SERVICE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: hashedPassword,
        displayName: displayName,
        role: "basic",
      }),
    });

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete("/api/auth/log-out", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error(error);
      res.sendStatus(500);
      return;
    }

    // the default name of the session cookie is "connect.sid"
    // source: https://expressjs.com/en/resources/middleware/session.html
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

app.get("/api/auth/current-user", (req, res) => {
  const expressUser = req.user;

  if (expressUser === undefined) {
    res.status(200).json({ username: null });
    return;
  }

  const user = expressUser as User;

  const userProfileInfo = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  };

  res.status(200).json(userProfileInfo);
});

app.get("/api/auth/secret", (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  res.status(200).json({ secret: 42 });
});

// ============================================================================
// user service
// ============================================================================

app.get("/api/users/:username", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const username = req.params.username;

    const response = await fetch(`${USER_SERVICE_URL}/api/users/${username}`);

    if (response.status !== 200) {
      // pass along the status code
      res.sendStatus(response.status);
      return;
    }

    const json = await response.json();
    const user = json as User;

    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/api/users", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const { username, password, displayName } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const response = await fetch(`${USER_SERVICE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: hashedPassword,
        displayName: displayName,
      }),
    });

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.put("/api/users/:username", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  const user = req.user as User;

  const oldUsername = user.username;
  const oldHashedPassword = user.password;
  const oldDisplayName = user.displayName;
  const oldRole = user.role;

  try {
    // check whether user is changing password
    if ("oldPassword" in req.body && "newPassword" in req.body) {
      const { oldPassword, newPassword } = req.body;

      // check whether the old password provided by the user is correct
      const isOldPasswordMatch = await bcrypt.compare(
        oldPassword,
        oldHashedPassword
      );

      if (!isOldPasswordMatch) {
        // wrong old password
        res.sendStatus(401);
        return;
      }

      const newHashedPassword = await bcrypt.hash(newPassword, 10);

      const response = await fetch(
        `${USER_SERVICE_URL}/api/users/${oldUsername}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: oldUsername,
            password: newHashedPassword,
            displayName: oldDisplayName,
            role: oldRole,
          }),
        }
      );

      // pass along the status code
      res.sendStatus(response.status);
    } else {
      // user is changing details other than password
      const { username, displayName, role } = req.body;

      if (username !== oldUsername) {
        // the user should not be able to change the details of another person
        res.sendStatus(401);
        return;
      }

      const response = await fetch(
        `${USER_SERVICE_URL}/api/users/${oldUsername}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: oldUsername,
            password: oldHashedPassword,
            displayName: displayName,
            role: role,
          }),
        }
      );

      // pass along the status code
      res.sendStatus(response.status);
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete("/api/users/:username", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const username = req.params.username;

    const response = await fetch(`${USER_SERVICE_URL}/api/users/${username}`, {
      method: "DELETE",
    });

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// ============================================================================
// question service
// ============================================================================

app.get("/api/questions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const response = await fetch(`${QUESTION_SERVICE_URL}/api/questions`);

    if (response.status !== 200) {
      // pass along the status code
      res.sendStatus(response.status);
      return;
    }

    const json = await response.json();
    const questions = json as Question[];

    res.status(200).send(questions);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.get("/api/questions/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const id = req.params.id;

    const response = await fetch(`${QUESTION_SERVICE_URL}/api/questions/${id}`);

    if (response.status !== 200) {
      // pass along the status code
      res.sendStatus(response.status);
      return;
    }

    const json = await response.json();
    const question = json as Question;

    res.status(200).send(question);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/api/questions", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  const user = req.user as User;

  // only admin users are allowed to add new questions
  if (user.role !== "admin") {
    res.sendStatus(401);
    return;
  }

  try {
    const json = req.body;
    const question = json as Question;

    const response = await fetch(`${QUESTION_SERVICE_URL}/api/questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(question),
    });

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.put("/api/questions/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  const user = req.user as User;

  // only admin users are allowed to update questions
  if (user.role !== "admin") {
    res.sendStatus(401);
    return;
  }

  try {
    const id = req.params.id;
    const json = req.body;
    const question = json as Question;

    const response = await fetch(
      `${QUESTION_SERVICE_URL}/api/questions/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(question),
      }
    );

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.delete("/api/questions/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  const user = req.user as User;

  // only admin users are allowed to delete questions
  if (user.role !== "admin") {
    res.sendStatus(401);
    return;
  }

  try {
    const id = req.params.id;

    const response = await fetch(
      `${QUESTION_SERVICE_URL}/api/questions/${id}`,
      { method: "DELETE" }
    );

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// ============================================================================
// history service
// ============================================================================

app.get("/api/history/:username", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  const username = req.params.username;

  try {
    const response = await fetch(
      `${HISTORY_SERVICE_URL}/api/history/${username}`
    );

    if (response.status !== 200) {
      // pass along the status code
      res.sendStatus(response.status);
      return;
    }

    const json = await response.json();
    const historyItems = json as HistoryItem[];

    res.status(200).send(historyItems);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

app.post("/api/history", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return;
  }

  try {
    const json = req.body;
    const newAttempt = json as HistoryItem;

    const response = await fetch(`${HISTORY_SERVICE_URL}/api/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newAttempt),
    });

    // pass along the status code
    res.sendStatus(response.status);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// ============================================================================
// miscellaneous
// ============================================================================

app.get("/", (req, res) => {
  res.send("rainbow");
});

// ============================================================================
// matching service
// ============================================================================

const server = http.createServer(app);
const socketIo = new Server(server, {
  cors: {
    origin: "*",
  },
});

socketIo.on("connection", (socket) => {
  console.log("User connected to matching service socket");

  socket.on(EVENT_FIND_MATCH, async (matchRequest) => {
    if (isMatchRequest(matchRequest)) {
      try {
        console.log(
          "Socket received request to match, sending to server:",
          JSON.stringify(matchRequest)
        );
        const foundMatch = await sendMatchRequest(matchRequest);
        console.log(
          "Socket received response from server, sending to client:",
          JSON.stringify(foundMatch)
        );
        socket.emit(EVENT_MATCH_FOUND, foundMatch);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log("Invalid match request:", matchRequest);
    }
  });
});

server.listen(PORT, "::", () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
