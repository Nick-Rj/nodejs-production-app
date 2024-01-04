// require("dotenv").config({ path: "../env" });
import connectDB from "./db/index.js";
import dotenv from "dotenv";
import { app } from "./app.js";

dotenv.config({ path: "../.env" });

//Promise Chaining
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Server failed", error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is up and running at ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB connection failed!!!", error);
  });

// import mongoose from "mongoose";
// import { DB_NAME } from "./constants";

// import express from "express";
// const app = express();

//Connecting DB using an IFFE in index.js
/* (async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("Error", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error", error);
    throw error;
  }
})(); */
