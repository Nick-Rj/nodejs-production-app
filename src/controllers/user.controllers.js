import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// Utility method for generating Access & Refresh Tokens.
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    console.log("Fetched user for login", userId);
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Saving refresh token into the database.
    // As password field is not present, turn-off the validation before saving.
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access tokens!"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend.
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar.
  // upload them to cloudinary, avatar.
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation.
  // return response.

  const { fullName, email, username, password } = req.body;
  console.log("email:", email);
  console.log("fullName:", fullName);
  console.log("username:", username);

  // if (fullName === "") {
  //   throw new ApiError(400, "fullname is required!");
  // }
  // Validating multiple fields sequentially.

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const existingUser = await User.findOne({
    // Checking for multiple fields
    $or: [{ username }, { email }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists!");
  }

  // All data is fetched through req.body.
  // In the same way, req.files gives access for all the files uploaded by the multer.
  // There are multiple properties provided by the file fields.
  // TODO: log req.files and observe the data.
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  console.log("All files", req.files, Array.isArray(req.files));

  // let coverImageLocalPath;
  // if (
  //   req.files &&
  //   Array.isArray(req.files) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  const coverImageLocalPath =
    req.files &&
    req.files.coverImage &&
    Array.isArray(req.files?.coverImage) &&
    req.files.coverImage.length > 0
      ? req.files.coverImage[0].path
      : "";

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  // Uploading files on Cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // Validate for Cloudinary path
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }
  // Create the object and insert it into the database.
  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username?.toLowerCase(),
  });

  // validating the new user added.
  // select method is used for unchecking the fields which are not required.
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  // If user not found, throw an error.
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "Username or Email required!");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  //Note: All the user-defined methods inside User modal can be accessed by the instance created of the User modal. Example, user.
  //Note: User modal will only provide mongoose methods.
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials!");
  }
  console.log("user id", user?._id);

  // Generating Access & Refresh Tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user?._id
  );

  // Fetching logged in user.
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Setting up options for cookies: cookies should be secured and to be modified only on server.
  const options = {
    httpOnly: true,
    secure: true,
  };

  // Generating cookies and sending response.
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // For finding the user, _id is required.
  // Fetching the user object generated by the auth middleware.
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out!"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    }

    // Comparing incoming refresh token with the refresh token stored in the db.
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or invalid!");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user?._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token updated successfully!"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token!");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // User added to request through auth middleware.
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid current password!");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user;

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //Production: Avoid updating files while updating textual data.
  const { email, fullName } = req.body;

  if (!email && !fullName) {
    throw new ApiError(400, "All fields are required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      // Different ways to update fields.
      $set: { fullName, email: email },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  // A single file will be provided as a request.
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file not found!");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading Avatar!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar?.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image not found!");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(400, "Error while uploading Cover Image!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage?.url,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username not found!");
  }

  // Fetching all the required documents with mongoDB aggregate pipelines.
  const channel = await User.aggregate([
    {
      // Looking for channel user details.
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      // Looking for all the subscribers for the current channel.
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      // Looking for the current channel user's subscribed users.
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      // Adding all the searched fields to the main document. users document
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // Projecting selected values
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log("Channel details:", channel);

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully!")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      // Searching for current user.
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      // Searching all the documents for the watch history.
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        // Nesting pipeline: Adding a sub-pipeline.
        // Adding owner (User document) inside Video document.
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              // Restructuring data before storing by nesting another pipeline.
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            // Converting the array returned into an object.
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully!"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
