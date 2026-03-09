// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors()); // allow your frontend to call this
app.use(express.json());

const uri = process.env.MONGO_URI; // Set this in Render env variables
const client = new MongoClient(uri);

let usersCollection;

client.connect().then(() => {
  usersCollection = client.db("watch_earn").collection("users");
  console.log("MongoDB connected");
});

// Add or update user
app.post("/user", async (req, res) => {
  const { userId, referrer } = req.body;

  let user = await usersCollection.findOne({ userId });
  if (!user) {
    await usersCollection.insertOne({
      userId,
      balance: 0,
      referrer: referrer || null,
      referrals: 0,
      tasksCompleted: [],
      leadershipRewards: []
    });

    // If user has referrer, increment referrer's count
    if (referrer) {
      await usersCollection.updateOne({ userId: referrer }, { $inc: { referrals: 1 } });
    }
  }

  res.send({ success: true });
});

// Increment referral manually (optional)
app.post("/referral/:referrerId", async (req, res) => {
  const referrerId = req.params.referrerId;
  await usersCollection.updateOne({ userId: referrerId }, { $inc: { referrals: 1 } });
  res.send({ success: true });
});

// Get leaderboard (top 10 users by referrals)
app.get("/leaderboard", async (req, res) => {
  const top = await usersCollection.find().sort({ referrals: -1 }).limit(10).toArray();
  res.send(top);
});

// Update balance for a user
app.post("/balance", async (req, res) => {
  const { userId, amount } = req.body;
  await usersCollection.updateOne({ userId }, { $inc: { balance: amount } });
  res.send({ success: true });
});

// Get user info
app.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  const user = await usersCollection.findOne({ userId });
  res.send(user || null);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
