import express from "express";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extends: true }));

app.use(cors());

// db.js
import mongoose, { Mongoose } from "mongoose";

function connectDb() {
  mongoose
    .connect("mongodb://localhost:27017/blog-api")
    .then(() => console.log("connected to db successfully"))
    .catch((err) => console.log(err));
}

connectDb();

// schemas

// identified entities
// users, posts, comments
// users{name, email, pswd}
// posts{title, body, image, date/time, #author-user}
// comment{body, date/time, #author-user, #post}

// import mongoose from "mongoose";

// user
const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    pswd: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// post
const postSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    body: String,
    image: String,
    user: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);

// comments
const commentSchema = mongoose.Schema({
  body: String,
  date: Date,
  user: [{ type: mongoose.Types.ObjectId, ref: "User" }],
  post: [{ type: mongoose.Types.ObjectId, ref: "Post" }],
});

const Comment = mongoose.model("Comment", commentSchema);

// Routes

// CRUD User

// create user
app.post("/users", (req, res) => {
  console.log("hello at the user point", req.body);
  User.create(req.body)
    .then((user) => res.status(201).json(user))
    .catch((err) => res.status(400).json(err));
});

// Read all users
app.get("/users", async (req, res) => {
  const users = await User.find();
  res.status(200).json(users);
});

// Read a particular user
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params["id"]);
    res.status(200).json(user);
  } catch (error) {
    res.json(error);
  }
});

// update a particular user
app.patch("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params["id"], req.body);
    res.status(200).json(user);
  } catch (error) {
    res.json(error);
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params["id"]);
    res.status(200).json(user);
  } catch (error) {
    res.json(error);
  }
});

// post routes

// comments routes

// auth flows
import bcrypt from "bcrypt";

// register route
app.post("/register", async (req, res) => {
  try {
    const { name, email, pswd } = req.body;
    const user_exist = await User.find({ email: email });
    if (user_exist.length) {
      return res.status(400).json({ msg: "user exist already" });
    }
    const hashed_pswd = await bcrypt.hash(pswd, 10);

    const user = await User.create({ name, email, pswd: hashed_pswd });
    res.status(201).json({ msg: "user created successfully" });
  } catch (error) {
    res.status(500).json(error);
  }
});

// login route
app.post("/login", async (req, res) => {
  console.log("hello at login");
  const { email, pswd } = req.body;
  if (!email || !pswd) {
    return res.status(400).json({ msg: "email/password required" });
  }

  const user = await User.findOne({ email: email }).select("+pswd");
  if (!user) {
    return res
      .status(401)
      .json({ msg: "invalid credentials:user does not exist" });
  }

  const compare_pswd = await bcrypt.compare(pswd, user.pswd);
  if (!compare_pswd) {
    return res.status(401).json({ msg: "invalid credentials: wrong pswd" });
  }

  // generate token
  const token = createToken(user);
  res.status(200).json({ msg: "login successfully", token: token });
});

// jwt

// middleware to protect routes
function authMiddleware(req, res, next) {
  // check if token is present in headers
  const token = req.headers["authorization"]?.split(" ")[1];
  console.log("auth token:", token, typeof token);
  if (!token) {
    return res.status(401).json({ message: "unauthorized:no token" });
  }
  // verify token
  try {
    const decoded = jwt.verify(token, "secret");
    console.log("decoded=", decoded);
    req.body["user"] = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "unauthorized" });
  }
}

// create jwt token
import jwt from "jsonwebtoken";

function createToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, "secret", {
    expiresIn: "24h",
  });
}

// posts

// create posts
app.post("/posts", authMiddleware, async (req, res) => {
  const { title, body, image, user } = req.body;
  console.log("user is:", user);
  // const user = req.body["user"]

  // create the post
  // const post = new Post({})
  const posts = await Post.create({ title, body, image, user: user.id });
  res.status(201).json(posts);
});

// read posts
app.get("/posts", async (req, res) => {
  // read or list all posts
  const posts = await Post.find().populate("user");
  res.status(200).json(posts);
});

app.get("/posts/:postid", authMiddleware, async (req, res) => {
  // read a single post (detailed)
  const post = await Post.findById(req.params["postid"]);
  res.status(200).json(post);
});

app.patch("/posts/:postid", authMiddleware, async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params["postid"]);
  res.status(200).json({ msg: "updated" });
});

app.delete("/post/:postid", authMiddleware, async (req, res) => {
  const user = req.body["user"];
  const post = await Post.findById(req.params["postid"]);
  const post_user = post.user;

  // check if user trying to delete is same with user that created post
  if (user == post_user) {
    res.send("user is same");
  }
  res.status(200).json({ msg: "deleted" });
});

app.listen(5000, () => console.log("server running"));
