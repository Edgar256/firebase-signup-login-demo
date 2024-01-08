const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

// Load environment variables from .env file
require("dotenv").config();

// Firebase imports
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require("firebase/auth");
const { getDatabase, ref, set } = require("firebase/database");
const {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  query,
  getDocs,
  where,
  setDoc,
} = require("firebase/firestore");

// Initialize Firebase app (replace with your Firebase configuration)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// firebase.initializeApp(firebaseConfig);
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

const app = express();
const port = 3000;

app.use(cors());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Endpoints:
app.use(express.static(path.join(__dirname, "public")));

// Root (Home)
app.get("/", async (req, res) => {
  const user = req?.session?.user;

  // Redirect to login page if user is not logged in
  if (!user) {
    return res.redirect("/registration");
  }
  const uid = user?.user?.uid;
  try {
    // Check if user.uid is defined
    if (uid) {
      const usersRef = collection(firestore, "users");
      const usersQuery = where("uid", "==", uid);
      const querySnapshot = await getDocs(query(usersRef, usersQuery));

      if (querySnapshot.size > 0) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Send user data as JSON
        return res.json(userData);
        
        // return res.redirect("/home");
      } else {
        return res.redirect("/registration");
      }
    } else {
      return res.redirect("/registration");
    }
  } catch (error) {
    return res.redirect("/registration");
  }
});

// Root (Home)
app.get("/user", async (req, res) => {
  const user = req?.session?.user;

  // Redirect to login page if user is not logged in
  if (!user) {
    return res.redirect("/login");
  }
  const uid = user?.user?.uid;

  try {
    // Check if user.uid is defined
    if (uid) {
      const usersRef = collection(firestore, "users");
      const usersQuery = where("uid", "==", uid);
      const querySnapshot = await getDocs(query(usersRef, usersQuery));

      if (querySnapshot.size > 0) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        return res.json(userData);
      } else {
        console.error("User document not found in Firestore");
        return res.status(500).send("Internal Server Error");
      }
    } else {
      console.error("User UID is undefined");
      return res.status(500).send("Internal Server Error");
    }
  } catch (error) {
    console.error("Error fetching user information:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// Home
app.get("/home", (req, res) => {
  return res.sendFile(path.resolve(__dirname, "public", "home.html"));
});

// Login
app.get("/login", (req, res) => {
  return res.sendFile(path.resolve(__dirname, "public", "login.html"));
});

// Login Submit
app.post("/login_submit", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Authenticate user with Firebase
  const auth = getAuth(firebaseApp);
  signInWithEmailAndPassword(auth, email, password)
    .then(async (user) => {
      req.session.user = user;

      // Fetch user data from Firestore
      const uid = user?.user?.uid;
      const usersRef = collection(firestore, "users");
      const usersQuery = where("uid", "==", uid);
      const querySnapshot = await getDocs(query(usersRef, usersQuery));

      if (querySnapshot.size > 0) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Render the home.html template with user data
        return res.json({ redirectUrl: "/home" });
      } else {
        console.error("User document not found in Firestore");
        return res.status(500).send("Internal Server Error");
      }
    })
    .catch((error) => {
      // Handle authentication errors
      res.status(401).send("Invalid email or password");
    });
});

// Registration
app.get("/registration", (req, res) => {
  return res.sendFile(path.resolve(__dirname, "public", "registration.html"));
});

// Registration Submit
app.post("/registration_submit", async (req, res) => {
  const {
    name,
    email,
    phone,
    gender,
    address,
    nextOfKin,
    dateOfBirth,
    password,
  } = req.body;

  try {
    // Create user in Firebase Authentication
    const auth = getAuth(firebaseApp);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const uid = user.uid;
    // // Save user details in Firestore

    // Save user details in Firestore
    const userRef = doc(firestore, "users", uid);

    await setDoc(userRef, {
      uid,
      name,
      email,
      phone,
      gender,
      address,
      nextOfKin,
      dateOfBirth,
      createdAt: new Date(),
    });

    req.session.user = user;
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    // Handle registration errors
    res.status(400).send("Registration failed");
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);  
});
