// require("dotenv").config({ path: "../env" });
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
connectDB();

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
