const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const db = admin.firestore();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH;

const register = async (req, res) => {
  const { name, username, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const passwordRegex = /.*[0-9].*/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: "Password must contain at least one number" });
  }

  try {
    const usersRef = db.collection("users");
    const emailCheck = await usersRef.where("email", "==", email).get();
    if (!emailCheck.empty) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const usernameCheck = await usersRef.where("username", "==", username).get();
    if (!usernameCheck.empty) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = {
      name,
      username,
      email,
      password: hashedPassword,
      profilePicture: null,
      followers: [],
      following: []
    };

    await usersRef.doc(email).set(userData);

    return res.status(201).json({
      user: {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        profilePicture: userData.profilePicture,
        followers: userData.followers,
        following: userData.following
      },
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Error registering user: ", error);
    return res.status(500).json({ message: "Error registering user" });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const userRef = db.collection("users").doc(email);
  const doc = await userRef.get();

  if (!doc.exists) {
    return res.status(404).json({ message: "User not found" });
  }

  const user = doc.data();
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign({ email: user.email, username: user.username, profilePicture: user.profilePicture }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ email: user.email, username: user.username, profilePicture: user.profilePicture }, JWT_SECRET_REFRESH, { expiresIn: "7d" });

  await userRef.update({ refreshToken });
  return res.json({
    success: true,
    message: "Login successful",
    user: {
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
    },
    token,
    refreshToken,
  });
};


const fetchUser = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("username", "==", username).limit(1).get();

    if (snapshot.empty) {
      return res.status(404).json({ message: "User not found" });
    }

    let userData = {};
    snapshot.forEach((doc) => {
      userData = { id: doc.id, ...doc.data() };
    });

    return res.status(200).json({
      message: "User fetched successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Error fetching user: ", error);
    return res.status(500).json({ message: "Error fetching user" });
  }
};

const logout = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const userRef = db.collection('users').doc(email);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found" });
    }

    await userRef.update({ refreshToken: null });

    return res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.error('Error during logout: ', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { register, login, fetchUser, logout };
