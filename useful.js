app.post("/login", async (req, res) => {
  const { email, pswd } = req.body;
  if (!email || !pswd) {
    return res.status(400).json({ message: "email and pswd are required" });
  }
  const user = await User.findOne({ email, pswd });
  // check if user exist
  if (!user) {
    return res.status(401).json({ message: "invalid credentials" });
  }

  // compare pswd
  const isMatch = await bcrypt.compare(pswd, user.pswd);
  if (!isMatch) {
    return res.status(401).json({ message: "invalid credentials" });
  }

  res.status(200).json({ message: "login successful" });
});
