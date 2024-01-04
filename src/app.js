import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Using and configuring cors
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//Configurations for fetching data with certains conditions/restrictions
//For fetching json data
app.use(express.json({ limit: "16kb" }));
//For fetching data from URL. extended:true -> for fetching data in nested objects
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
//For fetching and storing different files like images, pdfs, etc.
app.use(express.static("public"));

//For performing CRUD operations on browsers' cookies
app.use(cookieParser());

export { app };
